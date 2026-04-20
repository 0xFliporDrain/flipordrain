use anchor_lang::prelude::*;

use crate::VAULT_SEED;
use crate::errors::FlipError;
use crate::state::FlipVault;

#[derive(Accounts)]
pub struct TogglePause<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = vault.bump,
        constraint = vault.authority == authority.key() @ FlipError::Unauthorized,
    )]
    pub vault: Account<'info, FlipVault>,

    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<TogglePause>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.is_paused = !vault.is_paused;
    msg!("vault paused: {}", vault.is_paused);
    Ok(())
}
