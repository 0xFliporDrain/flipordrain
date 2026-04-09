use anchor_lang::prelude::*;

#[error_code]
pub enum FlipError {
    #[msg("bet too small")]
    BetTooSmall,
    #[msg("bet too large")]
    BetTooLarge,
    #[msg("vault cant cover payout")]
    InsufficientVaultBalance,
    #[msg("only vrf callback can resolve")]
    UnauthorizedResolver,
    #[msg("cant double on a loss")]
    CannotDoubleOnLoss,
    #[msg("flip not resolved yet")]
    FlipNotResolved,
    #[msg("not the authority")]
    Unauthorized,
    #[msg("game is paused")]
    GamePaused,
    #[msg("math overflow")]
    MathOverflow,
    #[msg("max streak reached")]
    MaxStreakReached,
    #[msg("already claimed")]
    AlreadyClaimed,
    #[msg("flip was not won")]
    FlipNotWon,
}
