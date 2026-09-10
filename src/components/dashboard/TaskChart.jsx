import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

// Data konfigurasi warna & status
const STATUS_CONFIG = {
  Baru: { key: 'new', color: '#8B5CF6' }, // Purple
  'Dalam Proses': { key: 'on_progress', color: '#F59E0B' }, // Amber
  Selesai: { key: 'done', color: '#10B981' }, // Emerald
};

const getStatusCounts = (tasks = []) => {
  const counts = { Baru: 0, 'Dalam Proses': 0, Selesai: 0 };

  tasks.forEach((t) => {
    if (t.status === 'new') counts.Baru += 1;
    else if (t.status === 'on_progress') counts['Dalam Proses'] += 1;
    else if (t.status === 'done') counts.Selesai += 1;
  });

  return Object.entries(counts).map(([status, value]) => ({
    status,
    value,
    color: STATUS_CONFIG[status].color,
  }));
};

// 1. PERBAIKAN TOOLTIP: Mengambil nama status dengan benar dari payload
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; // Ambil objek data asli (status, value, color)
    return (
      <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700/50 text-xs z-50">
        <p className="font-semibold text-slate-200">{data.status}</p>
        <p className="text-sm font-bold mt-0.5 text-indigo-400">
          {data.value} <span className="font-normal text-slate-400 text-xs">Tugas</span>
        </p>
      </div>
    );
  }
  return null;
};

// 2. LABEL PERSENTASE DI DALAM CHART
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent === 0) return null; // Sembunyikan label jika nilainya 0

  const RADIAN = Math.PI / 180;
  // Hitung posisi tengah segmen donut
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[11px] font-bold drop-shadow-md select-none"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function TaskChart({ tasks }) {
  const data = React.useMemo(() => getStatusCounts(tasks), [tasks]);
  const [, setSelected] = React.useState(null);
  const totalTasks = React.useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 640);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-sm transition-all duration-300 hover:shadow-md mt-6">
      {/* Header & Total Counter */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Distribusi Tugas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ringkasan status pekerjaan saat ini
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
            {totalTasks}
          </span>
          <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Total
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {isMobile ? (
            /* MODE MOBILE: Donut Chart */
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={5}
                dataKey="value"
                nameKey="status" /* FIX: Memberitahu Recharts untuk membaca status sebagai nama legenda */
                stroke="none"
                cornerRadius={6}
                labelLine={false}
                label={renderCustomizedLabel} /* FIX: Menampilkan persenan di dalam chart */
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    cursor="pointer"
                    onClick={() => setSelected(entry)}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {/* FIX LEGENDA: Menggunakan `entry.payload.status` agar tampil sesuai nama status */}
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value, entry) => (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ml-1">
                    {entry.payload.status}
                  </span>
                )}
              />
            </PieChart>
          ) : (
            /* MODE DESKTOP: Bar Chart */
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                className="stroke-slate-100 dark:stroke-slate-800"
              />
              <XAxis
                dataKey="status"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 12 }}
                dy={10}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94A3B8', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.1)' }} />
              <Bar
                dataKey="value"
                name="Jumlah Tugas"
                radius={[10, 10, 0, 0]}
                barSize={40}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`bar-cell-${index}`}
                    fill={entry.color}
                    onClick={() => setSelected(entry)}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}