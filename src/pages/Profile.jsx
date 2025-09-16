
import React, { useState, useEffect } from 'react';
import { User, ABTest, ActivityLog } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, User as UserIcon, Activity, TestTube, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [stats, setStats] = useState({ created: 0, active: 0, completed: 0 });
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiPrefs, setAiPrefs] = useState({ projections: true, high_conf_threshold: 95, verbosity: "normal", alerts_enabled: true });


  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        setFullName(currentUser.full_name);

        const userTests = await ABTest.filter({ created_by: currentUser.email });
        setStats({
          created: userTests.length,
          active: userTests.filter(t => t.test_status === 'running').length,
          completed: userTests.filter(t => t.test_status === 'completed').length
        });
        
        const userActivities = await ActivityLog.filter({ user_id: currentUser.id }, '-created_date', 5);
        setActivities(userActivities);

        // init AI prefs safely
        const prefs = currentUser.ai_insights_prefs || {};
        setAiPrefs({
          projections: prefs.projections !== false, // Default to true if not set
          high_conf_threshold: prefs.high_conf_threshold || 95,
          verbosity: prefs.verbosity || "normal",
          alerts_enabled: prefs.alerts_enabled !== false // Default to true if not set
        });

      } catch (error) {
        console.error("Failed to fetch user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleNameUpdate = async () => {
    if(user.full_name === fullName) return;
    await User.updateMyUserData({ full_name: fullName });
    alert("Name updated successfully!");
  };
  
  const handleNotificationChange = async (pref, value) => {
    const updatedPrefs = { ...user.notification_prefs, [pref]: value };
    await User.updateMyUserData({ notification_prefs: updatedPrefs });
    setUser(prev => ({...prev, notification_prefs: updatedPrefs}));
  };

  const saveAIPrefs = async () => {
    await User.updateMyUserData({ ai_insights_prefs: aiPrefs });
    alert("AI Insights settings saved.");
  };

  if (isLoading) {
    return <div className="p-6"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500">Manage your account settings and preferences.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-blue-600" />Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Full Name</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <p className="text-slate-700 p-2 bg-slate-100 rounded-md">{user.email}</p>
            </div>
             <Button onClick={handleNameUpdate}>Update Name</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-blue-600" />Your Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="flex justify-between items-center"><span className="text-slate-600">Tests Created</span> <span className="font-bold">{stats.created}</span></div>
             <div className="flex justify-between items-center"><span className="text-slate-600">Active Tests</span> <span className="font-bold">{stats.active}</span></div>
             <div className="flex justify-between items-center"><span className="text-slate-600">Completed Tests</span> <span className="font-bold">{stats.completed}</span></div>
          </CardContent>
        </Card>

        <Card>
           <CardHeader>
            <CardTitle className="flex items-center gap-2">Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label>Test Completions</label>
              <Switch checked={user.notification_prefs?.test_completion} onCheckedChange={val => handleNotificationChange('test_completion', val)} />
            </div>
            <div className="flex items-center justify-between">
              <label>Weekly Summaries</label>
              <Switch checked={user.notification_prefs?.weekly_summary} onCheckedChange={val => handleNotificationChange('weekly_summary', val)} />
            </div>
            <div className="flex items-center justify-between">
              <label>Team Invitations</label>
              <Switch checked={user.notification_prefs?.team_invitations} onCheckedChange={val => handleNotificationChange('team_invitations', val)} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>AI Insights Settings</CardTitle>
          <CardDescription>Configure how AI insights are presented.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projections-switch">Show monetary projections</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Enable AI to project potential monetary gains.</span>
              <Switch id="projections-switch" checked={aiPrefs.projections} onCheckedChange={(v) => setAiPrefs(prev => ({ ...prev, projections: v }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confidence-threshold">High confidence threshold</Label>
            <Select value={String(aiPrefs.high_conf_threshold)} onValueChange={(v) => setAiPrefs(prev => ({ ...prev, high_conf_threshold: Number(v) }))}>
              <SelectTrigger id="confidence-threshold" className="w-40"><SelectValue placeholder="Threshold" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="90">90%</SelectItem>
                <SelectItem value="95">95%</SelectItem>
                <SelectItem value="99">99%</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600">Insights with confidence above this threshold will be highlighted.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="verbosity-select">Verbosity</Label>
            <Select value={aiPrefs.verbosity} onValueChange={(v) => setAiPrefs(prev => ({ ...prev, verbosity: v }))}>
              <SelectTrigger id="verbosity-select" className="w-40"><SelectValue placeholder="Verbosity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-600">Control the level of detail in AI-generated insights.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="alerts-switch">Alerts enabled</Label>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Receive proactive alerts for significant test outcomes.</span>
              <Switch id="alerts-switch" checked={aiPrefs.alerts_enabled} onCheckedChange={(v) => setAiPrefs(prev => ({ ...prev, alerts_enabled: v }))} />
            </div>
          </div>
          <Button onClick={saveAIPrefs}>Save AI Settings</Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your last 5 actions in this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
            <ul className="space-y-3">
                {activities.map(activity => (
                    <li key={activity.id} className="flex items-center gap-3 text-sm">
                       <div className="p-1.5 bg-slate-100 rounded-full"><Activity className="w-4 h-4 text-slate-500" /></div>
                       <span className="text-slate-700">{activity.action_description}</span>
                       <span className="ml-auto text-slate-400">{format(new Date(activity.created_date), "MMM d, p")}</span>
                    </li>
                ))}
            </ul>
        </CardContent>
      </Card>
    </div>
  );
}
