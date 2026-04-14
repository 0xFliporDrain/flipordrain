import { useState, useCallback, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { useFlipProgram, getVaultPda, getFlipPda, getStatsPda } from './useProgram'

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

export type FlipRecord = {
  won: boolean
  amount: number
  payout: number
  ts: number
  sig?: string
  isDouble: boolean
}

export type FlipError = {
  type: 'tx_rejected' | 'vrf_timeout' | 'network' | 'unknown'
  message: string
}

const HISTORY_KEY = 'flipordrain:history'
const VRF_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 2_000

function loadHistory(): FlipRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, 200)
  } catch {
    return []
  }
}

function saveHistory(records: FlipRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 200)))
}

export function useFlip() {
  const { publicKey } = useWallet()
  const { get, connection, connected } = useFlipProgram()
  const [state, setState] = useState<FlipState>('idle')
  const [result, setResult] = useState<FlipResult | null>(null)
  const [vault, setVault] = useState<VaultInfo | null>(null)
  const [stats, setStats] = useState<PlayerInfo | null>(null)
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<FlipError | null>(null)
  const [history, setHistory] = useState<FlipRecord[]>(loadHistory)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addToHistory = useCallback((record: FlipRecord) => {
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, 200)
      saveHistory(next)
      return next
    })
  }, [])

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  // cleanup on unmount
  useEffect(() => clearPolling, [clearPolling])

  // fetch vault info
  const refreshVault = useCallback(async () => {
    try {
      const { prog } = get()
      const [vaultPda] = getVaultPda()
      const v = await prog.account.flipVault.fetch(vaultPda)
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
  }, [get])

  // fetch player stats
  const refreshStats = useCallback(async () => {
    if (!publicKey) return
    try {
      const { prog } = get()
      const [statsPda] = getStatsPda(publicKey)
      const s = await prog.account.playerStats.fetch(statsPda)
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
  }, [get, publicKey])

  // fetch SOL balance
  const refreshBalance = useCallback(async () => {
    if (!connection || !publicKey) return
    try {
      const bal = await connection.getBalance(publicKey)
      setBalance(bal / LAMPORTS_PER_SOL)
    } catch {
      // silent
    }
  }, [connection, publicKey])

  useEffect(() => {
    setLoading(true)
    Promise.all([refreshVault(), refreshStats(), refreshBalance()]).finally(() =>
      setLoading(false)
    )
  }, [refreshVault, refreshStats, refreshBalance])

  // clear polling on wallet disconnect
  useEffect(() => {
    if (!publicKey) clearPolling()
  }, [publicKey, clearPolling])

  // poll for flip result
  const pollForResult = useCallback(
    (flipPda: PublicKey, betAmount: number, isDouble: boolean) => {
      clearPolling()

      pollRef.current = setInterval(async () => {
        try {
          const { prog } = get()
          const flip = await prog.account.flipGame.fetch(flipPda)
          if (flip.result !== null) {
            clearPolling()
            const won = flip.result === true
            const payout = flip.payout.toNumber() / LAMPORTS_PER_SOL
            const amt = flip.amount.toNumber() / LAMPORTS_PER_SOL

            setResult({ won, amount: amt, payout: won ? payout : amt, flipPda, canDouble: won })
            setState(won ? 'won' : 'lost')
            addToHistory({ won, amount: amt, payout: won ? payout : amt, ts: Date.now(), isDouble })
            refreshVault()
            refreshStats()
            refreshBalance()
          }
        } catch {
          // flip account might be closed (loss) — check if account exists
          try {
            const acct = await connection.getAccountInfo(flipPda)
            if (!acct) {
              clearPolling()
              setResult({ won: false, amount: betAmount, payout: 0, flipPda, canDouble: false })
              setState('lost')
              addToHistory({ won: false, amount: betAmount, payout: 0, ts: Date.now(), isDouble })
              refreshVault()
              refreshStats()
              refreshBalance()
            }
          } catch {
            // network error in fallback check — keep polling
          }
        }
      }, POLL_INTERVAL_MS)

      // VRF timeout
      timeoutRef.current = setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        setError({
          type: 'vrf_timeout',
          message: 'Flip is taking too long — the resolver may be offline. Your SOL is safe, check back later.',
        })
        setState('idle')
        setResult(null)
      }, VRF_TIMEOUT_MS)
    },
    [get, connection, clearPolling, addToHistory, refreshVault, refreshStats, refreshBalance]
  )

  // demo flip — local only, no on-chain tx
  const demoFlip = useCallback(
    (amountSol: number) => {
      setState('placing')
      setResult(null)
      setError(null)

      setTimeout(() => {
        setState('waiting')
        setTimeout(() => {
          const won = Math.random() < 0.5
          const payout = won ? amountSol * 1.9 : amountSol
          setResult({
            won,
            amount: amountSol,
            payout,
            flipPda: PublicKey.default,
            canDouble: won,
          })
          setState(won ? 'won' : 'lost')
        }, 1500 + Math.random() * 1000)
      }, 500)
    },
    []
  )

  // place flip
  const placeFlip = useCallback(
    async (amountSol: number) => {
      if (!connected || !publicKey || !vault) return
      setState('placing')
      setResult(null)
      setError(null)

      let flipPda: PublicKey | null = null

      try {
        const { prog } = get()
        const amount = new BN(Math.round(amountSol * LAMPORTS_PER_SOL))
        const [vaultPda] = getVaultPda()
        const freshVault = await prog.account.flipVault.fetch(vaultPda)
        const currentFlips = freshVault.totalFlips.toNumber()
        ;[flipPda] = getFlipPda(publicKey, currentFlips)
        const [statsPda] = getStatsPda(publicKey)

        // build tx with fresh blockhash to avoid "already processed"
        const tx = await prog.methods
          .placeFlip(amount)
          .accountsPartial({
            vault: vaultPda,
            flipGame: flipPda,
            playerStats: statsPda,
            player: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction()

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        tx.recentBlockhash = blockhash
        tx.lastValidBlockHeight = lastValidBlockHeight
        tx.feePayer = publicKey

        // send without waiting for full confirmation — devnet is slow
        const signed = await prog.provider.wallet.signTransaction(tx)
        const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true })
        console.log('flip sent:', sig)

        // start polling immediately — don't wait for confirmTransaction
        setState('waiting')
        pollForResult(flipPda, amountSol, false)

        // confirm in background — if it fails, polling will catch the result anyway
        connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
          .catch((e) => console.warn('confirm bg:', e?.message?.slice(0, 60)))

      } catch (e: any) {
        console.error('flip error:', e)

        const msg = e?.message || String(e)

        // if tx was sent but confirmation timed out — still poll
        if (flipPda && (msg.includes('not confirmed') || msg.includes('timeout') || msg.includes('Timed out'))) {
          console.log('confirmation timed out but tx may have landed — polling')
          setState('waiting')
          pollForResult(flipPda, amountSol, false)
          return
        }

        // if tx already processed — it went through before, refresh and poll
        if (flipPda && (msg.includes('already been processed') || msg.includes('already processed'))) {
          console.log('tx already processed — polling for result')
          setState('waiting')
          pollForResult(flipPda, amountSol, false)
          refreshVault()
          refreshStats()
          refreshBalance()
          return
        }

        clearPolling()
        setState('idle')

        if (msg.includes('User rejected') || msg.includes('Transaction cancelled')) {
          setError({ type: 'tx_rejected', message: 'Transaction was rejected.' })
        } else if (msg.includes('blockhash')) {
          setError({ type: 'network', message: 'Network error — try again.' })
        } else {
          setError({ type: 'unknown', message: msg.slice(0, 120) })
        }
      }
    },
    [get, connection, connected, publicKey, vault, pollForResult, clearPolling, refreshVault, refreshStats, refreshBalance]
  )

  // helper: send tx without blocking on confirmation
  const sendFast = useCallback(
    async (tx: any) => {
      if (!publicKey) throw new Error('wallet disconnected')
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash
      tx.lastValidBlockHeight = lastValidBlockHeight
      tx.feePayer = publicKey

      const { prog } = get()
      const signed = await prog.provider.wallet.signTransaction(tx)
      const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: true })
      console.log('tx sent:', sig)

      // confirm in bg — don't block ui
      connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
        .catch((e) => console.warn('confirm bg:', e?.message?.slice(0, 60)))

      return sig
    },
    [connection, publicKey, get]
  )

  // claim winnings
  const claimWinnings = useCallback(
    async (flipPda: PublicKey) => {
      if (!connected || !publicKey) return
      setError(null)

      try {
        // check if flip account still exists before trying to claim
        const acct = await connection.getAccountInfo(flipPda)
        if (!acct) {
          // flip was already claimed or double lost — just reset
          setResult(null)
          setState('idle')
          refreshVault()
          refreshStats()
          refreshBalance()
          return
        }

        const { prog } = get()
        const [vaultPda] = getVaultPda()

        const tx = await prog.methods
          .claimWinnings()
          .accountsPartial({
            vault: vaultPda,
            flipGame: flipPda,
            player: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction()

        await sendFast(tx)

        setResult(null)
        setState('idle')
        setTimeout(() => { refreshVault(); refreshStats(); refreshBalance() }, 2000)
      } catch (e: any) {
        const msg = e?.message || String(e)
        if (msg.includes('User rejected') || msg.includes('Transaction cancelled')) {
          setError({ type: 'tx_rejected', message: 'Claim rejected.' })
        } else if (msg.includes('not confirmed') || msg.includes('timeout')) {
          setResult(null)
          setState('idle')
          setTimeout(() => { refreshVault(); refreshStats(); refreshBalance() }, 2000)
        } else if (msg.includes('AccountNotInitialized') || msg.includes('not found')) {
          // flip account closed — was already claimed or double resulted in loss
          setResult(null)
          setState('idle')
          refreshBalance()
        } else {
          setError({ type: 'unknown', message: 'Failed to claim: ' + msg.slice(0, 80) })
        }
      }
    },
    [get, connection, connected, publicKey, sendFast, refreshVault, refreshStats, refreshBalance]
  )

  // double or nothing
  const doubleOrNothing = useCallback(
    async (prevFlipPda: PublicKey) => {
      if (!connected || !publicKey || !vault) return
      setState('placing')
      setError(null)

      let newFlipPda: PublicKey | null = null

      try {
        const { prog } = get()
        const [vaultPda] = getVaultPda()
        const freshVault = await prog.account.flipVault.fetch(vaultPda)
        ;[newFlipPda] = getFlipPda(publicKey, freshVault.totalFlips.toNumber())

        const tx = await prog.methods
          .doubleOrNothing()
          .accountsPartial({
            vault: vaultPda,
            prevFlip: prevFlipPda,
            newFlip: newFlipPda,
            player: publicKey,
            systemProgram: SystemProgram.programId,
          })
          .transaction()

        await sendFast(tx)

        setState('waiting')
        const prevPayout = result?.payout || 0
        if (newFlipPda) pollForResult(newFlipPda, prevPayout, true)
        setResult((prev) => prev ? { ...prev, flipPda: newFlipPda!, canDouble: false } : null)
      } catch (e: any) {
        console.error('double error:', e)

        const msg = e?.message || String(e)

        // timeout or already processed — tx probably went through, poll anyway
        if (newFlipPda && (msg.includes('not confirmed') || msg.includes('timeout') || msg.includes('already processed'))) {
          console.log('double tx may have landed — polling')
          setState('waiting')
          const prevPayout = result?.payout || 0
          if (newFlipPda) pollForResult(newFlipPda, prevPayout, true)
          setResult((prev) => prev ? { ...prev, flipPda: newFlipPda!, canDouble: false } : null)
          return
        }

        clearPolling()
        setState(result?.won ? 'won' : 'idle')

        if (msg.includes('User rejected') || msg.includes('Transaction cancelled')) {
          setError({ type: 'tx_rejected', message: 'Double rejected.' })
        } else {
          setError({ type: 'unknown', message: msg.slice(0, 120) })
        }
      }
    },
    [get, connection, connected, publicKey, vault, result, pollForResult, clearPolling, sendFast]
  )

  const reset = useCallback(() => {
    setState('idle')
    setResult(null)
    setError(null)
    clearPolling()
  }, [clearPolling])

  const dismissError = useCallback(() => setError(null), [])

  return {
    state,
    result,
    vault,
    stats,
    balance,
    loading,
    error,
    history,
    placeFlip,
    demoFlip,
    claimWinnings,
    doubleOrNothing,
    reset,
    dismissError,
    refreshVault,
  }
}
