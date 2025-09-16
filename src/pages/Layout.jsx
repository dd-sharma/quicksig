

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
  AlertTriangle
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

import { User, Organization } from "@/api/entities";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import UsageBadge from "@/components/quota/UsageBadge";
import GracePeriodService from "@/components/services/GracePeriodService";


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
];

function MainLayout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [grace, setGrace] = useState({ inGracePeriod: false, hoursRemaining: 24 });


  useEffect(() => {
    const fetchUserAndOrg = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        if (currentUser.organization_id) {
          const org = await Organization.get(currentUser.organization_id);
          setOrganization(org);

          // Check grace period if we have an org
          const g = await GracePeriodService.checkGracePeriod(org.id);
          setGrace(g);

          // If grace has expired, enforce auto-pause
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
        // Handled by ProtectedRoute, typically means user is not authenticated
        // For development, you might log the error: console.error("Failed to fetch user/org:", e);
      }
      setIsLoading(false);
    };
    fetchUserAndOrg();
  }, [location.pathname]); // Re-fetch if the route changes, in case user/org state needs to be refreshed.

  const handleLogout = async () => {
    await User.logout();
    navigate(createPageUrl('Login')); // Or wherever base44 redirects after logout
  };

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8" /></div>
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
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

        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200 lg:hidden" />
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search tests, projects..."
                    className="pl-10 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Usage badge */}
                <UsageBadge />
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Test
                </Button>
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
                    <DropdownMenuItem><HelpCircle className="w-4 h-4 mr-2" /> Help & Support</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" /> Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Persistent quota/grace banner */}
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

          {/* Main content area */}
          <div className="flex-1 overflow-auto bg-slate-50">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}


export default function LayoutWrapper({ children, currentPageName }) {
  const publicPages = ["Onboarding", "Login", "SignUp", "ResetPassword"]; // Added common public pages
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

