import { challengeSchema } from '../../shared/schemas.js'
import type { Challenge } from '../../shared/types.js'

// These are original HackAtlas learning scenarios. The business figures are fictional case assumptions.
const foodWaste: Challenge = {
  id: "household-food-waste",
  title: "Reduce Household Food Waste",
  category: "Sustainability",
  difficulty: "beginner",
  estimatedMinutes: 20,
  scenario: "Design a digital product that helps busy US households throw away less edible food. In this case, interviews suggest that households forget what is already in the fridge, change dinner plans during the week, and notice perishables only when they are cleaning up.",
  businessContext: "A community food program wants to pilot a consumer tool with 30 volunteer households. The program can recruit through its newsletter and can fund a six-week pilot. It needs evidence that households waste less edible food before committing to a larger rollout.",
  targetUser: "US adults who share grocery or meal planning duties, cook several times a week, and have unpredictable evening schedules.",
  constraints: [
    "Assume two builders and six weeks to pilot.",
    "The pilot cannot depend on smart appliances, retailer inventory feeds, or paid partnerships.",
    "Keep ongoing household data entry under two minutes per day.",
    "The product must leave food-safety decisions to the household and avoid claiming that food is safe to eat.",
  ],
  expectedDeliverables: [
    "One recurring moment when avoidable food waste happens and one household segment to serve first.",
    "A product concept and the three features required to test it in the pilot.",
    "A small experiment that measures food discarded over time.",
  ],
  learningObjectives: [
    "Separate a user behavior from its symptoms.",
    "Scope a small product around one repeated household decision.",
    "Choose a measurable outcome that reflects a real reduction in waste.",
  ],
  rubric: {
    problemUnderstanding: {
      description: "Explain what edible food gets wasted, when it happens, and the behavior behind it.",
      anchors: {
        weak: "Repeats that food waste is bad or describes a different waste problem.",
        average: "Names a household friction such as forgetting food, with little detail about when or why.",
        good: "Identifies a recurring decision in the grocery-to-meal workflow and connects it to avoidable waste.",
        excellent: "Identifies a specific cause and decision window, explains why current household habits miss it, and states an assumption the pilot can test.",
      },
    },
    targetAudience: {
      description: "Pick a reachable household segment with a common food-management routine.",
      anchors: {
        weak: "Lists everyone, a business audience, or an unrelated persona.",
        average: "Names a general audience such as busy families without the behavior that makes them suitable.",
        good: "Defines who coordinates meals or groceries, when waste occurs for them, and how to reach them.",
        excellent: "Identifies a distinct early segment, explains why its routine makes the problem frequent, and shows how the community program can recruit it.",
      },
    },
    solutionQuality: {
      description: "Show how the proposal interrupts a behavior that causes edible food to be thrown away.",
      anchors: {
        weak: "Proposes a generic recipe app, dashboard, or unrelated behavior.",
        average: "Suggests a relevant tool but leaves the trigger or useful follow-up action unclear.",
        good: "Shows a realistic trigger and next action that can change the targeted household behavior.",
        excellent: "Connects the trigger, action, and expected behavior change, with a specific reason households would keep using it despite varying routines.",
      },
    },
    mvpFeasibility: {
      description: "Prioritize three features consistent with the team, timeline, low input burden, and food-safety constraint.",
      anchors: {
        weak: "Lists vague features or depends on unavailable integrations or unsafe claims.",
        average: "Lists plausible features but misses the input burden, scope, or a dependency.",
        good: "Names three buildable features that together support the pilot with little upkeep.",
        excellent: "Uses three clearly scoped features to run the whole pilot, explains a relevant trade-off, and honors all constraints.",
      },
    },
    validationStrategy: {
      description: "Explain how to measure whether the pilot reduces edible food discarded.",
      anchors: {
        weak: "Promises to get feedback or measure downloads without specifying an outcome.",
        average: "Proposes a test and metric but leaves comparison, timing, or success unclear.",
        good: "Defines a measurable waste outcome, a baseline or comparison, and an observation window.",
        excellent: "Defines recruitment, baseline or comparison, measurement method, and a decision threshold while acknowledging a practical measurement limitation.",
      },
    },
  },
  hints: [
    "Think about the last decision before someone throws away edible food.",
    "Choose an outcome a small group can measure without making the pilot itself hard to sustain.",
  ],
};

