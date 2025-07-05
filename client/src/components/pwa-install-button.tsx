import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone } from 'lucide-react';
import { setupPWAInstallPrompt } from '@/lib/pwa';

export function PWAInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const { showInstallPrompt, canInstall } = setupPWAInstallPrompt();
    setInstallPrompt(() => showInstallPrompt);

    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    checkIfInstalled();

    // Show fallback button after 2 seconds if no install prompt
    const fallbackTimer = setTimeout(() => {
      if (!isInstalled && !isInstallable) {
        setShowFallback(true);
      }
    }, 2000);

    const handleInstallable = () => {
      setIsInstallable(true);
      setShowFallback(false);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setShowFallback(false);
    };

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt();
    } else {
      // Fallback: show instructions
      alert('To install this app:\n\n• On Chrome/Edge: Look for the install icon in the address bar\n• On Safari: Tap Share > Add to Home Screen\n• On Firefox: Look for the install option in the menu');
    }
  };

  // Don't show button if already installed
  if (isInstalled) {
    return null;
  }

  // Show button if installable or fallback is enabled
  if (!isInstallable && !showFallback) {
    return null;
  }

  return (
    <Button
      onClick={handleInstall}
      variant="default"
      size="sm"
      className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
    >
      <Smartphone className="w-4 h-4" />
      Install App
    </Button>
  );
}