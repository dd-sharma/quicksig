
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Play, Pause, CheckCircle, Archive, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { User } from "@/api/entities"; // add import

const statusIcons = {
  draft: FileText,
  running: Play,
  paused: Pause,
  completed: CheckCircle,
  archived: Archive
};

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  running: 'bg-green-100 text-green-700', 
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-slate-100 text-slate-500'
};

export default function TestTimeline({ test, activities = [] }) {
  // Derive actor label helper (cannot list all users; show "You" when applicable)
  const [me, setMe] = React.useState(null);
  React.useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setMe(u);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  const timelineEvents = [
    {
      date: test.created_date,
      status: 'draft',
      description: 'Test created',
      user_id: test.created_by || null
    }
  ];

  // Add status change events from activities
  activities.forEach(activity => {
    if (activity.action_description.includes('status from')) {
      const match = activity.action_description.match(/status from (\w+) to (\w+)/);
      if (match) {
        timelineEvents.push({
          date: activity.created_date,
          status: match[2],
          description: `Status changed to ${match[2]}`,
          user_id: activity.user_id || null
        });
      }
    }
  });

  // Add started/ended/archived dates if available
  if (test.started_date && !timelineEvents.find(e => e.status === 'running')) {
    timelineEvents.push({
      date: test.started_date,
      status: 'running',
      description: 'Test started',
      user_id: null
    });
  }

  if (test.ended_date && !timelineEvents.find(e => e.status === 'completed')) {
    timelineEvents.push({
      date: test.ended_date,
      status: 'completed',
      description: 'Test completed',
      user_id: null
    });
  }

  if (test.is_archived && test.archived_at && !timelineEvents.find(e => e.status === 'archived')) {
    timelineEvents.push({
      date: test.archived_at,
      status: 'archived',
      description: 'Test archived',
      user_id: test.archived_by || null
    });
  }

  // Sort by date
  timelineEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (timelineEvents.length <= 1) {
    return null; // Don't show timeline for tests with no status changes
  }

  const actorLabel = (uid) => {
    if (!uid) return "System";
    if (me && uid === me.id) return "You";
    return `User ${String(uid).slice(0, 6)}...`;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Test Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {timelineEvents.map((event, index) => {
            const Icon = statusIcons[event.status];
            return (
              <div key={index} className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${statusColors[event.status]}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{event.description}</span>
                    <Badge variant="outline" className="text-xs">
                      {event.status}
                    </Badge>
                    <span className="text-xs text-slate-500">· {actorLabel(event.user_id)}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {format(new Date(event.date), 'MMM d, yyyy \'at\' h:mm a')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
