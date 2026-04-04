import Navbar from "@/components/Navbar";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, Copy, FileText, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AccountDialog from "@/components/AccountDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  formatCompactCount,
  formatSupportPercent,
  type AiAudienceRole,
  type AiProviderPreference,
  propositionPathFromParts,
  type PropositionReviewCheck,
  type VoteChoice,
  VotingApiError,
} from "@/lib/voting";
import {
  getPropositionAiExplanation,
  getPropositionByPath,
  getSession,
  propositionHistoryQueryKey,
  propositionAiQueryKey,
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

const aiProviderLabel = (provider: AiProviderPreference | "fallback") => {
  if (provider === "openai") return "OpenAI";
  if (provider === "gemini") return "Gemini";
  if (provider === "grok") return "Grok";
  if (provider === "fallback") return "Fallback";
  return "Auto";
};

const aiRoleLabel = (role: AiAudienceRole) => (role === "student" ? "Student" : "Staff");

const splitPillClass = (label: string) => {
  if (label === "Approve") return "text-green-500 bg-green-500/10";
  if (label === "Reject") return "text-red-500 bg-red-500/10";
  return "text-amber-500 bg-amber-500/10";
};

const formatTimeLeft = (closesAt: string, currentTime: number) => {
  const diff = Date.parse(closesAt) - currentTime;
  if (Number.isNaN(diff) || diff <= 0) {
    return "Closed";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
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
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRole, setAiRole] = useState<AiAudienceRole>("student");
  const [aiProvider, setAiProvider] = useState<AiProviderPreference>("auto");

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

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
  const isAuthenticated = sessionQuery.data?.authenticated === true;
  const activePerson = sessionQuery.data?.authenticated ? sessionQuery.data.person : null;

  useEffect(() => {
    if (!sessionQuery.data?.authenticated) {
      return;
    }

    setAiRole(sessionQuery.data.person.primaryRole === "staff" ? "staff" : "student");
  }, [sessionQuery.data?.authenticated, sessionQuery.data?.person?.primaryRole]);

  const aiQuery = useQuery({
    queryKey: proposition
      ? propositionAiQueryKey(proposition.id, aiRole, aiProvider)
      : ["proposition", "ai", "loading"] as const,
    queryFn: () => {
      if (!proposition) {
        throw new Error("Proposition not loaded.");
      }

      return getPropositionAiExplanation(proposition.id, {
        role: aiRole,
        provider: aiProvider,
      });
    },
    enabled: Boolean(proposition) && aiOpen && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

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
  const closesIn = proposition ? formatTimeLeft(proposition.closesAt, currentTime) : "";

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
  const aiErrorMessage =
    aiQuery.error instanceof VotingApiError
      ? aiQuery.error.message
      : aiQuery.error instanceof Error
        ? aiQuery.error.message
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

                <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
                  <Card className="mb-6 border-border bg-secondary/20">
                    <CardHeader className="space-y-4 border-b border-border p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-[0.16em]">
                            <Sparkles className="h-4 w-4" aria-hidden="true" />
                            AI explainer
                          </CardTitle>
                          <CardDescription className="max-w-2xl leading-relaxed">
                            Get a plain-language explanation, the upside, the downside, and the likely impact for a student or staff view.
                          </CardDescription>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-border bg-background/60 font-mono text-xs uppercase tracking-[0.16em] text-foreground hover:bg-secondary"
                          >
                            <span>{aiOpen ? "Hide" : "Open"}</span>
                            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${aiOpen ? "rotate-180" : ""}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-5 p-5">
                        {isAuthenticated ? (
                          <>
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_220px]">
                              <div className="space-y-2">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Audience view</p>
                                <ToggleGroup
                                  type="single"
                                  value={aiRole}
                                  onValueChange={(value) => {
                                    if (value === "student" || value === "staff") {
                                      setAiRole(value);
                                    }
                                  }}
                                  variant="outline"
                                  className="justify-start"
                                >
                                  <ToggleGroupItem value="student" className="px-4 font-mono text-xs uppercase tracking-[0.16em]">
                                    Student
                                  </ToggleGroupItem>
                                  <ToggleGroupItem value="staff" className="px-4 font-mono text-xs uppercase tracking-[0.16em]">
                                    Staff
                                  </ToggleGroupItem>
                                </ToggleGroup>
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Provider</p>
                                <Select value={aiProvider} onValueChange={(value) => setAiProvider(value as AiProviderPreference)}>
                                  <SelectTrigger className="border-border bg-background/60 font-mono text-xs uppercase tracking-[0.16em]">
                                    <SelectValue placeholder="Choose provider" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="auto">Auto</SelectItem>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="gemini">Gemini</SelectItem>
                                    <SelectItem value="grok">Grok</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {aiQuery.isLoading ? (
                              <div className="space-y-3 rounded border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                                <div className="h-4 w-40 animate-pulse rounded bg-muted/40" />
                                <div className="h-3 w-full animate-pulse rounded bg-muted/30" />
                                <div className="h-3 w-11/12 animate-pulse rounded bg-muted/30" />
                                <div className="h-3 w-10/12 animate-pulse rounded bg-muted/30" />
                              </div>
                            ) : aiQuery.isError ? (
                              <div className="rounded border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-500">
                                {aiErrorMessage || "Could not generate an explanation right now."}
                              </div>
                            ) : aiQuery.data ? (
                              <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.16em]">
                                    {aiProviderLabel(aiQuery.data.providerUsed)}
                                  </Badge>
                                  <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.16em]">
                                    {aiRoleLabel(aiQuery.data.role)}
                                  </Badge>
                                  <Badge variant="outline" className="border-border bg-background/60 font-mono uppercase tracking-[0.16em]">
                                    {aiQuery.data.cached ? "cached" : "live"}
                                  </Badge>
                                </div>

                                <div className="rounded border border-border bg-background/60 p-4">
                                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Explanation</p>
                                  <p className="text-sm leading-relaxed text-foreground">{aiQuery.data.explanation}</p>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                  <div className="rounded border border-border bg-background/60 p-4">
                                    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Advantages</p>
                                    <ul className="space-y-2">
                                      {aiQuery.data.advantages.map((item) => (
                                        <li key={item} className="flex gap-2 text-sm text-foreground">
                                          <span className="mt-1.5 h-1 w-1 rounded-full bg-foreground/60" />
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="rounded border border-border bg-background/60 p-4">
                                    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Disadvantages</p>
                                    <ul className="space-y-2">
                                      {aiQuery.data.disadvantages.map((item) => (
                                        <li key={item} className="flex gap-2 text-sm text-foreground">
                                          <span className="mt-1.5 h-1 w-1 rounded-full bg-foreground/60" />
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                <div className="rounded border border-border bg-background/60 p-4">
                                  <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">Impact</p>
                                  <p className="text-sm leading-relaxed text-foreground">{aiQuery.data.impact}</p>
                                </div>

                                <div className="rounded border border-border bg-background/60 p-4">
                                  <p className="mb-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Sources used</p>
                                  <div className="flex flex-wrap gap-2">
                                    {aiQuery.data.sourcesUsed.map((source) => (
                                      <Badge key={source} variant="outline" className="border-border bg-secondary/30 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                        {source}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className="rounded border border-border bg-background/60 p-4">
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              Sign in with your university account to use the AI explainer. It stays behind the same session gate as voting.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="mt-4 border-border bg-secondary/50 font-mono text-xs uppercase tracking-[0.16em] text-foreground hover:bg-secondary"
                              onClick={() => setAccountDialogOpen(true)}
                            >
                              Sign in to explain
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                <div className="mb-6 rounded-lg border border-border p-5">
                  <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">tl;dr</h3>
                  <p className="mb-3 text-sm font-semibold text-foreground">{proposition.tldr}</p>
                  {proposition.bullets.length > 0 ? (
                    <ul className="space-y-2">
                      {proposition.bullets.map((bullet, index) => (
                        <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Time Left</h3>
                  <span className="text-sm font-mono text-foreground">{closesIn}</span>
                </div>

                <div>
                  <h3 className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Quick Read</h3>
                  {proposition.reviewChecks.length > 0 ? (
                    <>
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
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No quick read has been added yet.</p>
                  )}
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
