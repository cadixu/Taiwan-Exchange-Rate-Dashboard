import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { APP_CONFIG } from './config';

// --- CRITICAL FIX: Polyfill 'process' for browser environments ---
// This prevents "ReferenceError: process is not defined" which causes the white screen.
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

// Logic to handle CSS loading based on configuration
const loadStyles = () => {
  if (APP_CONFIG.USE_LOCAL_CSS) {
    console.log('Using Local CSS mode (./index.css)');
    if (!document.querySelector('link[href="./index.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './index.css';
      document.head.appendChild(link);
    }
  } else {
    console.log('Using Tailwind CDN mode');
    if (!document.querySelector('script[src*="cdn.tailwindcss.com"]')) {
      const script = document.createElement('script');
      script.src = "https://cdn.tailwindcss.com";
      script.id = "tailwind-cdn"; // Add ID for easier debugging
      document.head.appendChild(script);
    }
  }
};

loadStyles();

// --- Error Boundary Component ---
// Catches errors in the component tree and displays a fallback UI instead of a blank screen.

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Explicitly declare state property to satisfy TypeScript
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    // State is initialized via property initializer above
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#333' }}>
          <h1 style={{ color: '#e11d48' }}>應用程式發生錯誤 (Application Error)</h1>
          <p>請將以下錯誤訊息提供給開發人員：</p>
          <pre style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', overflow: 'auto', color: '#d32f2f' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '10px', padding: '8px 16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            重新整理頁面
          </button>
        </div>
      );
    }

    // Fix: Cast to any to safely access props.children if TypeScript fails to infer props on Component
    return (this as any).props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);