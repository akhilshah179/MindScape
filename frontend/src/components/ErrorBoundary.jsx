import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/** Catches render errors in a subtree so one crash doesn't blank the whole app. */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ''}]`, error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    // A lazy chunk failing to load usually means a new version was deployed.
    const isChunk = /Loading chunk|dynamically imported module|Failed to fetch/i.test(error.message || '')
    return (
      <div role="alert" className={this.props.label ? 'card p-6 text-center' : 'min-h-screen bg-canvas flex items-center justify-center p-6'}>
        <div className="max-w-sm text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-bad/10 flex items-center justify-center mb-4"><AlertTriangle className="w-5 h-5 text-bad" /></div>
          <p className="text-ink font-semibold">{this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}</p>
          <p className="text-ink-3 text-sm mt-1">{isChunk ? 'A newer version of MindScape is available.' : error.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => (isChunk || !this.props.label ? window.location.reload() : this.setState({ error: null }))}
            className="mt-5 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-surface-2 border text-sm text-ink hover:bg-surface-3"
          >
            <RotateCcw className="w-4 h-4" /> {isChunk ? 'Reload' : 'Try again'}
          </button>
        </div>
      </div>
    )
  }
}
