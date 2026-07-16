import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Label,
} from 'recharts';
import type { PassData } from '../types';

interface AreaReductionChartProps {
  passes: PassData[];
}

function barColor(val: number) {
  if (val < 20) return '#3B82F6';
  if (val <= 24) return '#22C55E';
  if (val <= 28) return '#F59E0B';
  return '#EF4444';
}

const CustomBar = (props: any) => {
  const { x, y, width, height, value } = props;
  const fill = barColor(value);
  const r = Math.min(4, height / 2, width / 2);
  return (
    <g>
      <defs>
        <linearGradient id={'ar-' + x} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.85} />
          <stop offset="100%" stopColor={fill} stopOpacity={0.45} />
        </linearGradient>
      </defs>
      <rect
        x={x} y={y} width={width} height={height}
        rx={r} ry={r}
        fill={'url(#ar-' + x + ')'}
      />
      <text
        x={x + width / 2} y={y - 6}
        textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono"
        fill="#94A3B8" fontWeight={500}
      >
        {typeof value === 'number' ? value.toFixed(1) : value}%
      </text>
    </g>
  );
};

export default function AreaReductionChart({ passes }: AreaReductionChartProps) {
  if (passes.length === 0) return null;

  const data = passes.map((p) => ({
    pass: 'P' + p.pass,
    areaReduction: parseFloat(p.areaReduction.toFixed(2)),
  }));

  const avg = passes.reduce((s, p) => s + p.areaReduction, 0) / passes.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="wdc-panel"
    >
      <h3 className="text-[15px] font-semibold text-[#F8FAFC] m-0 mb-5">Area Reduction per Pass</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="pass"
            tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono' }}
            axisLine={false}
            tickLine={false}
          >
            <Label
              value="%" angle={-90} position="insideLeft"
              style={{ textAnchor: 'middle', fill: '#475569', fontSize: 10, fontFamily: 'Inter' }}
            />
          </YAxis>
          <Tooltip
            cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
            contentStyle={{
              background: '#1E293B',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: '#F8FAFC',
              fontSize: 12,
              fontFamily: 'JetBrains Mono',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
            formatter={(value) => [Number(value).toFixed(2) + '%', 'Area Reduction']}
          />
          <ReferenceLine
            y={avg}
            stroke="#8B5CF6" strokeDasharray="5 5" strokeOpacity={0.5}
            label={{ value: 'Avg ' + avg.toFixed(1) + '%', position: 'right', fill: '#8B5CF6', fontSize: 10 }}
          />
          <Bar dataKey="areaReduction" shape={<CustomBar />} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
