import React, { useMemo, useRef, useState, useLayoutEffect, useCallback } from "react";

export default function VirtualList({
  items = [],
  itemHeight = 120,
  height = 500,
  overscan = 6,
  renderItem,
  className = ""
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + height) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    const out = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < items.length) {
        out.push({ index: i, item: items[i] });
      }
    }
    return out;
  }, [startIndex, endIndex, items]);

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handle = () => setScrollTop(node.scrollTop);
    node.addEventListener("scroll", handle, { passive: true });
    return () => node.removeEventListener("scroll", handle);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height }}
      onScroll={onScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: startIndex * itemHeight,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ index, item }) => (
            <div key={item?.id || index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}