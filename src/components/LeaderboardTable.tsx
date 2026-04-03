import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ballotItems, getBallotItemPath } from "@/lib/ballotItems";

type Tab = "all" | "closing" | "draft";

const LeaderboardTable = () => {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");

  const filtered = ballotItems.filter((item) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "closing" && item.status === "Closing Soon") ||
      (activeTab === "draft" && item.status === "Draft");

    const query = search.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.jurisdiction.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="w-full">
      <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-foreground mb-6">
        Open Ballot
      </h2>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search ballot items ..."
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
          All Open ({ballotItems.filter((item) => item.status !== "Draft").length})
        </button>
        <button
          onClick={() => setActiveTab("closing")}
          className={`pb-1 transition-colors font-mono ${
            activeTab === "closing"
              ? "text-foreground border-b border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Closing Soon ({ballotItems.filter((item) => item.status === "Closing Soon").length})
        </button>
        <button
          onClick={() => setActiveTab("draft")}
          className={`pb-1 transition-colors font-mono ${
            activeTab === "draft"
              ? "text-foreground border-b border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Draft ({ballotItems.filter((item) => item.status === "Draft").length})
        </button>
      </div>

      {/* Table Header */}
      <div className="mb-2 grid grid-cols-[32px_minmax(0,1fr)_72px] px-2 text-xs uppercase tracking-wider text-muted-foreground sm:grid-cols-[40px_minmax(0,1fr)_80px]">
        <span>#</span>
        <span>Ballot Item</span>
        <span className="text-right">Support</span>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border">
        {filtered.map((item) => (
          <Link
            key={`${item.rank}-${item.jurisdictionSlug}-${item.slug}`}
            to={getBallotItemPath(item)}
            className="grid grid-cols-[32px_minmax(0,1fr)_72px] items-start px-2 py-3.5 transition-colors hover:bg-secondary/50 group sm:grid-cols-[40px_minmax(0,1fr)_80px]"
          >
            <span className="text-sm text-muted-foreground">{item.rank}</span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                <span className="break-words text-sm font-semibold text-foreground">{item.title}</span>
                <span className="min-w-0 break-all text-xs font-mono text-muted-foreground">
                  {item.jurisdiction} / {item.category} / {item.status}
                </span>
              </div>
            </div>
            <span className="text-right font-mono text-xs text-muted-foreground sm:text-sm">{item.support}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default LeaderboardTable;
