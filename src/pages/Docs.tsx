import Navbar from "@/components/Navbar";
import { useState } from "react";
import { Link } from "react-router-dom";

type DocTab = "overview" | "process" | "faq";

const commandBlockClass =
  "mb-4 rounded-lg bg-secondary/50 px-5 py-4 font-mono text-sm leading-relaxed text-foreground break-all whitespace-pre-wrap";

const overviewContent = (
  <>
    <h1 className="text-3xl font-semibold text-foreground mb-4">How Better Gov Works</h1>
    <p className="text-muted-foreground mb-10">
      Better Gov is a direct-governance platform where public decisions become ballot items that people can read, review, and vote on.
    </p>

    <p className="text-muted-foreground mb-10">
      Recommended umbrella term: <code className="text-sm bg-secondary px-1.5 py-0.5 rounded font-mono">ballot item</code>. It is broad enough to cover laws, budgets, permits, appointments, infrastructure plans, service changes, and rights-impacting rules.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">What is a ballot item?</h2>
    <p className="text-muted-foreground mb-10">
      A ballot item is any public decision that should be visible, understandable, and directly voteable by the people affected by it.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">What should be included?</h2>
    <p className="text-muted-foreground mb-4">
      Start broad and avoid artificial narrowing. Better Gov should include:
    </p>
    <div className={commandBlockClass}>
      budgets / taxes / procurement / housing / zoning / transit / schools /
      health / utilities / labor / energy / environment / policing / courts /
      privacy / digital rights / welfare / major appointments / local projects
    </div>
    <p className="text-muted-foreground mb-10">
      The default stance should be inclusion. If a decision changes people's lives, money, rights, access, land, or services, it belongs on the ballot.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">How people use the platform</h2>
    <p className="text-muted-foreground mb-4">
      People browse open ballot items, read the tl;dr, inspect the full brief, check review flags, and vote directly on the detail page.
    </p>
    <p className="text-muted-foreground mb-10">
      Each item should make the stakes, tradeoffs, implementation risk, and closing date immediately obvious.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Browse the ballot</h2>
    <p className="text-muted-foreground mb-10">
      Visit the <Link to="/" className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">homepage</Link> to browse current ballot items and open the ones you care about.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Why review matters</h2>
    <p className="text-muted-foreground mb-4">
      Direct voting still needs strong review. Rights impact, fiscal realism, and delivery risk should be visible beside every item so the public can vote with context.
    </p>
    <p className="text-muted-foreground">
      Review should inform the vote, not replace it.
    </p>
  </>
);

const processContent = (
  <>
    <h1 className="text-3xl font-semibold text-foreground mb-4">Posting Process</h1>
    <p className="text-muted-foreground mb-10">
      Every ballot item should follow a consistent pipeline before and during voting.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Minimum structure</h2>
    <p className="text-muted-foreground mb-4">
      Each ballot item should include a short brief, a full brief, visible review checks, and a clear closing date:
    </p>
    <div className={`${commandBlockClass} mb-10`}>
      title / category / jurisdiction / tl;dr / full brief / review checks /
      vote options / closing date / public history
    </div>

    <h2 className="text-xl font-semibold text-foreground mb-4">Recommended flow</h2>
    <p className="text-muted-foreground mb-4">
      A pragmatic first version can work like this:
    </p>
    <div className={commandBlockClass}>
      draft item / publish tl;dr / attach full brief / run review checks /
      open voting / close vote / publish outcome and implementation status
    </div>
    <p className="text-muted-foreground mb-10">
      That keeps the experience legible while still supporting serious public decisions.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">What to optimize for</h2>
    <p className="text-muted-foreground mb-4">
      The system should optimize for clarity, breadth, and low information loss between public intent and public action.
    </p>
    <p className="text-muted-foreground">
      The point is not just to count votes. The point is to preserve the actual will of the people all the way through decision-making.
    </p>
  </>
);

const faqContent = (
  <>
    <h1 className="text-3xl font-semibold text-foreground mb-4">Frequently Asked Questions</h1>
    <p className="text-muted-foreground mb-10">
      Common questions about the Better Gov model.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">What should these items be called?</h2>
    <p className="text-muted-foreground mb-10">
      Recommended default: ballot items. Good alternatives are public decisions or civic measures, but ballot item is the clearest umbrella term for now.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">What belongs on the ballot?</h2>
    <p className="text-muted-foreground mb-10">
      Anything that materially changes rights, money, land use, service levels, infrastructure, enforcement, access, or long-term public obligations should be eligible.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Why not leave this to representatives?</h2>
    <p className="text-muted-foreground mb-10">
      The premise of Better Gov is that representative layers can distort, delay, or dilute public intent. The platform tries to reduce that loss.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Do review checks replace voting?</h2>
    <p className="text-muted-foreground mb-10">
      No. Review is context for the public, not a veto layer over the public.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Should the platform start narrow?</h2>
    <p className="text-muted-foreground mb-10">
      No. Start wide in theory, then phase rollout in practice. Narrow scope too early and you reproduce the same gatekeeping problem in a different interface.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">How should the detail page feel?</h2>
    <p className="text-muted-foreground mb-10">
      Immediate. One screen should tell the user what the item does, what the tradeoffs are, what reviewers flagged, and let them vote without friction.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">What comes after the vote?</h2>
    <p className="text-muted-foreground mb-10">
      The outcome should flow into implementation tracking so people can see whether the decision they voted for is actually being carried out.
    </p>
  </>
);

const tabs: { id: DocTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "process", label: "Process" },
  { id: "faq", label: "FAQ" },
];

const Docs = () => {
  const [activeTab, setActiveTab] = useState<DocTab>("overview");

  const content = activeTab === "overview" ? overviewContent : activeTab === "process" ? processContent : faqContent;

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[180px_minmax(0,1fr)] md:gap-12">
          {/* Sidebar */}
          <nav className="flex flex-col gap-1 pt-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-left text-sm px-3 py-2 rounded transition-colors ${
                  activeTab === tab.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="min-w-0 max-w-2xl break-words">{content}</div>
        </div>
      </div>
    </div>
  );
};

export default Docs;
