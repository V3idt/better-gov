const WORDMARK = `██████╗ ███████╗████████╗████████╗███████╗██████╗      ██████╗  ██████╗ ██╗   ██╗
██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗    ██╔════╝ ██╔═══██╗██║   ██║
██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝    ██║  ███╗██║   ██║██║   ██║
██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗    ██║   ██║██║   ██║╚██╗ ██╔╝
██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║    ╚██████╔╝╚██████╔╝ ╚█████╔╝ 
╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝     ╚═════╝  ╚═════╝   ╚════╝  `;

const SkillsLogo = () => {
  return (
    <div className="flex w-full select-none items-start justify-center overflow-hidden lg:justify-start" aria-label="better-gov">
      <div className="relative max-w-[560px] overflow-hidden lg:max-w-[700px]">
        <pre
          className="pointer-events-none translate-x-px translate-y-px whitespace-pre text-[5px] leading-[125%] tracking-[-0.55px] text-muted-foreground sm:text-[6px] md:text-[7px] lg:text-[8px]"
          style={{ fontFamily: '"Fira Mono", "JetBrains Mono", Consolas, Monaco, monospace' }}
        >
          {WORDMARK}
        </pre>
        <pre
          className="pointer-events-none absolute left-0 top-0 whitespace-pre text-[5px] leading-[125%] tracking-[-0.55px] text-foreground sm:text-[6px] md:text-[7px] lg:text-[8px]"
          style={{ fontFamily: '"Fira Mono", "JetBrains Mono", Consolas, Monaco, monospace' }}
        >
          {WORDMARK}
        </pre>
      </div>
    </div>
  );
};

export default SkillsLogo;
