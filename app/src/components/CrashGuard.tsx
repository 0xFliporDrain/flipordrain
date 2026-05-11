import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { err: Error | null }

// last-resort guard against runtime crashes in any subtree.
// without it a thrown error in (say) <LiveFeed/> blanks the whole app.
export default class CrashGuard extends Component<Props, State> {
  state: State = { err: null }

  static getDerivedStateFromError(err: Error): State {
    return { err }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    // surface to console in dev; remote logging is out of scope for now.
    // in prod we keep the message but drop the component stack to avoid
    // leaking internal structure via DevTools.
    if (import.meta.env.DEV) {
      console.error('[crash-guard] caught', err, info.componentStack)
    } else {
      console.error('[crash-guard] caught:', err.message)
    }
  }

  reload = () => {
    this.setState({ err: null })
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (!this.state.err) return this.props.children

    return (
      <div className="boundary">
        <div className="boundary-card">
          <p className="boundary-tag">runtime error</p>
          <h1 className="boundary-title">something cracked.</h1>
          <p className="boundary-msg">
            the app threw an unhandled exception. the on-chain state is fine — your funds, flips,
            and history are untouched. just need to reload the ui.
          </p>
          <pre className="boundary-stack">{this.state.err.message}</pre>
          <button className="boundary-btn" onClick={this.reload}>reload</button>
        </div>
      </div>
    )
  }
}
