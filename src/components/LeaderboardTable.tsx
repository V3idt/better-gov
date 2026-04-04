import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  getSession,
  listPropositions,
  propositionListModeQueryKey,
  sessionQueryKey,
} from "@/lib/voting-api";
import { formatSupportPercent } from "@/lib/voting";

type Tab = "all" | "for_you" | "closing" | "newest";
type SortMode = "published" | "support-asc" | "support-desc";
const FEATURED_PROPOSITION_SLUG = "residence-hall-rent-cap";

const LeaderboardTable = () => {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("published");
  const sessionQuery = useQuery({
    queryKey: sessionQueryKey,
    queryFn: getSession,
  });
  const listMode = activeTab === "for_you" ? "for_you" : "default";
  const propositionsQuery = useQuery({
    queryKey: propositionListModeQueryKey(listMode),
    queryFn: () => listPropositions(listMode),
  });
  const isAuthenticated = sessionQuery.data?.authenticated === true;

  const propositions = propositionsQuery.data?.propositions ?? [];
  const filtered = useMemo(() => {
    const query = search.toLowerCase();

    return propositions.filter((item) => {
      const matchesTab =
        activeTab === "all" ||
        activeTab === "for_you" ||
        (activeTab === "closing" && item.status === "closing_soon") ||
        activeTab === "newest";

      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.jurisdiction.toLowerCase().includes(query);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, propositions, search]);

  const sorted = useMemo(() => {
    if (activeTab === "for_you") {
      return filtered;
    }

    if (activeTab === "newest") {
      return [...filtered].sort((left, right) => {
        const leftPublished = new Date(left.postedAt).getTime();
        const rightPublished = new Date(right.postedAt).getTime();

        if (leftPublished === rightPublished) {
          return left.title.localeCompare(right.title);
        }

        return rightPublished - leftPublished;
      });
    }

    return [...filtered].sort((left, right) => {
      if (activeTab === "all") {
        const leftFeatured = left.slug === FEATURED_PROPOSITION_SLUG;
        const rightFeatured = right.slug === FEATURED_PROPOSITION_SLUG;

        if (leftFeatured !== rightFeatured) {
          return leftFeatured ? -1 : 1;
        }
      }

      if (left.isUserPosted !== right.isUserPosted) {
        return left.isUserPosted ? 1 : -1;
      }

      if (sortMode === "published") {
        if (left.displayOrder !== right.displayOrder) {
          return left.displayOrder - right.displayOrder;
        }

        const leftPublished = new Date(left.postedAt).getTime();
        const rightPublished = new Date(right.postedAt).getTime();

        if (leftPublished === rightPublished) {
          return left.title.localeCompare(right.title);
        }

        return rightPublished - leftPublished;
      }

      const leftSupport = left.supportPercent;
      const rightSupport = right.supportPercent;

      if (leftSupport === null && rightSupport === null) {
        const leftPublished = new Date(left.postedAt).getTime();
        const rightPublished = new Date(right.postedAt).getTime();
        return rightPublished - leftPublished;
      }

      if (leftSupport === null) {
        return 1;
      }

      if (rightSupport === null) {
        return -1;
      }

      if (leftSupport === rightSupport) {
        if (left.isUserPosted !== right.isUserPosted) {
          return left.isUserPosted ? 1 : -1;
        }

        const leftPublished = new Date(left.postedAt).getTime();
        const rightPublished = new Date(right.postedAt).getTime();
        return rightPublished - leftPublished;
      }

      return sortMode === "support-asc" ? leftSupport - rightSupport : rightSupport - leftSupport;
    });
  }, [activeTab, filtered, sortMode]);

  const supportSortLabel = "Support";
  const SupportSortIcon =
    sortMode === "support-asc" ? ArrowUp : sortMode === "support-desc" ? ArrowDown : null;

  return (
    <div className="w-full">
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
        Open Propositions
      </h2>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search propositions ..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full border-b border-border bg-transparent py-2 pl-10 pr-10 font-mono text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-muted-foreground focus:outline-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
          /
        </span>
      </div>

      <div className="mb-6 flex gap-4 text-sm">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-1 font-mono transition-colors ${
            activeTab === "all" ? "border-b border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Open ({propositions.length})
        </button>
        {isAuthenticated ? (
          <button
            onClick={() => setActiveTab("for_you")}
            className={`pb-1 font-mono transition-colors ${
              activeTab === "for_you"
                ? "border-b border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            For You
          </button>
        ) : null}
        <button
          onClick={() => setActiveTab("closing")}
          className={`pb-1 font-mono transition-colors ${
            activeTab === "closing"
              ? "border-b border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Closing Soon ({propositions.filter((item) => item.status === "closing_soon").length})
        </button>
        <button
          onClick={() => setActiveTab("newest")}
          className={`pb-1 font-mono transition-colors ${
            activeTab === "newest" ? "border-b border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Newest ({propositions.length})
        </button>
      </div>

      <div className="mb-2 grid grid-cols-[32px_minmax(0,1fr)_72px] px-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-[40px_minmax(0,1fr)_80px]">
        <span>#</span>
        <span>Proposition</span>
        <div className="flex justify-end">
          {activeTab === "for_you" || activeTab === "newest" ? (
            <span className="text-xs uppercase tracking-wider text-muted-foreground">{supportSortLabel}</span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setSortMode((current) =>
                  current === "published"
                    ? "support-asc"
                    : current === "support-asc"
                      ? "support-desc"
                      : "published",
                )
              }
              className="h-auto px-0 py-0 text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
              <span>{supportSortLabel}</span>
              {SupportSortIcon ? <SupportSortIcon className="h-3.5 w-3.5" /> : null}
            </Button>
          )}
        </div>
      </div>

      <div className="divide-y divide-border">
        {propositionsQuery.isLoading ? (
          <div className="px-2 py-6 text-sm text-muted-foreground">Loading propositions ...</div>
        ) : propositionsQuery.isError ? (
          <div className="px-2 py-6 text-sm text-red-500">Could not load propositions.</div>
        ) : sorted.length === 0 ? (
          <div className="px-2 py-6 text-sm text-muted-foreground">No propositions match this view.</div>
        ) : (
          sorted.map((item, index) => (
            <Link
              key={item.id}
              to={item.path}
              className="grid grid-cols-[32px_minmax(0,1fr)_72px] items-start px-2 py-3.5 transition-colors hover:bg-secondary/50 group sm:grid-cols-[40px_minmax(0,1fr)_80px]"
            >
              <span className="text-sm text-muted-foreground">{index + 1}</span>
              <div className="min-w-0">
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                  <span className="break-words text-sm font-semibold text-foreground">{item.title}</span>
                  <span className="min-w-0 break-all text-xs font-mono text-muted-foreground">
                    {item.jurisdiction} / {item.category} / {item.status.replace("_", " ")}
                  </span>
                </div>
                {activeTab === "for_you" && item.personalizationReason ? (
                  <div className="mt-1 text-xs text-muted-foreground">{item.personalizationReason}</div>
                ) : null}
              </div>
              <span className="text-right font-mono text-xs text-muted-foreground sm:text-sm">
                {formatSupportPercent(item.supportPercent)}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default LeaderboardTable;
