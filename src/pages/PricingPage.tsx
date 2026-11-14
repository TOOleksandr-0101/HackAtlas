import { Link } from "react-router-dom";

const freeFeatures = [
  "Access to every current practice challenge",
  "AI evaluation across five product criteria",
  "Revisions and saved attempt comparisons",
  "Progress saved in this browser",
];

const proposedProFeatures = [
  "A larger challenge library",
  "Deeper learning insights",
  "Progress available across devices",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="pricing-features">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export function PricingPage() {
  return (
    <div className="page wrap">
      <header className="page-heading page-heading--centered">
        <p className="eyebrow">Plans</p>
        <h1>Start practicing for free</h1>
        <p>HackAtlas does not require an account or payment for the current learning experience.</p>
      </header>

      <div className="pricing-grid">
        <section className="card pricing-card pricing-card--featured" aria-labelledby="free-plan-title">
          <p className="pricing-card__status">Available now</p>
          <h2 id="free-plan-title">Free</h2>
          <p className="pricing-card__price"><strong>$0</strong><span>current plan</span></p>
          <p>Build product judgment with the complete current practice workflow.</p>
          <FeatureList items={freeFeatures} />
          <Link className="button button--primary" to="/challenges">Browse challenges</Link>
        </section>

        <section className="card pricing-card" aria-labelledby="pro-plan-title">
          <p className="pricing-card__status">Proposed plan · not available</p>
          <h2 id="pro-plan-title">Pro</h2>
          <p className="pricing-card__price"><strong>$12.99</strong><span>per month</span></p>
          <p>Potential future tools for learners who want more practice and longitudinal insights.</p>
          <FeatureList items={proposedProFeatures} />
          <button className="button button--secondary" type="button" disabled>Subscriptions unavailable</button>
        </section>
      </div>

      <p className="pricing-disclaimer" role="note">
        Pro is a product proposal only. HackAtlas does not currently provide subscriptions, payment processing,
        entitlements, accounts, or cross-device storage.
      </p>
    </div>
  );
}
