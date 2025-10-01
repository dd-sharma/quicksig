import React, { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

export default function SwipeableListItem({ children, onDelete, onSwipeStart }) {
  const [swiped, setSwiped] = useState(false);
  const [startX, setStartX] = useState(0);
  const itemRef = useRef(null);
  
  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
    onSwipeStart?.();
  };
  
  const handleTouchMove = (e) => {
    const deltaX = e.touches[0].clientX - startX;
    // Reveal delete on left swipe beyond threshold
    if (deltaX < -60) setSwiped(true);
    if (deltaX > 60) setSwiped(false);
    if (itemRef.current) {
      itemRef.current.style.transform = `translateX(${Math.max(deltaX, -100)}px)`;
    }
  };
  
  const handleTouchEnd = () => {
    if (itemRef.current) {
      itemRef.current.style.transform = "";
    }
  };
  
  return (
    <div className="relative overflow-hidden">
      <div
        ref={itemRef}
        className="relative bg-white transition-transform"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
      {swiped && (
        <div className="absolute right-0 top-0 bottom-0 bg-red-500 flex items-center px-4">
          <button onClick={onDelete} className="text-white min-h-[44px] min-w-[44px]">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}