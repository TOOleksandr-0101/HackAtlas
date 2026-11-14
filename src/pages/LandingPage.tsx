import { Link } from "react-router-dom";
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
  const { data: challenges } = useChallenges();
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
        <div className="hero__preview">
          <p className="hero__preview-label">Example challenge</p>
          <h2>{example?.title ?? "Reduce Household Food Waste"}</h2>
          <p>
            {example
              ? example.learningObjectives[0]
              : "Design a digital product that helps US households use more of the food they buy."}
          </p>
          <ul className="hero__preview-list">
            <li>Define the problem and audience</li>
            <li>Scope three essential features</li>
            <li>Decide how to validate your idea</li>
          </ul>
          <Link to={example ? `/challenges/${example.id}` : "/challenges"} className="hero__preview-link">
            View the brief <span aria-hidden="true">→</span>
          </Link>
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
          <Link to="/challenges" className="button button--primary">Browse challenges</Link>
        </div>
      </section>
    </>
  );
}
