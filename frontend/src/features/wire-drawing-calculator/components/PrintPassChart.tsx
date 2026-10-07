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
  const marginTop = 28;
  const marginRight = 86;
  const marginBottom = 34;
  const marginLeft = 44;

  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const plotRight = marginLeft + plotWidth;
  const plotBottom = marginTop + plotHeight;

  const values = passes.map((p) => p[metric]);
  const rawMax = Math.max(...values, 0);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

  // Nice scale ceiling for Y axis
  const maxVal = Math.max(Math.ceil((rawMax * 1.2) / 5) * 5, 25);
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  const getY = (val: number) => {
    return plotBottom - (Math.min(val, maxVal) / maxVal) * plotHeight;
  };

  const barCount = passes.length;
  const step = plotWidth / barCount;
  const barWidth = Math.max(6, Math.min(26, step * 0.62));
  const valFontSize = barCount > 18 ? 7.5 : barCount > 13 ? 8 : 9;
  const passFontSize = barCount > 18 ? 8 : barCount > 13 ? 8.5 : 9.5;

  const rawAvgY = getY(avg);
  const badgeWidth = 74;
  const badgeHeight = 18;
  const badgeX = plotRight + 6;
  const badgeCenterY = Math.max(
    marginTop + badgeHeight / 2,
    Math.min(plotBottom - badgeHeight / 2, rawAvgY)
  );
  const badgeY = badgeCenterY - badgeHeight / 2;

  return (
    <div className="bg-white border border-slate-300 rounded-sm p-3 font-mono print:border-slate-400">
      <div className="flex flex-wrap justify-between items-center gap-1 mb-1 pb-1.5 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</span>
        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded border border-slate-200 shrink-0">
          AVG: {avg.toFixed(2)}% | MAX: {Math.max(...values).toFixed(2)}% | MIN: {Math.min(...values).toFixed(2)}%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none block"
      >
        {/* Background gridlines & Y-axis ticks */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line
                x1={marginLeft}
                y1={y}
                x2={plotRight}
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

        {/* Average reference line spanning across the plot area */}
        <line
          x1={marginLeft}
          y1={rawAvgY}
          x2={plotRight}
          y2={rawAvgY}
          stroke="#7c3aed"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />

        {/* Connector from plot border to callout badge in right gutter */}
        <line
          x1={plotRight}
          y1={rawAvgY}
          x2={badgeX}
          y2={badgeCenterY}
          stroke="#7c3aed"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        <circle cx={plotRight} cy={rawAvgY} r={2} fill="#7c3aed" />

        {/* Dedicated Right-Gutter Callout Badge (isolated from bars and value labels) */}
        <g className="avg-callout-group">
          <rect
            x={badgeX}
            y={badgeY}
            width={badgeWidth}
            height={badgeHeight}
            rx={3}
            fill="#f5f3ff"
            stroke="#8b5cf6"
            strokeWidth={1}
            className="avg-callout-badge"
          />
          <text
            x={badgeX + badgeWidth / 2}
            y={badgeCenterY + 3.5}
            textAnchor="middle"
            fontSize={8.5}
            fontWeight={700}
            fill="#6d28d9"
            letterSpacing="0.02em"
            className="avg-callout-text"
          >
            AVG {avg.toFixed(2)}%
          </text>
        </g>

        {/* Bars */}
        {passes.map((p, i) => {
          const val = p[metric];
          const x = marginLeft + i * step + (step - barWidth) / 2;
          const y = getY(val);
          const barHeight = Math.max(1, plotBottom - y);
          const barCenterX = x + barWidth / 2;
          const labelY = y - 5 < marginTop ? y + 11 : y - 5;
          const labelFill = y - 5 < marginTop ? '#ffffff' : '#0f172a';

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

              {/* Exact percentage value on top of bar with halo for maximum legibility */}
              <text
                x={barCenterX}
                y={labelY}
                textAnchor="middle"
                fontSize={valFontSize}
                fontWeight={700}
                fill={labelFill}
                stroke="#ffffff"
                strokeWidth={2.5}
                paintOrder="stroke fill"
                strokeLinejoin="round"
              >
                {val.toFixed(1)}%
              </text>

              {/* X-axis Pass label */}
              <text
                x={barCenterX}
                y={plotBottom + 14}
                textAnchor="middle"
                fontSize={passFontSize}
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
          y2={plotBottom}
          stroke="#475569"
          strokeWidth={1.5}
        />
        <line
          x1={marginLeft}
          y1={plotBottom}
          x2={plotRight}
          y2={plotBottom}
          stroke="#475569"
          strokeWidth={1.5}
        />
        {/* Delimiter separating plot area from right callout gutter */}
        <line
          x1={plotRight}
          y1={marginTop}
          x2={plotRight}
          y2={plotBottom}
          stroke="#cbd5e1"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      </svg>
    </div>
  );
};
export default PrintPassChart;
