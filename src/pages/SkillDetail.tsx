import Navbar from "@/components/Navbar";
import { Link, useParams } from "react-router-dom";
import { Copy, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ballotItems, findBallotItemByPath } from "@/lib/ballotItems";
import type { VoteChoice } from "@/lib/ballotItems";

const statusColor = (s: string) => {
  if (s === "PASS") return "text-green-500 bg-green-500/10";
  if (s === "WARN") return "text-amber-500 bg-amber-500/10";
  return "text-red-500 bg-red-500/10";
};

const voteToneClass = (choice: VoteChoice, isActive: boolean) => {
  if (choice === "approve") {
    return isActive
      ? "border-emerald-500/45 bg-emerald-500/14 text-emerald-100"
      : "border-emerald-500/20 bg-emerald-500/6 text-emerald-200/85 hover:border-emerald-400/35 hover:bg-emerald-500/10";
  }

  if (choice === "reject") {
    return isActive
      ? "border-rose-500/45 bg-rose-500/14 text-rose-100"
      : "border-rose-500/20 bg-rose-500/6 text-rose-200/85 hover:border-rose-400/35 hover:bg-rose-500/10";
  }

  return isActive
    ? "border-zinc-400/45 bg-zinc-400/12 text-zinc-100"
    : "border-zinc-400/20 bg-zinc-400/6 text-zinc-300/85 hover:border-zinc-300/35 hover:bg-zinc-400/10";
};

const savedVoteToneClass = (choice: VoteChoice) => {
  if (choice === "approve") return "text-emerald-200/85";
  if (choice === "reject") return "text-rose-200/85";
  return "text-zinc-300/85";
};

const SkillDetail = () => {
  const { "*": path } = useParams();
  const item = useMemo(() => {
    if (!path) return ballotItems[0];
    return findBallotItemByPath(path) ?? ballotItems[0];
  }, [path]);

  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<VoteChoice | null | undefined>(undefined);
  const voteStorageKey = `better-gov:vote:${item.jurisdictionSlug}:${item.slug}`;
  const sharePath = `/${item.jurisdictionSlug}/${item.slug}`;

  useEffect(() => {
    const storedVote = window.localStorage.getItem(voteStorageKey) as VoteChoice | null;
    setVote(storedVote);
  }, [voteStorageKey]);

  useEffect(() => {
    if (vote === undefined) {
      return;
    }

    if (!vote) {
      window.localStorage.removeItem(voteStorageKey);
      return;
    }

    window.localStorage.setItem(voteStorageKey, vote);
  }, [vote, voteStorageKey]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">
        {/* Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">ballot</Link>
          <span>/</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">{item.jurisdictionSlug}</span>
          <span>/</span>
          <span className="text-foreground">{item.slug}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
          {/* Main content */}
          <div>
            <h1 className="mb-4 break-words text-3xl font-semibold text-foreground">{item.title}</h1>

            {/* Share path */}
            <div className="mb-6 flex items-start gap-3 rounded-lg bg-secondary/50 px-4 py-3">
              <span className="pt-0.5 text-muted-foreground">$</span>
              <span className="min-w-0 flex-1 break-all whitespace-pre-wrap text-sm leading-relaxed text-foreground">{sharePath}</span>
              <button onClick={handleCopy} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6 rounded-lg border border-border p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Vote on this item</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your position. Your selection is saved on this device.
                  </p>
                </div>
                {copied ? (
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Link copied</span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(["approve", "reject", "abstain"] as VoteChoice[]).map((choice) => {
                  const isActive = vote === choice;

                  return (
                    <button
                      key={choice}
                      onClick={() => setVote(choice)}
                      className={`rounded border px-4 py-3 text-left text-sm uppercase tracking-[0.14em] transition-colors ${voteToneClass(
                        choice,
                        isActive,
                      )}`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
              {vote ? (
                <p className={`mt-4 text-xs uppercase tracking-[0.16em] ${savedVoteToneClass(vote)}`}>
                  Saved vote: {vote}
                </p>
              ) : null}
            </div>

            {/* tl;dr card */}
            <div className="border border-border rounded-lg p-5 mb-6">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">tl;dr</h3>
              <p className="text-sm font-semibold text-foreground mb-3">{item.tldr}</p>
              <ul className="space-y-2">
                {item.bullets.map((b, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Full brief */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 border-b border-border pb-3">
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span className="font-mono">FULL BRIEF</span>
            </div>

            <div className="prose prose-invert prose-sm max-w-none">
              {item.brief.split("\n").map((line, i) => {
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
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Current Support</h3>
              <span className="text-3xl font-semibold text-foreground font-mono">{item.support}</span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Category</h3>
              <span className="break-all text-sm font-mono text-foreground">{item.category}</span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Scope</h3>
              <span className="text-sm text-foreground">{item.scope}</span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Closes On</h3>
              <span className="text-sm font-mono text-foreground">{item.closesOn}</span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Review Checks</h3>
              <div className="space-y-2">
                {item.reviewChecks.map((a) => (
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
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Current Split</h3>
              <div className="space-y-2">
                {item.voteBreakdown.map((result) => (
                  <div key={result.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{result.label}</span>
                    <span className="text-foreground font-mono">{result.share.toFixed(1)}% / {result.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Turnout</h3>
              <span className="text-sm font-mono text-foreground">{item.turnout}</span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Posted By</h3>
              <span className="text-sm text-foreground">{item.sponsor}</span>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Status</h3>
              <span className="text-sm font-mono text-foreground">{item.status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillDetail;
