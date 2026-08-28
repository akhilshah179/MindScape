// src/components/ErrorBoundary.jsx
// Wraps sections of your app so one crash doesn't kill everything.
//
// USAGE — wrap any major section in App.jsx or Dashboard.jsx:
//
//   import ErrorBoundary from './components/ErrorBoundary'
//
//   <ErrorBoundary>
//     <GlobalChatPanel subjects={allSubjects} />
//   </ErrorBoundary>
//
//   <ErrorBoundary label="Analytics">
//     <AnalyticsDashboard />
//   </ErrorBoundary>

import { Component } from 'react'

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        // Log to console in dev — swap for Sentry/CloudWatch in production
        console.error(`[ErrorBoundary: ${this.props.label || 'unnamed'}]`, error, info)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                    <p className="text-2xl mb-2">⚠️</p>
                    <p className="text-red-700 font-semibold text-sm mb-1">
                        {this.props.label ? `${this.props.label} failed to load` : 'Something went wrong'}
                    </p>
                    <p className="text-red-400 text-xs mb-4">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="text-xs font-medium px-4 py-2 rounded-xl bg-red-100
              hover:bg-red-200 text-red-700 transition-colors"
                    >
                        Try again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
