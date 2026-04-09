import { useMemo } from 'react'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import idl from '../lib/idl.json'
import { PROGRAM_ID, VAULT_SEED, FLIP_SEED, STATS_SEED } from '../lib/constants'
import type { Flipordrain } from '../../../target/types/flipordrain'

export function useProgram() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  const provider = useMemo(() => {
    if (!wallet) return null
    return new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    })
  }, [connection, wallet])

  const program = useMemo(() => {
    if (!provider) return null
    return new Program(idl as any, provider) as unknown as Program<Flipordrain>
  }, [provider])

  return { program, provider, connection }
}

export function getVaultPda() {
  return PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID)
}

export function getFlipPda(player: PublicKey, totalFlips: number) {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(BigInt(totalFlips))
  return PublicKey.findProgramAddressSync(
    [FLIP_SEED, player.toBuffer(), buf],
    PROGRAM_ID
  )
}

export function getStatsPda(player: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [STATS_SEED, player.toBuffer()],
    PROGRAM_ID
  )
}
