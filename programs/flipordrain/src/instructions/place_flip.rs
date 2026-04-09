use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::constants::{FLIP_SEED, STATS_SEED, VAULT_SEED, PAYOUT_MULTIPLIER_BPS};
use crate::errors::FlipError;
use crate::state::{FlipGame, FlipVault, PlayerStats};

#[derive(Accounts)]
pub struct PlaceFlip<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
        constraint = !vault.is_paused @ FlipError::GamePaused,
    )]
    pub vault: Account<'info, FlipVault>,

    #[account(
        init,
        payer = player,
        space = 8 + FlipGame::INIT_SPACE,
        seeds = [FLIP_SEED, player.key().as_ref(), &vault.total_flips.to_le_bytes()],
        bump,
    )]
    pub flip_game: Account<'info, FlipGame>,

    #[account(
        init_if_needed,
        payer = player,
        space = 8 + PlayerStats::INIT_SPACE,
        seeds = [STATS_SEED, player.key().as_ref()],
        bump,
    )]
    pub player_stats: Account<'info, PlayerStats>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<PlaceFlip>, amount: u64) -> Result<()> {
    let vault = &ctx.accounts.vault;

    // validate bet size
    require!(amount >= vault.min_bet, FlipError::BetTooSmall);
    require!(amount <= vault.max_bet, FlipError::BetTooLarge);

    // check vault can cover potential payout (1.9x)
    let potential_payout = amount
        .checked_mul(PAYOUT_MULTIPLIER_BPS as u64)
        .ok_or(FlipError::MathOverflow)?
        .checked_div(10000)
        .ok_or(FlipError::MathOverflow)?;

    require!(
        vault.balance >= potential_payout,
        FlipError::InsufficientVaultBalance
    );

    // state update before CPI
    let vault = &mut ctx.accounts.vault;
    vault.balance = vault.balance
        .checked_add(amount)
        .ok_or(FlipError::MathOverflow)?;
    vault.total_flips = vault.total_flips
        .checked_add(1)
        .ok_or(FlipError::MathOverflow)?;
    vault.total_volume = vault.total_volume
        .checked_add(amount)
        .ok_or(FlipError::MathOverflow)?;

    // transfer SOL from player to vault
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.key(),
        system_program::Transfer {
            from: ctx.accounts.player.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount)?;

    // init flip game
    let flip = &mut ctx.accounts.flip_game;
    flip.player = ctx.accounts.player.key();
    flip.amount = amount;
    flip.vrf_request = Pubkey::default(); // set when VRF requested
    flip.result = None;
    flip.payout = potential_payout;
    flip.is_double_or_nothing = false;
    flip.previous_flip = None;
    flip.streak_count = 0;
    flip.created_at = Clock::get()?.unix_timestamp;
    flip.resolved_at = None;
    flip.bump = ctx.bumps.flip_game;

    // init player stats if new
    let stats = &mut ctx.accounts.player_stats;
    if stats.player == Pubkey::default() {
        stats.player = ctx.accounts.player.key();
        stats.bump = ctx.bumps.player_stats;
    }
    stats.total_flips = stats.total_flips
        .checked_add(1)
        .ok_or(FlipError::MathOverflow)?;
    stats.volume = stats.volume
        .checked_add(amount)
        .ok_or(FlipError::MathOverflow)?;

    msg!("flip placed: {} lamports, payout: {}", amount, potential_payout);
    Ok(())
}
