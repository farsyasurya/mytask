"use client";

import React, { useState, useEffect, useMemo } from "react";
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
} from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/50 text-xs z-50">
        <p className="font-bold text-slate-100">{data.label || data.name || data.matkul}</p>
        {data.progressPercent !== undefined ? (
          <p className="text-xs font-semibold mt-1 text-emerald-400">
            Progress: <span className="font-bold">{data.progressPercent}%</span> ({data.doneCount}/{data.totalStudents} Mahasiswa)
          </p>
        ) : (
          <p className="text-xs font-semibold mt-1 text-indigo-400">
            {data.value} <span className="font-normal text-slate-400">Mahasiswa</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (!percent || percent === 0) return null;
  const RADIAN = Math.PI / 180;
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

export default function AdminTaskChart({ adminTaskGroups = [] }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 640);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  // 1. Data per Mata Kuliah untuk Bar Chart (Desktop)
  const matkulChartData = useMemo(() => {
    const grouped = {};

    adminTaskGroups.forEach((group) => {
      const key = group.matkul || "Lainnya";
      if (!grouped[key]) {
        grouped[key] = { matkul: key, totalProgress: 0, count: 0, doneCount: 0, totalStudents: 0 };
      }
      grouped[key].totalProgress += group.progressPercent || 0;
      grouped[key].doneCount += group.doneCount || 0;
      grouped[key].totalStudents += group.totalStudents || 0;
      grouped[key].count += 1;
    });

    return Object.values(grouped).map((item) => ({
      label: item.matkul,
      progressPercent: Math.round(item.totalProgress / item.count),
      doneCount: item.doneCount,
      totalStudents: item.totalStudents,
    }));
  }, [adminTaskGroups]);

  // 2. Aggregate Status Breakdown untuk Pie Chart (Mobile)
  const statusPieData = useMemo(() => {
    let doneTotal = 0;
    let onProgressTotal = 0;
    let newTotal = 0;
    let rejectTotal = 0;

    adminTaskGroups.forEach((group) => {
      doneTotal += group.doneCount || 0;
      onProgressTotal += group.onProgressCount || 0;
      newTotal += group.newCount || 0;
      rejectTotal += group.rejectCount || 0;
    });

    return [
      { name: "Selesai (Done)", value: doneTotal, color: "#10B981" },
      { name: "Sedang Dikerjakan", value: onProgressTotal, color: "#F59E0B" },
      { name: "Belum Dikerjakan", value: newTotal, color: "#3B82F6" },
      { name: "Perlu Perbaikan", value: rejectTotal, color: "#EF4444" },
    ].filter((item) => item.value > 0);
  }, [adminTaskGroups]);

  if (!adminTaskGroups || adminTaskGroups.length === 0) return null;

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 md:p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            Analisis Progres Tugas Kelas
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              {isMobile ? "Grafik Donut" : "Grafik Batang Per Matkul"}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isMobile
              ? "Distribusi status pengerjaan seluruh mahasiswa"
              : "Rata-rata persentase penyelesaian tugas per mata kuliah"}
          </p>
        </div>
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          {isMobile ? (
            /* MODE MOBILE: Pie / Donut Chart Status Breakdown */
            <PieChart>
              <Pie
                data={statusPieData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                stroke="none"
                cornerRadius={6}
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {statusPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 ml-1">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          ) : (
            /* MODE DESKTOP: Bar Chart Progress Per Matkul */
            <BarChart data={matkulChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-slate-100 dark:stroke-slate-800" />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                dy={10}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(241, 245, 249, 0.1)" }} />
              <Bar dataKey="progressPercent" name="Progress Selesai (%)" radius={[10, 10, 0, 0]} barSize={40}>
                {matkulChartData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.progressPercent === 100 ? "#10B981" : entry.progressPercent > 50 ? "#4F46E5" : "#F59E0B"}
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
