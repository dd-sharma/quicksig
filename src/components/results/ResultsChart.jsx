import React from 'react';
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

  return (
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
  );
};

export default ResultsChart;