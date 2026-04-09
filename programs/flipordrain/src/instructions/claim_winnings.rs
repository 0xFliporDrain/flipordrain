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
    let payout = ctx.accounts.flip_game.payout;

    // state update first
    let vault = &mut ctx.accounts.vault;
    vault.balance = vault.balance
        .checked_sub(payout)
        .ok_or(FlipError::InsufficientVaultBalance)?;

    // rent-exempt check
    let vault_info = vault.to_account_info();
    let rent = Rent::get()?.minimum_balance(vault_info.data_len());
    require!(
        vault_info.lamports().checked_sub(payout).unwrap_or(0) >= rent,
        FlipError::InsufficientVaultBalance
    );

    **vault_info.try_borrow_mut_lamports()? -= payout;
    **ctx.accounts.player.to_account_info().try_borrow_mut_lamports()? += payout;

    msg!("claimed {} lamports", payout);
    Ok(())
}
