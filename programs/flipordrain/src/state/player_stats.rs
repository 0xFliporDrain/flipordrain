use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PlayerStats {
    pub player: Pubkey,
    pub total_flips: u64,
    pub total_won: u64,
    pub total_lost: u64,
    pub best_streak: u8,
    pub current_streak: u8,
    pub volume: u64,
    pub bump: u8,
}