const freelancerPayments: Challenge = {
  id: "freelancer-late-payments",
  title: "Help Freelancers Get Paid on Time",
  category: "Fintech",
  difficulty: "intermediate",
  estimatedMinutes: 30,
  scenario: "Create a product for US freelancers who spend time chasing overdue client invoices. In this case, interviewees say invoices sometimes reach the wrong person, get stuck in approval, or contain terms that the freelancer and client understood differently.",
  businessContext: "A freelance community can introduce 20 independent workers with upcoming client invoices. Its sponsor will support a pilot if the team can show a way to reduce late payments without straining client relationships.",
  targetUser: "US-based independent creative and digital professionals who invoice a small set of repeat business clients.",
  constraints: [
    "Assume two builders and an eight-week pilot.",
    "The product cannot hold funds, give legal advice, extend credit, or depend on accounting integrations.",
    "Clients must be able to participate without making an account.",
    "The freelancer needs control over the tone and timing of client-facing messages.",
  ],
  expectedDeliverables: [
    "A narrow payment bottleneck and the freelancer segment that encounters it.",
    "A proposal and three features spanning the minimum freelancer-to-client journey.",
    "A pilot that measures payment timing and checks whether the intervention harms client relationships.",
  ],
  learningObjectives: [
    "Diagnose where a workflow breaks across multiple actors.",
    "Design around adoption friction and relationship risk.",
    "Distinguish an activity metric from a business outcome.",
  ],
  rubric: {
    problemUnderstanding: {
      description: "Locate the delay in the invoice workflow and describe who can resolve it.",
      anchors: {
        weak: "Restates that payment is late without explaining a cause.",
        average: "Names a possible cause but leaves the responsible party or point in the workflow unclear.",
        good: "Connects a specific handoff or expectation mismatch to a late payment and identifies the relevant actors.",
        excellent: "Explains why the bottleneck repeats, distinguishes what the freelancer can influence, and identifies an assumption to validate.",
      },
    },
    targetAudience: {
      description: "Define a reachable freelancer segment and the client role involved in payment.",
      anchors: {
        weak: "Describes all professionals or only the paying company.",
        average: "Names a freelance discipline without its invoice and client context.",
        good: "Specifies contracting and invoicing context, rough invoice frequency, and a client-side role.",
        excellent: "Distinguishes a reachable early segment by workflow and payment pain, and explains which client participants must cooperate.",
      },
    },
    solutionQuality: {
      description: "Show how the concept addresses the payment bottleneck while protecting the client relationship.",
      anchors: {
        weak: "Promises faster payment without a mechanism, or focuses on collections unrelated to the case.",
        average: "Names a helpful tool but omits a key workflow handoff or relationship consequence.",
        good: "Connects the freelancer and client actions to a plausible change in payment behavior.",
        excellent: "Explains adoption for both parties, how the intervention prevents or resolves the bottleneck, and how it protects a meaningful relationship.",
      },
    },
    mvpFeasibility: {
      description: "Scope three features that work without moving money or requiring an accounting integration.",
      anchors: {
        weak: "Requires unavailable integrations, financial handling, or a broad suite.",
        average: "Names buildable parts but leaves a critical client action or freelancer control unspecified.",
        good: "Names three coherent features that enable a client action and freelancer control within the time limit.",
        excellent: "Defines three testable feature boundaries, removes a real dependency, and handles a common workflow failure within the constraints.",
      },
    },
    validationStrategy: {
      description: "Measure invoice payment timing and watch for unwanted relationship effects.",
      anchors: {
        weak: "Uses sign-ups, invoices sent, or interest alone as evidence of faster payment.",
        average: "Measures late payments but leaves the comparison or relationship check unclear.",
        good: "Defines payment timing, a comparison period or group, and one relationship measure.",
        excellent: "Explains comparable invoice selection, timing and relationship guardrails, a decision threshold, and a practical confounding factor.",
      },
    },
  },
};

