

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  BarChart3,
  Settings,
  Users,
  Plus,
  ChevronDown,
  Bell,
  Search,
  Home,
  TestTube,
  Target,
  Building,
  LogOut,
  User as UserIcon,
  HelpCircle,
  Loader2,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  Archive,
  Download as DownloadIcon,
  User as UserIcon2,
  MoreHorizontal,
  Menu,
  X
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner"; // Added import
import DemoDataService from "@/components/services/DemoDataService"; // Added import

import { User, Organization } from "@/api/entities";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import UsageBadge from "@/components/quota/UsageBadge";
import GracePeriodService from "@/components/services/GracePeriodService";
import QuotaAlertsService from "@/components/services/QuotaAlertsService";
import HelpWidget from "@/components/HelpWidget";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import { useResponsive } from "@/components/hooks/useResponsive";
import OfflineIndicator from "@/components/mobile/OfflineIndicator";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Home,
  },
  {
    title: "A/B Tests",
    url: createPageUrl("Tests"),
    icon: TestTube,
  },
  {
    title: "Test History",
    url: createPageUrl("TestHistory"),
    icon: Archive,
  },
  {
    title: "Results Dashboard",
    url: createPageUrl("ResultsDashboard"),
    icon: TrendingUp,
  },
  {
    title: "Projects",
    url: createPageUrl("Projects"),
    icon: Target,
  },
  {
    title: "Analytics",
    url: createPageUrl("Analytics"),
    icon: BarChart3,
  },
  {
    title: "Export Center",
    url: createPageUrl("ExportCenter"),
    icon: DownloadIcon,
  },
  {
    title: "Documentation",
    url: createPageUrl("Documentation"),
    icon: BookOpen,
  },
];

