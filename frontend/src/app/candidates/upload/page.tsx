"use client";
import { useState, useCallback, useRef } from "react";
import { useDispatch, useSelector }       from "react-redux";
import { AppDispatch, RootState }         from "@/store";
import { uploadCSV, uploadPDFs, bulkImportJSON, fetchCandidates } from "@/store/candidatesSlice";
import { useRouter }                      from "next/navigation";
import { useJobs }                        from "@/hooks/useJobs";
import toast                              from "react-hot-toast";
import { motion, AnimatePresence }        from "framer-motion";
import { Upload, FileText, FileSpreadsheet, Code2, CheckCircle, XCircle, Loader2, ArrowLeft, Bell } from "lucide-react";
import Link from "next/link";

type TabType = "csv" | "pdf" | "json";

const SAMPLE_JSON = JSON.stringify([
  {
    firstName: "Alice", lastName: "Uwimana", email: "alice@example.com",
    headline: "Senior React Developer", location: "Kigali, Rwanda",
    skills: [{ name: "React", level: "Expert", yearsOfExperience: 5 }, { name: "TypeScript", level: "Advanced", yearsOfExperience: 4 }],
    experience: [{ company: "TechCo", role: "Senior Frontend Developer", startDate: "2020-01", isCurrent: true, description: "Led frontend team of 5", technologies: ["React","TypeScript","GraphQL"] }],
    education: [{ institution: "University of Rwanda", degree: "BSc", fieldOfStudy: "Computer Science", startYear: 2014, endYear: 2018 }],
    availability: { status: "Available", type: "Full-time" },
    projects: [],
    certifications: [],
  }
], null, 2);

export default function UploadCandidatesPage() {
  const dispatch    = useDispatch<AppDispatch>();
  const router      = useRouter();
  const { uploading } = useSelector((s: RootState) => s.candidates);
  const { jobs } = useJobs();

  const [tab, setTab]           = useState<TabType>("csv");
  const [dragging, setDragging] = useState(false);
  const [files, setFiles]       = useState<File[]>([]);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [pdfJobId, setPdfJobId] = useState("");
  const [pdfQueued, setPdfQueued] = useState(false);
  const [result, setResult]     = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const accept = tab === "pdf" ? ".pdf" : ".csv,.xlsx,.xls";
  const multiple = tab === "pdf";

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles(prev => multiple ? [...prev, ...dropped] : [dropped[0]]);
  }, [multiple]);

  const handleUpload = async () => {
    setResult(null);
    setPdfQueued(false);
    try {
      if (tab === "json") {
        let parsed: unknown;
        try { parsed = JSON.parse(jsonText); } catch { return toast.error("Invalid JSON"); }
        if (!Array.isArray(parsed)) return toast.error("JSON must be an array of candidate objects");
        const res = await dispatch(bulkImportJSON(parsed)).unwrap() as { created: number; skipped: number; errors: string[] };
        setResult(res);
        await dispatch(fetchCandidates({}));
        if (res.created > 0) toast.success(`${res.created} candidates imported!`);
      } else if (tab === "csv") {
        if (!files[0]) return toast.error("Select a CSV or Excel file first");
        const res = await dispatch(uploadCSV({ file: files[0] })).unwrap() as { created: number; skipped: number; errors: string[] };
        setResult(res);
        await dispatch(fetchCandidates({}));
        if (res.created > 0) toast.success(`${res.created} candidates imported!`);
      } else {
        // PDF — runs in background
        if (!files.length) return toast.error("Select PDF files first");
        if (!pdfJobId) return toast.error("Select a job position for the PDF resumes");
        await dispatch(uploadPDFs({ files, jobId: pdfJobId })).unwrap();
        setPdfQueued(true);
        setFiles([]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/candidates" className="p-2 rounded-xl hover:bg-white/5 text-gray-400">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Candidates</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Import from CSV, PDF resumes, or structured JSON</p>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        {([
          { id: "csv", label: "CSV / Excel", icon: FileSpreadsheet },
          { id: "pdf", label: "PDF Resumes", icon: FileText },
          { id: "json", label: "JSON",        icon: Code2 },
        ] as { id: TabType; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setFiles([]); setResult(null); setPdfQueued(false); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === id ? "rgba(59,130,246,0.15)" : "transparent",
              color:      tab === id ? "#60a5fa"                : "var(--text-muted)",
              border:     tab === id ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
            }}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Job selector — required for PDF uploads */}
      {tab === "pdf" && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Job Position (required)</label>
          <select
            value={pdfJobId}
            onChange={e => setPdfJobId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <option value="">— Select a job —</option>
            {jobs.map(j => (
              <option key={j._id} value={j._id}>{j.title}</option>
            ))}
          </select>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Resumes will be parsed by AI and linked to the selected job.
          </p>
        </div>
      )}

      {/* Drop zone */}
      {tab !== "json" && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="relative rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragging ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
            background: dragging ? "rgba(59,130,246,0.05)" : "var(--bg-surface)",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={e => setFiles(multiple ? Array.from(e.target.files || []) : [e.target.files![0]])}
          />
          <Upload className="w-10 h-10 mb-3" style={{ color: dragging ? "#3b82f6" : "var(--text-muted)" }} />
          <p className="text-sm font-medium text-white">
            {tab === "csv" ? "Drop CSV or Excel file" : "Drop up to 20 PDF resumes"}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>or click to browse</p>
          {tab === "csv" && (
            <p className="text-[11px] mt-4 text-center" style={{ color: "var(--text-muted)" }}>
              Required column: <code className="text-blue-400">email</code>. Optional: firstName, lastName, headline, location, skills, availabilityType
            </p>
          )}
          {files.length > 0 && (
            <div className="mt-4 space-y-1 w-full max-w-xs">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> {f.name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JSON editor */}
      {tab === "json" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs font-medium text-white">Talent Profile JSON Array</span>
            <button onClick={() => setJsonText(SAMPLE_JSON)} className="text-xs text-blue-400 hover:text-blue-300">Reset to sample</button>
          </div>
          <textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            rows={16}
            spellCheck={false}
            className="w-full px-4 py-3 text-xs font-mono text-green-400 outline-none resize-none"
            style={{ background: "#060911" }}
          />
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={uploading || (tab !== "json" && files.length === 0)}
        className="w-full py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
      >
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : <><Upload className="w-4 h-4" /> Import Candidates</>}
      </button>

      {/* PDF queued state */}
      <AnimatePresence>
        {pdfQueued && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-5 flex items-start gap-4"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}
          >
            <Bell className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-300">Processing in the background</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                AI is parsing your resumes. You'll receive a notification in the bell icon when it's done — feel free to navigate anywhere.
              </p>
              <button
                onClick={() => router.push("/candidates")}
                className="mt-3 text-xs text-blue-400 hover:text-blue-300"
              >
                View candidates →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 font-medium">{result.created} created</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-400">{result.skipped} duplicates skipped</span>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-400 mb-1 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {result.errors.length} errors
                </p>
                <ul className="space-y-1">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i} className="text-xs text-red-400/70">{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.created > 0 && (
              <button
                onClick={() => router.push("/candidates")}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View all candidates →
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
