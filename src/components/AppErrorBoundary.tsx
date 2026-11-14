import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("HackAtlas could not render this page.", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const recoveryPath = window.location.pathname === "/challenges" ? "/" : "/challenges";
    const recoveryLabel = recoveryPath === "/" ? "Go to home" : "Browse challenges";

    return (
      <section className="page wrap" aria-labelledby="app-error-title">
        <div className="card empty-state">
          <h1 id="app-error-title">This page could not be displayed</h1>
          <p>Your saved drafts and attempts have not been changed.</p>
          <div className="form-actions">
            <button className="button button--primary" type="button" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <Link className="button button--secondary" to={recoveryPath}>
              {recoveryLabel}
            </Link>
          </div>
        </div>
      </section>
    );
  }
}
