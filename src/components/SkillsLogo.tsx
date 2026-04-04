const WORDMARK = `██████╗ ███████╗████████╗████████╗███████╗██████╗      ██████╗  ██████╗ ██╗   ██╗
██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗    ██╔════╝ ██╔═══██╗██║   ██║
██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝    ██║  ███╗██║   ██║██║   ██║
██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗    ██║   ██║██║   ██║╚██╗ ██╔╝
██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║    ╚██████╔╝╚██████╔╝ ╚█████╔╝ 
╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝     ╚═════╝  ╚═════╝   ╚════╝  `;

const SkillsLogo = () => {
  return (
    <div className="flex w-full select-none items-start justify-center overflow-hidden lg:justify-start" aria-label="better-gov">
      <div className="relative max-w-[760px] overflow-hidden lg:max-w-[980px]">
        <pre
          className="pointer-events-none translate-x-px translate-y-px whitespace-pre text-[8px] leading-[125%] tracking-[-0.85px] text-muted-foreground sm:text-[9px] md:text-[10px] lg:text-[12px]"
          style={{ fontFamily: '"Fira Mono", "JetBrains Mono", Consolas, Monaco, monospace' }}
        >
          {WORDMARK}
        </pre>
        <pre
          className="pointer-events-none absolute left-0 top-0 whitespace-pre text-[8px] leading-[125%] tracking-[-0.85px] text-foreground sm:text-[9px] md:text-[10px] lg:text-[12px]"
          style={{ fontFamily: '"Fira Mono", "JetBrains Mono", Consolas, Monaco, monospace' }}
        >
          {WORDMARK}
        </pre>
      </div>
    </div>
  );
};

export default SkillsLogo;
