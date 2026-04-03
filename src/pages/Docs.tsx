import Navbar from "@/components/Navbar";
import { useState } from "react";
import { Link } from "react-router-dom";

type DocTab = "overview" | "cli" | "faq";

const commandBlockClass =
  "mb-4 rounded-lg bg-secondary/50 px-5 py-4 font-mono text-sm leading-relaxed text-foreground break-all whitespace-pre-wrap";

const overviewContent = (
  <>
    <h1 className="text-3xl font-semibold text-foreground mb-4">Documentation</h1>
    <p className="text-muted-foreground mb-10">
      Learn how to discover, install, and use skills with your AI agents.
    </p>

    <p className="text-muted-foreground mb-10">
      The <code className="text-sm bg-secondary px-1.5 py-0.5 rounded font-mono">skills</code> CLI that powers this leaderboard is open source at{" "}
      <a href="https://github.com/vercel-labs/skills" className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
        github.com/vercel-labs/skills
      </a>.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">What are skills?</h2>
    <p className="text-muted-foreground mb-10">
      Skills are reusable capabilities for AI agents. They provide procedural knowledge that helps agents accomplish specific tasks more effectively. Think of them as plugins or extensions that enhance what your AI agent can do.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Getting started</h2>
    <p className="text-muted-foreground mb-4">
      To install a skill, use the <code className="text-sm bg-secondary px-1.5 py-0.5 rounded font-mono">skills</code> CLI:
    </p>
    <div className={commandBlockClass}>
      npx skills add vercel-labs/agent-skills
    </div>
    <p className="text-muted-foreground mb-10">
      This will install the skill and make it available to your AI agent.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">How skills are ranked</h2>
    <p className="text-muted-foreground mb-4">
      The skills leaderboard ranks skills based on anonymous telemetry data collected from the <code className="text-sm bg-secondary px-1.5 py-0.5 rounded font-mono">skills</code> CLI. When users install skills, aggregated usage data helps surface the most popular and useful skills in the ecosystem.
    </p>
    <p className="text-muted-foreground mb-10">
      This telemetry is completely anonymous and only tracks which skills are being installed—no personal information or usage patterns are collected.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Browse skills</h2>
    <p className="text-muted-foreground mb-10">
      Visit the <Link to="/" className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">homepage</Link> to browse the skills leaderboard and discover new capabilities for your agents.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">How are you securing skills?</h2>
    <p className="text-muted-foreground mb-4">
      There are routine security audits that assess skills and their contents for malicious content. To report security issues, please visit{" "}
      <a href="https://security.vercel.com/" className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
        security.vercel.com
      </a>.
    </p>
    <p className="text-muted-foreground">
      We do our best to maintain a safe ecosystem, but we cannot guarantee the quality or security of every skill listed on skills.sh. We encourage you to review skills before installing and use your own judgment.
    </p>
  </>
);

const cliContent = (
  <>
    <h1 className="text-3xl font-semibold text-foreground mb-4">CLI Reference</h1>
    <p className="text-muted-foreground mb-10">
      The <code className="text-sm bg-secondary px-1.5 py-0.5 rounded font-mono">skills</code> CLI is the primary way to install and manage skills for your AI agents.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Installation</h2>
    <p className="text-muted-foreground mb-4">
      The CLI can be run directly with npx—no installation required:
    </p>
    <div className={`${commandBlockClass} mb-10`}>
      npx skills add &lt;skill-name&gt;
    </div>

    <h2 className="text-xl font-semibold text-foreground mb-4">Basic usage</h2>
    <p className="text-muted-foreground mb-4">
      Install a skill by specifying the owner and skill name:
    </p>
    <div className={commandBlockClass}>
      npx skills add vercel-labs/agent-skills
    </div>
    <p className="text-muted-foreground mb-10">
      This downloads the skill and configures it for use with your AI agent.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Examples</h2>
    <p className="text-muted-foreground mb-4">
      Install the agent skills collection:
    </p>
    <div className={`${commandBlockClass} mb-10`}>
      npx skills add vercel-labs/agent-skills
    </div>

    <h2 className="text-xl font-semibold text-foreground mb-4">Telemetry</h2>
    <p className="text-muted-foreground mb-4">
      By default, the CLI collects anonymous telemetry data to help rank skills on the leaderboard. This data includes the skill name, skill files, and a timestamp—no personal or device information is collected.
    </p>
    <p className="text-muted-foreground">
      To opt out, set the <code className="text-sm bg-secondary px-1.5 py-0.5 rounded font-mono">DISABLE_TELEMETRY=1</code> environment variable.
    </p>
  </>
);

const faqContent = (
  <>
    <h1 className="text-3xl font-semibold text-foreground mb-4">Frequently Asked Questions</h1>
    <p className="text-muted-foreground mb-10">
      Common questions about the skills ecosystem.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">What are skills?</h2>
    <p className="text-muted-foreground mb-10">
      Skills are reusable capabilities for AI agents. They provide procedural knowledge that helps agents accomplish specific tasks more effectively. Skills can include code generation patterns, domain expertise, tool integrations, and more.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">How do I install a skill?</h2>
    <p className="text-muted-foreground mb-10">
      Use the skills CLI: npx skills add &lt;owner&gt;/&lt;skill-name&gt;. For example, npx skills add vercel-labs/agent-skills installs the agent skills collection.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Which AI agents support skills?</h2>
    <p className="text-muted-foreground mb-10">
      Skills work with popular AI coding agents including Claude Code, Cursor, Windsurf, and others. Check each skill's documentation for specific compatibility information.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">How is the leaderboard ranked?</h2>
    <p className="text-muted-foreground mb-10">
      The skills leaderboard is powered by anonymous telemetry data from the skills CLI. When users install skills, aggregated installation counts help surface the most popular skills. No personal or device information is collected—only aggregate skill installation metrics.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">How do I get my skill listed on the leaderboard?</h2>
    <p className="text-muted-foreground mb-10">
      Skills appear on the leaderboard automatically through anonymous telemetry when users run npx skills add &lt;owner/repo&gt;. Once your skill is installed by users, it will be tracked and appear in the rankings based on its installation count.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Is any personal data collected?</h2>
    <p className="text-muted-foreground mb-10">
      No. The telemetry is completely anonymous and only tracks aggregate skill installation counts. No personal information, usage patterns, or identifying data is collected or stored.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">How do I create my own skill?</h2>
    <p className="text-muted-foreground mb-10">
      Skills are hosted in GitHub repositories. Create a repository with a skill definition file and a README explaining how to use the skill. See existing popular skills for examples of the structure and format.
    </p>

    <h2 className="text-xl font-semibold text-foreground mb-4">Can I use skills with any AI agent?</h2>
    <p className="text-muted-foreground">
      Skills are designed to work with AI coding agents that support the skills protocol. Currently, popular agents like Claude Code, Cursor, and Windsurf have built-in support. Check your agent's documentation for skills compatibility.
    </p>
  </>
);

const tabs: { id: DocTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "cli", label: "CLI" },
  { id: "faq", label: "FAQ" },
];

const Docs = () => {
  const [activeTab, setActiveTab] = useState<DocTab>("overview");

  const content = activeTab === "overview" ? overviewContent : activeTab === "cli" ? cliContent : faqContent;

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
