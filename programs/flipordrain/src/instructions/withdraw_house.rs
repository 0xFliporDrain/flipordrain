use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct WithdrawHouse<'info> {
    pub signer: Signer<'info>,
}

pub fn handler(_ctx: Context<WithdrawHouse>, _amount: u64) -> Result<()> {
    // TODO: authority check, transfer from vault
    Ok(())
}
