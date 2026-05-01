import { useConnection } from '@solana/wallet-adapter-react'

// shows a thin banner when the rpc isn't pointing at devnet — e.g. someone
// flipped VITE_RPC_URL to mainnet or testnet by mistake. read-only, never
// blocks the play area.
export default function NetworkBanner() {
  const { connection } = useConnection()
  const url = connection.rpcEndpoint.toLowerCase()

  if (url.includes('devnet') || url.includes('localhost') || url.includes('127.0.0.1')) {
    return null
  }

  const tag = url.includes('mainnet') ? 'mainnet' : url.includes('testnet') ? 'testnet' : 'unknown rpc'

  return (
    <div className="net-banner" role="status" aria-live="polite">
      <span className="net-dot" aria-hidden />
      <span>
        heads up — your rpc is pointed at <strong>{tag}</strong>. flipordrain only lives on devnet,
        so flip away once you swap <code>VITE_RPC_URL</code> back to a devnet endpoint.
      </span>
    </div>
  )
}
