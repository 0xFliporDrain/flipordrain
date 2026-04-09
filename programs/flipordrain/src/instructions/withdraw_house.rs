use anchor_lang::prelude::*;

use crate::constants::VAULT_SEED;
use crate::errors::FlipError;
use crate::state::FlipVault;

#[derive(Accounts)]
pub struct WithdrawHouse<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ FlipError::Unauthorized,
    )]
    pub vault: Account<'info, FlipVault>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WithdrawHouse>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;

    require!(vault.balance >= amount, FlipError::InsufficientVaultBalance);

    vault.balance = vault.balance
        .checked_sub(amount)
        .ok_or(FlipError::MathOverflow)?;

    let vault_info = vault.to_account_info();
    let authority_info = ctx.accounts.authority.to_account_info();

    **vault_info.try_borrow_mut_lamports()? -= amount;
    **authority_info.try_borrow_mut_lamports()? += amount;

    msg!("house withdrew {} lamports", amount);
    Ok(())
}
