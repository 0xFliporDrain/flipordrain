import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { err: Error | null }

// last-resort guard against runtime crashes in any subtree.
// without it a thrown error in (say) <LiveFeed/> blanks the whole app.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null }

  static getDerivedStateFromError(err: Error): State {
    return { err }
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    // surface to console; remote logging is out of scope for now.
    console.error('[boundary] caught', err, info.componentStack)
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
