interface RefynLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function RefynLogo({ size = 32, showText = true, className = "" }: RefynLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Yellow section */}
          <rect x="0" y="0" width="50" height="70" fill="#F5B041" />
          
          {/* Teal curved section */}
          <path
            d="M50 0 Q75 0 100 25 Q100 50 75 75 Q50 100 25 75 Q0 50 25 25 Q50 0 50 0 Z"
            fill="#2C5F6C"
            transform="translate(25, 0)"
          />
          
          {/* Burgundy section */}
          <rect x="0" y="70" width="25" height="30" fill="#8B1538" />
          
          {/* Black section */}
          <rect x="25" y="70" width="25" height="30" fill="#000000" />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-foreground">Refyn</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Designer App</span>
        </div>
      )}
    </div>
  );
}