const learningHabits: Challenge = {
  id: "adult-learning-habits",
  title: "Help Adults Build Consistent Learning Habits",
  category: "Education",
  difficulty: "advanced",
  estimatedMinutes: 40,
  scenario: "Design a product for working adults who start career-learning plans but rarely stick with them. In this case, learners return after a shift change or family obligation, see missed sessions piling up, and struggle to decide where to restart.",
  businessContext: "A nonprofit workforce program can recruit 40 adult learners already using online materials. The program has ten weeks to discover whether a lightweight tool can help learners practice repeatedly across schedule disruptions.",
  targetUser: "US working adults who are learning a career-related skill alongside variable work shifts or caregiving responsibilities.",
  constraints: [
    "Assume three builders and ten weeks, including the pilot.",
    "Do not build a new course catalog or require employer integration.",
    "Support learners who can spend as little as ten minutes at a time and who may regularly miss a planned session.",
    "Use only the schedule details necessary for the experience and avoid pressure to share personal or employment data.",
  ],
  expectedDeliverables: [
    "A hypothesis about where an existing routine breaks and who experiences that disruption most often.",
    "A product concept and three features that help learners start, return, and see progress.",
    "A trial measuring sustained practice that distinguishes early novelty from repeat use.",
  ],
  learningObjectives: [
    "Frame a behavior-change hypothesis around a specific moment.",
    "Prioritize recovery and flexibility under real-world time constraints.",
    "Design a study that measures repeated practice across multiple weeks.",
  ],
  rubric: {
    problemUnderstanding: {
      description: "Explain why career-learning practice drops off after an interruption.",
      anchors: {
        weak: "Blames low motivation or restates that adults are busy.",
        average: "Identifies a plausible obstacle but skips the specific moment the behavior breaks.",
        good: "Describes a recurring interruption and connects it to a barrier to returning.",
        excellent: "Separates the schedule trigger from the decision or emotional friction on return and states a testable hypothesis about which matters most.",
      },
    },
    targetAudience: {
      description: "Pick an accessible segment with a shared learning and schedule pattern.",
      anchors: {
        weak: "Treats all adults or all online students as one audience.",
        average: "Names a demographic group but leaves existing practice or schedule variation unclear.",
        good: "Specifies a shared work or care pattern, career-learning goal, and recruitment path.",
        excellent: "Explains why an identifiable early group faces the restart problem more often and how to recruit it using minimally necessary information.",
      },
    },
    solutionQuality: {
      description: "Show how the concept supports repeat practice and an easy return after a lapse.",
      anchors: {
        weak: "Adds generic reminders, points, or a course catalog without a relevant behavior mechanism.",
        average: "Addresses planning or motivation but leaves the experience after a missed session unclear.",
        good: "Shows a credible short practice flow and a return path after a real disruption.",
        excellent: "Connects the behavior hypothesis to a consistent experience before and after a lapse, with a plausible reason users would return without being pressured.",
      },
    },
    mvpFeasibility: {
      description: "Scope three features without a course catalog, employer dependency, or unnecessary data intake.",
      anchors: {
        weak: "Proposes a broad platform or a solution that requires unavailable integrations or sensitive data.",
        average: "Names plausible parts but overlooks short sessions, missed sessions, or scope.",
        good: "Defines three buildable features that work with current materials and minimal learner information.",
        excellent: "Defines a coherent, buildable path with three bounded features, explains a meaningful omission, and meets the time and privacy constraints.",
      },
    },
    validationStrategy: {
      description: "Measure sustained meaningful practice and recovery after missed sessions.",
      anchors: {
        weak: "Measures sign-up, clicks, or satisfaction alone.",
        average: "Tracks practicing but leaves the timescale, comparison, or meaningful session definition unclear.",
        good: "Defines sustained practice across several weeks with a baseline or comparison and a way to observe returns after a lapse.",
        excellent: "Specifies a practical multiweek design, measurable thresholds, a way to distinguish novelty from sustained practice, and a plan for missing data.",
      },
    },
  },
};

export const challenges: readonly Challenge[] = [foodWaste, freelancerPayments, learningHabits]
  .map((challenge) => challengeSchema.parse(challenge));

export function getChallenge(id: string): Challenge | undefined {
  return challenges.find((challenge) => challenge.id === id);
}
