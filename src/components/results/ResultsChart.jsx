
import React, { useRef, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const ResultsChart = ({ data, winner }) => {
  const chartData = data.map(variant => ({
    name: variant.variant_name,
    'Conversion Rate': variant.conversion_rate.toFixed(2),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const variantData = data.find(v => v.variant_name === label);
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-bold">{label}</p>
          <p className="text-blue-600">{`Conversion Rate: ${payload[0].value}%`}</p>
          <p className="text-sm text-slate-500">{`${variantData.visitor_count} visitors, ${variantData.conversion_count} conversions`}</p>
        </div>
      );
    }
    return null;
  };

  const chartWrapperRef = useRef(null);
  const [scale, setScale] = useState(1);
  const initialDistance = useRef(0);
  const [isPinching, setIsPinching] = useState(false);

  useEffect(() => {
    const el = chartWrapperRef.current;
    if (!el) return;
    
    // Using a local variable for currentScale within the effect closure
    // to avoid issues with stale closures if 'scale' was a dependency.
    // However, setScale directly updates state, which is reactive.
    // Let's refine this to directly use the state `scale` or ensure `currentScale` is managed correctly.
    // The outline uses a local `currentScale` variable which is fine.
    // The `scale` state is updated, and the effect's `onMove` callback will get the `el.style.transform` updated.

    const onStart = (e) => {
      if (e.touches?.length === 2) {
        setIsPinching(true);
        const [t1, t2] = e.touches;
        initialDistance.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      }
    };

    const onMove = (e) => {
      // Only process if pinching is active and there are exactly two touches
      if (!isPinching || e.touches?.length !== 2) return;
      
      e.preventDefault(); // Prevent default browser zoom/scroll

      const [t1, t2] = e.touches;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      
      // Calculate new scale, clamped between 0.75x and 3x
      const newScale = Math.min(Math.max(0.75, dist / initialDistance.current), 3);
      
      // Update state for display and transform the element
      setScale(newScale);
      el.style.transform = `scale(${newScale})`;
    };

    const onEnd = () => {
      setIsPinching(false);
      // Animate back to original scale (1x)
      el.style.transition = "transform 0.2s ease-out";
      el.style.transform = "scale(1)";
      setScale(1); // Reset state scale to 1

      // Remove transition style after animation to prevent interfering with subsequent pinches
      const id = setTimeout(() => { 
        if (el) el.style.transition = ""; 
      }, 200); 
      return () => clearTimeout(id); // Cleanup timeout if component unmounts
    };

    // Attach event listeners
    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);

    // Cleanup function to remove event listeners
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [isPinching]); // Rerun effect if isPinching changes (to update event listeners if needed),
                   // though the current implementation mostly relies on ref and state setters.
                   // Making it an empty array [] would also work if `onMove` and `onEnd` didn't
                   // directly reference `isPinching` from the closure for their execution logic.
                   // Given `isPinching` is used in `onMove` to gate execution, it's safer to include.

  return (
    <div>
      <div ref={chartWrapperRef} className="origin-center touch-none">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="name" />
            <YAxis unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Conversion Rate" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => {
                const variant = data[index];
                let color = '#3b82f6'; // Default blue
                if (variant.variant_type === 'control') color = '#64748b'; // Gray for control
                if (winner && winner.id === variant.id) color = '#16a34a'; // Green for winner
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {scale > 1.1 && ( // Only show feedback if zoomed in significantly
        <div className="text-xs text-center text-slate-500 mt-2">
          Pinch to zoom • Scale: {scale.toFixed(1)}x
        </div>
      )}
    </div>
  );
};

export default ResultsChart;
