import { Component, ReactNode } from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || String(error) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-red-900/30 border border-red-700/50">
            <h2 className="text-lg font-bold text-red-300 mb-2">Something went wrong</h2>
            <p className="text-sm text-red-400/80 break-words font-mono">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
