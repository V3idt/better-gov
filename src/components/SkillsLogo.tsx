const WORDMARK = ` |          |   |                                  
 __ \\   _ \\ __| __|  _ \\  __|     _\` |  _ \\\\ \\   / 
 |   |  __/ |   |    __/ |_____| (   | (   |\\ \\ /  
_.__/ \\___|\\__|\\__|\\___|_|      \\__, |\\___/  \\_/   
                                |___/              `;

const SkillsLogo = () => {
  return (
    <div className="flex w-full select-none items-start justify-center overflow-hidden lg:justify-start" aria-label="better-gov">
      <div className="relative w-fit max-w-full overflow-hidden">
        <pre
          className="pointer-events-none translate-x-px translate-y-px whitespace-pre font-mono text-[10px] leading-none tracking-[-0.04em] text-muted-foreground sm:text-[12px] md:text-[14px] lg:text-[16px]"
        >
          {WORDMARK}
        </pre>
        <pre
          className="pointer-events-none absolute left-0 top-0 whitespace-pre font-mono text-[10px] leading-none tracking-[-0.04em] text-foreground sm:text-[12px] md:text-[14px] lg:text-[16px]"
        >
          {WORDMARK}
        </pre>
      </div>
    </div>
  );
};

export default SkillsLogo;
