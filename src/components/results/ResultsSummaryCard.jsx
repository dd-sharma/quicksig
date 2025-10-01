import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Calendar, Users, Target, BarChart, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

const ResultsSummaryCard = ({ summary }) => {
  if (!summary) return null;

  const recommendationConfig = {
    continue: {
      icon: TrendingUp,
      color: 'text-blue-600',
      text: 'Continue testing'
    },
    winner: {
      icon: CheckCircle,
      color: 'text-green-600',
      text: 'Ready to declare winner'
    },
    inconclusive: {
      icon: AlertTriangle,
      color: 'text-yellow-600',
      text: 'Test inconclusive'
    }
  };

  const RecoIcon = recommendationConfig[summary.recommendation.type]?.icon || Info;
  const recoColor = recommendationConfig[summary.recommendation.type]?.color || 'text-slate-600';
  const recoText = recommendationConfig[summary.recommendation.type]?.text || 'Review results';

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Results Summary
          {summary.isLive && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric Cards */}
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Calendar className="w-4 h-4" />
            <span>Test Duration</span>
          </div>
          <p className="text-2xl font-bold">{summary.duration} days</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Users className="w-4 h-4" />
            <span>Total Visitors</span>
          </div>
          <p className="text-2xl font-bold">{summary.totalVisitors.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <Target className="w-4 h-4" />
            <span>Best Performer</span>
          </div>
          <p className="text-2xl font-bold">{summary.bestPerformer?.variant_name || 'N/A'}</p>
          {summary.bestPerformer && (
            <p className="text-sm text-green-600">
              {summary.bestPerformer.uplift.toFixed(1)}% uplift
            </p>
          )}
        </div>
        
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <BarChart className="w-4 h-4" />
            <span>Confidence</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Probability that the results are not due to random chance.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-bold">{(summary.confidence * 100).toFixed(1)}%</p>
          <Progress value={summary.confidence * 100} className="mt-1 h-2" />
        </div>
      </CardContent>
      <CardContent>
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
            recoText === 'Ready to declare winner' ? 'bg-green-50' : 
            recoText === 'Test inconclusive' ? 'bg-yellow-50' : 'bg-blue-50'
        }`}>
          <RecoIcon className={`w-6 h-6 ${recoColor}`} />
          <div>
            <p className={`font-semibold ${recoColor}`}>{recoText}</p>
            <p className="text-sm text-slate-600">{summary.recommendation.message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ResultsSummaryCard;