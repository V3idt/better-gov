import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";

type AuditEntry = {
  rank: number;
  name: string;
  repo: string;
  gen: "Safe";
  socket: "0 alerts";
  snyk: "Low Risk" | "Med Risk" | "Critical";
};

const audits: AuditEntry[] = [
  { rank: 1, name: "find-skills", repo: "vercel-labs/skills", gen: "Safe", socket: "0 alerts", snyk: "Med Risk" },
  { rank: 2, name: "vercel-react-best-practices", repo: "vercel-labs/agent-skills", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 3, name: "frontend-design", repo: "anthropics/skills", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 4, name: "web-design-guidelines", repo: "vercel-labs/agent-skills", gen: "Safe", socket: "0 alerts", snyk: "Med Risk" },
  { rank: 5, name: "remotion-best-practices", repo: "remotion-dev/skills", gen: "Safe", socket: "0 alerts", snyk: "Med Risk" },
  { rank: 6, name: "azure-ai", repo: "microsoft/github-copilot-for-azure", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 7, name: "azure-deploy", repo: "microsoft/github-copilot-for-azure", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 8, name: "azure-cost-optimization", repo: "microsoft/github-copilot-for-azure", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 9, name: "azure-storage", repo: "microsoft/github-copilot-for-azure", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 10, name: "azure-diagnostics", repo: "microsoft/github-copilot-for-azure", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 11, name: "entra-app-registration", repo: "microsoft/github-copilot-for-azure", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 12, name: "appinsights-instrumentation", repo: "microsoft/github-copilot-for-azure", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 13, name: "azure-compliance", repo: "microsoft/github-copilot-for-azure", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
  { rank: 14, name: "azure-prepare", repo: "microsoft/github-copilot-for-azure", gen: "Safe", socket: "0 alerts", snyk: "Critical" },
  { rank: 15, name: "skill-creator", repo: "anthropics/skills", gen: "Safe", socket: "0 alerts", snyk: "Low Risk" },
];

const snykColor = (risk: string) => {
  if (risk === "Low Risk") return "text-green-500";
  if (risk === "Med Risk") return "text-amber-500";
  if (risk === "Critical") return "text-red-500";
  return "text-muted-foreground";
};

const Audits = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">
        <h1 className="text-3xl font-semibold text-foreground mb-4">Security Audits</h1>
        <p className="text-muted-foreground mb-10">
          Combined security audit results from Gen Agent Trust Hub, Socket, and Snyk.
        </p>

        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_120px_120px_120px] text-xs text-muted-foreground uppercase tracking-wider mb-2 px-2">
          <span>#</span>
          <span>Skill</span>
          <span>Gen</span>
          <span>Socket</span>
          <span>Snyk</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {audits.map((a) => (
            <Link
              key={`${a.rank}-${a.name}`}
              to={`/${a.repo}/${a.name}`}
              className="grid grid-cols-[40px_1fr_120px_120px_120px] items-center py-3.5 px-2 hover:bg-secondary/50 transition-colors cursor-pointer group"
            >
              <span className="text-sm text-muted-foreground">{a.rank}</span>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-foreground">{a.name}</span>
                <span className="text-xs text-muted-foreground truncate">{a.repo}</span>
              </div>
              <span className="text-xs font-mono text-green-500">
                <span className="opacity-50 mr-1">▐▌▌</span>SAFE
              </span>
              <span className="text-xs font-mono text-green-500">
                <span className="opacity-50 mr-1">▐▌▌</span>0 ALERTS
              </span>
              <span className={`text-xs font-mono ${snykColor(a.snyk)}`}>
                <span className="opacity-50 mr-1">▐▌▌</span>{a.snyk.toUpperCase()}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Audits;
