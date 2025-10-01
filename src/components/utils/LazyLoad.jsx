import React, { useEffect, useRef, useState } from "react";

export default function LazyLoad({ 
  children, 
  placeholder = <div className="h-32 bg-slate-100 animate-pulse rounded" />,
  rootMargin = "100px"
}) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);
  
  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);
  
  return (
    <div ref={elementRef}>
      {isVisible ? children : placeholder}
    </div>
  );
}