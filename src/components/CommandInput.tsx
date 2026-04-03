const CommandInput = () => {
  return (
    <div className="flex w-full max-w-md items-start justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Live voting
        </p>
        <p className="text-sm leading-relaxed text-foreground">
          Read the brief, check the review, and vote directly.
        </p>
      </div>
      <span className="shrink-0 rounded border border-border px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Open
      </span>
    </div>
  );
};

export default CommandInput;
