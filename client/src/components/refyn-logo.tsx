import refynLogoAsset from "@assets/Asset 6@4x_1751463951553.png";

interface RefynLogoProps {
  size?: number;
  height?: number;
  showTitle?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export function RefynLogo({ 
  size = 64,
  height = size / 2,
  showTitle = true, 
  showSubtitle = false, 
  className = "" 
}: RefynLogoProps) {
  return (
    <div className={`flex flex-col items-center gap-0 ${className}`}>
      <img 
        src={refynLogoAsset} 
        alt="Refyn Logo" 
        style={{ width: size, height: height }}
        className="object-contain"
      />
      {showTitle && (
        <div className="flex flex-col">
          <span className="text-2xl title text-foreground"></span>
          {showSubtitle && (
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Your art: Refynd 🙄</span>
          )}
        </div>
      )}
    </div>
  );
}