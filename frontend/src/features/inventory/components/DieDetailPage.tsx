import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, Trash2, Printer, Download, Calendar, Target, MapPin, Layers, Activity, Compass, Ruler, FileText } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useToast } from '../../../contexts/ToastContext'
import { useApi } from '../../../hooks/useApi'
import { DieBlueprint } from './CadRenderer'
import { Timeline } from './Timeline'
import { ConfirmDialog } from '../../../components/ConfirmDialog'

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

export function DieDetailPage() {
  const { id } = useParams()
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
  
  // Custom subfields editing
  const [currentSize, setCurrentSize] = useState('')
  const [currentWidth, setCurrentWidth] = useState('')
  const [currentThickness, setCurrentThickness] = useState('')
  const [highlightedDim, setHighlightedDim] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Query details
  const { data: die, isLoading, error } = useQuery({
    queryKey: ['die', id],
    queryFn: () => request(`/api/dies/${id}/`),
  })

  const { data: racksList } = useQuery({
    queryKey: ['racksList'],
    queryFn: () => request('/api/racks/')
  })
  const racks = racksList || []

  // Populate form states once data loads or changes
  useEffect(() => {
    if (die) {
      setStatusVal(die.status || 'AVAILABLE')
      setLocation(die.location || '')
      setRack(die.rack ? String(die.rack) : '')
      setShelf(die.shelf ? String(die.shelf) : '')
      setRemarks(die.remarks || '')
      setCurrentSetId(die.current_set || '')
      setCurrentSize(die.current_size || '')
      setCurrentWidth(die.current_width || '')
      setCurrentThickness(die.current_thickness || '')
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
    const selectedRack = racks.find((r: any) => String(r.id) === String(rack))
    const finalLocation = selectedRack && shelf ? `${selectedRack.name} - Shelf ${shelf}` : ''

    const payload: any = {
      status: statusVal,
      location: finalLocation,
      rack: rack ? Number(rack) : null,
      shelf: shelf ? Number(shelf) : null,
      remarks,
      current_set: currentSetId || null
    }
    if (die.die_type === 'ROUND') {
      payload.current_size = currentSize
    } else {
      payload.current_width = currentWidth
      payload.current_thickness = currentThickness
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
      let currentVal = parseFloat(die.original_size || '0');
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
      let currentW = parseFloat(die.original_width || '0');
      let currentT = parseFloat(die.original_thickness || '0');
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
    downloadLink.download = `dms_blueprint_${die?.die_id || 'die'}.svg`;
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



      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-slate-500 mb-6 print:hidden">
        <Link to="/inventory" className="hover:text-slate-300">Inventory</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-slate-300">{die.die_id}</span>
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
                      required
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
                      required
                      placeholder="Shelf"
                      value={shelf}
                      onChange={(e) => setShelf(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assign Set</label>
                  <select 
                    value={currentSetId}
                    onChange={(e) => setCurrentSetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">— Unassigned —</option>
                    {setsList?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.machine_name})</option>
                    ))}
                  </select>
                </div>
                {die.die_type === 'ROUND' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Size (mm)</label>
                    <input 
                      type="number"
                      step="0.001"
                      value={currentSize}
                      onChange={(e) => setCurrentSize(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Width (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={currentWidth}
                        onChange={(e) => setCurrentWidth(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Current Thickness (mm)</label>
                      <input 
                        type="number"
                        step="0.001"
                        value={currentThickness}
                        onChange={(e) => setCurrentThickness(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 focus:border-blue-500 focus:outline-none"
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
                          highlightedDim === 'original_size' 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)] border-t-indigo-500/30' 
                            : 'border-transparent'
                        }`}
                        onMouseEnter={() => setHighlightedDim('original_size')}
                        onMouseLeave={() => setHighlightedDim(null)}
                      >
                        <span className={highlightedDim === 'original_size' ? 'text-indigo-400' : 'text-slate-500 print:text-slate-800'}>Original Size</span>
                        <span className={`font-semibold ${highlightedDim === 'original_size' ? 'text-indigo-300' : 'text-slate-200 print:text-black'}`}>{die.original_size} mm</span>
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
                          highlightedDim === 'original_width_thickness' 
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)] border-t-indigo-500/30' 
                            : 'border-transparent'
                        }`}
                        onMouseEnter={() => setHighlightedDim('original_width_thickness')}
                        onMouseLeave={() => setHighlightedDim(null)}
                      >
                        <span className={highlightedDim === 'original_width_thickness' ? 'text-indigo-400' : 'text-slate-500 print:text-slate-800'}>Original Size (W×T)</span>
                        <span className={`font-semibold ${highlightedDim === 'original_width_thickness' ? 'text-indigo-300' : 'text-slate-200 print:text-black'}`}>{die.original_width} × {die.original_thickness} mm</span>
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

      {/* Wear Trend Chart */}
      <div className="bg-slate-900 print:hidden border border-slate-800 rounded-2xl shadow-xl p-8 mb-8">
        <h3 className="text-lg font-bold text-white mb-6">Dimension Wear Trend</h3>
        <DimensionWearChart data={getChartData()} dieType={die.die_type} />
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
              {/* Original Size */}
              <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
                <span className="text-slate-500 flex items-center gap-2.5">
                  <Ruler className="h-4 w-4 text-slate-400" />
                  <span>Original Size</span>
                </span>
                <span className="font-semibold text-slate-900">{die.original_size} mm</span>
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
              {/* Original Size WxT */}
              <div className="flex justify-between items-center border-b border-slate-100 py-3 px-4 text-sm">
                <span className="text-slate-500 flex items-center gap-2.5">
                  <Ruler className="h-4 w-4 text-slate-400" />
                  <span>Original Size (W×T)</span>
                </span>
                <span className="font-semibold text-slate-900">{die.original_width} × {die.original_thickness} mm</span>
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
