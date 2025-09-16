
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Play, 
  Pause, 
  Plus,
  ExternalLink,
  Calendar,
  Activity,
  Award,
  BarChart3
} from "lucide-react";

import StatsOverview from "../components/dashboard/StatsOverview";
import ActiveTests from "../components/dashboard/ActiveTests";
import RecentResults from "../components/dashboard/RecentResults";
import QuickActions from "../components/dashboard/QuickActions";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome to QuickSig 👋
            </h1>
            <p className="text-slate-600">
              Your A/B testing dashboard is ready.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500">
              {currentTime.toLocaleDateString()}
            </div>
            <div className="text-xl font-mono text-slate-700">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full transform -translate-x-10 translate-y-10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">Ready to boost your conversions?</h2>
                <p className="text-blue-100 mb-4">
                  Start running A/B tests and get data-driven insights for your website
                </p>
                <Button className="bg-white text-blue-600 hover:bg-blue-50">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Test
                </Button>
              </div>
              <div className="hidden md:block">
                <BarChart3 className="w-24 h-24 text-white/20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview />

      {/* Main Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <ActiveTests />
          <RecentResults />
        </div>
        <div className="space-y-6">
          <QuickActions />
          
          {/* Usage Summary */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                Usage Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Tests this month</span>
                  <span className="font-semibold">3 / 50</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '6%'}}></div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Professional Plan</span>
                  <Button variant="outline" size="sm">
                    Upgrade
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Homepage Banner Test completed</p>
                    <p className="text-xs text-slate-500">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">New visitor from Google Ads</p>
                    <p className="text-xs text-slate-500">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Checkout Flow Test paused</p>
                    <p className="text-xs text-slate-500">1 day ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
