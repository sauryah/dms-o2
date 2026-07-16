import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Trash2, Printer, Download, Calendar, Target, MapPin, Layers, Activity, Compass, Ruler, FileText, Wrench, ArrowLeft, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, AlertCircle, Gauge, Clock } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useApi } from '../../../hooks/useApi'
import { DieBlueprint } from './CadRenderer'
import { Timeline } from './Timeline'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
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
      <div className="flex items-center justify-center h-full text-slate-500 italic text-sm">
        No dimension history recorded yet.
      </div>
    );
  }

  const isRound = dieType === 'ROUND';

  let allVals: number[] = [];
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
    <div className="relative w-full bg-slate-950/40 rounded-xl p-5 border border-slate-850">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines & Y-axis labels */}
        {yTicksVals.map((val, idx) => {
          const y = getY(val);
          return (
            <g key={idx} className="opacity-45">
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="#1e293b" 
                strokeDasharray="4 4" 
              />
              <text 
                x={paddingLeft - 8} 
                y={y + 4} 
                fill="#94a3b8" 
                fontSize="10" 
                textAnchor="end"
                className="font-mono font-bold"
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
              fill="#64748b"
              fontSize="9"
              textAnchor="middle"
              className="font-semibold"
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
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}
        {!isRound && widthPath && (
          <path 
            d={widthPath} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}
        {!isRound && thicknessPath && (
          <path 
            d={thicknessPath} 
            fill="none" 
            stroke="#a855f7" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        )}

        {/* Data points */}
        {data.map((p, idx) => {
          const x = getX(idx);
          return (
            <g key={idx}>
              {isRound && p.Size !== undefined && (
                <circle 
                  cx={x} 
                  cy={getY(p.Size)} 
                  r="5" 
                  fill="#0f172a" 
                  stroke="#3b82f6" 
                  strokeWidth="2.5" 
                />
              )}
              {!isRound && p.Width !== undefined && (
                <circle 
                  cx={x} 
                  cy={getY(p.Width)} 
                  r="5" 
                  fill="#0f172a" 
                  stroke="#3b82f6" 
                  strokeWidth="2.5" 
                />
              )}
              {!isRound && p.Thickness !== undefined && (
                <circle 
                  cx={x} 
                  cy={getY(p.Thickness)} 
                  r="5" 
                  fill="#0f172a" 
                  stroke="#a855f7" 
                  strokeWidth="2.5" 
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex justify-center space-x-6 mt-3 text-xs">
        {isRound ? (
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-slate-350 font-bold">Size (mm)</span>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="text-slate-350 font-bold">Width (mm)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-purple-500" />
              <span className="text-slate-350 font-bold">Thickness (mm)</span>
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
      let currentVal = parseFloat(die.punched_size || '0');
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
      let punchedW = parseFloat(die.punched_width || '0');
      let punchedT = parseFloat(die.punched_thickness || '0');
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
      <div className="bg-[#070d19] border border-slate-800 rounded-2xl p-12 mb-8 flex justify-center items-center shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading Predictive Models...</span>
        </div>
      </div>
    )
  }

  if (error || !prediction) {
    return (
      <div className="bg-[#070d19] border border-slate-800 rounded-2xl p-8 mb-8 text-slate-500 text-sm shadow-2xl">
        Unable to load wear prediction analysis.
      </div>
    )
  }

  const { alert_level, overall_wear_percentage, overall_remaining_days, dimensions } = prediction

  const alertBadgeColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
          label: 'CRITICAL',
          icon: AlertCircle
        }
      case 'WARNING':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
          label: 'WARNING',
          icon: AlertTriangle
        }
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
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
      label: 'Remaining Life',
      value: `${(100 - overall_wear_percentage).toFixed(1)}%`,
      icon: Gauge,
      description: 'Estimated wear margin before service limit.',
      iconColor: alert_level === 'CRITICAL' ? 'text-rose-400' : alert_level === 'WARNING' ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      label: 'Wear Progress',
      value: `${overall_wear_percentage.toFixed(1)}%`,
      icon: TrendingUp,
      description: 'Current status relative to total allowed wear.',
      iconColor: alert_level === 'CRITICAL' ? 'text-rose-400' : alert_level === 'WARNING' ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      label: 'Current Wear',
      value: `${maxWear.toFixed(3)} mm`,
      icon: Ruler,
      description: 'Maximum measured deviation from nominal.',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Predicted Recut',
      value: overall_remaining_days !== null ? `${Math.round(overall_remaining_days)} Days` : 'Calibrating...',
      icon: Calendar,
      description: overall_remaining_days !== null ? 'Forecasted time before recut is required.' : 'Accumulating historical readings.',
      iconColor: overall_remaining_days !== null && overall_remaining_days < 7 ? 'text-rose-400' : overall_remaining_days !== null && overall_remaining_days < 30 ? 'text-amber-400' : 'text-emerald-400',
    }
  ]

  const getRecommendationDetails = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return {
          title: 'Immediate Recut Mandatory',
          message: 'Severe wear detected. Dimensional tolerance limits exceeded. Stop production immediately to prevent defects.',
          action: 'Perform immediate recutting / polishing. Reset tool alignment.',
          nextInspection: '0 kg throughput or 0 operating hours (Immediate Action)',
          borderColor: 'border-l-rose-500',
          bgColor: 'bg-rose-500/5',
          iconColor: 'text-rose-400',
          icon: AlertCircle,
        };
      case 'WARNING':
        return {
          title: 'Schedule Maintenance Soon',
          message: 'Significant wear detected. The die is approaching its calibration limits. Plan maintenance window shortly.',
          action: 'Schedule inspection, clean die elements, prepare for recutting.',
          nextInspection: '1,000 kg throughput or 8 operating hours',
          borderColor: 'border-l-amber-500',
          bgColor: 'bg-amber-500/5',
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
          bgColor: 'bg-emerald-500/5',
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
        <div className="flex items-center justify-center h-32 text-slate-500 italic text-xs">
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
    
    let maxTime = Math.max(...timestamps)
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
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Critical limit line */}
          <line 
            x1={paddingLeft} 
            y1={limitY} 
            x2={width - paddingRight} 
            y2={limitY} 
            stroke="#ef4444" 
            strokeWidth="1.5"
            strokeDasharray="3 3"
            className="opacity-75"
          />
          <text 
            x={width - paddingRight + 5} 
            y={limitY + 3} 
            fill="#f87171" 
            fontSize="8"
            className="font-bold uppercase tracking-wider font-sans"
          >
            Limit ({limit}mm)
          </text>

          {/* Grid line at 0 */}
          <line 
            x1={paddingLeft} 
            y1={getY(0)} 
            x2={width - paddingRight} 
            y2={getY(0)} 
            stroke="#1e293b" 
            strokeWidth="1"
          />

          {/* Solid History Path */}
          {pathD && (
            <path 
              d={pathD} 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* Dashed Projection Path */}
          {projectionPathD && (
            <path 
              d={projectionPathD} 
              fill="none" 
              stroke="#ef4444" 
              strokeWidth="2" 
              strokeDasharray="4 4"
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          )}

          {/* Historical points */}
          {historyCoords.map((c, idx) => {
            const isLast = idx === historyCoords.length - 1
            return (
              <g key={idx} className="group">
                <circle 
                  cx={c.x} 
                  cy={c.y} 
                  r={isLast ? "4" : "3"} 
                  fill="#070d19" 
                  stroke={isLast ? "#ef4444" : "#3b82f6"} 
                  strokeWidth="2" 
                />
                <title>{`Date: ${c.date}\nWear: ${c.wear.toFixed(4)} mm`}</title>
              </g>
            )
          })}

          {/* Projected point */}
          {projectionCoord && (
            <g>
              <circle 
                cx={projectionCoord.x} 
                cy={projectionCoord.y} 
                r="4" 
                fill="#ef4444" 
                stroke="#070d19" 
                strokeWidth="1.5" 
              />
              <title>{`Projected Recut Limit reached\nin ${Math.round(overall_remaining_days || 0)} days`}</title>
            </g>
          )}

          {/* Y Axis Labels */}
          <text 
            x={paddingLeft - 6} 
            y={limitY + 3} 
            fill="#94a3b8" 
            fontSize="8" 
            textAnchor="end"
            className="font-mono font-bold"
          >
            {limit.toFixed(2)}
          </text>
          <text 
            x={paddingLeft - 6} 
            y={getY(0) + 3} 
            fill="#94a3b8" 
            fontSize="8" 
            textAnchor="end"
            className="font-mono font-bold"
          >
            0.00
          </text>

          {/* X Axis Labels */}
          {points.length > 0 && (
            <text 
              x={paddingLeft} 
              y={height - 5} 
              fill="#64748b" 
              fontSize="8" 
              textAnchor="start"
              className="font-semibold font-sans"
            >
              {points[0].date}
            </text>
          )}
          {projectionCoord && (
            <text 
              x={projectionCoord.x} 
              y={height - 5} 
              fill="#ef4444" 
              fontSize="8" 
              textAnchor="end"
              className="font-bold font-mono"
            >
              +{Math.round(overall_remaining_days || 0)}d Proj
            </text>
          )}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 mt-3 text-[10px] text-slate-400 font-semibold font-sans">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 bg-blue-500 rounded-sm" />
            <span>Wear History</span>
          </div>
          {hasProjection && (
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 border-t-2 border-dashed border-rose-500" />
              <span className="text-rose-400">RUL Projection</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 border-t-2 border-dashed border-red-500/60" />
            <span className="text-red-400/80">Critical Limit</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#070d19] border border-slate-800 rounded-2xl shadow-2xl p-8 mb-8">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800/40 mb-8">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-white font-heading">
            Preventive Wear Prediction
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Predictive calibration model analyzing dimensional wear against design tolerances.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">RUL Status:</span>
          <span className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-lg border uppercase tracking-wider transition-all duration-300 ${status.bg}`}>
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </span>
        </div>
      </div>

      {/* 2. PRIMARY KPI SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <div 
              key={index} 
              className="bg-[#0b1428] hover:bg-[#0e1b38] border border-slate-800/40 rounded-xl p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider font-sans">{kpi.label}</span>
                <Icon className={`h-4.5 w-4.5 ${kpi.iconColor} group-hover:scale-110 transition-transform duration-300`} />
              </div>
              <div className="text-3xl font-extrabold tracking-tight text-white font-heading my-1 font-mono">
                {kpi.value}
              </div>
              <p className="text-[11px] text-slate-500 leading-normal mt-2 font-sans">
                {kpi.description}
              </p>
            </div>
          )
        })}
      </div>

      {/* TWO COLUMN GRID FOR VISUALIZATION, ANALYSIS, RECOMMENDATION & HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: 3. WEAR VISUALIZATION & 5. RECOMMENDATION PANEL */}
        <div className="lg:col-span-7 space-y-8">
          {/* 3. WEAR VISUALIZATION */}
          <div className="bg-[#0b1428]/40 border border-slate-800/40 rounded-xl p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2 font-sans">
              <Activity className="h-4 w-4 text-blue-400" />
              Horizontal Wear Calibration Gauge
            </h4>
            
            <div className="relative pt-6 pb-2">
              <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2 font-sans">
                <span className="text-emerald-500/80">Safe Range (0-70%)</span>
                <span className="text-amber-500/80">Warning (70-90%)</span>
                <span className="text-rose-500/80">Critical (90-100%)</span>
              </div>
              
              <div className="relative h-4 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-850 p-0.5">
                {/* Segments background */}
                <div className="absolute inset-y-0.5 left-0.5 right-0.5 flex rounded-md overflow-hidden opacity-10">
                  <div className="w-[70%] bg-emerald-500"></div>
                  <div className="w-[20%] bg-amber-500"></div>
                  <div className="w-[10%] bg-rose-500"></div>
                </div>
                
                {/* Gauge fill */}
                <div 
                  className="h-full rounded-md transition-all duration-700 ease-out"
                  style={{
                    width: `${overall_wear_percentage}%`,
                    background: alert_level === 'CRITICAL' 
                      ? 'linear-gradient(90deg, rgba(239,68,68,0.4) 0%, rgba(239,68,68,1) 100%)'
                      : alert_level === 'WARNING'
                      ? 'linear-gradient(90deg, rgba(245,158,11,0.4) 0%, rgba(245,158,11,1) 100%)'
                      : 'linear-gradient(90deg, rgba(16,185,129,0.4) 0%, rgba(16,185,129,1) 100%)',
                    boxShadow: alert_level === 'CRITICAL'
                      ? '0 0 12px rgba(239,68,68,0.5)'
                      : alert_level === 'WARNING'
                      ? '0 0 12px rgba(245,158,11,0.5)'
                      : '0 0 12px rgba(16,185,129,0.5)'
                  }}
                />
              </div>

              {/* Ticks and indicator cursor */}
              <div className="relative w-full h-8 mt-2">
                <div className="absolute inset-x-0 top-0 flex justify-between px-1 text-[9px] text-slate-500 font-mono font-bold">
                  <span>0%</span>
                  <span>50%</span>
                  <span>70%</span>
                  <span>90%</span>
                  <span>100%</span>
                </div>
                
                {/* Pointer indicator */}
                <div 
                  className="absolute top-1.5 transition-all duration-700 ease-out -ml-3.5 flex flex-col items-center"
                  style={{ left: `${overall_wear_percentage}%` }}
                >
                  <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-white"></div>
                  <span className="bg-white text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-lg mt-1 font-mono">
                    {overall_wear_percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. RECOMMENDATION PANEL */}
          <div className={`border-l-4 ${recommendation.borderColor} ${recommendation.bgColor} rounded-r-xl p-6 transition-all duration-300 shadow-sm`}>
            <div className="flex items-start gap-4">
              <div className={`p-2.5 bg-[#070d19] rounded-lg shrink-0 border border-slate-800/60 ${recommendation.iconColor}`}>
                <RecIcon className="h-6 w-6" />
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-sans">
                    Operational Recommendation
                  </h4>
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${recommendation.iconColor} bg-slate-950/40 border border-current/10 font-sans`}>
                    {alert_level}
                  </span>
                </div>
                <p className="text-base font-bold text-white leading-relaxed font-sans">
                  {recommendation.title}
                </p>
                <p className="text-sm font-medium text-slate-355 leading-relaxed font-sans">
                  {recommendation.message}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800/40 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 font-sans">
                      Action Steps
                    </span>
                    <span className="text-slate-300 font-medium font-sans">
                      {recommendation.action}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 font-sans">
                      Next Inspection Threshold
                    </span>
                    <span className="text-slate-300 font-semibold font-mono">
                      {recommendation.nextInspection}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 4. DIMENSIONAL ANALYSIS & 6. WEAR HISTORY */}
        <div className="lg:col-span-5 space-y-8">
          {/* 4. DIMENSIONAL ANALYSIS */}
          <div className="bg-[#0b1428]/40 border border-slate-800/40 rounded-xl p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2 font-sans">
              <Ruler className="h-4 w-4 text-blue-400" />
              Dimensional Tolerances & Wear
            </h4>
            
            <div className="space-y-6">
              {Object.entries(dimensions).map(([dimName, dimData]: [string, any]) => {
                const displayTitle = dimName === 'size' ? 'Outer Diameter (Size)' : dimName === 'width' ? 'Ribbon Width' : 'Ribbon Thickness'
                const isLimitExceeded = dimData.wear_percentage >= 100
                const isWarning = dimData.wear_percentage >= 70 && dimData.wear_percentage < 100
                
                return (
                  <div key={dimName} className="space-y-4">
                    {/* Title & Status */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-300 tracking-wider uppercase font-sans">{displayTitle}</span>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isLimitExceeded ? 'bg-red-500 animate-ping' : isWarning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${isLimitExceeded ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'} font-sans`}>
                          {isLimitExceeded ? 'Exceeded' : isWarning ? 'Warning' : 'Normal'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Values Layout */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-sans">Measured</span>
                        <span className="text-base font-mono font-bold text-white mt-0.5">{dimData.current_value.toFixed(4)}<span className="text-[10px] text-slate-400 ml-0.5 font-sans font-normal">mm</span></span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-sans">Nominal</span>
                        <span className="text-base font-mono font-bold text-slate-400 mt-0.5">{dimData.initial_value.toFixed(4)}<span className="text-[10px] text-slate-500 ml-0.5 font-sans font-normal">mm</span></span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-sans">Difference</span>
                        <span className={`text-base font-mono font-bold mt-0.5 ${isLimitExceeded ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {dimData.total_wear.toFixed(4)}<span className="text-[10px] ml-0.5 font-sans font-normal">mm</span>
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-sans">Tolerance</span>
                        <span className="text-base font-mono font-bold text-slate-400 mt-0.5">±{dimData.tolerance_limit.toFixed(3)}<span className="text-[10px] text-slate-500 ml-0.5 font-sans font-normal">mm</span></span>
                      </div>
                    </div>

                    {/* Mini Gauge bar */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex-1 bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-850 p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLimitExceeded ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, dimData.wear_percentage)}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 font-bold shrink-0">{dimData.wear_percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 6. WEAR HISTORY */}
          <div className="bg-[#0b1428]/40 border border-slate-800/40 rounded-xl p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2 font-sans">
              <Clock className="h-4 w-4 text-blue-400" />
              Wear History & RUL Projection
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
    onError: (err: any) => {
      showToast(`Failed to add log: ${err.message}`, 'error')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    addLogMutation.mutate({ note: note.trim(), category })
  }

  const categoryBadge = (cat: string) => {
    const colors: Record<string, string> = {
      INSPECTION: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      REPAIR: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      CLEANING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      POLISHING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      MEASUREMENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      OTHER: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    }
    return colors[cat] || colors.OTHER
  }

  return (
    <div className="space-y-4">
      {canAdd && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-950 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300"
        >
          + Add Entry
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="INSPECTION">Inspection</option>
              <option value="REPAIR">Repair</option>
              <option value="CLEANING">Cleaning</option>
              <option value="POLISHING">Polishing</option>
              <option value="MEASUREMENT">Measurement</option>
              <option value="OTHER">Other</option>
            </select>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white text-sm px-3"
            >
              Cancel
            </button>
          </div>
          <textarea
            rows={3}
            placeholder="Describe the maintenance activity..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none text-sm"
            required
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addLogMutation.isPending || !note.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50"
            >
              {addLogMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {isLoading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : !logs || logs.length === 0 ? (
          <p className="text-slate-500 text-sm italic">No maintenance logs recorded.</p>
        ) : (
          logs.map((log: any) => (
            <div key={log.id} className="bg-slate-950/30 rounded-xl p-4 border border-slate-800/60">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md border ${categoryBadge(log.category)}`}>
                    {log.category || 'OTHER'}
                  </span>
                  <span className="text-xs text-slate-500">{log.created_by_username || 'System'}</span>
                </div>
                <span className="text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-line">{log.note}</p>
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
  const [location, setLocation] = useState('')
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
    onError: (err: any) => {
      setRecutError(err.message || 'An error occurred during recutting.')
    }
  })

  const { data: racksList } = useQuery({
    queryKey: ['racksList'],
    queryFn: () => request('/api/racks/')
  })
  const racks = racksList || []

  // Populate form states once data loads or changes
  useEffect(() => {
    if (die) {
      setDieIdVal(die.die_id || '')
      setCasingVal(die.casing || '')
      setStatusVal(die.status || 'AVAILABLE')
      setLocation(die.location || '')
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
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['die', id] })
      await queryClient.cancelQueries({ queryKey: ['dieDetail', id] })
      await queryClient.cancelQueries({ queryKey: ['dies'] })
      await queryClient.cancelQueries({ queryKey: ['searchDies'] })

      // Snapshot previous data
      const previousDie = queryClient.getQueryData(['die', id])
      const previousDieDetail = queryClient.getQueryData(['dieDetail', id])
      const previousDiesQueries = queryClient.getQueriesData({ queryKey: ['dies'] })
      const previousSearchDiesQueries = queryClient.getQueriesData({ queryKey: ['searchDies'] })

      // Optimistically update single die caches
      queryClient.setQueryData(['die', id], (old: any) => old ? { ...old, ...data } : old)
      queryClient.setQueryData(['dieDetail', id], (old: any) => old ? { ...old, ...data } : old)

      // Optimistically update list caches
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
      showToast(`Failed to update die: ${err.message}`, 'error')
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

    const selectedRack = racks.find((r: any) => String(r.id) === String(rack))
    const finalLocation = selectedRack && shelf ? `${selectedRack.name} - Shelf ${shelf}` : ''

    const payload: any = {
      die_id: trimmedId,
      casing: casingVal,
      status: statusVal,
      location: finalLocation,
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
    }
    updateMutation.mutate(payload)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const getChartData = () => {
    if (!die || !die.history) return [];

    const isRound = die.die_type === 'ROUND';
    const sortedHistory = [...die.history].sort(
      (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const points: any[] = [];

    if (isRound) {
      let currentVal = parseFloat(die.punched_size || '0');
      const creationDate = die.created_at || (sortedHistory.length > 0 ? sortedHistory[0].timestamp : new Date().toISOString());
      points.push({
        timestamp: new Date(creationDate).getTime(),
        date: new Date(creationDate).toLocaleDateString(),
        Size: currentVal,
      });

      sortedHistory.forEach((h: any) => {
        if (h.field_name === 'current_size') {
          const val = parseFloat(h.new_value);
          if (!isNaN(val)) {
            currentVal = val;
            points.push({
              timestamp: new Date(h.timestamp).getTime(),
              date: new Date(h.timestamp).toLocaleDateString(),
              Size: currentVal,
            });
          }
        }
      });

      const finalVal = parseFloat(die.current_size || '0');
      const lastPoint = points[points.length - 1];
      if (lastPoint && lastPoint.Size !== finalVal) {
        points.push({
          timestamp: new Date(die.updated_at || new Date().toISOString()).getTime(),
          date: new Date(die.updated_at || new Date().toISOString()).toLocaleDateString(),
          Size: finalVal,
        });
      }
    } else {
      let currentW = parseFloat(die.punched_width || '0');
      let currentT = parseFloat(die.punched_thickness || '0');
      const creationDate = die.created_at || (sortedHistory.length > 0 ? sortedHistory[0].timestamp : new Date().toISOString());
      points.push({
        timestamp: new Date(creationDate).getTime(),
        date: new Date(creationDate).toLocaleDateString(),
        Width: currentW,
        Thickness: currentT,
      });

      sortedHistory.forEach((h: any) => {
        if (h.field_name === 'current_width') {
          const val = parseFloat(h.new_value);
          if (!isNaN(val)) {
            currentW = val;
            points.push({
              timestamp: new Date(h.timestamp).getTime(),
              date: new Date(h.timestamp).toLocaleDateString(),
              Width: currentW,
              Thickness: currentT,
            });
          }
        } else if (h.field_name === 'current_thickness') {
          const val = parseFloat(h.new_value);
          if (!isNaN(val)) {
            currentT = val;
            points.push({
              timestamp: new Date(h.timestamp).getTime(),
              date: new Date(h.timestamp).toLocaleDateString(),
              Width: currentW,
              Thickness: currentT,
            });
          }
        }
      });

      const finalW = parseFloat(die.current_width || '0');
      const finalT = parseFloat(die.current_thickness || '0');
      const lastPoint = points[points.length - 1];
      if (lastPoint && (lastPoint.Width !== finalW || lastPoint.Thickness !== finalT)) {
        points.push({
          timestamp: new Date(die.updated_at || new Date().toISOString()).getTime(),
          date: new Date(die.updated_at || new Date().toISOString()).toLocaleDateString(),
          Width: finalW,
          Thickness: finalT,
        });
      }
    }

    return points.sort((a, b) => a.timestamp - b.timestamp);
  };

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
    <div className="flex justify-center items-center py-24">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center py-12 bg-rose-500/10 border border-rose-500/20 rounded-xl">
        <p className="text-rose-400 font-semibold">Error: {error.message}</p>
        <Link to="/inventory" className="text-blue-400 hover:underline mt-4 inline-block">Back to Inventory</Link>
      </div>
    </div>
  )

  const canEdit = role === 'ROOT' || role === 'ADMIN'

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html {
            background-color: white !important;
            color: #0f172a !important; /* text-slate-900 */
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
          nav, footer, .print\\:hidden {
            display: none !important;
          }
          .print-container {
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-only-container {
            display: block !important;
          }
          .print-only-container .glass-panel {
            background: white !important;
            border: 1px solid #e2e8f0 !important; /* border-slate-200 */
            box-shadow: none !important;
            border-radius: 12px !important;
          }
          .print-only-container .border-slate-800\\/80 {
            border-color: #e2e8f0 !important;
          }
          .print-only-container .blueprint-grid {
            background-color: #f8fafc !important; /* light slate background for grid */
            background-image: 
              linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px) !important;
            background-size: 20px 20px !important;
          }
          .print-only-container .blueprint-axis {
            stroke: #cbd5e1 !important; /* light gray grid axis */
            stroke-dasharray: 4 4 !important;
          }
          .print-only-container .blueprint-outline {
            stroke: #2563eb !important; /* darker blue for high contrast print */
            filter: none !important;
          }
          .print-only-container .blueprint-outline-secondary {
            stroke: #6366f1 !important; /* indigo */
          }
          .print-only-container .blueprint-dim-line {
            stroke: #059669 !important; /* darker green */
          }
          .print-only-container .blueprint-dim-text {
            fill: #059669 !important; /* darker green text */
          }
          .print-only-container svg rect {
            fill: #0f172a !important; /* dark capsule background */
          }
          .print-only-container svg text {
            fill: #10b981 !important; /* green text inside capsule */
          }
        }
      `}} />



      {/* Back Button and Breadcrumbs */}
      <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
        <button 
          onClick={() => navigate('/inventory')}
          className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl transition-all duration-300 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
          <span>Back to Inventory</span>
        </button>
        
        <div className="flex items-center space-x-2 text-sm text-slate-500">
          <Link to="/inventory" className="hover:text-slate-300">Inventory</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-slate-300 font-mono">{die.die_id}</span>
        </div>
      </div>

      <div className="bg-slate-900 print:bg-transparent border border-slate-800 print:border-none rounded-2xl shadow-xl print:shadow-none overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-950 print:from-transparent print:to-transparent p-8 border-b border-slate-800 print:border-b-2 print:border-black flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center space-x-3 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">
                {die.die_type} DIE
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white print:text-black mt-3 print:mt-0">{die.die_id}</h1>
            <p className="text-slate-400 print:text-slate-700 text-sm mt-1">Casing: {die.casing}</p>
          </div>
          
          <div className="flex space-x-2 print:hidden">
            <button 
              onClick={handlePrint}
              className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2"
            >
              <Printer className="h-4 w-4 text-blue-500" />
              <span className="hidden sm:inline">Print Blueprint</span>
            </button>
            <button 
              onClick={downloadSvg}
              className="bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2"
            >
              <Download className="h-4 w-4 text-emerald-500" />
              <span className="hidden sm:inline">Download SVG</span>
            </button>
            {canEdit && (
              <>
                <button 
                  onClick={() => setIsRecutOpen(true)}
                  className="bg-slate-950 hover:bg-slate-800 text-blue-400 hover:text-white border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2 animate-fadeIn"
                >
                  <Wrench className="h-4 w-4" />
                  <span>Recut</span>
                </button>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-slate-950 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button 
                  onClick={handleDelete}
                  className="bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 p-2.5 rounded-xl transition-all duration-300"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="p-8">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Die ID</label>
                  <input 
                    type="text"
                    value={dieIdVal}
                    onChange={(e) => setDieIdVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Casing</label>
                  <input 
                    type="text"
                    value={casingVal}
                    onChange={(e) => setCasingVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</label>
                  <select 
                    value={statusVal}
                    onChange={(e) => setStatusVal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="RUNNING">Running</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="POLISHING">Polishing</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="SCRAPPED">Scrapped</option>
                    <option value="MISSING">Missing</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select 
                      value={rack}
                      onChange={(e) => setRack(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">Select Rack...</option>
                      {racks.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      min="1"
                      placeholder="Shelf"
                      value={shelf}
                      onChange={(e) => setShelf(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign Set</label>
                  <SearchableSelect
                    value={currentSetId}
                    onChange={(val) => setCurrentSetId(String(val))}
                    options={setsList?.map((s: any) => ({
                      value: s.id,
                      label: `${s.name} (${s.machine_name || 'No Machine'})`
                    })) || []}
                    placeholder="Select set to assign..."
                    emptyLabel="— Unassigned —"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {die.die_type === 'ROUND' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Punched Size (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={punchedSize}
                        onChange={(e) => setPunchedSize(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Size (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={currentSize}
                        onChange={(e) => setCurrentSize(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Punched Width (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={punchedWidth}
                        onChange={(e) => setPunchedWidth(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Width (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={currentWidth}
                        onChange={(e) => setCurrentWidth(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Punched Thickness (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={punchedThickness}
                        onChange={(e) => setPunchedThickness(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Thickness (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={currentThickness}
                        onChange={(e) => setCurrentThickness(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Remarks</label>
                <textarea 
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800/80">
                <button 
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 px-5 py-2.5 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div>
                <h3 className="text-sm font-bold text-slate-400 print:text-black uppercase tracking-wider mb-4">Specifications</h3>
                <div className="bg-slate-950/50 print:bg-transparent rounded-xl p-5 border border-slate-850 print:border-black space-y-2">
                  <div 
                    className={`flex justify-between -mx-2 px-2 py-1.5 rounded-lg transition-all duration-300 border ${
                      highlightedDim === 'status' 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                        : 'border-transparent'
                    }`}
                    onMouseEnter={() => setHighlightedDim('status')}
                    onMouseLeave={() => setHighlightedDim(null)}
                  >
                    <span className={highlightedDim === 'status' ? 'text-blue-400' : 'text-slate-500 print:text-slate-800'}>Status</span>
                    <span className={`font-semibold ${highlightedDim === 'status' ? 'text-blue-300' : 'text-slate-200 print:text-black'}`}>{die.status}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1.5">
                    <span className="text-slate-500 print:text-slate-800">Location</span>
                    <span className="font-semibold text-slate-200 print:text-black">{die.location || '—'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1.5">
                    <span className="text-slate-500 print:text-slate-800">Set Assignment</span>
                    <span className="font-semibold text-slate-200 print:text-black">{die.set_name || '—'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1.5">
                    <span className="text-slate-500 print:text-slate-800">Machine</span>
                    <span className="font-semibold text-slate-200 print:text-black">{die.machine_name || '—'}</span>
                  </div>
                  <div 
                    className={`flex justify-between -mx-2 px-2 py-1.5 rounded-lg transition-all duration-300 border ${
                      highlightedDim === 'casing' 
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                        : 'border-transparent'
                    }`}
                    onMouseEnter={() => setHighlightedDim('casing')}
                    onMouseLeave={() => setHighlightedDim(null)}
                  >
                    <span className={highlightedDim === 'casing' ? 'text-blue-400' : 'text-slate-500 print:text-slate-800'}>Casing</span>
                    <span className={`font-semibold ${highlightedDim === 'casing' ? 'text-blue-300' : 'text-slate-200 print:text-black'}`}>{die.casing || '—'}</span>
                  </div>

                  {die.die_type === 'ROUND' ? (
                    <>
                      <div 
                        className={`flex justify-between border-t border-slate-800/80 print:border-t-black mt-2 pt-2 -mx-2 px-2 py-1.5 rounded-lg transition-all duration-300 border ${
                          highlightedDim === 'punched_size' 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)] border-t-indigo-500/30' 
                            : 'border-transparent'
                        }`}
                        onMouseEnter={() => setHighlightedDim('punched_size')}
                        onMouseLeave={() => setHighlightedDim(null)}
                      >
                        <span className={highlightedDim === 'punched_size' ? 'text-indigo-400' : 'text-slate-500 print:text-slate-800'}>Punched Size</span>
                        <span className={`font-semibold ${highlightedDim === 'punched_size' ? 'text-indigo-300' : 'text-slate-200 print:text-black'}`}>{die.punched_size} mm</span>
                      </div>
                      <div 
                        className={`flex justify-between -mx-2 px-2 py-1.5 rounded-lg transition-all duration-300 border ${
                          highlightedDim === 'current_size' 
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                            : 'border-transparent'
                        }`}
                        onMouseEnter={() => setHighlightedDim('current_size')}
                        onMouseLeave={() => setHighlightedDim(null)}
                      >
                        <span className={highlightedDim === 'current_size' ? 'text-blue-400' : 'text-slate-500 print:text-slate-800'}>Current Size</span>
                        <span className={`font-semibold ${highlightedDim === 'current_size' ? 'text-blue-300' : 'text-slate-200 print:text-black'}`}>{die.current_size} mm</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div 
                        className={`flex justify-between border-t border-slate-800/80 print:border-t-black mt-2 pt-2 -mx-2 px-2 py-1.5 rounded-lg transition-all duration-300 border ${
                          highlightedDim === 'punched_width_thickness' 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)] border-t-indigo-500/30' 
                            : 'border-transparent'
                        }`}
                        onMouseEnter={() => setHighlightedDim('punched_width_thickness')}
                        onMouseLeave={() => setHighlightedDim(null)}
                      >
                        <span className={highlightedDim === 'punched_width_thickness' ? 'text-indigo-400' : 'text-slate-500 print:text-slate-800'}>Punched Size (W×T)</span>
                        <span className={`font-semibold ${highlightedDim === 'punched_width_thickness' ? 'text-indigo-300' : 'text-slate-200 print:text-black'}`}>{die.punched_width} × {die.punched_thickness} mm</span>
                      </div>
                      <div 
                        className={`flex justify-between -mx-2 px-2 py-1.5 rounded-lg transition-all duration-300 border ${
                          highlightedDim === 'width_thickness' 
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                            : 'border-transparent'
                        }`}
                        onMouseEnter={() => setHighlightedDim('width_thickness')}
                        onMouseLeave={() => setHighlightedDim(null)}
                      >
                        <span className={highlightedDim === 'width_thickness' ? 'text-blue-400' : 'text-slate-500 print:text-slate-800'}>Current Size (W×T)</span>
                        <span className={`font-semibold ${highlightedDim === 'width_thickness' ? 'text-blue-300' : 'text-slate-200 print:text-black'}`}>{die.current_width} × {die.current_thickness} mm</span>
                      </div>
                      <div 
                        className={`flex justify-between -mx-2 px-2 py-1.5 rounded-lg transition-all duration-300 border ${
                          highlightedDim === 'radius' 
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                            : 'border-transparent'
                        }`}
                        onMouseEnter={() => setHighlightedDim('radius')}
                        onMouseLeave={() => setHighlightedDim(null)}
                      >
                        <span className={highlightedDim === 'radius' ? 'text-blue-400' : 'text-slate-500 print:text-slate-800'}>Radius</span>
                        <span className={`font-semibold ${highlightedDim === 'radius' ? 'text-blue-300' : 'text-slate-200 print:text-black'}`}>{die.radius} mm</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="cad-svg-container print:w-[350px] print:h-[350px] flex flex-col items-center">
                <h3 className="text-sm font-bold text-slate-400 print:text-black uppercase tracking-wider mb-4 w-full text-left">CAD Blueprint</h3>
                <DieBlueprint 
                  die={die} 
                  activeHighlight={highlightedDim}
                  onHoverDim={setHighlightedDim}
                />
              </div>

              <div className="md:col-span-2 lg:col-span-1">
                <h3 className="text-sm font-bold text-slate-400 print:text-black uppercase tracking-wider mb-4">Remarks</h3>
                <div className="bg-slate-950/50 print:bg-transparent rounded-xl p-5 border border-slate-850 print:border-black h-[calc(100%-2rem)]">
                  <p className="text-slate-300 print:text-black whitespace-pre-line text-sm leading-relaxed">
                    {die.remarks || 'No remarks recorded.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wear Prediction Section */}
      {(role === 'ROOT' || role === 'ADMIN') && <WearPredictionSection die={die} />}

      {/* Maintenance Logs */}
      <div className="bg-slate-900 print:hidden border border-slate-800 rounded-2xl shadow-xl p-8 mb-8">
        <h3 className="text-lg font-bold text-white mb-6">Maintenance Log</h3>
        <MaintenanceLogSection dieId={die.die_id} canAdd={canEdit} />
      </div>

      {/* History timeline */}
      <div className="print:hidden">
        <Timeline history={die.history} />
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Die Asset"
        message={`Are you absolutely sure you want to permanently delete die "${die?.die_id}"? This action is irreversible and all transaction history will be purged.`}
        confirmText="Delete Die"
        isDestructive={true}
        onConfirm={() => {
          deleteMutation.mutate()
          setShowDeleteConfirm(false)
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {isRecutOpen && die && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-950/80 transition-opacity backdrop-blur-sm" aria-hidden="true" onClick={() => setIsRecutOpen(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-slate-900 border border-slate-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-slate-900 px-6 pt-6 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-500/10 text-blue-500 sm:mx-0 sm:h-10 sm:w-10">
                    <Wrench className="h-6 w-6" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-bold text-white font-heading" id="modal-title">
                      Recut / Re-bore Die: {die.die_id}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-slate-400">
                        This action updates the design base size (punched size) and resets the current size. The die status will be set to AVAILABLE.
                      </p>
                    </div>

                    {recutError && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        {recutError}
                      </div>
                    )}

                    <div className="mt-6 space-y-4">
                      {die.die_type === 'ROUND' ? (
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">New Punched/Current Diameter (mm)</label>
                          <input
                            type="number"
                            step="0.001"
                            value={newSize}
                            onChange={(e) => setNewSize(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                            placeholder="e.g. 12.000"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Current size is {die.rounddie?.current_size} mm (original punched size: {die.rounddie?.punched_size} mm)
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">New Width (mm)</label>
                              <input
                                type="number"
                                step="0.001"
                                value={newWidth}
                                onChange={(e) => setNewWidth(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">New Thick (mm)</label>
                              <input
                                type="number"
                                step="0.001"
                                value={newThickness}
                                onChange={(e) => setNewThickness(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">New Radius (mm)</label>
                              <input
                                type="number"
                                step="0.001"
                                value={newRadius}
                                onChange={(e) => setNewRadius(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none text-sm"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">
                            Current dims: {die.flatdie?.current_width} x {die.flatdie?.current_thickness} mm (fillet radius: {die.flatdie?.radius} mm)
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Maintenance Note / Reason</label>
                        <textarea
                          rows={3}
                          value={recutNote}
                          onChange={(e) => setRecutNote(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none text-sm"
                          placeholder="Why is this die being recut? (e.g. Ring formation removed, recut to size 12.0)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-950 px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse gap-3 border-t border-slate-800">
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
                  className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-base font-semibold text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:bg-blue-800 transition-colors"
                >
                  {recutMutation.isPending ? 'Processing...' : 'Confirm Recut'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecutOpen(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-xl border border-slate-800 shadow-sm px-4 py-2.5 bg-slate-900 text-base font-semibold text-slate-300 hover:text-white focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Print-only View */}
    <div className="hidden print:block w-full text-slate-900 bg-white min-h-screen p-4 print-only-container">
      {/* Header Row */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">DMS DIE BLUEPRINT REPORT</h1>
          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Generated: {new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</span>
            <span className="text-slate-350">|</span>
            <span>Die ID: {die.die_id}</span>
          </p>
        </div>
        <span className={`px-4 py-1.5 rounded-full border text-xs font-bold ${
          die.status === 'AVAILABLE' 
            ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
            : die.status === 'RUNNING'
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-amber-500 bg-amber-50 text-amber-700'
        }`}>
          {die.status}
        </span>
      </div>

      {/* Title / Identity Row */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center shadow-sm">
          <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <ellipse cx="12" cy="6" rx="6" ry="3" />
            <path d="M6 6v12c0 1.66 2.69 3 6 3s6-1.34 6-3V6" />
          </svg>
        </div>
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{die.die_id}</h2>
          <p className="text-sm text-slate-500 mt-1">Casing: <span className="text-blue-600 font-semibold">{die.casing}</span></p>
        </div>
      </div>

      {/* Section: Specifications */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-blue-600 rounded-sm" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Specifications</h3>
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          {/* Status */}
          <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
            <span className="text-slate-500 flex items-center gap-2.5">
              <Target className="h-4 w-4 text-slate-400" />
              <span>Status</span>
            </span>
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                die.status === 'AVAILABLE' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <span className={die.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-amber-600'}>{die.status}</span>
            </span>
          </div>
          {/* Location */}
          <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
            <span className="text-slate-500 flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>Location</span>
            </span>
            <span className="font-semibold text-slate-900">{die.location || '—'}</span>
          </div>
          {/* Set Assignment */}
          <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
            <span className="text-slate-500 flex items-center gap-2.5">
              <Layers className="h-4 w-4 text-slate-400" />
              <span>Set Assignment</span>
            </span>
            <span className="font-semibold text-slate-900">{die.set_name || '—'}</span>
          </div>
          {/* Machine */}
          <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
            <span className="text-slate-500 flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-slate-400" />
              <span>Machine</span>
            </span>
            <span className="font-semibold text-slate-900">{die.machine_name || '—'}</span>
          </div>
          {/* Casing */}
          <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
            <span className="text-slate-500 flex items-center gap-2.5">
              <Target className="h-4 w-4 text-slate-400" />
              <span>Casing</span>
            </span>
            <span className="font-semibold text-slate-900">{die.casing || '—'}</span>
          </div>
          
          {die.die_type === 'ROUND' ? (
            <>
              {/* Punched Size */}
              <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
                <span className="text-slate-500 flex items-center gap-2.5">
                  <Ruler className="h-4 w-4 text-slate-400" />
                  <span>Punched Size</span>
                </span>
                <span className="font-semibold text-slate-900">{die.punched_size} mm</span>
              </div>
              {/* Current Size */}
              <div className="flex justify-between items-center py-3 px-4 text-sm">
                <span className="text-slate-500 flex items-center gap-2.5">
                  <Ruler className="h-4 w-4 text-slate-400" />
                  <span>Current Size</span>
                </span>
                <span className="font-semibold text-slate-900">{die.current_size} mm</span>
              </div>
            </>
          ) : (
            <>
              {/* Punched Size WxT */}
              <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
                <span className="text-slate-500 flex items-center gap-2.5">
                  <Ruler className="h-4 w-4 text-slate-400" />
                  <span>Punched Size (W×T)</span>
                </span>
                <span className="font-semibold text-slate-900">{die.punched_width} × {die.punched_thickness} mm</span>
              </div>
              {/* Current Size WxT */}
              <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
                <span className="text-slate-500 flex items-center gap-2.5">
                  <Ruler className="h-4 w-4 text-slate-400" />
                  <span>Current Size (W×T)</span>
                </span>
                <span className="font-semibold text-slate-900">{die.current_width} × {die.current_thickness} mm</span>
              </div>
              {/* Radius */}
              <div className="flex justify-between items-center py-3 px-4 text-sm">
                <span className="text-slate-500 flex items-center gap-2.5">
                  <Compass className="h-4 w-4 text-slate-400" />
                  <span>Radius</span>
                </span>
                <span className="font-semibold text-slate-900">{die.radius} mm</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section: CAD Blueprint */}
      <div className="mb-8 break-inside-avoid">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-blue-600 rounded-sm" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">CAD Blueprint</h3>
        </div>
        <div className="flex justify-center items-center">
          <div className="w-full max-w-lg">
            <DieBlueprint 
              die={die} 
              activeHighlight={null}
              onHoverDim={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Section: Remarks */}
      <div className="break-inside-avoid">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-blue-600 rounded-sm" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Remarks</h3>
        </div>
        <div className="border border-slate-200 rounded-xl p-5 bg-white min-h-[80px]">
          <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">
            {die.remarks || 'No remarks recorded.'}
          </p>
        </div>
      </div>
    </div>
  </>
)
}
