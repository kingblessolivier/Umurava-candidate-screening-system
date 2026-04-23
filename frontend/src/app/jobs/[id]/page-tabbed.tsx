"use client";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/store";
import { fetchJob, deleteJob, clearSelected } from "@/store/jobsSlice";
import { fetchCandidates, updateCandidate, uploadCSV, uploadPDFs, bulkImportJSON } from "@/store/candidatesSlice";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { DragDropUpload } from "@/components/ui/DragDropUpload";
import { CandidateDetailModal } from "@/components/candidates/CandidateDetailModal";
import {
  ArrowLeft, Briefcase, MapPin, Clock, DollarSign, Award, CheckCircle,
  AlertCircle, Edit, Trash2, Zap, Users, BarChart3, Plus, FileText,
} from "lucide-react";
import { Candidate } from "@/types";

const LEVEL_COLORS: Record<string, string> = {
  Junior: "#10b981",
  "Mid-level": "#3b82f6",
  Senior: "#8b5cf6",
  Lead: "#f59e0b",
  Executive: "#ef4444",
};

type TabType = "details" | "candidates" | "screening" | "analytics";

export default function JobDetailPageTabbed() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { selected: job, loading, error } = useSelector((s: RootState) => s.jobs);
  const { items: candidates } = useSelector((s: RootState) => s.candidates);

  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [showAddCandidates, setShowAddCandidates] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<typeof candidates[0] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pdfQueued, setPdfQueued] = useState(false);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (id) {
      dispatch(fetchJob(id));
      dispatch(fetchCandidates());
    }
    return () => {
      dispatch(clearSelected());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (!pdfQueued || !id) return;

    let attempts = 0;
    const maxAttempts = 24; // 24 * 5s = 2 minutes
    const timer = setInterval(async () => {
      attempts += 1;
      await dispatch(fetchCandidates());
      if (attempts >= maxAttempts) {
        setPdfQueued(false);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [pdfQueued, id, dispatch]);

  const handleDelete = async () => {
    if (!job || !confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
    try {
      await dispatch(deleteJob(job._id)).unwrap();
      toast.success("Job deleted");
      router.push("/jobs");
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const handleFileUpload = async (file: File) => {
    toast.loading(`Uploading ${file.name}...`);
    try {
      if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        const result = await dispatch(uploadCSV({ file, jobId: id })).unwrap();
        toast.dismiss();
        toast.success(`${result.created} candidates imported!`);
        await dispatch(fetchCandidates());
        setShowAddCandidates(false);
      } else if (file.name.endsWith('.pdf')) {
        const result = await dispatch(uploadPDFs({ files: [file], jobId: id })).unwrap();
        toast.dismiss();
        toast.success(`Processing ${file.name} in background...`);
        setPdfQueued(true);
        setShowAddCandidates(false);
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
        const result = await dispatch(bulkImportJSON(parsed)).unwrap();
        toast.dismiss();
        toast.success(`${result.created} candidates imported!`);
        await dispatch(fetchCandidates());
        setShowAddCandidates(false);
      }
    } catch (err) {
      toast.dismiss();
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleViewCandidate = (candidate: typeof candidates[0]) => {
    setSelectedCandidate(candidate);
    setModalOpen(true);
  };

  const handleUpdateCandidate = async (id: string, updates: Partial<Candidate>) => {
    const result = await dispatch(updateCandidate({ id, updates }));
    if (result.meta.requestStatus === 'fulfilled') {
      setSelectedCandidate(result.payload as typeof candidates[0]);
      await dispatch(fetchCandidates());
    }
    return result;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <p className="text-red-500">{error || "Job not found"}</p>
        <Link href="/jobs" className="text-blue-500 hover:underline inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>
      </div>
    );
  }

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode; count?: number }> = [
    { id: "details", label: "Job Details", icon: <Briefcase className="w-4 h-4" /> },
    { id: "candidates", label: "Candidates", icon: <Users className="w-4 h-4" />, count: candidates.length },
    { id: "screening", label: "AI Screening", icon: <Zap className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Jobs", href: "/jobs", icon: "📋" },
          { label: job.title },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              {job.department && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" /> {job.department}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {job.type}
              </span>
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: LEVEL_COLORS[job.experienceLevel] + "20",
                  color: LEVEL_COLORS[job.experienceLevel],
                }}
              >
                {job.experienceLevel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/jobs/${job._id}/edit`}
            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition"
          >
            <Edit className="w-5 h-5" />
          </Link>
          <button
            onClick={handleDelete}
            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        className="flex gap-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-3 font-medium text-sm transition-all flex items-center gap-2 border-b-2 -mb-px"
            style={{
              color: activeTab === tab.id ? "#3b82f6" : "var(--text-muted)",
              borderColor: activeTab === tab.id ? "#3b82f6" : "transparent",
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: activeTab === tab.id ? "rgba(59, 130, 246, 0.2)" : "rgba(148, 163, 184, 0.1)",
                  color: activeTab === tab.id ? "#3b82f6" : "var(--text-muted)",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl" style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
              <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{job.description}</p>
            </div>

            {job.responsibilities && job.responsibilities.length > 0 && (
              <div className="p-6 rounded-xl" style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" /> Responsibilities
                </h2>
                <ul className="space-y-2">
                  {job.responsibilities.map((r, i) => (
                    <li key={i} className="flex gap-3 text-gray-300">
                      <span className="text-green-400 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {job.requirements && job.requirements.length > 0 && (
              <div className="p-6 rounded-xl" style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-400" /> Required Skills
                </h2>
                <div className="space-y-3">
                  {job.requirements.map((req, i) => (
                    <div key={i} className="flex items-start justify-between p-3 rounded-lg" style={{ background: "rgba(148, 163, 184, 0.1)" }}>
                      <div>
                        <p className="font-medium text-white">{req.skill}</p>
                        {req.level && <p className="text-xs text-gray-400">{req.level}</p>}
                        {req.yearsRequired && <p className="text-xs text-gray-400">{req.yearsRequired} years required</p>}
                      </div>
                      {req.required && <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-300">Required</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Candidates Tab */}
        {activeTab === "candidates" && (
          <div className="space-y-4">
            {!showAddCandidates ? (
              <>
                {candidates.length === 0 ? (
                  <EmptyState
                    icon="👥"
                    title="No Candidates Yet"
                    description="Add candidates to this job to start screening. You can upload CSV, JSON, or add manually."
                    action={{
                      label: "Add Candidates",
                      onClick: () => setShowAddCandidates(true),
                    }}
                    tips={[
                      "Upload CSV files with columns: firstName, lastName, email, skills",
                      "Drag and drop files for quick import",
                      "Add single candidates manually if needed",
                    ]}
                  />
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-white font-medium">{candidates.length} candidates</p>
                      <button
                        onClick={() => setShowAddCandidates(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                        style={{ backgroundColor: "rgba(59, 130, 246, 0.2)" }}
                      >
                        <Plus className="w-4 h-4" />
                        Add More
                      </button>
                    </div>
                    <div className="grid gap-3">
                      {candidates.slice(0, 5).map(candidate => (
                        <div
                          key={candidate._id}
                          className="p-4 rounded-lg flex items-center justify-between"
                          style={{ background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(148, 163, 184, 0.2)" }}
                        >
                          <div>
                            <p className="text-white font-medium">{candidate.firstName} {candidate.lastName}</p>
                            <p className="text-sm text-gray-400">{candidate.email}</p>
                          </div>
                          <button
                            onClick={() => handleViewCandidate(candidate)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium"
                            style={{ backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" }}
                          >
                            View
                          </button>
                        </div>
                      ))}
                      {candidates.length > 5 && (
                        <button
                          onClick={() => {
                            setSelectedCandidate(null);
                            setModalOpen(true);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          View all {candidates.length} candidates →
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Add Candidates</h3>
                  <button
                    onClick={() => setShowAddCandidates(false)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>
                {pdfQueued ? (
                  <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                    <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-300">Processing in background</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                        AI is parsing your resumes. You'll receive a notification when it's done.
                      </p>
                      <button
                        onClick={() => { setPdfQueued(false); setShowAddCandidates(false); }}
                        className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      >
                        Got it →
                      </button>
                    </div>
                  </div>
                ) : (
                  <DragDropUpload
                    onFileSelect={handleFileUpload}
                    accept=".csv,.json,.xlsx,.pdf"
                    maxSize={10}
                    label="Upload Candidates"
                    description="Drag candidates file here or click to browse"
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Screening Tab */}
        {activeTab === "screening" && (
          <EmptyState
            icon="🔍"
            title="AI Screening"
            description="Run AI screening on added candidates to get intelligent rankings and insights."
            action={{
              label: candidates.length > 0 ? "Run Screening" : "Add Candidates First",
              href: candidates.length > 0 ? undefined : undefined,
              onClick: candidates.length > 0 ? () => router.push(`/screening?jobId=${job._id}`) : undefined,
            }}
            tips={[
              "At least one candidate required to start screening",
              "Results include skills match, experience fit, and recommendations",
              "Process takes 1-2 minutes for typical job openings",
            ]}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <EmptyState
            icon="📊"
            title="Analytics"
            description="Screening analytics and insights will appear here after you run AI screening."
            tips={[
              "Track shortlist diversity metrics",
              "Monitor screening progress and results",
              "Compare candidate scores and rankings",
            ]}
          />
        )}
      </div>

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        candidate={selectedCandidate}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedCandidate(null);
        }}
        onUpdate={handleUpdateCandidate}
      />
    </motion.div>
  );
}
