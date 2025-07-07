import { Button } from '@/components/ui/button';
import { RefynLogo } from '@/components/refyn-logo';
import { ProfileDialog } from '@/components/profile-dialog';
import { MobileConversationHistory } from '@/components/mobile-conversation-history';
import { PWAInstallButton } from '@/components/pwa-install-button';
import { User, LogOut, ListRestart, MapPin, CirclePlus, BookOpen, GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import { queryClient } from '@/lib/queryClient';

interface MobileLayoutProps {
  children: React.ReactNode;
  onNewConversation?: () => void;
  onSelectConversation?: (sessionId: string) => void;
}

export function MobileLayout({ children, onNewConversation, onSelectConversation }: MobileLayoutProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  if (!user || !isMobile) {
    return <>{children}</>;
  }

  const navigationItems = [
    {
      id: 'history',
      icon: ListRestart,
      label: 'History',
      action: () => {}
    },
    {
      id: 'discover',
      icon: MapPin,
      label: 'Discover',
      action: () => setLocation('/cultural-discovery')
    },
    {
      id: 'new',
      icon: CirclePlus,
      label: 'New',
      action: onNewConversation || (() => setLocation('/'))
    },
    {
      id: 'notes',
      icon: BookOpen,
      label: 'Notes',
      action: () => setLocation('/notes')
    },
    {
      id: 'courses',
      icon: GraduationCap,
      label: 'Courses',
      action: () => setLocation('/micro-courses')
    }
  ];

  const getActiveId = () => {
    if (location === '/') return 'new';
    if (location.startsWith('/cultural-discovery')) return 'discover';
    if (location.startsWith('/notes')) return 'notes';
    if (location.startsWith('/micro-courses')) return 'courses';
    return '';
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky Header - GiffGaff Style Dark */}
      <header className="sticky top-0 z-50 h-20 bg-gray-900 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="w-10"></div> {/* Spacer for centering */}
          <RefynLogo size={94} showTitle={false} />
          <div className="flex items-center space-x-2">
            <PWAInstallButton />
            <ProfileDialog>
              <Button variant="ghost" size="sm" className="p-2 text-white hover:bg-gray-800">
                {user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-black" />
                  </div>
                )}
              </Button>
            </ProfileDialog>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={async () => {
                try {
                  // Clear query cache first
                  queryClient.clear();
                  
                  // Call logout API
                  const response = await fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include',
                  });
                  
                  if (response.ok) {
                    // Clear any remaining cache and redirect
                    queryClient.removeQueries();
                    window.location.href = '/';
                  }
                } catch (error) {
                  console.error('Logout error:', error);
                  // Force redirect even if logout fails
                  window.location.href = '/';
                }
              }}
              className="p-2 text-white hover:bg-gray-800"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with padding for sticky footer */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Sticky Footer Navigation - GiffGaff Style Dark */}
      <nav className="sticky bottom-0 z-50 bg-gray-900 py-4 shadow-lg border-t border-gray-800">
        <div className="flex items-center justify-around">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = getActiveId() === item.id;
            
            if (item.id === 'history') {
              return (
                <MobileConversationHistory
                  key={item.id}
                  onSelectConversation={(sessionId: string) => {
                    setLocation(`/?session=${sessionId}`);
                    if (onSelectConversation) {
                      onSelectConversation(sessionId);
                    }
                  }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex flex-col items-center justify-center p-2 min-w-0 flex-1 hover:bg-gray-800 ${
                      isActive ? 'text-primary' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 mb-1" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </Button>
                </MobileConversationHistory>
              );
            }
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={item.action}
                className={`flex flex-col items-center justify-center p-2 min-w-0 flex-1 hover:bg-gray-800 ${
                  isActive ? 'text-primary' : 'text-gray-300 hover:text-white'
                }`}
              >
                <IconComponent className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}