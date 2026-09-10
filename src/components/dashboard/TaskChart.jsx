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

// Data konfigurasi warna & status agar tampilan lebih modern dan konsisten
const STATUS_CONFIG = {
  Baru: { key: 'new', color: '#6366F1', label: 'Baru' }, // Indigo
  'Dalam Proses': { key: 'on_progress', color: '#F59E0B', label: 'Dalam Proses' }, // Amber
  Selesai: { key: 'done', color: '#10B981', label: 'Selesai' }, // Emerald
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

// Custom Tooltip Modern
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700 text-xs">
        <p className="font-medium text-slate-300">{data.name || data.payload.status}</p>
        <p className="text-sm font-bold mt-0.5">
          {data.value} <span className="font-normal text-slate-400 text-xs">Tugas</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function TaskChart({ tasks }) {
  const data = React.useMemo(() => getStatusCounts(tasks), [tasks]);
  const [selected, setSelected] = React.useState(null);
  const totalTasks = React.useMemo(() => data.reduce((acc, curr) => acc + curr.value, 0), [data]);

  // Hook untuk mendeteksi mode Mobile (< 640px)
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 640);
    checkIsMobile(); // Jalankan saat pertama kali mount
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-sm transition-all duration-300 hover:shadow-md mt-6">
      {/* Header & Total Task Counter */}
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
            /* Mode Mobile: Donut / Pie Chart Modern */
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={6}
                dataKey="value"
                stroke="none"
                cornerRadius={8}
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
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 ml-1">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          ) : (
            /* Mode Desktop: Bar Chart Modern dengan Gradient & Rounded Bars */
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.8} />
                </linearGradient>
              </defs>
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
              <Bar
                dataKey="value"
                name="Jumlah Tugas"
                fill="url(#barGradient)"
                radius={[10, 10, 0, 0]}
                barSize={40}
              >
                {/* Pewarnaan per-bar berdasarkan warna status */}
                {data.map((entry, index) => (
                  <Cell key={`bar-cell-${index}`} fill={entry.color} onClick={() => setSelected(entry)} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
        {selected && selected.status !== "Selesai" && (
          <div className="mt-2 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
            <div>{selected.status}</div>
            <div>{selected.value} tugas</div>
          </div>
        )}
      </div>
    </div>
  );
}