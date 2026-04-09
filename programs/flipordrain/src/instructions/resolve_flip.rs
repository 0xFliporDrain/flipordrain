use anchor_lang::prelude::*;

use crate::constants::{STATS_SEED, VAULT_SEED};
use crate::errors::FlipError;
use crate::state::{FlipGame, FlipVault, PlayerStats};

#[derive(Accounts)]
pub struct ResolveFlip<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
    )]
    pub vault: Account<'info, FlipVault>,

    #[account(
        mut,
        constraint = flip_game.result.is_none() @ FlipError::FlipNotResolved,
    )]
    pub flip_game: Account<'info, FlipGame>,

    #[account(
        mut,
        seeds = [STATS_SEED, flip_game.player.as_ref()],
        bump = player_stats.bump,
    )]
    pub player_stats: Account<'info, PlayerStats>,

    /// CHECK: player receives payout if won
    #[account(mut, constraint = player.key() == flip_game.player @ FlipError::Unauthorized)]
    pub player: UncheckedAccount<'info>,

    // TODO: replace with VRF callback authority
    pub resolver: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ResolveFlip>, result: [u8; 32]) -> Result<()> {
    let won = result[0] % 2 == 0;

    let flip = &mut ctx.accounts.flip_game;
    flip.result = Some(won);
    flip.resolved_at = Some(Clock::get()?.unix_timestamp);

    let stats = &mut ctx.accounts.player_stats;

    if won {
        let payout = flip.payout;
        let vault = &mut ctx.accounts.vault;

        // state update before transfer
        vault.balance = vault.balance
            .checked_sub(payout)
            .ok_or(FlipError::InsufficientVaultBalance)?;

        // direct lamport transfer from vault PDA
        **vault.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += payout;

        stats.total_won = stats.total_won
            .checked_add(payout)
            .ok_or(FlipError::MathOverflow)?;
        stats.current_streak = stats.current_streak
            .checked_add(1)
            .ok_or(FlipError::MathOverflow)?;
        if stats.current_streak > stats.best_streak {
            stats.best_streak = stats.current_streak;
        }

        msg!("flip won! payout: {} lamports", payout);
    } else {
        stats.total_lost = stats.total_lost
            .checked_add(flip.amount)
            .ok_or(FlipError::MathOverflow)?;
        stats.current_streak = 0;

        msg!("flip lost. {} lamports stay in vault", flip.amount);
    }

    Ok(())
}
