import React, { useState } from "react";
import { useLongPress } from "@/components/hooks/useLongPress";
import MobileActionSheet from "@/components/mobile/MobileActionSheet";

export default function LongPressContextMenu({
  title,
  actions,
  children,
  onOpen, // optional: if provided, we call this instead of rendering our own sheet
  delay = 500
}) {
  const [open, setOpen] = useState(false);

  const handlers = useLongPress(() => {
    if (onOpen) {
      onOpen();
    } else {
      setOpen(true);
    }
  }, { delay });

  return (
    <div {...handlers}>
      {children}
      {!onOpen && (
        <MobileActionSheet
          open={open}
          onClose={() => setOpen(false)}
          title={title}
          actions={actions || []}
        />
      )}
    </div>
  );
}