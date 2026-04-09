use anchor_lang::prelude::*;
use crate::state::FlipVault;
use crate::constants::VAULT_SEED;
use crate::errors::FlipError;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + FlipVault::INIT_SPACE,
        seeds = [VAULT_SEED],
        bump,
    )]
    pub vault: Account<'info, FlipVault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<InitializeVault>,
    house_edge_bps: u16,
    min_bet: u64,
    max_bet: u64,
) -> Result<()> {
    require!(house_edge_bps <= 1000, FlipError::MathOverflow); // max 10%
    require!(min_bet > 0, FlipError::BetTooSmall);
    require!(max_bet >= min_bet, FlipError::BetTooLarge);

    let vault = &mut ctx.accounts.vault;
    vault.authority = ctx.accounts.authority.key();
    vault.balance = 0;
    vault.total_flips = 0;
    vault.total_volume = 0;
    vault.house_edge_bps = house_edge_bps;
    vault.min_bet = min_bet;
    vault.max_bet = max_bet;
    vault.is_paused = false;
    vault.bump = ctx.bumps.vault;
    Ok(())
}
