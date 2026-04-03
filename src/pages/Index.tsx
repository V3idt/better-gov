import Navbar from "@/components/Navbar";
import SkillsLogo from "@/components/SkillsLogo";
import CommandInput from "@/components/CommandInput";
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
            <CommandInput />
          </div>

          {/* Right: Description */}
          <div className="pt-2">
            <p className="text-xl md:text-2xl leading-relaxed text-muted-foreground font-light">
              better-gov is a way to provide true democracy and allow people to gain control over descions that affect them everyday.
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
