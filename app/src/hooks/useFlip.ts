import { useState, useCallback, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useProgram, getVaultPda, getFlipPda, getStatsPda } from './useProgram'

export type FlipState = 'idle' | 'placing' | 'waiting' | 'won' | 'lost'

export type FlipResult = {
  won: boolean
  amount: number
  payout: number
  flipPda: PublicKey
  canDouble: boolean
}

export type VaultInfo = {
  balance: number
  totalFlips: number
  totalVolume: number
  minBet: number
  maxBet: number
  isPaused: boolean
}

export type PlayerInfo = {
  totalFlips: number
  totalWon: number
  totalLost: number
  bestStreak: number
  currentStreak: number
  volume: number
}

export function useFlip() {
  const { publicKey } = useWallet()
  const { program, connection } = useProgram()
  const [state, setState] = useState<FlipState>('idle')
  const [result, setResult] = useState<FlipResult | null>(null)
  const [vault, setVault] = useState<VaultInfo | null>(null)
  const [stats, setStats] = useState<PlayerInfo | null>(null)
  const [balance, setBalance] = useState(0)

  // fetch vault info
  const refreshVault = useCallback(async () => {
    if (!program) return
    try {
      const [vaultPda] = getVaultPda()
      const v = await program.account.flipVault.fetch(vaultPda)
      setVault({
        balance: v.balance.toNumber() / LAMPORTS_PER_SOL,
        totalFlips: v.totalFlips.toNumber(),
        totalVolume: v.totalVolume.toNumber() / LAMPORTS_PER_SOL,
        minBet: v.minBet.toNumber() / LAMPORTS_PER_SOL,
        maxBet: v.maxBet.toNumber() / LAMPORTS_PER_SOL,
        isPaused: v.isPaused,
      })
    } catch {
      setVault(null)
    }
  }, [program])

  // fetch player stats
  const refreshStats = useCallback(async () => {
    if (!program || !publicKey) return
    try {
      const [statsPda] = getStatsPda(publicKey)
      const s = await program.account.playerStats.fetch(statsPda)
      setStats({
        totalFlips: s.totalFlips.toNumber(),
        totalWon: s.totalWon.toNumber() / LAMPORTS_PER_SOL,
        totalLost: s.totalLost.toNumber() / LAMPORTS_PER_SOL,
        bestStreak: s.bestStreak,
        currentStreak: s.currentStreak,
        volume: s.volume.toNumber() / LAMPORTS_PER_SOL,
      })
    } catch {
      setStats(null)
    }
  }, [program, publicKey])

  // fetch SOL balance
  const refreshBalance = useCallback(async () => {
    if (!connection || !publicKey) return
    const bal = await connection.getBalance(publicKey)
    setBalance(bal / LAMPORTS_PER_SOL)
  }, [connection, publicKey])

  useEffect(() => {
    refreshVault()
    refreshStats()
    refreshBalance()
  }, [refreshVault, refreshStats, refreshBalance])

  // place flip
  const placeFlip = useCallback(
    async (amountSol: number) => {
      if (!program || !publicKey || !vault) return
      setState('placing')
      setResult(null)

      try {
        const amount = new BN(Math.floor(amountSol * LAMPORTS_PER_SOL))
        const [vaultPda] = getVaultPda()
        const [flipPda] = getFlipPda(publicKey, vault.totalFlips)
        const [statsPda] = getStatsPda(publicKey)

        await program.methods
          .placeFlip(amount)
          .accountsPartial({
            vault: vaultPda,
            flipGame: flipPda,
            playerStats: statsPda,
            player: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        setState('waiting')

        // poll for resolution (the resolver/backend resolves it)
        const poll = setInterval(async () => {
          try {
            const flip = await program.account.flipGame.fetch(flipPda)
            if (flip.result !== null) {
              clearInterval(poll)
              const won = flip.result === true
              const payout = flip.payout.toNumber() / LAMPORTS_PER_SOL
              const amt = flip.amount.toNumber() / LAMPORTS_PER_SOL

              setResult({
                won,
                amount: amt,
                payout: won ? payout : amt,
                flipPda,
                canDouble: won,
              })
              setState(won ? 'won' : 'lost')
              refreshVault()
              refreshStats()
              refreshBalance()
            }
          } catch {
            // flip account might be closed (loss) — check if account exists
            const acct = await connection.getAccountInfo(flipPda)
            if (!acct) {
              clearInterval(poll)
              setResult({
                won: false,
                amount: amountSol,
                payout: amountSol,
                flipPda,
                canDouble: false,
              })
              setState('lost')
              refreshVault()
              refreshStats()
              refreshBalance()
            }
          }
        }, 2000)

        // timeout after 60s
        setTimeout(() => clearInterval(poll), 60000)
      } catch (e: any) {
        console.error('flip error:', e)
        setState('idle')
        throw e
      }
    },
    [program, publicKey, vault, connection, refreshVault, refreshStats, refreshBalance]
  )

  // claim winnings
  const claimWinnings = useCallback(
    async (flipPda: PublicKey) => {
      if (!program || !publicKey) return
      const [vaultPda] = getVaultPda()

      await program.methods
        .claimWinnings()
        .accountsPartial({
          vault: vaultPda,
          flipGame: flipPda,
          player: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      setResult(null)
      setState('idle')
      refreshVault()
      refreshStats()
      refreshBalance()
    },
    [program, publicKey, refreshVault, refreshStats, refreshBalance]
  )

  // double or nothing
  const doubleOrNothing = useCallback(
    async (prevFlipPda: PublicKey) => {
      if (!program || !publicKey || !vault) return
      setState('placing')

      const [vaultPda] = getVaultPda()
      const [newFlipPda] = getFlipPda(publicKey, vault.totalFlips)

      await program.methods
        .doubleOrNothing()
        .accountsPartial({
          vault: vaultPda,
          prevFlip: prevFlipPda,
          newFlip: newFlipPda,
          player: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      setState('waiting')
      setResult((prev) =>
        prev ? { ...prev, flipPda: newFlipPda, canDouble: false } : null
      )

      // poll for resolution
      const poll = setInterval(async () => {
        try {
          const flip = await program.account.flipGame.fetch(newFlipPda)
          if (flip.result !== null) {
            clearInterval(poll)
            const won = flip.result === true
            const payout = flip.payout.toNumber() / LAMPORTS_PER_SOL
            const amt = flip.amount.toNumber() / LAMPORTS_PER_SOL

            setResult({
              won,
              amount: amt,
              payout: won ? payout : amt,
              flipPda: newFlipPda,
              canDouble: won,
            })
            setState(won ? 'won' : 'lost')
            refreshVault()
            refreshStats()
            refreshBalance()
          }
        } catch {
          const acct = await connection.getAccountInfo(newFlipPda)
          if (!acct) {
            clearInterval(poll)
            setState('lost')
            refreshVault()
            refreshStats()
            refreshBalance()
          }
        }
      }, 2000)

      setTimeout(() => clearInterval(poll), 60000)
    },
    [program, publicKey, vault, connection, refreshVault, refreshStats, refreshBalance]
  )

  const reset = useCallback(() => {
    setState('idle')
    setResult(null)
  }, [])

  return {
    state,
    result,
    vault,
    stats,
    balance,
    placeFlip,
    claimWinnings,
    doubleOrNothing,
    reset,
    refreshVault,
  }
}
