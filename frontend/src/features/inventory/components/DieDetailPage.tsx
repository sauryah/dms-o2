import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Trash2, Printer, Download, Calendar, MapPin, Layers, Activity, Ruler, Wrench, TrendingUp, ShieldCheck, AlertTriangle, AlertCircle, Gauge, Clock } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useApi } from '../../../hooks/useApi'
import { lazyWithRetry } from '../../../utils/lazyWithRetry'

const DieBlueprint = lazyWithRetry(() =>
  import('./CadRenderer').then(m => ({ default: m.DieBlueprint }))
);

const BlueprintSkeleton = () => (
  <div className="w-full h-[120px] flex items-center justify-center font-mono">
    <div className="w-6 h-6 border border-[#2a2a2a] border-t-blue-500 rounded-none animate-spin" />
  </div>
);
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Drawer } from '../../../components/ui/Drawer'
import { DataTable } from '../../../components/ui/DataTable'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SearchableSelect } from '../../../components/SearchableSelect'


interface ChartPoint {
  date: string;
  Size?: number;
  Width?: number;
  Thickness?: number;
}

function DimensionWearChart({ data, dieType }: { data: ChartPoint[]; dieType: string }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[#6b7280] italic text-xs font-mono">
        No dimension history recorded yet.
      </div>
    );
  }

  const isRound = dieType === 'ROUND';

  const allVals: number[] = [];
  data.forEach(p => {
    if (isRound) {
      if (p.Size !== undefined) allVals.push(p.Size);
    } else {
      if (p.Width !== undefined) allVals.push(p.Width);
      if (p.Thickness !== undefined) allVals.push(p.Thickness);
    }
  });

  const minVal = allVals.length > 0 ? Math.min(...allVals) : 0;
  const maxVal = allVals.length > 0 ? Math.max(...allVals) : 10;

  const valRange = maxVal - minVal;
  const yMin = valRange === 0 ? minVal - 1 : minVal - valRange * 0.15;
  const yMax = valRange === 0 ? maxVal + 1 : maxVal + valRange * 0.15;
  const yRange = yMax - yMin;

  const width = 600;
  const height = 250;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    if (yRange === 0) return paddingTop + chartHeight / 2;
    return paddingTop + chartHeight - ((val - yMin) / yRange) * chartHeight;
  };

  const getPathD = (key: 'Size' | 'Width' | 'Thickness') => {
    const points = data
      .map((p, idx) => {
        const val = p[key];
        if (val === undefined) return null;
        return `${getX(idx)},${getY(val)}`;
      })
      .filter(p => p !== null);

    if (points.length === 0) return '';
    return `M ${points.join(' L ')}`;
  };

  const roundPath = isRound ? getPathD('Size') : '';
  const widthPath = !isRound ? getPathD('Width') : '';
  const thicknessPath = !isRound ? getPathD('Thickness') : '';

  const yTicks = 4;
  const yTicksVals = Array.from({ length: yTicks }, (_, i) => yMin + (i / (yTicks - 1)) * yRange);

  return (
    <div className="relative w-full bg-[#0a0a0a] rounded-sm p-4 border border-[#1a1a1a] font-mono">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines & Y-axis labels */}
        {yTicksVals.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="#1a1a1a" 
                strokeDasharray="2 2" 
              />
              <text 
                x={paddingLeft - 8} 
                y={y + 4} 
                fill="#6b7280" 
                fontSize="10" 
                textAnchor="end"
                className="font-mono tabular-nums"
              >
                {val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((p, idx) => {
          const x = getX(idx);
          const showLabel = data.length <= 5 || idx % Math.ceil(data.length / 5) === 0 || idx === data.length - 1;
          if (!showLabel) return null;
          return (
            <text
              key={idx}
              x={x}
              y={height - paddingBottom + 18}
              fill="#6b7280"
              fontSize="9"
              textAnchor="middle"
              className="font-mono"
            >
              {p.date}
            </text>
          );
        })}

        {/* Lines */}
        {isRound && roundPath && (
          <path 
            d={roundPath} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="2" 
            strokeLinecap="square" 
            strokeLinejoin="miter" 
          />
        )}
        {!isRound && widthPath && (
          <path 
            d={widthPath} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="2" 
            strokeLinecap="square" 
            strokeLinejoin="miter" 
          />
        )}
        {!isRound && thicknessPath && (
          <path 
            d={thicknessPath} 
            fill="none" 
            stroke="#8b5cf6" 
            strokeWidth="2" 
            strokeLinecap="square" 
            strokeLinejoin="miter" 
          />
        )}

        {/* Data points */}
        {data.map((p, idx) => {
          const x = getX(idx);
          return (
            <g key={idx}>
              {isRound && p.Size !== undefined && (
                <rect 
                  x={x - 3} 
                  y={getY(p.Size) - 3} 
                  width="6"
                  height="6"
                  fill="#0a0a0a" 
                  stroke="#3b82f6" 
                  strokeWidth="2" 
                />
              )}
              {!isRound && p.Width !== undefined && (
                <rect 
                  x={x - 3} 
                  y={getY(p.Width) - 3} 
                  width="6"
                  height="6"
                  fill="#0a0a0a" 
                  stroke="#3b82f6" 
                  strokeWidth="2" 
                />
              )}
              {!isRound && p.Thickness !== undefined && (
                <rect 
                  x={x - 3} 
                  y={getY(p.Thickness) - 3} 
                  width="6"
                  height="6"
                  fill="#0a0a0a" 
                  stroke="#8b5cf6" 
                  strokeWidth="2" 
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex justify-center space-x-6 mt-2 text-xs font-mono">
        {isRound ? (
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 bg-blue-500 rounded-none" />
            <span className="text-[#6b7280] uppercase text-[10px]">SIZE (MM)</span>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 bg-blue-500 rounded-none" />
              <span className="text-[#6b7280] uppercase text-[10px]">WIDTH (MM)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 bg-purple-500 rounded-none" />
              <span className="text-[#6b7280] uppercase text-[10px]">THICKNESS (MM)</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WearPredictionSection({ die }: { die: any }) {
  const dieId = die.die_id
  const { request } = useApi()
  const { data: prediction, isLoading, error } = useQuery({
    queryKey: ['wearPrediction', dieId],
    queryFn: () => request(`/api/dies/${dieId}/wear-prediction/`)
  })

  const getMiniChartData = () => {
    if (!die || !die.history) return [];

    const isRound = die.die_type === 'ROUND';
    const sortedHistory = [...die.history].sort(
      (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const points: any[] = [];

    if (isRound) {
      const currentVal = parseFloat(die.punched_size || '0');
      const creationDate = die.created_at || (sortedHistory.length > 0 ? sortedHistory[0].timestamp : new Date().toISOString());
      
      points.push({
        timestamp: new Date(creationDate).getTime(),
        date: new Date(creationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        wear: 0,
      });

      sortedHistory.forEach((h: any) => {
        if (h.field_name === 'current_size') {
          const val = parseFloat(h.new_value);
          if (!isNaN(val)) {
            points.push({
              timestamp: new Date(h.timestamp).getTime(),
              date: new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
              wear: Math.abs(val - currentVal),
            });
          }
        }
      });

      const finalVal = parseFloat(die.current_size || '0');
      const finalWear = Math.abs(finalVal - currentVal);
      const lastPoint = points[points.length - 1];
      if (!lastPoint || lastPoint.wear !== finalWear) {
        points.push({
          timestamp: new Date(die.updated_at || new Date().toISOString()).getTime(),
          date: new Date(die.updated_at || new Date().toISOString()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          wear: finalWear,
        });
      }
    } else {
      const punchedW = parseFloat(die.punched_width || '0');
      const punchedT = parseFloat(die.punched_thickness || '0');
      const creationDate = die.created_at || (sortedHistory.length > 0 ? sortedHistory[0].timestamp : new Date().toISOString());
      
      points.push({
        timestamp: new Date(creationDate).getTime(),
        date: new Date(creationDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        wear: 0,
      });

      let currentW = punchedW;
      let currentT = punchedT;
      
      sortedHistory.forEach((h: any) => {
        if (h.field_name === 'current_width') {
          const val = parseFloat(h.new_value);
          if (!isNaN(val)) currentW = val;
        } else if (h.field_name === 'current_thickness') {
          const val = parseFloat(h.new_value);
          if (!isNaN(val)) currentT = val;
        }
        
        if (h.field_name === 'current_width' || h.field_name === 'current_thickness') {
          const wearW = Math.abs(currentW - punchedW);
          const wearT = Math.abs(currentT - punchedT);
          points.push({
            timestamp: new Date(h.timestamp).getTime(),
            date: new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            wear: Math.max(wearW, wearT),
          });
        }
      });

      const finalW = parseFloat(die.current_width || '0');
      const finalT = parseFloat(die.current_thickness || '0');
      const finalWear = Math.max(Math.abs(finalW - punchedW), Math.abs(finalT - punchedT));
      const lastPoint = points[points.length - 1];
      if (!lastPoint || lastPoint.wear !== finalWear) {
        points.push({
          timestamp: new Date(die.updated_at || new Date().toISOString()).getTime(),
          date: new Date(die.updated_at || new Date().toISOString()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          wear: finalWear,
        });
      }
    }

    // Deduplicate by date
    const uniquePoints: any[] = [];
    const seenDates = new Set();
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      if (!seenDates.has(p.date)) {
        uniquePoints.unshift(p);
        seenDates.add(p.date);
      }
    }

    return uniquePoints;
  };

  if (isLoading) {
    return (
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-6 mb-6 flex justify-center items-center font-mono">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin h-6 w-6 border border-[#2a2a2a] border-t-blue-500"></div>
          <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">Loading Predictive Models...</span>
        </div>
      </div>
    )
  }

  if (error || !prediction) {
    return (
      <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 mb-6 text-[#6b7280] text-xs font-mono">
        Unable to load wear prediction analysis.
      </div>
    )
  }

  const { alert_level, overall_wear_percentage, overall_remaining_days, dimensions } = prediction

  const alertBadgeColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-[#141414] border-red-500/30 text-red-400',
          label: 'CRITICAL',
          icon: AlertCircle
        }
      case 'WARNING':
        return {
          bg: 'bg-[#141414] border-amber-500/30 text-amber-400',
          label: 'WARNING',
          icon: AlertTriangle
        }
      default:
        return {
          bg: 'bg-[#141414] border-emerald-500/30 text-emerald-400',
          label: 'GOOD',
          icon: ShieldCheck
        }
    }
  }

  const status = alertBadgeColor(alert_level)
  const StatusIcon = status.icon

  const dims = Object.values(dimensions)
  const maxWear = dims.length > 0 ? Math.max(...dims.map((d: any) => d.total_wear)) : 0

  const kpis = [
    {
      label: 'REMAINING LIFE',
      value: `${(100 - overall_wear_percentage).toFixed(1)}%`,
      icon: Gauge,
      description: 'Estimated wear margin before service limit.',
      iconColor: alert_level === 'CRITICAL' ? 'text-red-400' : alert_level === 'WARNING' ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      label: 'WEAR PROGRESS',
      value: `${overall_wear_percentage.toFixed(1)}%`,
      icon: TrendingUp,
      description: 'Current status relative to total allowed wear.',
      iconColor: alert_level === 'CRITICAL' ? 'text-red-400' : alert_level === 'WARNING' ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      label: 'CURRENT WEAR',
      value: `${maxWear.toFixed(3)} mm`,
      icon: Ruler,
      description: 'Maximum measured deviation from nominal.',
      iconColor: 'text-blue-400',
    },
    {
      label: 'PREDICTED RECUT',
      value: overall_remaining_days !== null ? `${Math.round(overall_remaining_days)} DAYS` : 'CALIBRATING...',
      icon: Calendar,
      description: overall_remaining_days !== null ? 'Forecasted time before recut is required.' : 'Accumulating historical readings.',
      iconColor: overall_remaining_days !== null && overall_remaining_days < 7 ? 'text-red-400' : overall_remaining_days !== null && overall_remaining_days < 30 ? 'text-amber-400' : 'text-emerald-400',
    }
  ]

  const getRecommendationDetails = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          title: 'Immediate Recut Mandatory',
          message: 'Severe wear detected. Dimensional tolerance limits exceeded. Stop production immediately.',
          action: 'Perform immediate recutting / polishing. Reset tool alignment.',
          nextInspection: '0 kg throughput or 0 operating hours (Immediate Action)',
          borderColor: 'border-l-red-500',
          iconColor: 'text-red-400',
          icon: AlertCircle,
        };
      case 'WARNING':
        return {
          title: 'Schedule Maintenance Soon',
          message: 'Significant wear detected. The die is approaching its calibration limits.',
          action: 'Schedule inspection, clean die elements, prepare for recutting.',
          nextInspection: '1,000 kg throughput or 8 operating hours',
          borderColor: 'border-l-amber-500',
          iconColor: 'text-amber-400',
          icon: AlertTriangle,
        };
      default:
        return {
          title: 'The die is operating within acceptable tolerance.',
          message: 'No corrective action is required. Continue production.',
          action: 'Routine status logs check. No mechanical adjustment needed.',
          nextInspection: '5,000 kg throughput or 30 operating hours',
          borderColor: 'border-l-emerald-500',
          iconColor: 'text-emerald-400',
          icon: ShieldCheck,
        };
    }
  }

  const recommendation = getRecommendationDetails(alert_level)
  const RecIcon = recommendation.icon

  const historyPoints = getMiniChartData()

  const renderHistoryChart = () => {
    const points = historyPoints
    const isRound = die.die_type === 'ROUND'
    const limit = isRound ? 0.05 : 0.1

    if (points.length === 0) {
      return (
        <div className="flex items-center justify-center h-28 text-[#6b7280] italic text-xs font-mono">
          No dimension history recorded yet.
        </div>
      )
    }

    const width = 380
    const height = 130
    const paddingLeft = 35
    const paddingRight = 45
    const paddingTop = 15
    const paddingBottom = 20

    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    const timestamps = points.map(p => p.timestamp)
    const minTime = Math.min(...timestamps)
    
    const maxTime = Math.max(...timestamps)
    let projectedTime = maxTime
    let hasProjection = false

    if (overall_remaining_days !== null && overall_remaining_days > 0) {
      projectedTime = maxTime + overall_remaining_days * 86400 * 1000
      hasProjection = true
    }

    const timeRange = projectedTime - minTime
    const yMaxVal = limit * 1.15

    const getX = (time: number) => {
      if (timeRange === 0) return paddingLeft + chartWidth / 2
      return paddingLeft + ((time - minTime) / timeRange) * chartWidth
    }

    const getY = (val: number) => {
      return paddingTop + chartHeight - (val / yMaxVal) * chartHeight
    }

    const historyCoords = points.map(p => ({
      x: getX(p.timestamp),
      y: getY(p.wear),
      date: p.date,
      wear: p.wear
    }))

    const pathD = historyCoords.length > 0
      ? `M ${historyCoords.map(c => `${c.x},${c.y}`).join(' L ')}`
      : ''

    let projectionCoord = null
    if (hasProjection && historyCoords.length > 0) {
      projectionCoord = {
        x: getX(projectedTime),
        y: getY(limit),
      }
    }

    const projectionPathD = projectionCoord && historyCoords.length > 0
      ? `M ${historyCoords[historyCoords.length - 1].x},${historyCoords[historyCoords.length - 1].y} L ${projectionCoord.x},${projectionCoord.y}`
      : ''

    const limitY = getY(limit)

    return (
      <div className="relative font-mono">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Critical limit line */}
          <line 
            x1={paddingLeft} 
            y1={limitY} 
            x2={width - paddingRight} 
            y2={limitY} 
            stroke="#ef4444" 
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <text 
            x={width - paddingRight + 4} 
            y={limitY + 3} 
            fill="#f87171" 
            fontSize="8"
            className="font-mono uppercase"
          >
            Limit ({limit}mm)
          </text>

          {/* Grid line at 0 */}
          <line 
            x1={paddingLeft} 
            y1={getY(0)} 
            x2={width - paddingRight} 
            y2={getY(0)} 
            stroke="#1a1a1a" 
            strokeWidth="1"
          />

          {/* Solid History Path */}
          {pathD && (
            <path 
              d={pathD} 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="2" 
              strokeLinecap="square" 
              strokeLinejoin="miter" 
            />
          )}

          {/* Dashed Projection Path */}
          {projectionPathD && (
            <path 
              d={projectionPathD} 
              fill="none" 
              stroke="#ef4444" 
              strokeWidth="1.5" 
              strokeDasharray="3 3" 
            />
          )}

          {/* Historical points */}
          {historyCoords.map((c, idx) => {
            const isLast = idx === historyCoords.length - 1
            return (
              <g key={idx}>
                <rect 
                  x={c.x - 2.5} 
                  y={c.y - 2.5} 
                  width="5"
                  height="5"
                  fill="#0a0a0a" 
                  stroke={isLast ? "#ef4444" : "#3b82f6"} 
                  strokeWidth="1.5" 
                />
              </g>
            )
          })}

          {/* Projected point */}
          {projectionCoord && (
            <g>
              <rect 
                x={projectionCoord.x - 2.5} 
                y={projectionCoord.y - 2.5} 
                width="5"
                height="5"
                fill="#ef4444" 
                stroke="#0a0a0a" 
                strokeWidth="1" 
              />
            </g>
          )}

          {/* Y Axis Labels */}
          <text 
            x={paddingLeft - 4} 
            y={limitY + 3} 
            fill="#6b7280" 
            fontSize="8" 
            textAnchor="end"
            className="font-mono tabular-nums"
          >
            {limit.toFixed(2)}
          </text>
          <text 
            x={paddingLeft - 4} 
            y={getY(0) + 3} 
            fill="#6b7280" 
            fontSize="8" 
            textAnchor="end"
            className="font-mono tabular-nums"
          >
            0.00
          </text>

          {/* X Axis Labels */}
          {points.length > 0 && (
            <text 
              x={paddingLeft} 
              y={height - 4} 
              fill="#6b7280" 
              fontSize="8" 
              textAnchor="start"
              className="font-mono"
            >
              {points[0].date}
            </text>
          )}
          {projectionCoord && (
            <text 
              x={projectionCoord.x} 
              y={height - 4} 
              fill="#ef4444" 
              fontSize="8" 
              textAnchor="end"
              className="font-mono"
            >
              +{Math.round(overall_remaining_days || 0)}d Proj
            </text>
          )}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-2 text-[9px] text-[#6b7280] font-mono uppercase">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-3 bg-blue-500" />
            <span>WEAR HISTORY</span>
          </div>
          {hasProjection && (
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-3 border-t border-dashed border-red-500" />
              <span className="text-red-400">RUL PROJECTION</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-3 border-t border-dashed border-red-500/60" />
            <span className="text-red-400">LIMIT</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 mb-5 font-mono">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[#1a1a1a] mb-4">
        <div>
          <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]">
            03 PREVENTIVE WEAR PREDICTION
          </h3>
          <p className="text-[#6b7280] text-[11px] mt-0.5">
            Predictive calibration model analyzing dimensional wear against tolerances.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[10px] text-[#6b7280] uppercase">RUL STATUS:</span>
          <span className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-sm border uppercase ${status.bg}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </span>
        </div>
      </div>

      {/* 2. PRIMARY KPI SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <div 
              key={index} 
              className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-3 font-mono"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] text-[#6b7280] uppercase">{kpi.label}</span>
                <Icon className={`h-3.5 w-3.5 ${kpi.iconColor}`} />
              </div>
              <div className="text-lg font-bold text-[#e4e4e4] font-mono tabular-nums my-0.5">
                {kpi.value}
              </div>
              <p className="text-[9px] text-[#404040] leading-normal">
                {kpi.description}
              </p>
            </div>
          )
        })}
      </div>

      {/* TWO COLUMN GRID FOR VISUALIZATION, ANALYSIS, RECOMMENDATION & HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: 3. WEAR VISUALIZATION & 5. RECOMMENDATION PANEL */}
        <div className="lg:col-span-7 space-y-4">
          {/* 3. WEAR VISUALIZATION */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-3 font-mono">
            <h4 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-blue-400" />
              <span>HORIZONTAL WEAR CALIBRATION GAUGE</span>
            </h4>
            
            <div className="relative pt-3 pb-1">
              <div className="flex justify-between text-[9px] text-[#6b7280] uppercase mb-1">
                <span className="text-emerald-400">SAFE (0-70%)</span>
                <span className="text-amber-400">WARN (70-90%)</span>
                <span className="text-red-400">CRIT (90-100%)</span>
              </div>
              
              <div className="relative h-3 w-full bg-[#141414] rounded-none overflow-hidden border border-[#2a2a2a] p-0.5">
                {/* Gauge fill */}
                <div 
                  className={`h-full transition-all duration-300 ${
                    alert_level === 'CRITICAL' ? 'bg-red-500' : alert_level === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${overall_wear_percentage}%` }}
                />
              </div>

              {/* Ticks and indicator cursor */}
              <div className="relative w-full h-6 mt-1 text-[8px] text-[#404040] font-mono flex justify-between">
                <span>0%</span>
                <span>50%</span>
                <span>70%</span>
                <span>90%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* 5. RECOMMENDATION PANEL */}
          <div className={`border-l-2 ${recommendation.borderColor} bg-[#0a0a0a] rounded-sm p-3 font-mono border border-[#1a1a1a]`}>
            <div className="flex items-start gap-3">
              <div className={`p-1.5 bg-[#141414] border border-[#2a2a2a] rounded-sm shrink-0 ${recommendation.iconColor}`}>
                <RecIcon className="h-4 w-4" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">
                    OPERATIONAL RECOMMENDATION
                  </h4>
                  <span className={`text-[8px] uppercase px-1 py-0.2 rounded-sm border ${status.bg}`}>
                    {alert_level}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#e4e4e4]">
                  {recommendation.title}
                </p>
                <p className="text-[11px] text-[#6b7280]">
                  {recommendation.message}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#1a1a1a] text-[10px]">
                  <div>
                    <span className="text-[#404040] uppercase block">ACTION</span>
                    <span className="text-[#e4e4e4]">{recommendation.action}</span>
                  </div>
                  <div>
                    <span className="text-[#404040] uppercase block">NEXT INSPECTION</span>
                    <span className="text-[#e4e4e4]">{recommendation.nextInspection}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 4. DIMENSIONAL ANALYSIS & 6. WEAR HISTORY */}
        <div className="lg:col-span-5 space-y-4">
          {/* 4. DIMENSIONAL ANALYSIS */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-3 font-mono">
            <h4 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Ruler className="h-3 w-3 text-blue-400" />
              <span>DIMENSIONAL TOLERANCES</span>
            </h4>
            
            <div className="space-y-3">
              {Object.entries(dimensions).map(([dimName, dimData]: [string, any]) => {
                const displayTitle = dimName === 'size' ? 'OUTER DIAMETER' : dimName === 'width' ? 'RIBBON WIDTH' : 'RIBBON THICKNESS'
                const isLimitExceeded = dimData.wear_percentage >= 100
                const isWarning = dimData.wear_percentage >= 70 && dimData.wear_percentage < 100
                
                return (
                  <div key={dimName} className="space-y-1.5 border-b border-[#1a1a1a] pb-2 last:border-b-0">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-[#6b7280] uppercase">{displayTitle}</span>
                      <span className={`text-[9px] uppercase ${isLimitExceeded ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {isLimitExceeded ? 'EXCEEDED' : isWarning ? 'WARNING' : 'NORMAL'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-1 text-[10px] tabular-nums">
                      <div>
                        <span className="text-[#404040] text-[8px] uppercase block">MEAS</span>
                        <span className="text-[#e4e4e4] font-bold">{dimData.current_value.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="text-[#404040] text-[8px] uppercase block">NOM</span>
                        <span className="text-[#6b7280]">{dimData.initial_value.toFixed(3)}</span>
                      </div>
                      <div>
                        <span className="text-[#404040] text-[8px] uppercase block">DIFF</span>
                        <span className={isLimitExceeded ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}>
                          {dimData.total_wear.toFixed(3)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#404040] text-[8px] uppercase block">TOL</span>
                        <span className="text-[#6b7280]">±{dimData.tolerance_limit.toFixed(3)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex-1 bg-[#141414] h-1 border border-[#2a2a2a] overflow-hidden">
                        <div 
                          className={`h-full ${
                            isLimitExceeded ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, dimData.wear_percentage)}%` }}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-[#6b7280] shrink-0 tabular-nums">{dimData.wear_percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 6. WEAR HISTORY */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-3 font-mono">
            <h4 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-blue-400" />
              <span>WEAR HISTORY & PROJECTION</span>
            </h4>
            
            {renderHistoryChart()}
          </div>
        </div>
      </div>
    </div>
  )
}

function MaintenanceLogSection({ dieId, canAdd }: { dieId: string; canAdd: boolean }) {
  const { request } = useApi()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [note, setNote] = useState('')
  const [category, setCategory] = useState('INSPECTION')

  const { data: logs, isLoading } = useQuery({
    queryKey: ['maintenanceLogs', dieId],
    queryFn: () => request(`/api/dies/${dieId}/maintenance-logs/`),
  })

  const addLogMutation = useMutation({
    mutationFn: (data: any) => request(`/api/dies/${dieId}/maintenance-logs/`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenanceLogs', dieId] })
      setShowForm(false)
      setNote('')
      setCategory('INSPECTION')
      showToast('Maintenance log added', 'success')
    },
    onError: () => {
      showToast('Failed to add log. Please try again.', 'error')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    addLogMutation.mutate({ note: note.trim(), category })
  }

  const categoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      INSPECTION: 'bg-[#141414] text-blue-400 border-blue-500/30',
      REPAIR: 'bg-[#141414] text-red-400 border-red-500/30',
      CLEANING: 'bg-[#141414] text-amber-400 border-amber-500/30',
      POLISHING: 'bg-[#141414] text-purple-400 border-purple-500/30',
      MEASUREMENT: 'bg-[#141414] text-emerald-400 border-emerald-500/30',
      OTHER: 'bg-[#141414] text-[#6b7280] border-[#2a2a2a]',
    }
    return colors[cat] || colors.OTHER
  }

  return (
    <div className="space-y-3 font-mono">
      {canAdd && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#141414] hover:bg-[#1f1f1f] text-[#e4e4e4] border border-[#2a2a2a] px-3 py-1 rounded-sm text-xs uppercase font-mono transition cursor-pointer"
        >
          + Add Log Entry
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-[#0a0a0a] rounded-sm p-3 border border-[#2a2a2a] space-y-2 font-mono">
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-[#141414] border border-[#2a2a2a] rounded-sm py-1 px-2 text-xs text-[#e4e4e4] focus:border-blue-500 focus:outline-none uppercase font-mono"
            >
              <option value="INSPECTION">INSPECTION</option>
              <option value="REPAIR">REPAIR</option>
              <option value="CLEANING">CLEANING</option>
              <option value="POLISHING">POLISHING</option>
              <option value="MEASUREMENT">MEASUREMENT</option>
              <option value="OTHER">OTHER</option>
            </select>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[#6b7280] hover:text-[#e4e4e4] text-xs px-2 uppercase font-mono cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <textarea
            rows={3}
            placeholder="Describe maintenance activity..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none text-xs font-mono"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addLogMutation.isPending || !note.trim()}
              className="bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 border border-blue-500/50 px-3 py-1 rounded-sm uppercase text-xs font-mono transition disabled:opacity-40 cursor-pointer"
            >
              {addLogMutation.isPending ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-1.5 max-h-60 overflow-y-auto">
        {isLoading ? (
          <p className="text-[#6b7280] text-xs">Loading logs...</p>
        ) : !logs || logs.length === 0 ? (
          <p className="text-[#6b7280] text-xs italic">No maintenance logs recorded.</p>
        ) : (
          logs.map((log: any) => (
            <div key={log.id} className="bg-[#0a0a0a] rounded-sm p-2.5 border border-[#1a1a1a] font-mono">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.2 text-[9px] font-mono uppercase rounded-sm border ${categoryBadge(log.category)}`}>
                    {log.category || 'OTHER'}
                  </span>
                  <span className="text-[9px] text-[#6b7280]">{log.created_by_username || 'System'}</span>
                </div>
                <span className="text-[9px] text-[#6b7280] tabular-nums">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <p className="text-xs text-[#e4e4e4] whitespace-pre-line mt-1">{log.note}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export function DieDetailPage() {
  const params = useParams()
  const id = params['*']
  const { request } = useApi()
  const { role } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const [isEditing, setIsEditing] = useState(false)
  const [statusVal, setStatusVal] = useState('')
  const [rack, setRack] = useState('')
  const [shelf, setShelf] = useState('')
  const [remarks, setRemarks] = useState('')
  const [currentSetId, setCurrentSetId] = useState('')
  
  const [dieIdVal, setDieIdVal] = useState('')
  const [casingVal, setCasingVal] = useState('')
  const [punchedSize, setPunchedSize] = useState('')
  const [punchedWidth, setPunchedWidth] = useState('')
  const [punchedThickness, setPunchedThickness] = useState('')
  
  // Custom subfields editing
  const [currentSize, setCurrentSize] = useState('')
  const [currentWidth, setCurrentWidth] = useState('')
  const [currentThickness, setCurrentThickness] = useState('')
  const [highlightedDim, setHighlightedDim] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [radiusVal, setRadiusVal] = useState('')
  const [showStatusConfirm, setShowStatusConfirm] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<any>(null)

  const [isRecutOpen, setIsRecutOpen] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [newWidth, setNewWidth] = useState('')
  const [newThickness, setNewThickness] = useState('')
  const [newRadius, setNewRadius] = useState('')
  const [recutNote, setRecutNote] = useState('')
  const [recutError, setRecutError] = useState<string | null>(null)

  // Query details
  const { data: die, isLoading, error } = useQuery({
    queryKey: ['die', id],
    queryFn: () => request(`/api/dies/${id}/`),
  })

  // Fetch prediction data for CAD rendering tolerance highlights
  const { data: prediction } = useQuery({
    queryKey: ['wearPrediction', die?.die_id],
    queryFn: () => request(`/api/dies/${die?.die_id}/wear-prediction/`),
    enabled: !!die?.die_id,
  })

  // Populate recut defaults when modal is opened or die changes
  useEffect(() => {
    if (die) {
      if (die.die_type === 'ROUND' && die.rounddie) {
        setNewSize(String(Number(die.rounddie.current_size) + 1.0))
      } else if (die.die_type === 'FLAT' && die.flatdie) {
        setNewWidth(String(Number(die.flatdie.current_width) + 1.0))
        setNewThickness(String(Number(die.flatdie.current_thickness) + 0.5))
        setNewRadius(String(die.flatdie.radius))
      }
    }
  }, [die, isRecutOpen])

  // Mutation for recutting die
  const recutMutation = useMutation({
    mutationFn: (data: any) => request(`/api/dies/${id}/recut/`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      showToast('Die recut successfully.', 'success')
      queryClient.invalidateQueries({ queryKey: ['die', id] })
      queryClient.invalidateQueries({ queryKey: ['dieDetail', id] })
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      setIsRecutOpen(false)
      setRecutNote('')
      setRecutError(null)
    },
    onError: () => {
      setRecutError('An error occurred during recutting. Please try again.')
    }
  })

  const { data: racksList } = useQuery({
    queryKey: ['racksList'],
    queryFn: () => request('/api/racks/')
  })
  const racks = racksList || []

  // Populate form states only when navigating to a different die (not on refetch)
  const prevDieIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (die) {
      if (prevDieIdRef.current === String(die.die_id)) return
      prevDieIdRef.current = String(die.die_id)
      setDieIdVal(die.die_id || '')
      setCasingVal(die.casing || '')
      setStatusVal(die.status || 'AVAILABLE')
      setRack(die.rack ? String(die.rack) : '')
      setShelf(die.shelf ? String(die.shelf) : '')
      setRemarks(die.remarks || '')
      setCurrentSetId(die.current_set || '')
      setCurrentSize(die.current_size || '')
      setCurrentWidth(die.current_width || '')
      setCurrentThickness(die.current_thickness || '')
      setPunchedSize(die.punched_size || '')
      setPunchedWidth(die.punched_width || '')
      setPunchedThickness(die.punched_thickness || '')
      setRadiusVal(die.radius || '')
    }
  }, [die])

  // Fetch sets list for editing dropdown
  const { data: setsList } = useQuery({
    queryKey: ['setsDropdownDetail'],
    queryFn: () => request('/api/sets/')
  })

  // Mutation for updating die
  const updateMutation = useMutation({
    mutationFn: (data: any) => request(`/api/dies/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['die', id] })
      await queryClient.cancelQueries({ queryKey: ['dieDetail', id] })
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })

      const previousDie = queryClient.getQueryData(['die', id])
      const previousDieDetail = queryClient.getQueryData(['dieDetail', id])
      const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['die', id], (old: any) => old ? { ...old, ...data } : old)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['dieDetail', id], (old: any) => old ? { ...old, ...data } : old)

      queryClient.setQueriesData({ queryKey: ['dies'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        return old.map((d: any) => String(d.die_id) === String(id) ? { ...d, ...data } : d)
      })
      queryClient.setQueriesData({ queryKey: ['searchDies'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        return old.map((d: any) => String(d.die_id) === String(id) ? { ...d, ...data } : d)
      })

      return { previousDie, previousDieDetail, previousDiesQueries, previousSearchDiesQueries }
    },
    onSuccess: (data: any) => {
      showToast('Die updated successfully.', 'success')
      if (data && data.die_id && String(data.die_id) !== String(id)) {
        navigate(`/dies/${data.die_id}`, { replace: true })
      }
    },
    onError: (err, data, context: any) => {
      if (context) {
        if (context.previousDie !== undefined) queryClient.setQueryData(['die', id], context.previousDie)
        if (context.previousDieDetail !== undefined) queryClient.setQueryData(['dieDetail', id], context.previousDieDetail)
        if (context.previousDiesQueries) {
          context.previousDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
        if (context.previousSearchDiesQueries) {
          context.previousSearchDiesQueries.forEach(([key, val]: any) => queryClient.setQueryData(key, val))
        }
      }
      showToast('Failed to update die. Please try again.', 'error')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['die', id] })
      queryClient.invalidateQueries({ queryKey: ['dieDetail', id] })
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['searchDies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      setIsEditing(false)
    }
  })

  // Mutation for deleting die
  const deleteMutation = useMutation({
    mutationFn: () => request(`/api/dies/${id}/`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dies'] })
      queryClient.invalidateQueries({ queryKey: ['allDiesStats'] })
      navigate('/inventory')
    }
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedId = dieIdVal.trim()
    if (!trimmedId) {
      showToast("Die ID is required.", "error")
      return
    }
    if (!/^[a-zA-Z0-9_\-./]+$/.test(trimmedId)) {
      showToast("Die ID can only contain alphanumeric characters, hyphens, underscores, dots, and slashes.", "error")
      return
    }

    const payload: any = {
      die_id: trimmedId,
      casing: casingVal,
      status: statusVal,
      rack: rack ? Number(rack) : null,
      shelf: shelf ? Number(shelf) : null,
      remarks,
      current_set: currentSetId || null,
      version: die?.version
    }
    if (die.die_type === 'ROUND') {
      payload.current_size = currentSize
      payload.punched_size = punchedSize
    } else {
      payload.current_width = currentWidth
      payload.current_thickness = currentThickness
      payload.punched_width = punchedWidth
      payload.punched_thickness = punchedThickness
      payload.radius = radiusVal
    }

    const statusChanged = die && statusVal !== die.status
    if (statusChanged) {
      setPendingPayload(payload)
      setShowStatusConfirm(true)
    } else {
      updateMutation.mutate(payload)
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const downloadSvg = () => {
    const svgEl = document.querySelector('.cad-svg-container svg') || document.querySelector('svg');
    if (!svgEl) {
      showToast('SVG blueprint not found', 'error');
      return;
    }
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    const safeDieId = (die?.die_id || 'die').replace(/\//g, '_');
    downloadLink.download = `dms_blueprint_${safeDieId}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast('SVG blueprint downloaded successfully', 'success');
  };

  if (isLoading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4 font-mono">
      <Skeleton width="w-48" height="h-6" />
      <Skeleton width="w-full" height="h-16" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Skeleton width="w-full" height="h-36" />
        <Skeleton width="w-full" height="h-36" />
        <Skeleton width="w-full" height="h-36" />
      </div>
    </div>
  )

  if (error || !die) return (
    <div className="max-w-7xl mx-auto px-4 py-6 font-mono">
      <div className="text-center py-8 bg-[#0f0f0f] border border-red-500/30 rounded-sm">
        <p className="text-red-400 font-mono text-xs uppercase">An error occurred loading asset.</p>
        <Link to="/inventory" className="text-blue-400 hover:underline mt-2 inline-block text-xs uppercase font-mono">← Back to Inventory</Link>
      </div>
    </div>
  )

  const canEdit = role === 'ROOT' || role === 'ADMIN'

  const sortedHistory = [...(die.history || [])].sort(
    (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  const historyTotal = sortedHistory.length
  const paginatedHistory = sortedHistory.slice((historyPage - 1) * 20, historyPage * 20)

  const breadcrumbs = [
    { label: 'Inventory', href: '/inventory' },
    { label: `Die ${die.die_id}` }
  ]

  const historyColumns = [
    { key: 'timestamp', label: 'Timestamp', render: (row: any) => <span className="tabular-nums font-mono">{new Date(row.timestamp).toLocaleString()}</span> },
    { key: 'changed_by_username', label: 'User' },
    { key: 'field_name', label: 'Property', render: (row: any) => row.field_name.replace(/_/g, ' ').toUpperCase() },
    { key: 'old_value', label: 'Previous Value', render: (row: any) => <span className="font-mono text-red-400 tabular-nums">{row.old_value || '—'}</span> },
    { key: 'new_value', label: 'New Value', render: (row: any) => <span className="font-mono text-emerald-400 tabular-nums">{row.new_value || '—'}</span> }
  ]

  const headerActions = (
    <div className="flex items-center gap-1.5 print:hidden font-mono">
      <button 
        onClick={handlePrint}
        className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs uppercase font-mono transition flex items-center gap-1.5 cursor-pointer"
      >
        <Printer className="h-3.5 w-3.5 text-blue-500" />
        Print
      </button>
      <button 
        onClick={downloadSvg}
        className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs uppercase font-mono transition flex items-center gap-1.5 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5 text-emerald-500" />
        Download SVG
      </button>
      {canEdit && (
        <button 
          onClick={() => setIsEditing(true)}
          className="bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 hover:text-blue-300 border border-blue-500/50 px-3.5 py-1 rounded-sm text-xs uppercase font-mono transition flex items-center gap-1.5 cursor-pointer"
        >
          <Wrench className="h-3.5 w-3.5" />
          Edit Asset
        </button>
      )}
      {role === 'ROOT' && (
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="bg-[#141414] hover:bg-[#1f1f1f] border border-red-500/40 text-red-400 hover:text-red-300 p-1 rounded-sm transition flex items-center cursor-pointer"
          title="Delete Asset"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4 print-container font-mono">
        <PageHeader 
          title={`Die Asset: ${die.die_id}`} 
          breadcrumbs={breadcrumbs}
          actions={headerActions}
        />

        {/* Double-column dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* LEFT COLUMN: Identity & Status (lg:span-5) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Identity Card */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-3 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">01 ASSET IDENTITY</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-[#1a1a1a]">
                  <span className="text-[#6b7280]">SYSTEM TAG</span>
                  <span className="font-mono text-[#e4e4e4] font-bold">{die.die_id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#1a1a1a]">
                  <span className="text-[#6b7280]">GEOMETRY PROFILE</span>
                  <span className="font-bold text-[#e4e4e4]">{die.die_type}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6b7280]">CASING PROFILE</span>
                  <span className="font-mono text-[#e4e4e4]">{die.casing || '—'}</span>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-3 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">02 OPERATIONS STATUS</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    die.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                  <span className="font-bold text-[#e4e4e4] text-xs uppercase">{die.status}</span>
                </div>
                <button 
                  onClick={() => setIsRecutOpen(true)}
                  className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-2.5 py-1 rounded-sm text-[10px] uppercase font-mono transition flex items-center gap-1 cursor-pointer"
                >
                  <Wrench className="h-3 w-3" />
                  Recut / Re-bore
                </button>
              </div>
            </div>

            {/* Physical Location mapping */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-2 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">03 WAREHOUSE MAPPING</h3>
              <div className="flex items-center gap-2.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-2.5">
                <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-[9px] text-[#6b7280] uppercase">STORAGE SLOT</p>
                  <p className="text-xs font-mono text-[#e4e4e4] mt-0.5">
                    {die.rack_name && die.shelf ? `${die.rack_name} — Shelf ${die.shelf}` : 'UNMAPPED / FLOOR'}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Visualizer Blueprint & Dims (lg:span-7) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Visualizer Blueprint Canvas */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 flex flex-col items-center font-mono">
              <div className="flex justify-between items-center w-full mb-2">
                <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">04 CAD VISUALIZER</h3>
                <span className="text-[9px] font-mono text-[#404040] uppercase">Orthographic Vector</span>
              </div>
              <div className="w-full flex justify-center py-2 bg-[#0a0a0a] rounded-sm border border-[#1a1a1a]">
                <Suspense fallback={<BlueprintSkeleton />}>
                  <DieBlueprint 
                    die={die} 
                    activeHighlight={highlightedDim}
                    onHoverDim={setHighlightedDim}
                    prediction={prediction}
                  />
                </Suspense>
              </div>
            </div>

            {/* Dimensions Specifications Grid */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-2 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">05 MEASUREMENTS PROFILE (MM)</h3>
              
              {die.die_type === 'ROUND' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div 
                    className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                      highlightedDim === 'punched_size' ? 'border-purple-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                    }`}
                    onMouseEnter={() => setHighlightedDim('punched_size')}
                    onMouseLeave={() => setHighlightedDim(null)}
                  >
                    <span className="text-[9px] text-[#6b7280] uppercase">BASE PUNCHED</span>
                    <p className="text-base font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">{die.punched_size} mm</p>
                  </div>
                  <div 
                    className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                      highlightedDim === 'current_size' ? 'border-blue-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                    }`}
                    onMouseEnter={() => setHighlightedDim('current_size')}
                    onMouseLeave={() => setHighlightedDim(null)}
                  >
                    <span className="text-[9px] text-[#6b7280] uppercase">CURRENT DIAMETER</span>
                    <p className="text-base font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">{die.current_size} mm</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div 
                      className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                        highlightedDim === 'punched_width_thickness' ? 'border-purple-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                      }`}
                      onMouseEnter={() => setHighlightedDim('punched_width_thickness')}
                      onMouseLeave={() => setHighlightedDim(null)}
                    >
                      <span className="text-[9px] text-[#6b7280] uppercase">BASE PUNCHED W×T</span>
                      <p className="text-sm font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">
                        {die.punched_width} × {die.punched_thickness} mm
                      </p>
                    </div>
                    <div 
                      className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                        highlightedDim === 'width_thickness' ? 'border-blue-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                      }`}
                      onMouseEnter={() => setHighlightedDim('width_thickness')}
                      onMouseLeave={() => setHighlightedDim(null)}
                    >
                      <span className="text-[9px] text-[#6b7280] uppercase">CURRENT W×T</span>
                      <p className="text-sm font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">
                        {die.current_width} × {die.current_thickness} mm
                      </p>
                    </div>
                  </div>
                  <div 
                    className={`bg-[#0a0a0a] border rounded-sm p-2.5 transition-colors ${
                      highlightedDim === 'radius' ? 'border-blue-500/60 bg-[#141414]' : 'border-[#1a1a1a]'
                    }`}
                    onMouseEnter={() => setHighlightedDim('radius')}
                    onMouseLeave={() => setHighlightedDim(null)}
                  >
                    <span className="text-[9px] text-[#6b7280] uppercase">FILLET CORNER RADIUS</span>
                    <p className="text-xs font-mono font-bold text-[#e4e4e4] mt-0.5 tabular-nums">{die.radius} mm</p>
                  </div>
                </div>
              )}
            </div>

            {/* Set Assignment Info */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-2 font-mono">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">06 PRODUCTION LINE ASSIGNMENT</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-2.5">
                  <span className="text-[9px] text-[#6b7280] uppercase">ACTIVE SET</span>
                  <p className="text-xs font-bold text-[#e4e4e4] mt-0.5 uppercase">{die.set_name || 'STAND-ALONE'}</p>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-2.5">
                  <span className="text-[9px] text-[#6b7280] uppercase">MACHINE</span>
                  <p className="text-xs font-bold text-[#e4e4e4] mt-0.5 uppercase">{die.machine_name || 'UNASSIGNED'}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Remarks Section */}
        {die.remarks && (
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-3.5 space-y-1 font-mono">
            <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">07 REMARKS</h3>
            <p className="text-[#e4e4e4] text-xs whitespace-pre-line leading-normal">{die.remarks}</p>
          </div>
        )}

        {/* Wear Prediction Section */}
        {(role === 'ROOT' || role === 'ADMIN') && <WearPredictionSection die={die} />}

        {/* Maintenance Log Form & Records */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-3 font-mono">
          <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">08 MAINTENANCE & CATEGORY LOG</h3>
          <MaintenanceLogSection dieId={die.die_id} canAdd={canEdit} />
        </div>

        {/* Industrial Audit Log (Paginated DataTable) */}
        {(role === 'ROOT' || role === 'ADMIN') && (
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-sm p-4 space-y-3 font-mono">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider">09 CHANGE AUDIT HISTORY</h3>
              <span className="text-[9px] font-mono text-[#6b7280] tabular-nums">SHOWING {paginatedHistory.length} OF {historyTotal} UPDATES</span>
            </div>
            
            {historyTotal === 0 ? (
              <EmptyState 
                title="NO CHANGES RECORDED"
                description="This die asset has not undergone any custom modification or update events since register."
              />
            ) : (
              <div className="space-y-3">
                <DataTable columns={historyColumns} rows={paginatedHistory} />
                {historyTotal > 20 && (
                  <div className="flex justify-between items-center pt-2">
                    <button
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                      className="bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-[#6b7280] font-mono tabular-nums">PAGE {historyPage} OF {Math.ceil(historyTotal / 20)}</span>
                    <button
                      disabled={historyPage * 20 >= historyTotal}
                      onClick={() => setHistoryPage(prev => prev + 1)}
                      className="bg-[#141414] hover:bg-[#1f1f1f] disabled:opacity-40 border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm text-xs font-mono uppercase transition cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Slide-out Edit Form Drawer */}
      <Drawer open={isEditing} onClose={() => setIsEditing(false)} title={`CONFIGURE DIE: ${die.die_id}`}>
        <form onSubmit={handleSave} className="space-y-4 pb-20 pr-1 pl-1 font-mono">
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">DIE ID</label>
            <input 
              type="text"
              value={dieIdVal}
              onChange={(e) => setDieIdVal(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono uppercase"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">CASING SIZE</label>
            <input 
              type="text"
              value={casingVal}
              onChange={(e) => setCasingVal(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono uppercase"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">STATUS</label>
            <select 
              value={statusVal}
              onChange={(e) => setStatusVal(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono uppercase cursor-pointer"
            >
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="RUNNING">RUNNING</option>
              <option value="CLEANING">CLEANING</option>
              <option value="POLISHING">POLISHING</option>
              <option value="DAMAGED">DAMAGED</option>
              <option value="SCRAPPED">SCRAPPED</option>
              <option value="MISSING">MISSING</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">LOCATION SLOT</label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono uppercase cursor-pointer"
              >
                <option value="">SELECT RACK...</option>
                {racks.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <input 
                type="number" 
                min="1"
                placeholder="SHELF"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">SET ASSIGNMENT</label>
            <SearchableSelect
              value={currentSetId}
              onChange={(val) => setCurrentSetId(String(val))}
              options={setsList?.map((s: any) => ({
                value: s.id,
                label: `${s.name} (${s.machine_name || 'No Machine'})`
              })) || []}
              placeholder="Select set to assign..."
              emptyLabel="— Unassigned —"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
            />
          </div>

          {die.die_type === 'ROUND' ? (
            <>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">PUNCHED DIAMETER (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={punchedSize}
                  onChange={(e) => setPunchedSize(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">CURRENT DIAMETER (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={currentSize}
                  onChange={(e) => setCurrentSize(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">PUNCHED WIDTH (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={punchedWidth}
                  onChange={(e) => setPunchedWidth(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">CURRENT WIDTH (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={currentWidth}
                  onChange={(e) => setCurrentWidth(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">PUNCHED THICKNESS (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={punchedThickness}
                  onChange={(e) => setPunchedThickness(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">CURRENT THICKNESS (MM)</label>
                <input 
                  type="number"
                  step="0.001"
                  value={currentThickness}
                  onChange={(e) => setCurrentThickness(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none font-mono text-xs"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-[10px] font-medium text-[#6b7280] uppercase tracking-wider mb-1">REMARKS</label>
            <textarea 
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2.5 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-[#1a1a1a]">
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] px-3 py-1 rounded-sm uppercase text-xs font-mono cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-[#141414] hover:bg-[#1f1f1f] border border-blue-500/50 text-blue-400 hover:text-blue-300 px-4 py-1 rounded-sm uppercase text-xs font-mono transition cursor-pointer"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* Confirm Action Dialogue */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Die Asset"
        message={`Are you absolutely sure you want to permanently delete die "${die?.die_id}"? This action is irreversible.`}
        confirmLabel="Delete Die"
        danger={true}
        onConfirm={() => {
          deleteMutation.mutate()
          setShowDeleteConfirm(false)
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmDialog
        open={showStatusConfirm}
        title="Confirm Status Change"
        message={`Are you sure you want to change the status of die "${die?.die_id}" from "${die?.status}" to "${statusVal}"?`}
        confirmLabel="Change Status"
        cancelLabel="Keep Current Status"
        danger={statusVal === 'SCRAPPED' || statusVal === 'DAMAGED'}
        onConfirm={() => {
          if (pendingPayload) {
            updateMutation.mutate(pendingPayload)
          }
          setShowStatusConfirm(false)
        }}
        onCancel={() => {
          setShowStatusConfirm(false)
          setPendingPayload(null)
          setStatusVal(die?.status || '')
        }}
      />

      {isRecutOpen && die && (
        <div className="fixed inset-0 z-50 overflow-y-auto font-mono" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen p-4 text-center">
            <div className="fixed inset-0 bg-[#0a0a0a]/80 transition-opacity" aria-hidden="true" onClick={() => setIsRecutOpen(false)}></div>
            <div className="relative bg-[#0f0f0f] border border-[#2a2a2a] rounded-sm text-left overflow-hidden max-w-md w-full p-4 font-mono z-10">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#1a1a1a]">
                <Wrench className="h-4 w-4 text-blue-500" />
                <h3 className="text-xs font-medium text-[#e4e4e4] uppercase tracking-[0.05em]" id="modal-title">
                  RECUT / RE-BORE DIE: {die.die_id}
                </h3>
              </div>

              <p className="text-[11px] text-[#6b7280] mb-3">
                Updates design base size (punched size) and resets current size. Status resets to AVAILABLE.
              </p>

              {recutError && (
                <div className="mb-3 p-2 bg-[#141414] border border-red-500/30 rounded-sm text-red-400 text-xs">
                  {recutError}
                </div>
              )}

              <div className="space-y-3">
                {die.die_type === 'ROUND' ? (
                  <div>
                    <label className="block text-[10px] text-[#6b7280] uppercase mb-1">NEW PUNCHED / CURRENT DIAMETER (MM)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
                      placeholder="e.g. 12.000"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-[#6b7280] uppercase mb-1">WIDTH (MM)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newWidth}
                        onChange={(e) => setNewWidth(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[#6b7280] uppercase mb-1">THICK (MM)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newThickness}
                        onChange={(e) => setNewThickness(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[#6b7280] uppercase mb-1">RADIUS (MM)</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newRadius}
                        onChange={(e) => setNewRadius(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] focus:border-blue-500 focus:outline-none text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-[#6b7280] uppercase mb-1">MAINTENANCE NOTE</label>
                  <textarea
                    rows={2}
                    value={recutNote}
                    onChange={(e) => setRecutNote(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm py-1.5 px-2 text-[#e4e4e4] placeholder-[#404040] focus:border-blue-500 focus:outline-none text-xs font-mono"
                    placeholder="Why is this die being recut?"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#1a1a1a]">
                <button
                  type="button"
                  onClick={() => setIsRecutOpen(false)}
                  className="px-3 py-1 bg-[#141414] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#6b7280] hover:text-[#e4e4e4] text-xs uppercase font-mono rounded-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={recutMutation.isPending}
                  onClick={() => {
                    const payload: any = { note: recutNote }
                    if (die.die_type === 'ROUND') {
                      payload.new_size = newSize
                    } else {
                      payload.new_width = newWidth
                      payload.new_thickness = newThickness
                      payload.new_radius = newRadius
                    }
                    recutMutation.mutate(payload)
                  }}
                  className="px-3 py-1 bg-[#141414] hover:bg-[#1f1f1f] text-blue-400 hover:text-blue-300 border border-blue-500/50 text-xs uppercase font-mono rounded-sm transition disabled:opacity-40 cursor-pointer"
                >
                  {recutMutation.isPending ? 'Processing...' : 'Confirm Recut'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
