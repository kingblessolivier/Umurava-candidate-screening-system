"use client";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState }   from "@/store";
import { fetchDashboardStats }      from "@/store/analyticsSlice";
import { motion }                   from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { BarChart3, TrendingUp, Users, Zap, AlertCircle } from "lucide-react";

const COLORS = ["#3b82f6","#7c3aed","#22c55e","#f59e0b","#ec4899","#14b8a6","#f97316","#8b5cf6","#06b6d4","#84cc16"];

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-400" /> {title}
      </h2>
      {children}
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const dispatch  = useDispatch<AppDispatch>();
  const { dashboard, loading } = useSelector((s: RootState) => s.analytics);

  useEffect(() => { dispatch(fetchDashboardStats()); }, [dispatch]);

  if (loading || !dashboard) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-xl animate-pulse" style={{ background: "var(--bg-surface)" }} />
        <div className="grid grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: "var(--bg-surface)" }} />
          ))}
        </div>
      </div>
    );
  }

  const { topSkills, commonGaps, recBreakdown, candidateSources, scoreStats, overview } = dashboard;

  // Pie data for recommendation breakdown
  const recPieData = Object.entries(recBreakdown).map(([name, value]) => ({ name, value }));

  // Source pie data
  const sourcePieData = candidateSources.map(s => ({ name: s.source, value: s.count }));

  // Top vs Average data for radar
  const topVsAvgData = [
    { metric: "Skills",       top: 100, avg: scoreStats.avgScore },
    { metric: "Experience",   top: 95,  avg: scoreStats.avgScore - 5 },
    { metric: "Education",    top: 88,  avg: scoreStats.avgScore - 10 },
    { metric: "Projects",     top: 90,  avg: scoreStats.avgScore - 8 },
    { metric: "Availability", top: 100, avg: scoreStats.avgScore + 5 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm mt-0.5 text-gray-500">
          Aggregate insights across all screenings
        </p>
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Jobs",        value: overview.totalJobs,        color: "#3b82f6", icon: Zap },
          { label: "Candidates",        value: overview.totalCandidates,  color: "#7c3aed", icon: Users },
          { label: "Screenings Run",    value: overview.totalScreenings,  color: "#f59e0b", icon: BarChart3 },
          { label: "Avg AI Confidence", value: `${Math.round(scoreStats.avgConfidence)}%`, color: "#22c55e", icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</p>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-6">

        {/* Chart 1: Top Skills (Bar) */}
        <SectionCard title="Top Skills in Shortlists" icon={BarChart3}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSkills.slice(0, 10)} layout="vertical" barSize={10} margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="skill" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, color: "#e5e7eb" }}
                  formatter={(val: number) => [`${val} candidates`, "Count"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {topSkills.slice(0, 10).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Chart 2: Common Skill Gaps (Bar) */}
        <SectionCard title="Most Common Skill Gaps" icon={AlertCircle}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commonGaps.slice(0, 8)} layout="vertical" barSize={10} margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fill: "#4b5563", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="skill" tick={{ fill: "#9ca3af", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, color: "#e5e7eb" }}
                  formatter={(val: number) => [`${val} candidates missing`, "Gap"]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#ef4444" fillOpacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-3 gap-6">

        {/* Chart 3: Recommendation breakdown (Pie) */}
        <SectionCard title="Recommendation Breakdown" icon={Users}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={recPieData}
                  cx="50%" cy="50%"
                  innerRadius={40} outerRadius={72}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(" ")[0]}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={9}
                >
                  {recPieData.map((_, i) => (
                    <Cell key={i} fill={["#22c55e","#3b82f6","#f59e0b","#ef4444"][i] || COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, color: "#e5e7eb" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Chart 4: Candidate sources (Pie) */}
        <SectionCard title="Candidate Sources" icon={Users}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourcePieData} cx="50%" cy="50%" outerRadius={72} dataKey="value" label={({ name }) => name}>
                  {sourcePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, color: "#e5e7eb" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Chart 5: Top vs Average Radar */}
        <SectionCard title="Top vs. Avg Candidate" icon={TrendingUp}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={topVsAvgData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "#4b5563", fontSize: 9 }} />
                <Radar name="Top Candidate" dataKey="top" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} />
                <Radar name="Avg Candidate" dataKey="avg" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.12} />
                <Legend
                  formatter={v => <span style={{ fontSize: 10, color: "#9ca3af" }}>{v}</span>}
                />
                <Tooltip contentStyle={{ background: "#0d1220", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, color: "#e5e7eb" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Top skills with avg score table */}
      {topSkills.length > 0 && (
        <SectionCard title="Skill Performance Table" icon={BarChart3}>
          <div className="space-y-2">
            {topSkills.slice(0, 12).map((s, i) => (
              <div key={s.skill} className="flex items-center gap-3">
                <span className="text-[11px] w-5 text-right flex-shrink-0" style={{ color: "var(--text-dim)" }}>{i + 1}</span>
                <span className="text-xs text-white flex-1 font-medium">{s.skill}</span>
                <div className="flex-1 max-w-xs h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{ width: `${s.count * 10}%`, background: COLORS[i % COLORS.length], maxWidth: "100%" }} />
                </div>
                <span className="text-[11px] w-16 text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>{s.count} candidates</span>
                <span className="text-[11px] w-12 text-right flex-shrink-0" style={{ color: "var(--text-muted)" }}>avg {s.avgScore}%</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
