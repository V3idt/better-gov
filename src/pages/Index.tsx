import Navbar from "@/components/Navbar";
import SkillsLogo from "@/components/SkillsLogo";
import CommandInput from "@/components/CommandInput";
import LeaderboardTable from "@/components/LeaderboardTable";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />

      {/* Hero Section */}
      <div className="mx-auto max-w-6xl px-6 pb-16 pt-12">
        <div className="mb-16 grid grid-cols-1 items-start gap-10 md:grid-cols-[1.2fr_0.8fr]">
          {/* Left: Logo + Command */}
          <div>
            <SkillsLogo />
            <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground mt-4 mb-10">
              Direct Governance For Everyday Public Decisions
            </p>
            <CommandInput />
          </div>

          {/* Right: Description */}
          <div className="pt-2">
            <p className="text-xl md:text-2xl leading-relaxed text-muted-foreground font-light">
              Tuition goes up. Library hours shrink. Shuttle routes change. Most people find out after the decision is already made.
            </p>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              better-gov turns those closed-door choices into clear public propositions so the people affected can read them, question them, and vote before the outcome is locked in.
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
