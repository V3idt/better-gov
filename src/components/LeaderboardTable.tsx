import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

type Skill = {
  rank: number;
  name: string;
  repo: string;
  installs: string;
};

const skills: Skill[] = [
  { rank: 1, name: "find-skills", repo: "vercel-labs/skills", installs: "787.5K" },
  { rank: 2, name: "vercel-react-best-practices", repo: "vercel-labs/agent-skills", installs: "263.7K" },
  { rank: 3, name: "frontend-design", repo: "anthropics/skills", installs: "222.2K" },
  { rank: 4, name: "web-design-guidelines", repo: "vercel-labs/agent-skills", installs: "212.9K" },
  { rank: 5, name: "remotion-best-practices", repo: "remotion-dev/skills", installs: "189.8K" },
  { rank: 6, name: "azure-ai", repo: "microsoft/github-copilot-for-azure", installs: "146.9K" },
  { rank: 7, name: "agent-browser", repo: "vercel-labs/agent-browser", installs: "142.8K" },
  { rank: 8, name: "microsoft-foundry", repo: "microsoft/github-copilot-for-azure", installs: "141.6K" },
  { rank: 9, name: "azure-messaging", repo: "microsoft/github-copilot-for-azure", installs: "133.3K" },
  { rank: 10, name: "skill-creator", repo: "anthropics/skills", installs: "117.8K" },
  { rank: 11, name: "microsoft-foundry", repo: "microsoft/azure-skills", installs: "116.3K" },
  { rank: 12, name: "azure-observability", repo: "microsoft/github-copilot-for-azure", installs: "115.5K" },
  { rank: 13, name: "ai-image-generation", repo: "inferen-sh/skills", installs: "114.8K" },
  { rank: 14, name: "azure-hosted-copilot-sdk", repo: "microsoft/github-copilot-for-azure", installs: "112.5K" },
  { rank: 15, name: "ai-video-generation", repo: "inferen-sh/skills", installs: "111.9K" },
];

type Tab = "all" | "trending" | "hot";

const LeaderboardTable = () => {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.repo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full">
      <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-foreground mb-6">
        Skills Leaderboard
      </h2>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search skills ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-b border-border pl-10 pr-10 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-muted-foreground transition-colors font-mono"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
          /
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 text-sm">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-1 transition-colors font-mono ${
            activeTab === "all"
              ? "text-foreground border-b border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Time (91,478)
        </button>
        <button
          onClick={() => setActiveTab("trending")}
          className={`pb-1 transition-colors font-mono ${
            activeTab === "trending"
              ? "text-foreground border-b border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Trending (24h)
        </button>
        <button
          onClick={() => setActiveTab("hot")}
          className={`pb-1 transition-colors font-mono ${
            activeTab === "hot"
              ? "text-foreground border-b border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Hot
        </button>
      </div>

      {/* Table Header */}
      <div className="mb-2 grid grid-cols-[32px_minmax(0,1fr)_72px] px-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-[40px_minmax(0,1fr)_80px]">
        <span>#</span>
        <span>Skill</span>
        <span className="text-right">Installs</span>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border">
        {filtered.map((skill) => (
          <Link
            key={`${skill.rank}-${skill.repo}-${skill.name}`}
            to={`/${skill.repo}/${skill.name}`}
            className="grid grid-cols-[32px_minmax(0,1fr)_72px] items-start px-2 py-3.5 transition-colors hover:bg-secondary/50 group sm:grid-cols-[40px_minmax(0,1fr)_80px]"
          >
            <span className="text-sm text-muted-foreground">{skill.rank}</span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                <span className="break-words text-sm font-semibold text-foreground">{skill.name}</span>
                <span className="min-w-0 break-all text-xs font-mono text-muted-foreground">{skill.repo}</span>
              </div>
            </div>
            <span className="text-right font-mono text-xs text-muted-foreground sm:text-sm">{skill.installs}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardTable;
