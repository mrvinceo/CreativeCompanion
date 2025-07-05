// PWA installation and service worker registration

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registered: ', registration);
      } catch (registrationError) {
        console.log('SW registration failed: ', registrationError);
      }
    });
  }
}

export function setupPWAInstallPrompt() {
  let deferredPrompt: any;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button/banner
    showInstallPromotion();
  });

  window.addEventListener('appinstalled', () => {
    // Hide the app-provided install promotion
    hideInstallPromotion();
    // Clear the deferredPrompt so it can be garbage collected
    deferredPrompt = null;
    console.log('PWA was installed');
  });

  return {
    showInstallPrompt: async () => {
      if (deferredPrompt) {
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // Clear the deferredPrompt so it can be garbage collected
        deferredPrompt = null;
      }
    },
    canInstall: () => !!deferredPrompt
  };
}

function showInstallPromotion() {
  // This could trigger a custom install banner in your UI
  const event = new CustomEvent('pwa-installable');
  window.dispatchEvent(event);
}

function hideInstallPromotion() {
  // This could hide the custom install banner
  const event = new CustomEvent('pwa-installed');
  window.dispatchEvent(event);
}