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
import {
  formatCompactCount,
  formatSupportPercent,
  propositionPathFromParts,
  type PropositionReviewCheck,
  type VoteChoice,
  VotingApiError,
} from "@/lib/voting";
import {
  getPropositionByPath,
  getSession,
  propositionHistoryQueryKey,
  propositionListQueryKey,
  sessionQueryKey,
  submitVote,
} from "@/lib/voting-api";

const statusColor = (s: PropositionReviewCheck["status"]) => {
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
  const { "*": rawPath } = useParams();
  const propositionPath = useMemo(() => {
    const [jurisdictionSlug = "campus", slug = "transparent-department-budgets"] = rawPath
      ? rawPath.split("/").filter(Boolean)
      : [];

    return propositionPathFromParts(jurisdictionSlug, slug);
  }, [rawPath]);
  const [copied, setCopied] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [pendingVote, setPendingVote] = useState<VoteChoice | null>(null);

  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });

  const propositionQuery = useQuery({
    queryKey: ["proposition", propositionPath],
    queryFn: () => getPropositionByPath(propositionPath),
  });

  const proposition = propositionQuery.data?.proposition;
  const isVotable =
    proposition?.status === "open" || proposition?.status === "closing_soon";
  const submitMutation = useMutation({
    mutationFn: (choice: VoteChoice) => {
      if (!proposition) {
        throw new Error("Proposition not loaded.");
      }

      return submitVote(proposition.id, choice);
    },
    onSuccess: async () => {
      setPendingVote(null);
      await queryClient.invalidateQueries({ queryKey: ["proposition", propositionPath] });
      await queryClient.invalidateQueries({ queryKey: propositionListQueryKey });
      await queryClient.invalidateQueries({ queryKey: propositionHistoryQueryKey });
    },
  });

  const handleCopy = () => {
    if (!proposition) {
      return;
    }

    navigator.clipboard.writeText(`${window.location.origin}${proposition.path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentVote = proposition?.myVote ?? null;
  const pendingVoteLabel = pendingVote ? pendingVote.charAt(0).toUpperCase() + pendingVote.slice(1) : "";
  const isAuthenticated = sessionQuery.data?.authenticated === true;
  const activePerson = sessionQuery.data?.authenticated ? sessionQuery.data.person : null;

  const errorMessage =
    submitMutation.error instanceof VotingApiError
      ? submitMutation.error.code === "policy_closed"
        ? "This proposition is closed."
        : submitMutation.error.message
      : submitMutation.error instanceof Error
        ? submitMutation.error.message
        : "";
  const loadError =
    propositionQuery.error instanceof VotingApiError
      ? propositionQuery.error.message
      : propositionQuery.error instanceof Error
        ? propositionQuery.error.message
        : "";

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <Navbar />
      <AccountDialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen} />
      <AlertDialog open={pendingVote !== null} onOpenChange={(open) => !open && setPendingVote(null)}>
        <AlertDialogContent className="border-border bg-background text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-base uppercase tracking-[0.16em]">Confirm choice</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-muted-foreground">
              Record <span className="text-foreground">{pendingVoteLabel}</span> for{" "}
              <span className="text-foreground">{proposition?.title ?? "this proposition"}</span>?
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
      <div className="mx-auto max-w-5xl px-6 pb-16 pt-12">
        {propositionQuery.isLoading ? (
          <div className="py-16 text-sm text-muted-foreground">Loading proposition ...</div>
        ) : propositionQuery.isError || !proposition ? (
          <div className="py-16 text-sm text-red-500">{loadError || "Could not load this proposition."}</div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="transition-colors hover:text-foreground">
                proposition
              </Link>
              <span>/</span>
              <span className="cursor-pointer transition-colors hover:text-foreground">{proposition.jurisdictionSlug}</span>
              <span>/</span>
              <span className="text-foreground">{proposition.slug}</span>
            </div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
              <div>
                <h1 className="mb-4 break-words text-3xl font-semibold text-foreground">{proposition.title}</h1>

                <div className="mb-6 flex items-start gap-3 rounded-lg bg-secondary/50 px-4 py-3">
                  <span className="pt-0.5 text-muted-foreground">$</span>
                  <span className="min-w-0 flex-1 break-all whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {proposition.path}
                  </span>
                  <button onClick={handleCopy} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-6 rounded-lg border border-border p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Vote on this proposition</h3>
                      <p className="text-sm text-muted-foreground">
                        {isAuthenticated
                          ? `Signed in as ${activePerson?.displayName}. You can record one vote on this proposition.`
                          : "Sign in with a university account to record one vote on this proposition."}
                      </p>
                    </div>
                    {copied ? <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Link copied</span> : null}
                  </div>
                  {isAuthenticated ? (
                    <>
                      {isVotable ? (
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
                      ) : (
                        <div className="rounded border border-border bg-secondary/30 px-4 py-4 text-sm text-muted-foreground">
                          {proposition.status === "draft"
                            ? "This proposition is still in draft and voting has not opened yet."
                            : "This proposition is closed. Voting is no longer open."}
                        </div>
                      )}
                      {currentVote ? (
                        <p className={`mt-4 text-xs uppercase tracking-[0.16em] ${savedVoteToneClass(currentVote.choice)}`}>
                          Saved vote: {currentVote.choice}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {currentVote
                          ? `Recorded vote: ${currentVote.choice} at ${new Date(currentVote.updatedAt).toLocaleString()}`
                          : "No vote recorded for this proposition yet."}
                      </p>
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

                <div className="mb-6 rounded-lg border border-border p-5">
                  <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">tl;dr</h3>
                  <p className="mb-3 text-sm font-semibold text-foreground">{proposition.tldr}</p>
                  <ul className="space-y-2">
                    {proposition.bullets.map((bullet, index) => (
                      <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <span className="font-mono">FULL BRIEF</span>
                </div>

                <div className="prose prose-invert prose-sm max-w-none">
                  {proposition.brief.split("\n").map((line, index) => {
                    if (line.startsWith("# ")) return <h1 key={index} className="mb-4 mt-8 break-words text-2xl font-semibold text-foreground">{line.slice(2)}</h1>;
                    if (line.startsWith("## ")) return <h2 key={index} className="mb-3 mt-8 break-words text-lg font-semibold text-foreground">{line.slice(3)}</h2>;
                    if (line.startsWith("- ")) return <li key={index} className="mb-1 ml-4 break-words text-sm text-muted-foreground">{line.slice(2)}</li>;
                    if (line.startsWith("**")) return <p key={index} className="mb-2 text-sm font-semibold text-foreground">{line.replace(/\*\*/g, "")}</p>;
                    if (line.trim() === "") return <div key={index} className="h-2" />;
                    return <p key={index} className="mb-2 break-words text-sm text-muted-foreground">{line}</p>;
                  })}
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Current Support</h3>
                  <span className="font-mono text-3xl font-semibold text-foreground">{formatSupportPercent(proposition.supportPercent)}</span>
                </div>

                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Category</h3>
                  <span className="break-all text-sm font-mono text-foreground">{proposition.category}</span>
                </div>

                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Scope</h3>
                  <span className="text-sm text-foreground">{proposition.scope}</span>
                </div>

                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Closes On</h3>
                  <span className="text-sm font-mono text-foreground">{new Date(proposition.closesAt).toLocaleDateString()}</span>
                </div>

                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Quick Read</h3>
                  <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                    A fast read on rights impact, budget pressure, and delivery risk.
                  </p>
                  <div className="space-y-2">
                    {proposition.reviewChecks.map((check) => (
                      <div key={check.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{reviewLabel(check.name)}</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-mono ${statusColor(check.status)}`}>{check.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Current Split</h3>
                  <div className="space-y-2">
                    {proposition.voteBreakdown.map((result) => (
                      <div key={result.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{result.label}</span>
                        <span className="flex items-center gap-2 font-mono">
                          <span className={`rounded px-2 py-0.5 text-xs ${splitPillClass(result.label)}`}>
                            {result.share.toFixed(1)}%
                          </span>
                          <span className="text-foreground">{formatCompactCount(result.count)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Turnout</h3>
                  <span className="text-sm font-mono text-foreground">{proposition.turnoutCount.toLocaleString()} votes</span>
                </div>

                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Posted By</h3>
                  <span className="text-sm text-foreground">{proposition.sponsor}</span>
                </div>

                <div>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Status</h3>
                  <span className="text-sm font-mono text-foreground">{proposition.status.replace("_", " ")}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SkillDetail;
