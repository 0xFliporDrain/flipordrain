use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ResolveFlip<'info> {
    pub signer: Signer<'info>,
}

pub fn handler(_ctx: Context<ResolveFlip>, _result: [u8; 32]) -> Result<()> {
    // TODO: verify VRF callback, resolve flip, update stats
    Ok(())
}
