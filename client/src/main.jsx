import React, { Component } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import App from "./App.jsx";
import { initDemoBackend } from "./demo/mockBackend";

// Safe Unicode Base64 patch to prevent InvalidCharacterError across routes
if (typeof window !== "undefined" && window.btoa) {
  const origBtoa = window.btoa.bind(window);
  window.btoa = (str) => {
    try {
      return origBtoa(str);
    } catch {
      return origBtoa(unescape(encodeURIComponent(str)));
    }
  };
}

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("CRITICAL REACT ERROR IN APP:", error, errorInfo);
    window.__reactFatalError = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 30, background: "#fee2e2", color: "#991b1b", fontFamily: "sans-serif" }}>
          <h2 style={{ fontWeight: "bold", fontSize: "20px" }}>React Render Error Caught:</h2>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: "10px" }}>
            {this.state.error?.stack || this.state.error?.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

initDemoBackend();

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}
