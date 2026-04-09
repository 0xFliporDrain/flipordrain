use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PlaceFlip<'info> {
    pub signer: Signer<'info>,
}

pub fn handler(_ctx: Context<PlaceFlip>, _amount: u64) -> Result<()> {
    // TODO: validate bet, create FlipGame PDA, request VRF
    Ok(())
}
