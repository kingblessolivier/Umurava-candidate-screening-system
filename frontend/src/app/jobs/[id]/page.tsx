'use client';
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/store";
import { fetchJob, deleteJob, clearSelected } from "@/store/jobsSlice";
import { fetchCandidates } from "@/store/candidatesSlice";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft, Briefcase, MapPin, Clock, Award, CheckCircle,
  AlertCircle, Edit2, Trash2, Zap, Users, BarChart3, Plus,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Junior: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  "Mid-level": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Senior: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Lead: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Executive: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

type TabType = "details" | "candidates" | "screening" | "analytics";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { selected: job, loading, error } = useSelector((s: RootState) => s.jobs);
  const { items: candidates } = useSelector((s: RootState) => s.candidates);

  const [activeTab, setActiveTab] = useState<TabType>("details");

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (id) {
      dispatch(fetchJob(id));
      dispatch(fetchCandidates());
    }
    return () => { dispatch(clearSelected()); };
  }, [id, dispatch]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Job Not Found</h2>
        <p className="text-sm text-gray-500 mb-4">{error || "The job you're looking for doesn't exist."}</p>
        <Link href="/jobs" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Link>
      </div>
    );
  }

  const levelStyle = LEVEL_STYLES[job.experienceLevel] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };

  const tabs = [
    { id: "details" as TabType, label: "Details", icon: Briefcase },
    { id: "candidates" as TabType, label: "Candidates", icon: Users, count: candidates.length },
    { id: "screening" as TabType, label: "Screening", icon: Zap },
    { id: "analytics" as TabType, label: "Analytics", icon: BarChart3 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header Section */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header Top */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/jobs"
                className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  {job.department && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" /> {job.department}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {job.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> {job.type}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/jobs/${job._id}/edit`}
                className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all"
              >
                <Edit2 className="w-5 h-5" />
              </Link>
              <button
                onClick={handleDelete}
                className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${levelStyle.bg} ${levelStyle.text} ${levelStyle.border}`}>
              {job.experienceLevel}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${job.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${job.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              {job.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-t border-gray-100 flex gap-1">
          {tabs.map(({ id: tabId, label, icon: Icon, count }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={`relative px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors ${
                activeTab === tabId
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== undefined && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tabId ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {count}
                </span>
              )}
              {activeTab === tabId && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-5">
            {/* Description */}
            <div className="bg-white border border-gray-200 rounded-xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Job Description</h2>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{job.description}</p>
              </div>
            </div>

            {/* Responsibilities */}
            {job.responsibilities?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" /> Responsibilities
                    <span className="text-xs font-normal text-gray-400 ml-auto">{job.responsibilities.length} items</span>
                  </h2>
                </div>
                <div className="p-5">
                  <ul className="space-y-2.5">
                    {job.responsibilities.map((r, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0 mt-2" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Skills */}
            {job.requirements?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-500" /> Required Skills
                    <span className="text-xs font-normal text-gray-400 ml-auto">{job.requirements.length} skills</span>
                  </h2>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {job.requirements.map((req, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">{i + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{req.skill}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {req.level && <span className="text-xs text-gray-500">{req.level}</span>}
                              {req.yearsRequired && <span className="text-xs text-gray-400">· {req.yearsRequired}+ years</span>}
                            </div>
                          </div>
                        </div>
                        {req.required && (
                          <Badge variant="default" size="sm">Required</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Nice to Have */}
            {(job.niceToHave?.length ?? 0) > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Nice to Have</h2>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {job.niceToHave!.map((skill, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Candidates Tab */}
        {activeTab === "candidates" && (
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Candidates</h2>
                <p className="text-xs text-gray-500 mt-0.5">{candidates.length} candidates added to this job</p>
              </div>
              <Link
                href={`/candidates/upload?jobId=${job._id}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add
              </Link>
            </div>
            <div>
              {candidates.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">No candidates yet</p>
                  <p className="text-xs text-gray-500 mb-4">Add candidates to start screening</p>
                  <Link href={`/candidates/upload?jobId=${job._id}`} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    <Plus className="w-4 h-4" /> Add Candidates
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {candidates.slice(0, 10).map(candidate => (
                    <div key={candidate._id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-sm">
                          {candidate.firstName?.[0]}{candidate.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{candidate.firstName} {candidate.lastName}</p>
                          <p className="text-xs text-gray-500">{candidate.email}</p>
                        </div>
                      </div>
                      <Link href="/candidates" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View →
                      </Link>
                    </div>
                  ))}
                  {candidates.length > 10 && (
                    <div className="py-3 text-center">
                      <Link href="/candidates" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View all {candidates.length} candidates →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Screening Tab */}
        {activeTab === "screening" && (
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">AI Screening</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                Evaluate and rank candidates using AI based on job requirements, skills match, and experience fit.
              </p>
              {candidates.length > 0 ? (
                <Link
                  href={`/screening?jobId=${job._id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                >
                  <Zap className="w-5 h-5" /> Run AI Screening
                </Link>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">Add candidates first to start screening</p>
                  <Link href={`/candidates/upload?jobId=${job._id}`} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                    <Plus className="w-4 h-4" /> Add Candidates
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                Screening analytics and insights will appear here after running your first AI screening.
              </p>
              {candidates.length > 0 ? (
                <Link
                  href={`/screening?jobId=${job._id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                >
                  <Zap className="w-5 h-5" /> Run First Screening
                </Link>
              ) : (
                <p className="text-sm text-gray-400">Add candidates to generate analytics</p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
