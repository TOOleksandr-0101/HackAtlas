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
            <>
              <p className="hero__preview-label">Example challenge</p>
              <h2>{example.title}</h2>
              <p>{example.learningObjectives[0]}</p>
              <ul className="hero__preview-list">
                <li>Define the problem and audience</li>
                <li>Scope three essential features</li>
                <li>Decide how to validate your idea</li>
              </ul>
              <Link to={`/challenges/${example.id}`} className="hero__preview-link">
                View the brief <span aria-hidden="true">→</span>
              </Link>
            </>
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
