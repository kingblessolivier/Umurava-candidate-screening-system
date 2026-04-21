"use client";
import { useEffect, useState }     from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState }  from "@/store";
import { fetchResults, deleteResult } from "@/store/screeningSlice";
import Link                        from "next/link";
import { motion }                  from "framer-motion";
import { Trophy, Users, Clock, Zap, ArrowRight, BarChart3, Trash2 } from "lucide-react";

export default function ResultsPage() {
  const dispatch  = useDispatch<AppDispatch>();
  const { results, loading } = useSelector((s: RootState) => s.screening);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { dispatch(fetchResults()); }, [dispatch]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Delete this screening result?")) return;
    
    setDeletingId(id);
    try {
      await dispatch(deleteResult(id)).unwrap();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Screening Results</h1>
          <p className="text-sm mt-0.5 text-gray-500">{results.length} screening{results.length !== 1 ? "s" : ""} run</p>
        </div>
        <Link href="/analytics" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-gray-300 transition-all">
          <BarChart3 className="w-4 h-4" /> Analytics
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl animate-pulse bg-gray-100" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-900 font-medium">No results yet</p>
          <p className="text-sm mt-1 text-gray-500">Run your first AI screening to see results here</p>
          <Link href="/screening" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
            <Zap className="w-4 h-4" /> Run Screening
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r, i) => {
            const avgScore = r.shortlist?.length
              ? Math.round(r.shortlist.reduce((a, c) => a + c.finalScore, 0) / r.shortlist.length)
              : 0;

            return (
              <motion.div
                key={r._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2"
              >
                <Link
                  href={`/results/${r._id}`}
                  className="flex-1 flex items-center justify-between p-5 rounded-2xl bg-white border border-gray-200 group transition-all hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{r.jobTitle}</p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Users className="w-3 h-3" />{r.totalApplicants} screened
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Trophy className="w-3 h-3" />{r.shortlistSize} shortlisted
                      </span>
                      {r.processingTimeMs && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Clock className="w-3 h-3" />{(r.processingTimeMs / 1000).toFixed(1)}s
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Zap className="w-3 h-3" />{r.aiModel}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    {avgScore > 0 && (
                      <div className="text-right">
                        <p className="text-lg font-bold" style={{ color: avgScore >= 70 ? "#22c55e" : avgScore >= 55 ? "#f59e0b" : "#ef4444" }}>
                          {avgScore}%
                        </p>
                        <p className="text-[10px] text-gray-500">avg score</p>
                      </div>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </Link>
                <button
                  onClick={(e) => handleDelete(r._id || "", e)}
                  disabled={deletingId === r._id}
                  className="p-2.5 rounded-xl transition-all text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50"
                  title="Delete result"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
