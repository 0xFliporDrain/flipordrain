use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct FlipVault {
    pub authority: Pubkey,
    pub balance: u64,
    pub total_flips: u64,
    pub total_volume: u64,
    pub house_edge_bps: u16,
    pub min_bet: u64,
    pub max_bet: u64,
    pub is_paused: bool,
    pub bump: u8,
}
