import { createContext, useContext, useState, useEffect } from 'react';
import { Share2, Plus, X, Smartphone } from 'lucide-react';

const PWAContext = createContext(null);

export function PWAProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      setIsInstallable(true);
    }

    // Check if the prompt event was already captured by the early script
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      setIsInstallable(true);
    }

    // Capture the browser's install prompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Capture the custom event fired by the early script if it ran first
    const handleCustomInstallable = () => {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        setIsInstallable(true);
      }
    };

    // Track when the user actually installs the app
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      window.deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-installable', handleCustomInstallable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-installable', handleCustomInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      setShowIOSPrompt(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <PWAContext.Provider value={{ isInstallable, isInstalled, installApp }}>
      {children}
      {showIOSPrompt && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowIOSPrompt(false)} 
          style={{ zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="modal ios-install-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: 0, fontWeight: 700 }}>
                <Smartphone style={{ color: 'var(--accent-primary)' }} size={20} /> Install ExpenseTracker
              </h3>
              <button className="btn-icon" onClick={() => setShowIOSPrompt(false)} style={{ padding: '6px', cursor: 'pointer' }} title="Close">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                Install ExpenseTracker on your iPhone or iPad for quick offline access and a full-screen experience.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ 
                    background: 'var(--bg-elevated)', 
                    color: 'var(--accent-primary)',
                    borderRadius: '50%', 
                    width: '28px', 
                    height: '28px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>1</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    Tap the <strong>Share</strong> button <Share2 size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', color: '#007aff', margin: '0 2px' }} /> in the Safari toolbar at the bottom of your screen.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ 
                    background: 'var(--bg-elevated)', 
                    color: 'var(--accent-primary)',
                    borderRadius: '50%', 
                    width: '28px', 
                    height: '28px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>2</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    Scroll down or swipe and tap <strong>Add to Home Screen</strong> <Plus size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', color: 'var(--text-primary)', margin: '0 2px', background: 'var(--bg-elevated)', padding: '2px', borderRadius: '4px' }} />.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ 
                    background: 'var(--bg-elevated)', 
                    color: 'var(--accent-primary)',
                    borderRadius: '50%', 
                    width: '28px', 
                    height: '28px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>3</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    Tap <strong>Add</strong> in the top right corner of the sheet to complete installation!
                  </div>
                </div>
              </div>
              <button 
                className="btn-primary" 
                onClick={() => setShowIOSPrompt(false)} 
                style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px', cursor: 'pointer' }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}

export const usePWA = () => useContext(PWAContext);



