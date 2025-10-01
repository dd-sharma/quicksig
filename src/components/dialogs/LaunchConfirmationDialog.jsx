import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function LaunchConfirmationDialog({
  open, onOpenChange, summary, canLaunch, onLaunch, onDraft
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Launch</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="bg-slate-50 p-3 rounded">
            <div className="font-medium mb-1">Configuration Summary</div>
            <ul className="list-disc ml-5 space-y-1">
              <li>Name: {summary?.test_name || "-"}</li>
              <li>URL: {summary?.test_url || "-"}</li>
              <li>Variants: {summary?.variants?.length || 0}</li>
              <li>Success metric: {summary?.success_metric?.type || "-"}</li>
              <li>Estimated days: {summary?.estDurationDays ?? "-"}</li>
            </ul>
          </div>
          <div className="text-xs text-slate-600">
            Results will be locked initially to prevent peeking bias. Ensure your tracking code is installed on the tested page.
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDraft}>Save as Draft</Button>
          <Button disabled={!canLaunch} onClick={onLaunch} className="bg-green-600 hover:bg-green-700">Launch Test</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}