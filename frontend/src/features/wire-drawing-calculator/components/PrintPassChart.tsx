import React from 'react';
import type { PassData } from '../types';

interface PrintPassChartProps {
  title: string;
  metric: 'elongation' | 'areaReduction';
  passes: PassData[];
  barColor?: string;
  targetMin?: number;
  targetMax?: number;
}

export const PrintPassChart: React.FC<PrintPassChartProps> = ({
  title,
  metric,
  passes,
  barColor = '#2563eb',
  targetMin,
  targetMax,
}) => {
  if (passes.length === 0) return null;

  const width = 680;
  const height = 210;
  const marginTop = 30;
  const marginRight = 30;
  const marginBottom = 36;
  const marginLeft = 48;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const values = passes.map((p) => p[metric]);
  const rawMax = Math.max(...values, 0);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

  // Nice scale ceiling for Y axis
  const maxVal = Math.max(Math.ceil((rawMax * 1.2) / 5) * 5, 25);
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  const getY = (val: number) => {
    return marginTop + plotHeight - (Math.min(val, maxVal) / maxVal) * plotHeight;
  };

  const barCount = passes.length;
  const step = plotWidth / barCount;
  const barWidth = Math.max(8, Math.min(28, step * 0.65));

  return (
    <div className="bg-white border border-slate-300 rounded-sm p-3 font-mono print:border-slate-400">
      <div className="flex justify-between items-center mb-1 pb-1.5 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</span>
        <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          AVG: {avg.toFixed(2)}% | MAX: {Math.max(...values).toFixed(2)}% | MIN: {Math.min(...values).toFixed(2)}%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        style={{ maxHeight: '200px' }}
      >
        {/* Background gridlines & Y-axis ticks */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={marginLeft}
                y1={y}
                x2={width - marginRight}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={tick === 0 ? 1.5 : 1}
                strokeDasharray={tick === 0 ? 'none' : '3 3'}
              />
              <text
                x={marginLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="#64748b"
                fontWeight={500}
              >
                {tick.toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Tolerance target band if provided */}
        {targetMin !== undefined && targetMax !== undefined && (
          <rect
            x={marginLeft}
            y={getY(targetMax)}
            width={plotWidth}
            height={getY(targetMin) - getY(targetMax)}
            fill="#f1f5f9"
            opacity={0.65}
          />
        )}

        {/* Average reference line */}
        <line
          x1={marginLeft}
          y1={getY(avg)}
          x2={width - marginRight}
          y2={getY(avg)}
          stroke="#7c3aed"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />
        <rect
          x={width - marginRight - 74}
          y={getY(avg) - 8}
          width={72}
          height={16}
          rx={2}
          fill="#ede9fe"
          stroke="#8b5cf6"
          strokeWidth={0.75}
        />
        <text
          x={width - marginRight - 38}
          y={getY(avg) + 3.5}
          textAnchor="middle"
          fontSize={9.5}
          fontWeight={700}
          fill="#6d28d9"
        >
          Avg {avg.toFixed(1)}%
        </text>

        {/* Bars */}
        {passes.map((p, i) => {
          const val = p[metric];
          const x = marginLeft + i * step + (step - barWidth) / 2;
          const y = getY(val);
          const barHeight = Math.max(1, marginTop + plotHeight - y);

          return (
            <g key={p.pass}>
              {/* Bar Rect */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={barColor}
                rx={1.5}
                stroke="#1e293b"
                strokeWidth={0.75}
                opacity={0.92}
              />

              {/* Exact percentage value on top of bar */}
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={9}
                fontWeight={700}
                fill="#0f172a"
              >
                {val.toFixed(1)}%
              </text>

              {/* X-axis Pass label */}
              <text
                x={x + barWidth / 2}
                y={height - marginBottom + 14}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={600}
                fill="#475569"
              >
                P{p.pass}
              </text>
            </g>
          );
        })}

        {/* Axis boundary lines */}
        <line
          x1={marginLeft}
          y1={marginTop}
          x2={marginLeft}
          y2={marginTop + plotHeight}
          stroke="#475569"
          strokeWidth={1.5}
        />
        <line
          x1={marginLeft}
          y1={marginTop + plotHeight}
          x2={width - marginRight}
          y2={marginTop + plotHeight}
          stroke="#475569"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
};
export default PrintPassChart;
