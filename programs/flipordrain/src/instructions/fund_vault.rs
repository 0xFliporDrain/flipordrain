use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::FlipVault;
use crate::errors::FlipError;
use crate::constants::VAULT_SEED;

#[derive(Accounts)]
pub struct FundVault<'info> {
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

pub fn handler(ctx: Context<FundVault>, amount: u64) -> Result<()> {
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.key(),
        system_program::Transfer {
            from: ctx.accounts.authority.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount)?;
    ctx.accounts.vault.balance = ctx.accounts.vault.balance
        .checked_add(amount)
        .ok_or(FlipError::MathOverflow)?;
    Ok(())
}
