use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct DoubleOrNothing<'info> {
    pub signer: Signer<'info>,
}

pub fn handler(_ctx: Context<DoubleOrNothing>) -> Result<()> {
    // TODO: check prev flip won, create new flip, request VRF
    Ok(())
}
