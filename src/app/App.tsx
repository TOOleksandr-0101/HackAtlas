import { useEffect } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { LandingPage } from "../pages/LandingPage";
import { ChallengeLibraryPage } from "../pages/ChallengeLibraryPage";
import { ChallengeWorkspacePage } from "../pages/ChallengeWorkspacePage";
import { ProgressPage } from "../pages/ProgressPage";

export function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="site-header__inner wrap">
          <Link to="/" className="wordmark" aria-label="HackAtlas home">
            <span className="wordmark__mark" aria-hidden="true">H</span>
            HackAtlas
          </Link>
          <nav aria-label="Main navigation" className="site-nav">
            <NavLink to="/challenges">Challenges</NavLink>
            <NavLink to="/progress">My progress</NavLink>
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/challenges" element={<ChallengeLibraryPage />} />
          <Route path="/challenges/:id" element={<ChallengeWorkspacePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="*" element={
            <div className="page wrap">
              <h1>Page not found</h1>
              <Link to="/challenges" className="button button--primary">Browse challenges</Link>
            </div>
          } />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner wrap">
          <Link to="/" className="wordmark">HackAtlas</Link>
          <p>Learn to Build. Build to Learn.</p>
        </div>
      </footer>
    </>
  );
}