function MainLayout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [grace, setGrace] = useState({ inGracePeriod: false, hoursRemaining: 24 });
  const { isMobile } = useResponsive();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const startXRef = React.useRef(null);

  // Swipe to close drawer
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onTouchStart = (e) => { startXRef.current = e.touches?.[0]?.clientX || 0; };
    const onTouchMove = (e) => {
      const dx = (e.touches?.[0]?.clientX || 0) - (startXRef.current || 0);
      if (dx < -60) setMobileNavOpen(false);
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const fetchUserAndOrg = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        if (currentUser.organization_id) {
          const org = await Organization.get(currentUser.organization_id);
          setOrganization(org);

          const g = await GracePeriodService.checkGracePeriod(org.id);
          setGrace(g);

          if (currentUser?.email) {
            const alertResult = await QuotaAlertsService.checkAndNotify(org.id, currentUser.email);
            if (!alertResult?.success) {
              console.error("Failed to check quota alerts:", alertResult?.error);
            }
          }

          if (g.inGracePeriod === false && org.quota_exceeded_at) {
            const exceededTime = new Date(org.quota_exceeded_at).getTime();
            const currentTime = new Date().getTime();
            const hoursSinceExceeded = (currentTime - exceededTime) / (1000 * 60 * 60);
            if (hoursSinceExceeded >= 24) {
              await GracePeriodService.handleGracePeriodExpired(org.id);
            }
          }
        }
      } catch (e) {
        // ProtectedRoute will handle unauthenticated state
      }
      setIsLoading(false);
    };
    fetchUserAndOrg();
  }, [location.pathname]);

  useEffect(() => {
    // Register service worker for basic offline caching (no-op if not supported)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const handleLogout = async () => {
    await User.logout();
    navigate(createPageUrl('Login'));
  };

  const handleExitDemo = async () => {
    if (!organization?.id) return;
    const ok = window.confirm("Exit Demo Mode? All demo data will be removed.");
    if (!ok) return;
    await DemoDataService.exitDemoMode(organization.id);
    toast.success("Exited demo mode. Demo data removed.");
    window.location.reload();
  };

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar className="border-r border-slate-200 bg-white">
            <SidebarHeader className="border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b8706eb327a0a001504a4a/17d93696f_QuickSig_logo.png"
                  alt="QuickSig Logo"
                  className="w-[65px] h-[65px]"
                />
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">QuickSig</h2>
                  <p className="text-xs text-slate-500">A/B Testing Platform</p>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="p-4">
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-2">
                  Main Navigation
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-slate-500 uppercase tracking-wider px-2 py-2">
                  Organization
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-3 py-2">
                    <div className="w-full justify-between h-auto p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building className="w-4 h-4 text-slate-500" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-slate-900">{organization?.name || 'Loading...'}</div>
                          <div className="text-xs text-slate-500 capitalize">{organization?.subscription_tier || 'Loading...'} Plan</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                  <span className="text-slate-600 font-medium text-sm">{user?.full_name?.[0] || 'U'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>
        </div>

        <main className="flex-1 flex flex-col pb-16 md:pb-0">
          {/* Global CSS helpers for touch + typography */}
          <style>{`
            .touch-manipulation {
              touch-action: manipulation;
              -webkit-tap-highlight-color: transparent;
              -webkit-user-select: none;
            }
            button, .btn {
              min-height: 44px;
              min-width: 44px;
            }
            html { font-size: 16px; }
            h1 { font-size: clamp(1.25rem, 2vw, 2rem); line-height: 1.2; }
            h2 { font-size: clamp(1.125rem, 1.8vw, 1.5rem); line-height: 1.25; }
            h3 { font-size: clamp(1rem, 1.6vw, 1.25rem); line-height: 1.3; }
            .mobile-safe-bottom { padding-bottom: calc(env(safe-area-inset-bottom) + 56px); }
          `}</style>

          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Mobile hamburger */}
                <button
                  className="md:hidden p-2 rounded-lg hover:bg-slate-100"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu className="w-6 h-6" />
                </button>
                {/* Existing sidebar trigger */}
                <SidebarTrigger className="hidden md:inline-flex hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
                <div className="relative max-w-md w-full hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search tests, projects..."
                    className="pl-10 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4">
                <div className="hidden md:block"><UsageBadge /></div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="Help" className="hidden md:inline-flex">
                      <HelpCircle className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuItem asChild><Link to={createPageUrl('Documentation')}>Documentation Home</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to={createPageUrl('DocsInstallationGuide')}>Installation Guide</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to={createPageUrl('DocsTroubleshooting')}>Troubleshooting</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to={createPageUrl('DocsFAQ')}>FAQ</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.dispatchEvent(new Event('qs:tour:start'))}>
                      Take Product Tour
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild><a href="mailto:support@quicksig.co">Contact Support</a></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <span>{user?.full_name || 'Guest'}</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild><Link to={createPageUrl('Profile')} className="flex items-center"><UserIcon className="w-4 h-4 mr-2" /> Profile</Link></DropdownMenuItem>
                    {user?.role === 'admin' && (
                      <>
                        <DropdownMenuItem asChild><Link to={createPageUrl('SettingsOrganization')} className="flex items-center"><Settings className="w-4 h-4 mr-2" /> Org Settings</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to={createPageUrl('SettingsTeam')} className="flex items-center"><Users className="w-4 h-4 mr-2" /> Team</Link></DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem asChild><Link to={createPageUrl('Documentation')} className="flex items-center"><BookOpen className="w-4 h-4 mr-2" /> Documentation</Link></DropdownMenuItem>
                    <DropdownMenuItem><HelpCircle className="w-4 h-4 mr-2" /> Help & Support</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" /> Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Demo Mode Banner */}
          {organization?.is_demo_mode && (
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
                <div>🎮 Demo Mode Active - Exploring with sample data</div>
                <Button size="sm" variant="secondary" className="bg-white text-purple-700 hover:bg-purple-50" onClick={handleExitDemo}>
                  Exit Demo
                </Button>
              </div>
            </div>
          )}

          <OfflineIndicator />

          {grace.inGracePeriod && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    Visitor quota exceeded. Tests will auto-pause in {Math.ceil(grace.hoursRemaining)} hours.
                  </span>
                </div>
                <Link to={createPageUrl('PlanManagement')}>
                  <Button size="sm" variant="outline" className="text-yellow-800 border-yellow-300 bg-yellow-100 hover:bg-yellow-200">Upgrade Now</Button>
                </Link>
              </div>
            </div>
          )}

          <div className={`flex-1 overflow-auto bg-slate-50 ${isMobile ? 'mobile-safe-bottom' : ''}`}>
            {children}
          </div>

          {/* Mobile bottom navigation */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-[env(safe-area-inset-bottom)]">
            <nav className="flex justify-around py-1.5">
              <Link to={createPageUrl("Dashboard")} className="flex flex-col items-center p-2 min-w-[64px]">
                <Home className="w-6 h-6" />
                <span className="text-xs mt-1">Dashboard</span>
              </Link>
              <Link to={createPageUrl("Tests")} className="flex flex-col items-center p-2 min-w-[64px]">
                <TestTube className="w-6 h-6" />
                <span className="text-xs mt-1">Tests</span>
              </Link>
              <Link to={createPageUrl("ResultsDashboard")} className="flex flex-col items-center p-2 min-w-[64px]">
                <TrendingUp className="w-6 h-6" />
                <span className="text-xs mt-1">Results</span>
              </Link>
              <Link to={createPageUrl("Profile")} className="flex flex-col items-center p-2 min-w-[64px]">
                <UserIcon2 className="w-6 h-6" />
                <span className="text-xs mt-1">Profile</span>
              </Link>
              <button
                className="flex flex-col items-center p-2 min-w-[64px]"
                onClick={() => setMobileNavOpen(true)}
              >
                <MoreHorizontal className="w-6 h-6" />
                <span className="text-xs mt-1">More</span>
              </button>
            </nav>
          </div>

          {/* Full-screen mobile navigation drawer */}
          {mobileNavOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
              <div className="absolute top-0 bottom-0 left-0 right-0 bg-white">
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b8706eb327a0a001504a4a/17d93696f_QuickSig_logo.png"
                      alt="QuickSig"
                      className="w-8 h-8"
                    />
                    <span className="font-semibold">QuickSig</span>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-slate-100" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-2">
                  <ul className="divide-y">
                    {navigationItems.map((item) => (
                      <li key={item.title}>
                        <Link
                          to={item.url}
                          className="flex items-center gap-3 p-4 text-slate-800 active:bg-slate-50"
                          onClick={() => setMobileNavOpen(false)}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        to={createPageUrl('Profile')}
                        className="flex items-center gap-3 p-4 text-slate-800 active:bg-slate-50"
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <UserIcon className="w-5 h-5" />
                        <span className="font-medium">Profile</span>
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="p-4 border-t text-xs text-slate-500">
                  Swipe left to close • Tap outside to dismiss
                </div>
              </div>
            </div>
          )}

          <OnboardingTour />
          <HelpWidget />
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function LayoutWrapper({ children, currentPageName }) {
  const publicPages = ["Onboarding", "Login", "SignUp", "ResetPassword", "Unsubscribe"];
  const isPublicPage = publicPages.includes(currentPageName);

  if (isPublicPage) {
    return children;
  }

  return (
    <ProtectedRoute>
      <MainLayout currentPageName={currentPageName}>
        {children}
      </MainLayout>
    </ProtectedRoute>
  )
}

