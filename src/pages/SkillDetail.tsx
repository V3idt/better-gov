import Navbar from "@/components/Navbar";
import { Link, useParams } from "react-router-dom";
import { Copy, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AccountDialog from "@/components/AccountDialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ballotItems, findBallotItemByPath } from "@/lib/ballotItems";
import type { VoteChoice } from "@/lib/ballotItems";
import { policyIdForItem, VotingApiError } from "@/lib/voting";
import {
  getSession,
  getVoteStatus,
  sessionQueryKey,
  submitVote,
} from "@/lib/voting-api";

const statusColor = (s: string) => {
  if (s === "PASS") return "text-green-500 bg-green-500/10";
  if (s === "WARN") return "text-amber-500 bg-amber-500/10";
  return "text-red-500 bg-red-500/10";
};

const voteToneClass = (choice: VoteChoice, isActive: boolean) => {
  if (choice === "approve") {
    return isActive
      ? "border-transparent bg-green-500/10 text-green-500"
      : "border-border bg-secondary/50 text-foreground hover:border-muted-foreground";
  }

  if (choice === "reject") {
    return isActive
      ? "border-transparent bg-red-500/10 text-red-500"
      : "border-border bg-secondary/50 text-foreground hover:border-muted-foreground";
  }

  return isActive
    ? "border-transparent bg-amber-500/10 text-amber-500"
    : "border-border bg-secondary/50 text-foreground hover:border-muted-foreground";
};

const savedVoteToneClass = (choice: VoteChoice) => {
  if (choice === "approve") return "text-green-500";
  if (choice === "reject") return "text-red-500";
  return "text-amber-500";
};

const reviewLabel = (name: string) => {
  if (name === "Rights") return "Rights impact";
  if (name === "Budget") return "Budget pressure";
  if (name === "Delivery") return "Delivery risk";
  return name;
};

const splitPillClass = (label: string) => {
  if (label === "Approve") return "text-green-500 bg-green-500/10";
  if (label === "Reject") return "text-red-500 bg-red-500/10";
  return "text-amber-500 bg-amber-500/10";
};

const SkillDetail = () => {
  const queryClient = useQueryClient();
  const { "*": path } = useParams();
  const item = useMemo(() => {
    if (!path) return ballotItems[0];
    return findBallotItemByPath(path) ?? ballotItems[0];
  }, [path]);
  const policyId = useMemo(() => policyIdForItem(item), [item]);

  const [copied, setCopied] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<VoteChoice | null>(null);
  const sharePath = `/${item.jurisdictionSlug}/${item.slug}`;

  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  const voteQuery = useQuery({
    queryKey: ["vote-status", policyId],
    queryFn: () => getVoteStatus(policyId),
    enabled: sessionQuery.data?.authenticated === true,
  });

  const submitMutation = useMutation({
    mutationFn: (choice: VoteChoice) => submitVote(policyId, choice),
    onSuccess: async () => {
      setPendingVote(null);
      await queryClient.invalidateQueries({ queryKey: ["vote-status", policyId] });
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentVote = voteQuery.data?.vote ?? null;
  const voteMessage = currentVote
    ? `Recorded vote: ${currentVote.choice} at ${new Date(currentVote.updatedAt).toLocaleString()}`
    : "No vote recorded for this policy yet.";
  const pendingVoteLabel = pendingVote ? pendingVote.charAt(0).toUpperCase() + pendingVote.slice(1) : "";
  const isAuthenticated = sessionQuery.data?.authenticated === true;
  const activePerson = sessionQuery.data?.authenticated ? sessionQuery.data.person : null;

  const errorMessage =
    submitMutation.error instanceof VotingApiError
      ? submitMutation.error.code === "policy_closed"
        ? "This policy is closed."
        : submitMutation.error.message
      : submitMutation.error instanceof Error
        ? submitMutation.error.message
        : "";
  const loadError =
    voteQuery.error instanceof VotingApiError
      ? voteQuery.error.message
      : voteQuery.error instanceof Error
        ? voteQuery.error.message
        : "";

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <AccountDialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen} />
      <AlertDialog open={pendingVote !== null} onOpenChange={(open) => !open && setPendingVote(null)}>
        <AlertDialogContent className="border-border bg-background text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-base uppercase tracking-[0.16em]">
              Confirm choice
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-muted-foreground">
              Record <span className="text-foreground">{pendingVoteLabel}</span> for{" "}
              <span className="text-foreground">{item.title}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-secondary/50 text-foreground hover:bg-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-foreground text-background hover:bg-foreground/90"
              onClick={() => {
                if (!pendingVote) {
                  return;
                }

                void submitMutation.mutateAsync(pendingVote);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-16">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            ballot
          </Link>
          <span>/</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">{item.jurisdictionSlug}</span>
          <span>/</span>
          <span className="text-foreground">{item.slug}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-12">
          <div>
            <h1 className="mb-4 break-words text-3xl font-semibold text-foreground">{item.title}</h1>

            <div className="mb-6 flex items-start gap-3 rounded-lg bg-secondary/50 px-4 py-3">
              <span className="pt-0.5 text-muted-foreground">$</span>
              <span className="min-w-0 flex-1 break-all whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {sharePath}
              </span>
              <button onClick={handleCopy} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6 rounded-lg border border-border p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Vote on this item</h3>
                <p className="text-sm text-muted-foreground">
                  {isAuthenticated
                    ? `Signed in as ${activePerson?.displayName}. You can record one vote on this proposal.`
                    : "Sign in with a university account to record one vote on this proposal."}
                </p>
              </div>
              {copied ? (
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Link copied</span>
              ) : null}
            </div>
              {isAuthenticated ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(["approve", "reject", "abstain"] as VoteChoice[]).map((choice) => {
                      const isActive = currentVote?.choice === choice;

                      return (
                        <button
                          key={choice}
                          onClick={() => setPendingVote(choice)}
                          disabled={submitMutation.isPending}
                          className={`rounded border px-4 py-3 text-left text-sm uppercase tracking-[0.14em] transition-colors ${voteToneClass(
                            choice,
                            isActive,
                          )} ${submitMutation.isPending ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                  {loadError ? <p className="mt-2 text-xs text-red-500">{loadError}</p> : null}
                  {currentVote ? (
                    <p className={`mt-4 text-xs uppercase tracking-[0.16em] ${savedVoteToneClass(currentVote.choice)}`}>
                      Saved vote: {currentVote.choice}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-muted-foreground">{voteMessage}</p>
                  {errorMessage ? <p className="mt-2 text-xs text-red-500">{errorMessage}</p> : null}
                </>
              ) : (
                <div className="rounded border border-border bg-secondary/30 px-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Use your university email to confirm your identity before voting. Accounts are tied to one campus record so duplicate votes stay blocked at the database level.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 border-border bg-secondary/50 font-mono text-xs uppercase tracking-[0.16em] text-foreground hover:bg-secondary"
                    onClick={() => setAccountDialogOpen(true)}
                  >
                    Sign in to vote
                  </Button>
                </div>
              )}
            </div>

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
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Quick Read</h3>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                A fast read on rights impact, budget pressure, and delivery risk.
              </p>
              <div className="space-y-2">
                {item.reviewChecks.map((a) => (
                  <div key={a.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{reviewLabel(a.name)}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${statusColor(a.status)}`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Current Split</h3>
              <div className="space-y-2">
                {item.voteBreakdown.map((result) => (
                  <div key={result.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{result.label}</span>
                    <span className="flex items-center gap-2 font-mono">
                      <span className={`rounded px-2 py-0.5 text-xs ${splitPillClass(result.label)}`}>
                        {result.share.toFixed(1)}%
                      </span>
                      <span className="text-foreground">{result.count}</span>
                    </span>
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
