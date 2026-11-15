import { Link } from "react-router-dom";
import { LoadingNotice } from "../components/Status";
import { useChallenges } from "../hooks/useApi";

const steps = [
  {
    title: "Choose a challenge",
    detail: "Get a business problem with a target user, real constraints, and a clear brief.",
  },
  {
    title: "Propose a solution",
    detail: "Define the problem, scope three MVP features, and plan how you would test your idea.",
  },
  {
    title: "Revise with feedback",
    detail: "Get an AI evaluation, improve your answers, and compare your attempts.",
  },
];

export function LandingPage() {
  const { data: challenges, error, isLoading, retry } = useChallenges();
  const example = challenges?.find((challenge) => challenge.difficulty === "beginner") ?? challenges?.[0];

  return (
    <>
      <section className="hero wrap">
        <div className="hero__copy">
          <h1>Stop Watching Tutorials. <span>Start Building Products.</span></h1>
          <p>
            Practice solving realistic business problems, get AI feedback on your decisions,
            and build the judgment you need to make your first product.
          </p>
          <Link to="/challenges" className="button button--primary">
            Start Learning <span aria-hidden="true">→</span>
          </Link>
          <p className="hero__access">Free practice · No account needed</p>
        </div>
        <div className="hero__preview" aria-live="polite">
          {isLoading ? (
            <LoadingNotice message="Loading an example challenge…" />
          ) : error ? (
            <div className="hero__preview-status" role="alert">
              <p className="hero__preview-label">Example unavailable</p>
              <h2>Challenges could not be loaded</h2>
              <p>{error.message}</p>
              <button className="button button--secondary" type="button" onClick={retry}>Try again</button>
            </div>
          ) : example ? (
            <article className="feedback-preview" aria-labelledby="example-feedback-title">
              <header className="feedback-preview__header">
                <div>
                  <p className="hero__preview-label" id="example-feedback-title">Example AI Feedback</p>
                  <p className="feedback-preview__challenge">{example.title}</p>
                </div>
                <span className="feedback-preview__badge">Illustrative example</span>
              </header>

              <div className="feedback-preview__score-row">
                <p className="feedback-preview__score"><strong>58</strong><span>/100</span></p>
                <div className="feedback-preview__skill">
                  <p>Weakest skill · 8/20</p>
                  <h2>Target Audience Definition</h2>
                </div>
              </div>

              <div className="feedback-preview__suggestion">
                <p>Next revision</p>
                <strong>Define one reachable household segment and explain why this problem repeats for them.</strong>
              </div>

              <div className="feedback-preview__improvement">
                <div>
                  <p>After revising this skill</p>
                  <span>One focused change creates visible progress.</span>
                </div>
                <p className="feedback-preview__delta">
                  <span>8/20</span><span aria-hidden="true">→</span><strong>14/20</strong><small>+6</small>
                </p>
              </div>

              <p className="feedback-preview__disclaimer">Illustrative learning-loop example, not a learner result.</p>
              <Link to={`/challenges/${example.id}`} className="button button--secondary feedback-preview__cta">
                Try This Challenge <span aria-hidden="true">→</span>
              </Link>
            </article>
          ) : (
            <div className="hero__preview-status">
              <p className="hero__preview-label">Challenge library</p>
              <h2>No challenges are available</h2>
              <p>Please check again later.</p>
            </div>
          )}
        </div>
      </section>

      <section className="landing-section wrap" aria-labelledby="how-title">
        <h2 id="how-title">How It Works</h2>
        <ol className="steps">
          {steps.map((step) => (
            <li key={step.title} className="card">
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section landing-section--access wrap" aria-labelledby="access-title">
        <div className="access-banner">
          <div>
            <h2 id="access-title">Free Plan</h2>
            <p>Practice a case, get an AI evaluation, and revise your submission.</p>
          </div>
          <div className="form-actions">
            <Link to="/challenges" className="button button--primary">Browse challenges</Link>
            <Link to="/pricing" className="button button--secondary">Compare plans</Link>
          </div>
        </div>
      </section>
    </>
  );
}
