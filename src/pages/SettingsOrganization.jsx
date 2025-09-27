
import React, { useState, useEffect } from 'react';
import { User, Organization } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Building, LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import HelpTooltip from "@/components/ui/HelpTooltip"; // Added HelpTooltip import

export default function SettingsOrganization() {
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [autoArchiveDays, setAutoArchiveDays] = useState(60);
  const [autoArchiveNotify, setAutoArchiveNotify] = useState(true);
  const [autoDeleteAfterYear, setAutoDeleteAfterYear] = useState(false);
  // NEW fields
  const [strictMode, setStrictMode] = useState(false);
  const [requireHyp, setRequireHyp] = useState(false);
  const [minDuration, setMinDuration] = useState(7);
  const [lockUntilSig, setLockUntilSig] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [notifyEarlyStop, setNotifyEarlyStop] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await User.me();
      if (user.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }
      
      const currentOrg = await Organization.get(user.organization_id);
      setOrg(currentOrg);
      setOrgName(currentOrg.name);
      setWebsiteUrl(currentOrg.website_url);
      setAutoArchiveDays(currentOrg.auto_archive_days ?? 60);
      setAutoArchiveNotify(Boolean(currentOrg.auto_archive_notify ?? true));
      setAutoDeleteAfterYear(Boolean(currentOrg.auto_delete_after_year ?? false));
      // NEW fields
      setStrictMode(Boolean(currentOrg.strict_mode_enabled ?? false));
      setRequireHyp(Boolean(currentOrg.require_hypothesis ?? false));
      setMinDuration(Number(currentOrg.min_test_duration_days ?? 7));
      setLockUntilSig(Boolean(currentOrg.lock_results_until_significance ?? true));
      setRequireApproval(Boolean(currentOrg.require_approval_for_launch ?? false));
      setNotifyEarlyStop(Boolean(currentOrg.notify_on_early_stop ?? true));
      setIsLoading(false);
    };
    checkAdmin();
  }, [navigate]);
  
  const handleUpdate = async () => {
    await Organization.update(org.id, { 
      name: orgName, 
      website_url: websiteUrl,
      auto_archive_days: Number(autoArchiveDays) || 0,
      auto_archive_notify: Boolean(autoArchiveNotify),
      auto_delete_after_year: Boolean(autoDeleteAfterYear),
      // NEW fields
      strict_mode_enabled: Boolean(strictMode),
      require_hypothesis: Boolean(requireHyp),
      min_test_duration_days: Number(minDuration) || 0,
      lock_results_until_significance: Boolean(lockUntilSig),
      require_approval_for_launch: Boolean(requireApproval),
      notify_on_early_stop: Boolean(notifyEarlyStop),
    });
    alert("Organization updated!");
  };

  if (isLoading) {
    return <div className="p-6"><Loader2 className="animate-spin" /></div>;
  }
  
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Organization Settings</h1>
        <p className="text-slate-500">Manage your workspace details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Details</CardTitle>
          <CardDescription>Update your organization's name and website.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="orgName">Organization Name</label>
            <Input id="orgName" value={orgName} onChange={e => setOrgName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label htmlFor="websiteUrl">Website URL</label>
            <Input id="websiteUrl" type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
          </div>
          <Button onClick={handleUpdate}>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation & Archiving</CardTitle>
          <CardDescription>Control how completed tests are archived.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="autoArchiveDays" className="text-sm text-slate-700">Auto-archive after (days)</label>
            <Input id="autoArchiveDays" type="number" min="0" value={autoArchiveDays} onChange={e => setAutoArchiveDays(e.target.value)} />
            <div className="text-xs text-slate-500">Set to 0 for Never.</div>
          </div>
          <div className="flex items-center gap-2">
            <input id="notify" type="checkbox" checked={autoArchiveNotify} onChange={e => setAutoArchiveNotify(e.target.checked)} />
            <label htmlFor="notify" className="text-sm text-slate-700">Email notify before auto-archive</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="delete" type="checkbox" checked={autoDeleteAfterYear} onChange={e => setAutoDeleteAfterYear(e.target.checked)} />
            <label htmlFor="delete" className="text-sm text-slate-700">Delete archived tests after 1 year</label>
          </div>
          <Button onClick={handleUpdate}>Save Changes</Button>
        </CardContent>
      </Card>

      {/* NEW: Mistake Prevention Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Mistake Prevention</CardTitle>
          <CardDescription>Enforce guardrails and team preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <input id="strictMode" type="checkbox" checked={strictMode} onChange={e => setStrictMode(e.target.checked)} />
            <label htmlFor="strictMode" className="text-sm text-slate-700">Strict mode</label>
            <HelpTooltip side="right" content="When enabled, all recommended checks must pass before launching tests. Good for teams." />
          </div>
          <div className="flex items-center gap-2">
            <input id="requireHyp" type="checkbox" checked={requireHyp} onChange={e => setRequireHyp(e.target.checked)} />
            <label htmlFor="requireHyp" className="text-sm text-slate-700">Require documented hypothesis</label>
            <HelpTooltip side="right" content="Encourages clear learning by documenting what you expect to happen and why." />
          </div>
          <div className="space-y-1"> {/* Kept outer div for space-y-1, inner for flex alignment */}
            <div className="flex items-center gap-2">
              <label htmlFor="minDuration" className="text-sm text-slate-700">Minimum test duration (days)</label>
              <HelpTooltip side="right" content="Prevents tests from being stopped too early, ensuring statistical validity." />
            </div>
            <Input id="minDuration" type="number" min="0" value={minDuration} onChange={e => setMinDuration(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input id="lockUntilSig" type="checkbox" checked={lockUntilSig} onChange={e => setLockUntilSig(e.target.checked)} />
            <label htmlFor="lockUntilSig" className="text-sm text-slate-700">Lock results until significance</label>
          </div>
          <div className="flex items-center gap-2">
            <input id="requireApproval" type="checkbox" checked={requireApproval} onChange={e => setRequireApproval(e.target.checked)} />
            <label htmlFor="requireApproval" className="text-sm text-slate-700">Require approval for launch</label>
            <HelpTooltip side="right" content="Require manager approval before launching or stopping tests to maintain quality." />
          </div>
          <div className="flex items-center gap-2">
            <input id="notifyEarlyStop" type="checkbox" checked={notifyEarlyStop} onChange={e => setNotifyEarlyStop(e.target.checked)} />
            <label htmlFor="notifyEarlyStop" className="text-sm text-slate-700">Notify on early stopping</label>
          </div>
          <Button onClick={handleUpdate}>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
