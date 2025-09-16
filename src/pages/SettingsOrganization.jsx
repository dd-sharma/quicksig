import React, { useState, useEffect } from 'react';
import { User, Organization } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Building, LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SettingsOrganization() {
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [orgName, setOrgName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(false);
    };
    checkAdmin();
  }, [navigate]);
  
  const handleUpdate = async () => {
    await Organization.update(org.id, { name: orgName, website_url: websiteUrl });
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
    </div>
  );
}