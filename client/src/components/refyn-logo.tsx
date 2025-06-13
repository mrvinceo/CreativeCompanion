import refynLogoAsset from "@assets/Asset 3@4x_1749816721142.png";

interface RefynLogoProps {
  size?: number;
  showTitle?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

export function RefynLogo({ 
  size = 32, 
  showTitle = true, 
  showSubtitle = false, 
  className = "" 
}: RefynLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src={refynLogoAsset} 
        alt="Refyn Logo" 
        style={{ width: size, height: size }}
        className="object-contain"
      />
      {showTitle && (
        <div className="flex flex-col">
          <span className="text-2xl title text-foreground">Refyn</span>
          {showSubtitle && (
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Your work: Refynd</span>
          )}
        </div>
      )}
    </div>
  );
}