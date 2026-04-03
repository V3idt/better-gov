import Navbar from "@/components/Navbar";
import { Link, useParams } from "react-router-dom";
import { Copy, ExternalLink, FileText, Star } from "lucide-react";
import { useState } from "react";

type SkillData = {
  name: string;
  repo: string;
  owner: string;
  repoName: string;
  summary: string;
  bullets: string[];
  weeklyInstalls: string;
  stars: string;
  firstSeen: string;
  audits: { name: string; status: "PASS" | "WARN" | "FAIL" }[];
  installedOn: { agent: string; count: string }[];
  skillMd: string;
};

const skillsData: Record<string, SkillData> = {
  "find-skills": {
    name: "find-skills",
    repo: "vercel-labs/skills",
    owner: "vercel-labs",
    repoName: "skills",
    summary: "Discover and install specialized agent skills from the open ecosystem when users need extended capabilities.",
    bullets: [
      'Helps identify relevant skills by domain and task when users ask "how do I do X" or "find a skill for X"',
      "Integrates with the Skills CLI (npx skills find, npx skills add) to search, verify, and install packages from the skills.sh directory",
      "Recommends skills based on install count, source reputation, and GitHub stars to ensure quality before suggesting installation",
      "Presents skill options with install commands and links to skills.sh for user review and one-click installation",
    ],
    weeklyInstalls: "847.5K",
    stars: "12.8K",
    firstSeen: "Jan 26, 2026",
    audits: [
      { name: "Gen Agent Trust Hub", status: "PASS" },
      { name: "Socket", status: "PASS" },
      { name: "Snyk", status: "WARN" },
    ],
    installedOn: [
      { agent: "opencode", count: "791.0K" },
      { agent: "codex", count: "787.5K" },
      { agent: "claude code", count: "698.2K" },
      { agent: "cursor", count: "542.1K" },
      { agent: "windsurf", count: "423.8K" },
    ],
    skillMd: `# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

## When to Use This Skill

Use this skill when the user:

- Asks "how do I do X" where X might be a common task with an existing skill
- Says "find a skill for X" or "is there a skill for X"
- Asks "can you do X" where X is a specialized capability
- Expresses interest in extending agent capabilities
- Wants to search for tools, templates, or workflows
- Mentions they wish they had help with a specific domain (design, testing, deployment, etc.)

## What is the Skills CLI?

The Skills CLI (\`npx skills\`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

**Key commands:**

- \`npx skills find [query]\` - Search for skills interactively or by keyword
- \`npx skills add <owner/repo>\` - Install a specific skill
- \`npx skills list\` - List installed skills`,
  },
};

const defaultSkill: SkillData = {
  name: "example-skill",
  repo: "owner/repo",
  owner: "owner",
  repoName: "repo",
  summary: "An example skill for AI agents.",
  bullets: ["Provides reusable capabilities", "Easy to install with the Skills CLI"],
  weeklyInstalls: "100.0K",
  stars: "1.2K",
  firstSeen: "Mar 15, 2026",
  audits: [
    { name: "Gen Agent Trust Hub", status: "PASS" },
    { name: "Socket", status: "PASS" },
    { name: "Snyk", status: "PASS" },
  ],
  installedOn: [
    { agent: "claude code", count: "80.0K" },
    { agent: "cursor", count: "45.2K" },
  ],
  skillMd: "# Example Skill\n\nThis is an example skill.",
};

const statusColor = (s: string) => {
  if (s === "PASS") return "text-green-500 bg-green-500/10";
  if (s === "WARN") return "text-amber-500 bg-amber-500/10";
  return "text-red-500 bg-red-500/10";
};

const SkillDetail = () => {
  const { "*": path } = useParams();
  const parts = (path || "").split("/");
  const skillName = parts[parts.length - 1] || "";
  const skill = skillsData[skillName] || {
    ...defaultSkill,
    name: skillName || "unknown",
    repo: parts.length >= 2 ? `${parts[0]}/${parts[1]}` : "unknown/repo",
    owner: parts[0] || "unknown",
    repoName: parts[1] || "repo",
  };

  const [copied, setCopied] = useState(false);
  const installCmd = `npx skills add https://github.com/${skill.repo} --skill ${skill.name}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">
        {/* Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">skills</Link>
          <span>/</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">{skill.owner}</span>
          <span>/</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">{skill.repoName}</span>
          <span>/</span>
          <span className="text-foreground">{skill.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
          {/* Main content */}
          <div>
            <h1 className="mb-4 break-words text-3xl font-semibold text-foreground">{skill.name}</h1>

            {/* Install command */}
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-secondary/50 px-4 py-3">
              <span className="pt-0.5 text-muted-foreground">$</span>
              <span className="min-w-0 flex-1 break-all whitespace-pre-wrap text-sm leading-relaxed text-foreground">{installCmd}</span>
              <button onClick={handleCopy} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {/* Summary card */}
            <div className="border border-border rounded-lg p-5 mb-6">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Summary</h3>
              <p className="text-sm font-semibold text-foreground mb-3">{skill.summary}</p>
              <ul className="space-y-2">
                {skill.bullets.map((b, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* SKILL.md */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 border-b border-border pb-3">
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span className="font-mono">SKILL.md</span>
            </div>

            <div className="prose prose-invert prose-sm max-w-none">
              {skill.skillMd.split("\n").map((line, i) => {
                if (line.startsWith("# ")) return <h1 key={i} className="mt-8 mb-4 break-words text-2xl font-semibold text-foreground">{line.slice(2)}</h1>;
                if (line.startsWith("## ")) return <h2 key={i} className="mt-8 mb-3 break-words text-lg font-semibold text-foreground">{line.slice(3)}</h2>;
                if (line.startsWith("- ")) return <li key={i} className="mb-1 ml-4 break-words text-sm text-muted-foreground">{line.slice(2)}</li>;
                if (line.startsWith("**")) return <p key={i} className="text-sm font-semibold text-foreground mb-2">{line.replace(/\*\*/g, "")}</p>;
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return <p key={i} className="mb-2 break-words text-sm text-muted-foreground">{line}</p>;
              })}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Weekly Installs</h3>
              <span className="text-3xl font-semibold text-foreground font-mono">{skill.weeklyInstalls}</span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                Repository <ExternalLink className="w-3 h-3" />
              </h3>
              <span className="break-all text-sm font-mono text-foreground">{skill.repo}</span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">GitHub Stars</h3>
              <span className="text-sm text-foreground flex items-center gap-1">
                <Star className="w-3.5 h-3.5" /> {skill.stars}
              </span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">First Seen</h3>
              <span className="text-sm font-mono text-foreground">{skill.firstSeen}</span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Security Audits</h3>
              <div className="space-y-2">
                {skill.audits.map((a) => (
                  <div key={a.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${statusColor(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Installed On</h3>
              <div className="space-y-2">
                {skill.installedOn.map((a) => (
                  <div key={a.agent} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{a.agent}</span>
                    <span className="text-foreground font-mono">{a.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillDetail;
