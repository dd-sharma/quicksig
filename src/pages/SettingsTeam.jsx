import React, { useState, useEffect } from 'react';
import { User, Organization } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, UserPlus, Shield, Eye, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function SettingsTeam() {
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const [org, setOrg] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const user = await User.me();
      if (user.role !== 'admin') {
        navigate(createPageUrl('Dashboard'));
        return;
      }
      setCurrentUser(user);
      
      const currentOrg = await Organization.get(user.organization_id);
      setOrg(currentOrg);
      
      const teamMembers = await User.filter({ organization_id: user.organization_id });
      setTeam(teamMembers);
      
      setIsLoading(false);
    };
    fetchData();
  }, [navigate]);

  const handleRoleChange = async (userId, newRole) => {
    const isBaseAdmin = newRole === 'admin';
    const newAppRole = isBaseAdmin ? null : newRole;

    await User.update(userId, { role: isBaseAdmin ? 'admin' : 'user', app_role: newAppRole });
    
    setTeam(prevTeam => prevTeam.map(member => 
      member.id === userId ? { ...member, role: isBaseAdmin ? 'admin' : 'user', app_role: newAppRole } : member
    ));
    alert("User role updated.");
  };

  const getRoleValue = (member) => {
    return member.role === 'admin' ? 'admin' : member.app_role || 'editor';
  };
  
  const canInvite = org?.subscription_tier === 'free' && team.length >= (org?.member_limit || 3);

  if (isLoading) {
    return <div className="p-6"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
        <p className="text-slate-500">Invite and manage your team members.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Invite New Members</CardTitle>
              <CardDescription>Add new members to your organization.</CardDescription>
            </div>
            {canInvite && (
                <Button disabled>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-100 p-4 rounded-lg text-sm text-slate-700">
            <p className="font-semibold mb-2">How to invite members:</p>
            <p>To invite new members to your team, please go to the Base44 Dashboard &gt; Users &gt; and click 'Invite User'. They will automatically be added to your organization.</p>
            {canInvite && (
              <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                <div>
                    <p className="font-semibold">Team Limit Reached</p>
                    <p>Upgrade to a Professional plan to add more members.</p>
                </div>
                <Button size="sm" className="ml-auto bg-yellow-500 hover:bg-yellow-600">Upgrade</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({team.length})</CardTitle>
          <CardDescription>Manage roles for your existing team members.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Select 
                      value={getRoleValue(member)} 
                      onValueChange={(value) => handleRoleChange(member.id, value)}
                      disabled={member.id === currentUser.id && member.role === 'admin'}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin"><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4"/>Admin</div></SelectItem>
                        <SelectItem value="editor"><div className="flex items-center gap-2"><Shield className="w-4 h-4"/>Editor</div></SelectItem>
                        <SelectItem value="viewer"><div className="flex items-center gap-2"><Eye className="w-4 h-4"/>Viewer</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}