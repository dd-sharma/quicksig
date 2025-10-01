import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Play, Pause, CheckCircle, Archive } from 'lucide-react';

const statusMessages = {
  running: {
    title: 'Launch A/B Test',
    description: 'This will start collecting live data from your website visitors. Make sure your tracking code is properly installed.',
    icon: Play,
    action: 'Launch Test',
    variant: 'default'
  },
  completed: {
    title: 'Complete Test',
    description: 'Are you sure you want to end this test? Once completed, you won\'t be able to restart it or collect additional data.',
    icon: CheckCircle,
    action: 'Complete Test',
    variant: 'destructive'
  },
  archived: {
    title: 'Archive Test',
    description: 'Archived tests are moved to long-term storage and removed from your active workspace. You can still view results but cannot make changes.',
    icon: Archive,
    action: 'Archive Test',
    variant: 'destructive'
  },
  paused: {
    title: 'Pause Test',
    description: 'This will temporarily stop data collection. You can resume the test at any time.',
    icon: Pause,
    action: 'Pause Test',
    variant: 'outline'
  }
};

export default function StatusConfirmationDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  newStatus, 
  testName,
  isLoading = false 
}) {
  const config = statusMessages[newStatus];
  
  if (!config) return null;

  const Icon = config.icon;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {config.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium">"{testName}"</span>
            <br />
            <br />
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            variant={config.variant}
            disabled={isLoading}
            className={config.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isLoading ? 'Processing...' : config.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}