// client/src/components/ErrorBoundary.jsx
import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In a real deployment this is where an error-tracking call (Sentry,
    // etc.) would go. Logging to console is the honest baseline here -
    // no error-tracking service is wired up in this project.
    console.error('Unhandled UI error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-error-600" />
          <h1 className="font-serif text-lg text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-sm bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}