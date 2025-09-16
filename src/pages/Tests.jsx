import React, { useState, useEffect } from 'react';
import { ABTest, Variant, User, Organization, ActivityLog } from '@/api/entities';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  Play, 
  Pause, 
  Eye, 
  MoreVertical,
  TestTube,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle,
  Info,
  Archive
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { validateStatusTransition, getStatusWarning, logStatusChange } from '@/components/tests/TestStatusValidation';
import StatusConfirmationDialog from '@/components/tests/StatusConfirmationDialog';
import { toast } from 'sonner';

const statusConfig = {
  draft: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: null },
  running: { color: 'bg-green-100 text-green-700 border-green-200', icon: Play },
  paused: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Pause },
  completed: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: null },
  archived: { color: 'bg-slate-100 text-slate-500 border-slate-200', icon: null }
};

const filterOptions = [
  { key: 'all', label: 'All Tests' },
  { key: 'running', label: 'Running' },
  { key: 'paused', label: 'Paused' }, 
  { key: 'draft', label: 'Drafts' },
  { key: 'completed', label: 'Completed' }
];

export default function Tests() {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [selectedTests, setSelectedTests] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        
        const allTests = await ABTest.filter(
          { organization_id: currentUser.organization_id },
          '-created_date'
        );
        
        // Get variants for each test to show basic stats
        const testsWithStats = await Promise.all(
          allTests.map(async (test) => {
            const variants = await Variant.filter({ ab_test_id: test.id });
            const totalVisitors = variants.reduce((sum, v) => sum + v.visitor_count, 0);
            const totalConversions = variants.reduce((sum, v) => sum + v.conversion_count, 0);
            const conversionRate = totalVisitors > 0 ? (totalConversions / totalVisitors * 100) : 0;
            
            return {
              ...test,
              totalVisitors,
              conversionRate: conversionRate.toFixed(1),
              variantCount: variants.length,
              variants // Store variants for validation
            };
          })
        );
        
        setTests(testsWithStats);
        setFilteredTests(testsWithStats);
      } catch (error) {
        console.error('Failed to fetch tests:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTests();
  }, []);

  useEffect(() => {
    let filtered = tests;
    
    // Apply status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(test => test.test_status === activeFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(test => 
        test.test_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.test_url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredTests(filtered);
  }, [tests, activeFilter, searchQuery]);

  const getStatusCounts = () => {
    const counts = {};
    filterOptions.forEach(filter => {
      if (filter.key === 'all') {
        counts[filter.key] = tests.length;
      } else {
        counts[filter.key] = tests.filter(test => test.test_status === filter.key).length;
      }
    });
    return counts;
  };

  const updateTestStatus = async (testId, newStatus, skipConfirmation = false) => {
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    // Validate transition
    const validation = validateStatusTransition(test.test_status, newStatus, test.variants);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    // Show confirmation for important changes
    const needsConfirmation = ['completed', 'archived', 'running'].includes(newStatus);
    if (needsConfirmation && !skipConfirmation) {
      setConfirmDialog({
        isOpen: true,
        testId,
        testName: test.test_name,
        newStatus,
        oldStatus: test.test_status
      });
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = { test_status: newStatus };
      if (newStatus === 'running') {
        updateData.started_date = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.ended_date = new Date().toISOString();
      }
      
      await ABTest.update(testId, updateData);
      
      // Log the status change
      await logStatusChange(user, test, test.test_status, newStatus);
      
      // Update local state
      setTests(prev => prev.map(t => 
        t.id === testId ? { ...t, test_status: newStatus, ...updateData } : t
      ));

      // Success message
      const messages = {
        running: 'Test started successfully',
        paused: 'Test has been paused',
        completed: 'Test completed successfully',
        archived: 'Test has been archived'
      };
      toast.success(messages[newStatus] || 'Test status updated');
      
    } catch (error) {
      console.error('Failed to update test status:', error);
      toast.error('Failed to update test status');
    } finally {
      setIsUpdating(false);
      setConfirmDialog({ isOpen: false });
    }
  };

  const handleBulkAction = (action) => {
    const selectedTestsList = Array.from(selectedTests).map(id => tests.find(t => t.id === id));
    
    if (selectedTestsList.length === 0) {
      toast.error('Please select tests first');
      return;
    }

    // Validate all selected tests can perform this action
    for (const test of selectedTestsList) {
      const validation = validateStatusTransition(test.test_status, action, test.variants);
      if (!validation.valid) {
        toast.error(`Cannot ${action} test "${test.test_name}": ${validation.error}`);
        return;
      }
    }

    // Confirm bulk action
    setConfirmDialog({
      isOpen: true,
      isBulk: true,
      testIds: Array.from(selectedTests),
      testNames: selectedTestsList.map(t => t.test_name),
      newStatus: action,
      count: selectedTestsList.length
    });
  };

  const executeBulkAction = async () => {
    setIsUpdating(true);
    try {
      const testIds = confirmDialog.testIds;
      await Promise.all(testIds.map(id => updateTestStatus(id, confirmDialog.newStatus, true)));
      setSelectedTests(new Set());
      toast.success(`${confirmDialog.count} tests updated successfully`);
    } catch (error) {
      toast.error('Some tests failed to update');
    } finally {
      setIsUpdating(false);
      setConfirmDialog({ isOpen: false });
    }
  };

  const toggleTestSelection = (testId) => {
    setSelectedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testId)) {
        newSet.delete(testId);
      } else {
        newSet.add(testId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedTests(new Set(filteredTests.map(t => t.id)));
  };

  const clearSelection = () => {
    setSelectedTests(new Set());
  };

  const getAvailableBulkActions = () => {
    if (selectedTests.size === 0) return [];
    
    const selectedTestsList = Array.from(selectedTests).map(id => tests.find(t => t.id === id));
    const actions = [];
    
    // Check if all selected tests can be paused
    if (selectedTestsList.every(test => validateStatusTransition(test.test_status, 'paused', test.variants).valid)) {
      actions.push({ key: 'paused', label: 'Pause Selected', icon: Pause });
    }
    
    // Check if all selected tests can be archived
    if (selectedTestsList.every(test => validateStatusTransition(test.test_status, 'archived', test.variants).valid)) {
      actions.push({ key: 'archived', label: 'Archive Selected', icon: Archive });
    }
    
    return actions;
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">A/B Tests</h1>
          <p className="text-slate-600">Manage and monitor your optimization tests</p>
        </div>
        <Link to={createPageUrl('TestsNew')}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map(filter => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter.key)}
              className={activeFilter === filter.key ? 'bg-blue-600' : ''}
            >
              {filter.label} ({statusCounts[filter.key] || 0})
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search tests by name or URL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTests.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-blue-900">
                {selectedTests.size} test{selectedTests.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                {getAvailableBulkActions().map(action => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.key}
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkAction(action.key)}
                      disabled={isUpdating}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAllVisible}>
                Select All Visible
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tests List */}
      {filteredTests.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <TestTube className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {activeFilter === 'all' ? 'Ready to optimize?' : `No ${activeFilter} tests found`}
            </h3>
            <p className="text-slate-600 mb-6">
              {activeFilter === 'all' 
                ? 'Create your first A/B test and start improving your conversion rates'
                : 'Try adjusting your filters or search query'
              }
            </p>
            {activeFilter === 'all' && (
              <Link to={createPageUrl('TestsNew')}>
                <Button size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Test
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTests.map(test => {
            const status = statusConfig[test.test_status];
            const warning = getStatusWarning(test, test.variants);
            return (
              <Card key={test.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedTests.has(test.id)}
                      onCheckedChange={() => toggleTestSelection(test.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link 
                          to={createPageUrl(`TestDetail?id=${test.id}`)}
                          className="text-xl font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {test.test_name}
                        </Link>
                        <Badge className={`${status.color} border text-xs`}>
                          {status.icon && <status.icon className="w-3 h-3 mr-1" />}
                          {test.test_status.charAt(0).toUpperCase() + test.test_status.slice(1)}
                        </Badge>
                        {warning && (
                          <Badge variant="outline" className={`text-xs ${
                            warning.type === 'warning' ? 'border-yellow-500 text-yellow-700' : 'border-blue-500 text-blue-700'
                          }`}>
                            {warning.type === 'warning' ? (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            ) : (
                              <Info className="w-3 h-3 mr-1" />
                            )}
                            {warning.message}
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm mb-3">{test.test_url}</p>
                      
                      {/* Mini Stats */}
                      <div className="flex gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{test.totalVisitors}</span>
                          <span className="text-slate-500">visitors</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{test.conversionRate}%</span>
                          <span className="text-slate-500">conversion</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TestTube className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{test.variantCount}</span>
                          <span className="text-slate-500">variants</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Link to={createPageUrl(`TestDetail?id=${test.id}`)}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={test.test_status === 'draft'}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Results
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={isUpdating}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {test.test_status === 'draft' && (
                            <DropdownMenuItem onClick={() => updateTestStatus(test.id, 'running')}>
                              <Play className="w-4 h-4 mr-2" />
                              Launch Test
                            </DropdownMenuItem>
                          )}
                          {test.test_status === 'running' && (
                            <DropdownMenuItem onClick={() => updateTestStatus(test.id, 'paused')}>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause Test
                            </DropdownMenuItem>
                          )}
                          {test.test_status === 'paused' && (
                            <>
                              <DropdownMenuItem onClick={() => updateTestStatus(test.id, 'running')}>
                                <Play className="w-4 h-4 mr-2" />
                                Resume Test
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateTestStatus(test.id, 'completed')}>
                                End Test
                              </DropdownMenuItem>
                            </>
                          )}
                          {(test.test_status === 'running' || test.test_status === 'paused') && (
                            <DropdownMenuItem onClick={() => updateTestStatus(test.id, 'completed')}>
                              Complete Test
                            </DropdownMenuItem>
                          )}
                          {test.test_status === 'completed' && (
                            <DropdownMenuItem onClick={() => updateTestStatus(test.id, 'archived')}>
                              <Archive className="w-4 h-4 mr-2" />
                              Archive Test
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <StatusConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false })}
        onConfirm={confirmDialog.isBulk ? executeBulkAction : () => updateTestStatus(confirmDialog.testId, confirmDialog.newStatus, true)}
        newStatus={confirmDialog.newStatus}
        testName={confirmDialog.isBulk ? `${confirmDialog.count} tests` : confirmDialog.testName}
        isLoading={isUpdating}
      />
    </div>
  );
}