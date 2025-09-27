import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export default function SwipeableItem({ children, onDelete }) {
  const startX = useRef(0);
  const [swiped, setSwiped] = useState(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches?.[0]?.clientX || 0;
  };
  const handleTouchMove = (e) => {
    const dx = (e.touches?.[0]?.clientX || 0) - startX.current;
    setSwiped(dx < -50);
  };
  const handleTouchEnd = () => {
    // keep state; optionally auto-hide later
  };

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      {swiped && (
        <Button
          className="absolute right-2 top-2"
          size="sm"
          variant="destructive"
          onClick={onDelete}
        >
          Delete
        </Button>
      )}
    </div>
  );
}