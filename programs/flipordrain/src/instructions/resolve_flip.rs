use anchor_lang::prelude::*;

use crate::constants::{STATS_SEED, VAULT_SEED};
use crate::errors::FlipError;
use crate::state::{FlipGame, FlipVault, PlayerStats};

#[derive(Accounts)]
pub struct ResolveFlip<'info> {
    #[account(
        seeds = [VAULT_SEED],
        bump = vault.bump,
        // only vault authority can resolve (VRF callback in production)
        constraint = vault.authority == resolver.key() @ FlipError::UnauthorizedResolver,
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

    pub resolver: Signer<'info>,
}

pub fn handler(ctx: Context<ResolveFlip>, result: [u8; 32]) -> Result<()> {
    // determine win/loss — production: verify VRF proof
    let won = result[0] % 2 == 0;

    let flip = &mut ctx.accounts.flip_game;
    flip.result = Some(won);
    flip.resolved_at = Some(Clock::get()?.unix_timestamp);

    // only update stats here, payout happens in claim_winnings
    let stats = &mut ctx.accounts.player_stats;
    if won {
        stats.total_won = stats.total_won
            .checked_add(flip.payout)
            .ok_or(FlipError::MathOverflow)?;
        stats.current_streak = stats.current_streak
            .checked_add(1)
            .ok_or(FlipError::MathOverflow)?;
        if stats.current_streak > stats.best_streak {
            stats.best_streak = stats.current_streak;
        }
        msg!("flip won! claim via claim_winnings");
    } else {
        stats.total_lost = stats.total_lost
            .checked_add(flip.amount)
            .ok_or(FlipError::MathOverflow)?;
        stats.current_streak = 0;
        msg!("flip lost. {} lamports stay in vault", flip.amount);
    }

    Ok(())
}
