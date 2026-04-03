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
    <div className="flex items-center justify-between bg-secondary border border-border rounded-lg px-4 py-3 max-w-md w-full">
      <div className="text-sm text-muted-foreground font-mono">
        <span className="text-muted-foreground">$ </span>
        <span className="text-foreground">{command}</span>
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
