use anchor_lang::prelude::*;

use crate::constants::{STATS_SEED, VAULT_SEED};
use crate::errors::FlipError;
use crate::state::{FlipGame, FlipVault, PlayerStats};

#[derive(Accounts)]
pub struct ResolveFlip<'info> {
    #[account(
        seeds = [VAULT_SEED],
        bump = vault.bump,
        constraint = vault.authority == resolver.key() @ FlipError::UnauthorizedResolver,
    )]
    pub vault: Account<'info, FlipVault>,

    #[account(
        mut,
        constraint = flip_game.player == player.key() @ FlipError::Unauthorized,
        constraint = flip_game.result.is_none() @ FlipError::AlreadyResolved,
    )]
    pub flip_game: Account<'info, FlipGame>,

    #[account(
        mut,
        seeds = [STATS_SEED, flip_game.player.as_ref()],
        bump = player_stats.bump,
    )]
    pub player_stats: Account<'info, PlayerStats>,

    /// CHECK: receives rent refund if flip is lost
    #[account(mut, constraint = player.key() == flip_game.player @ FlipError::Unauthorized)]
    pub player: UncheckedAccount<'info>,

    pub resolver: Signer<'info>,
}

pub fn handler(ctx: Context<ResolveFlip>, result: [u8; 32]) -> Result<()> {
    let won = result[0] % 2 == 0;

    let flip = &mut ctx.accounts.flip_game;
    flip.result = Some(won);
    flip.resolved_at = Some(Clock::get()?.unix_timestamp);

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
        msg!("flip won! player: {} payout: {}", flip.player, flip.payout);
    } else {
        stats.total_lost = stats.total_lost
            .checked_add(flip.amount)
            .ok_or(FlipError::MathOverflow)?;
        stats.current_streak = 0;

        // close lost flip — zero discriminator + return rent to player
        let flip_info = flip.to_account_info();
        let player_info = ctx.accounts.player.to_account_info();
        let lamports = flip_info.lamports();
        **flip_info.try_borrow_mut_lamports()? = 0;
        **player_info.try_borrow_mut_lamports()? += lamports;
        // zero account data to prevent resurrection
        flip_info.try_borrow_mut_data()?.fill(0);

        msg!("flip lost. player: {} amt: {} rent refunded", flip.player, flip.amount);
    }

    Ok(())
}
