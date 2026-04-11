use anchor_lang::prelude::*;

use crate::constants::{FLIP_SEED, MAX_STREAK, PAYOUT_MULTIPLIER_BPS, VAULT_SEED};
use crate::errors::FlipError;
use crate::state::{FlipGame, FlipVault};

#[derive(Accounts)]
pub struct DoubleOrNothing<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
        constraint = !vault.is_paused @ FlipError::GamePaused,
    )]
    pub vault: Account<'info, FlipVault>,

    /// the previous winning flip — closed to prevent double claim
    #[account(
        mut,
        constraint = prev_flip.player == player.key() @ FlipError::Unauthorized,
        constraint = prev_flip.result == Some(true) @ FlipError::CannotDoubleOnLoss,
        close = player,
    )]
    pub prev_flip: Account<'info, FlipGame>,

    #[account(
        init,
        payer = player,
        space = 8 + FlipGame::INIT_SPACE,
        seeds = [FLIP_SEED, player.key().as_ref(), &vault.total_flips.to_le_bytes()],
        bump,
    )]
    pub new_flip: Account<'info, FlipGame>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<DoubleOrNothing>) -> Result<()> {
    let prev = &ctx.accounts.prev_flip;
    let streak = prev.streak_count
        .checked_add(1)
        .ok_or(FlipError::MathOverflow)?;

    require!(streak <= MAX_STREAK, FlipError::MaxStreakReached);

    // doubled amount = previous payout, apply house edge (1.9x not 2x)
    let doubled_amt = prev.payout;
    let new_payout = doubled_amt
        .checked_mul(PAYOUT_MULTIPLIER_BPS as u64)
        .ok_or(FlipError::MathOverflow)?
        .checked_div(10000)
        .ok_or(FlipError::MathOverflow)?;

    require!(
        ctx.accounts.vault.balance >= new_payout,
        FlipError::InsufficientVaultBalance
    );

    // update vault counters
    let vault = &mut ctx.accounts.vault;
    vault.total_flips = vault.total_flips
        .checked_add(1)
        .ok_or(FlipError::MathOverflow)?;
    vault.total_volume = vault.total_volume
        .checked_add(doubled_amt)
        .ok_or(FlipError::MathOverflow)?;

    // init new flip linked to previous
    let flip = &mut ctx.accounts.new_flip;
    flip.player = ctx.accounts.player.key();
    flip.amount = doubled_amt;
    flip.vrf_request = Pubkey::default();
    flip.result = None;
    flip.payout = new_payout;
    flip.is_double_or_nothing = true;
    flip.previous_flip = Some(ctx.accounts.prev_flip.key());
    flip.streak_count = streak;
    flip.created_at = Clock::get()?.unix_timestamp;
    flip.resolved_at = None;
    flip.bump = ctx.bumps.new_flip;

    msg!("double or nothing! streak: {}, amount: {}", streak, doubled_amt);
    Ok(())
}
