import { Search } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  listPropositions,
  propositionListQueryKey,
} from "@/lib/voting-api";
import { formatSupportPercent } from "@/lib/voting";

type Tab = "all" | "closing" | "draft";

const LeaderboardTable = () => {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const propositionsQuery = useQuery({
    queryKey: propositionListQueryKey,
    queryFn: listPropositions,
  });

  const propositions = propositionsQuery.data?.propositions ?? [];
  const filtered = propositions.filter((item) => {
    const matchesTab =
      (activeTab === "all" && item.status !== "draft") ||
      (activeTab === "closing" && item.status === "closing_soon") ||
      (activeTab === "draft" && item.status === "draft");

    const query = search.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.jurisdiction.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

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
          All Open ({propositions.filter((item) => item.status !== "draft").length})
        </button>
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
          onClick={() => setActiveTab("draft")}
          className={`pb-1 font-mono transition-colors ${
            activeTab === "draft" ? "border-b border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Draft ({propositions.filter((item) => item.status === "draft").length})
        </button>
      </div>

      <div className="mb-2 grid grid-cols-[32px_minmax(0,1fr)_72px] px-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-[40px_minmax(0,1fr)_80px]">
        <span>#</span>
        <span>Proposition</span>
        <span className="text-right">Support</span>
      </div>

      <div className="divide-y divide-border">
        {propositionsQuery.isLoading ? (
          <div className="px-2 py-6 text-sm text-muted-foreground">Loading propositions ...</div>
        ) : propositionsQuery.isError ? (
          <div className="px-2 py-6 text-sm text-red-500">Could not load propositions.</div>
        ) : filtered.length === 0 ? (
          <div className="px-2 py-6 text-sm text-muted-foreground">No propositions match this view.</div>
        ) : (
          filtered.map((item, index) => (
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
