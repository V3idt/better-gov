const SkillsLogo = () => {
  const shadow = `██████╗ ███████╗████████╗████████╗███████╗██████╗
██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ██████╗  ██████╗ ██╗   ██╗
██╔════╝ ██╔═══██╗██║   ██║
██║  ███╗██║   ██║██║   ██║
██║   ██║██║   ██║╚██╗ ██╔╝
╚██████╔╝╚██████╔╝ ╚████╔╝
 ╚═════╝  ╚═════╝   ╚═══╝`;

  const foreground = `██████  ███████ ████████ ████████ ███████ ██████
██   ██ ██         ██       ██    ██      ██   ██
██████  █████      ██       ██    █████   ██████
██   ██ ██         ██       ██    ██      ██   ██
██████  ███████    ██       ██    ███████ ██   ██

 ██████   ██████  ██    ██
██       ██    ██ ██    ██
██   ███ ██    ██ ██    ██
██    ██ ██    ██  ██  ██
 ██████   ██████    ████`;

  return (
    <div className="relative w-full flex items-start justify-center lg:justify-start overflow-hidden select-none" aria-label="BETTER GOV">
      <div className="relative max-w-[320px] lg:max-w-[480px] overflow-hidden">
        <pre className="text-[8px] lg:text-[10px] tracking-[-0.8px] leading-[125%] text-muted-foreground whitespace-pre font-mono">
          {shadow}
        </pre>
        <pre className="absolute top-0 left-0 text-[8px] lg:text-[10px] tracking-[-0.8px] leading-[125%] text-foreground whitespace-pre font-mono">
          {foreground}
        </pre>
      </div>
    </div>
  );
};

export default SkillsLogo;
