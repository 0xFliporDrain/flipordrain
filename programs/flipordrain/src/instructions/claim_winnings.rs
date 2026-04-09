use anchor_lang::prelude::*;

use crate::constants::VAULT_SEED;
use crate::errors::FlipError;
use crate::state::{FlipGame, FlipVault};

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
    )]
    pub vault: Account<'info, FlipVault>,

    #[account(
        mut,
        constraint = flip_game.player == player.key() @ FlipError::Unauthorized,
        constraint = flip_game.result == Some(true) @ FlipError::CannotDoubleOnLoss,
        close = player,
    )]
    pub flip_game: Account<'info, FlipGame>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let flip = &ctx.accounts.flip_game;

    require!(flip.result.is_some(), FlipError::FlipNotResolved);
    require!(flip.result == Some(true), FlipError::CannotDoubleOnLoss);

    let payout = flip.payout;
    let vault = &mut ctx.accounts.vault;

    vault.balance = vault.balance
        .checked_sub(payout)
        .ok_or(FlipError::InsufficientVaultBalance)?;

    let vault_info = vault.to_account_info();
    let player_info = ctx.accounts.player.to_account_info();

    **vault_info.try_borrow_mut_lamports()? -= payout;
    **player_info.try_borrow_mut_lamports()? += payout;

    msg!("claimed {} lamports", payout);
    Ok(())
}
