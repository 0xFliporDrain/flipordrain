use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct FlipGame {
    pub player: Pubkey,
    pub amount: u64,
    pub vrf_request: Pubkey,
    pub result: Option<bool>,
    pub payout: u64,
    pub is_double_or_nothing: bool,
    pub previous_flip: Option<Pubkey>,
    pub streak_count: u8,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}
