import React from 'react';
import { AlertTriangle, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-full bg-warehouse-gray-dark flex-col items-center justify-center p-6 text-white text-center">
                    <AlertTriangle size={64} className="text-warehouse-red mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                    <p className="text-gray-400 mb-6">The Picking Screen crashed.</p>

                    <div className="bg-black/50 p-4 rounded text-left font-mono text-xs w-full max-w-lg overflow-auto mb-6 border border-gray-700 max-h-64">
                        <p className="text-red-400 font-bold">{this.state.error?.toString()}</p>
                        <pre className="mt-2 text-gray-500">{this.state.errorInfo?.componentStack}</pre>
                    </div>

                    <button
                        onClick={() => window.location.href = '/'} // Hard reload/redirect to home
                        className="flex items-center space-x-2 px-6 py-3 bg-warehouse-blue rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        <Home size={20} />
                        <span>Go Home</span>
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
