import { useRef, useCallback } from 'react'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey, Keypair } from '@solana/web3.js'
import idl from '../lib/idl.json'
import { PROGRAM_ID, VAULT_SEED, FLIP_SEED, STATS_SEED } from '../lib/constants'

type FlipProgram = any

const readonlyKp = Keypair.generate()

export function useFlipProgram() {
  const { connection } = useConnection()
  const w = useAnchorWallet()
  const progRef = useRef<Program<FlipProgram> | null>(null)
  const provRef = useRef<AnchorProvider | null>(null)

  const get = useCallback(() => {
    const signer = w ?? { publicKey: readonlyKp.publicKey, signTransaction: () => Promise.reject(), signAllTransactions: () => Promise.reject() }
    provRef.current = new AnchorProvider(connection, signer as any, { preflightCommitment: 'confirmed' })
    progRef.current = new Program(idl as any, provRef.current) as unknown as Program<FlipProgram>
    return { prog: progRef.current, prov: provRef.current }
  }, [connection, w])

  return { get, connection, connected: !!w }
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
