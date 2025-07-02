import * as React from "react"

const MOBILE_BREAKPOINT = 1024 // Increased to catch fullscreen mobile preview mode

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      // Check for mobile user agent or screen size
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;
      
      setIsMobile(isMobileDevice || isSmallScreen)
    }
    mql.addEventListener("change", onChange)
    
    // Initial check
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;
    setIsMobile(isMobileDevice || isSmallScreen)
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
