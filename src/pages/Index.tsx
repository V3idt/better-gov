import Navbar from "@/components/Navbar";
import SkillsLogo from "@/components/SkillsLogo";
import CommandInput from "@/components/CommandInput";
import AgentIcons from "@/components/AgentIcons";
import LeaderboardTable from "@/components/LeaderboardTable";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-16">
          {/* Left: Logo + Command */}
          <div>
            <SkillsLogo />
            <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mt-4 mb-10">
              Direct Governance For Everyday Public Decisions
            </p>

            <h3 className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3">
              Naming
            </h3>
            <CommandInput />
          </div>

          {/* Right: Description */}
          <div className="pt-2">
            <p className="text-xl md:text-2xl leading-relaxed text-muted-foreground font-light">
              Better Gov turns policy, spending, infrastructure, and public-service changes into ballot items that people can directly vote on instead of losing intent inside layers of representation.
            </p>
          </div>
        </div>

        {/* Agent Icons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-20">
          <div />
          <div>
            <h3 className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">
              What should be voteable
            </h3>
            <AgentIcons />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Start wide: budgets, taxes, housing, transit, schools, health, energy, utilities, labor, privacy, safety, procurement, zoning, and major appointments.
            </p>
          </div>
        </div>

        {/* Ballot list */}
        <LeaderboardTable />
      </div>
    </div>
  );
};

export default Index;
