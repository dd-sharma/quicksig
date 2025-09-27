import React from "react";
import { X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export default function MobileDecisionSheet({ isOpen, onClose, title, children, actions }) {
  const mobile = isMobile();

  if (!mobile) {
    return (
      <Dialog open={isOpen} onOpenChange={(v) => !v && onClose?.()}>
        <DialogContent>{children}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="sm:max-w-[425px] bottom-0 top-auto translate-y-0 rounded-t-2xl rounded-b-none">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-slate-400 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {children}
        </div>

        {Array.isArray(actions) && actions.length > 0 && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            {actions.map((action, i) => (
              <Button
                key={i}
                variant={action.variant || "default"}
                className="flex-1 touch-manipulation min-h-[44px]"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}