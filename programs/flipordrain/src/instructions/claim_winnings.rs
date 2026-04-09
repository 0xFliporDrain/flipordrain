use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    pub signer: Signer<'info>,
}

pub fn handler(_ctx: Context<ClaimWinnings>) -> Result<()> {
    // TODO: verify flip resolved + won, transfer payout
    Ok(())
}
