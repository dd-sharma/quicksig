import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useResponsive } from "@/components/hooks/useResponsive";

export default function ResponsiveModal({ open, onClose, title, children }) {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="h-[100dvh] w-full max-w-full m-0 rounded-none p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={() => onClose(false)} className="p-2 min-h-[44px] min-w-[44px]">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}