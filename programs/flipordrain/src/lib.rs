//! FlipOrDrain — on-chain coin flip with verifiable randomness.

use anchor_lang::prelude::*;

declare_id!("8SXWVRBFoPCqbLZiDA9oY9EFbD9NVbU7SryoxJQt3ssG");

// PDA seeds + house params live at the crate root — tiny, not worth a file.
pub const VAULT_SEED: &[u8] = b"vault";
pub const FLIP_SEED: &[u8] = b"flip";
pub const STATS_SEED: &[u8] = b"stats";
pub const MAX_STREAK: u8 = 15;
pub const DEFAULT_HOUSE_EDGE_BPS: u16 = 500;      // 5%
pub const PAYOUT_MULTIPLIER_BPS: u16 = 19000;     // 1.9x

pub mod instructions;
pub mod state;
pub mod errors;

use instructions::*;

#[program]
pub mod flipordrain {
    use super::*;

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        house_edge_bps: u16,
        min_bet: u64,
        max_bet: u64,
    ) -> Result<()> {
        instructions::initialize_vault::handler(ctx, house_edge_bps, min_bet, max_bet)
    }

    pub fn fund_vault(ctx: Context<FundVault>, amount: u64) -> Result<()> {
        instructions::fund_vault::handler(ctx, amount)
    }

    pub fn place_flip(ctx: Context<PlaceFlip>, amount: u64) -> Result<()> {
        instructions::place_flip::handler(ctx, amount)
    }

    pub fn resolve_flip(ctx: Context<ResolveFlip>, result: [u8; 32]) -> Result<()> {
        instructions::resolve_flip::handler(ctx, result)
    }

    pub fn double_or_nothing(ctx: Context<DoubleOrNothing>) -> Result<()> {
        instructions::double_or_nothing::handler(ctx)
    }

    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }

    pub fn withdraw_house(ctx: Context<WithdrawHouse>, amount: u64) -> Result<()> {
        instructions::withdraw_house::handler(ctx, amount)
    }

    pub fn toggle_pause(ctx: Context<TogglePause>) -> Result<()> {
        instructions::toggle_pause::handler(ctx)
    }
}
