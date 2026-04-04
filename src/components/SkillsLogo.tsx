const WORDMARK = `                                                                                                      
_|                    _|      _|                                                                      
_|_|_|      _|_|    _|_|_|_|_|_|_|_|    _|_|    _|  _|_|                _|_|_|    _|_|    _|      _|  
_|    _|  _|_|_|_|    _|      _|      _|_|_|_|  _|_|      _|_|_|_|_|  _|    _|  _|    _|  _|      _|  
_|    _|  _|          _|      _|      _|        _|                    _|    _|  _|    _|    _|  _|    
_|_|_|      _|_|_|      _|_|    _|_|    _|_|_|  _|                      _|_|_|    _|_|        _|      
                                                                            _|                        
                                                                        _|_|                          `;

const SkillsLogo = () => {
  return (
    <div className="flex w-full select-none items-start justify-center overflow-hidden lg:justify-start" aria-label="better-gov">
      <div className="relative w-fit max-w-full overflow-hidden">
        <pre
          className="pointer-events-none translate-x-px translate-y-px whitespace-pre font-mono text-[3px] leading-[1] text-muted-foreground sm:text-[4px] md:text-[5px] lg:text-[6px]"
        >
          {WORDMARK}
        </pre>
        <pre
          className="pointer-events-none absolute left-0 top-0 whitespace-pre font-mono text-[3px] leading-[1] text-foreground sm:text-[4px] md:text-[5px] lg:text-[6px]"
        >
          {WORDMARK}
        </pre>
      </div>
    </div>
  );
};

export default SkillsLogo;
