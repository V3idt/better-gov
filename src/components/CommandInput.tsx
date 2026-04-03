import { Copy } from "lucide-react";
import { useState } from "react";

const CommandInput = () => {
  const [copied, setCopied] = useState(false);

  const command = "npx skills add <owner/repo>";

  const handleCopy = () => {
    navigator.clipboard.writeText(`$ ${command}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex w-full max-w-md items-start justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-3">
      <div className="min-w-0 flex-1 text-sm text-muted-foreground font-mono leading-relaxed">
        <span className="text-muted-foreground">$ </span>
        <span className="break-all whitespace-pre-wrap text-foreground">{command}</span>
      </div>
      <button
        onClick={handleCopy}
        className="text-muted-foreground hover:text-foreground transition-colors ml-3 shrink-0"
        aria-label="Copy command"
      >
        {copied ? (
          <span className="text-xs">✓</span>
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default CommandInput;
