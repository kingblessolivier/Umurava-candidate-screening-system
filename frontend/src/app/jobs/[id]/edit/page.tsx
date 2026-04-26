"use client";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter } from "next/navigation";
import { AppDispatch, RootState } from "@/store";
import { fetchJob, updateJob, clearSelected, enhanceJob } from "@/store/jobsSlice";
import toast from "react-hot-toast";
import { ArrowLeft, Sparkles, Loader2, Plus, X } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Job, JobRequirement, ScoringWeights } from "@/types";

const DEFAULT_WEIGHTS: ScoringWeights = { skills: 35, experience: 30, education: 15, projects: 15, availability: 5 };

interface FormState {
  title: string; description: string; department: string;
  location: string; type: Job["type"]; experienceLevel: Job["experienceLevel"];
  requirements: JobRequirement[]; niceToHave: string[];
  responsibilities: string[]; weights: ScoringWeights;
  salaryMin: string; salaryMax: string; currency: string; isActive: boolean;
}

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { selected: job, loading: jobLoading } = useSelector((s: RootState) => s.jobs);

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [enhancingField, setEnhancingField] = useState<string | null>(null);

  // Load job on mount
  useEffect(() => {
    if (id) dispatch(fetchJob(id));
    return () => { dispatch(clearSelected()); };
  }, [id, dispatch]);

  // Initialize form when job loads
  useEffect(() => {
    if (job) {
      setForm({
        title: job.title,
        description: job.description,
        department: job.department || "",
        location: job.location,
        type: job.type,
        experienceLevel: job.experienceLevel,
        requirements: job.requirements || [],
        niceToHave: job.niceToHave || [""],
        responsibilities: job.responsibilities || [""],
        weights: job.weights || { ...DEFAULT_WEIGHTS },
        salaryMin: job.salaryRange?.min?.toString() || "",
        salaryMax: job.salaryRange?.max?.toString() || "",
        currency: job.salaryRange?.currency || "USD",
        isActive: job.isActive,
      });
    }
  }, [job]);

  if (jobLoading || !form || !job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const weightsTotal = Object.values(form.weights).reduce((a, b) => a + b, 0);
  const weightsValid = Math.abs(weightsTotal - 100) <= 1;

  type EnhanceResult = {
    enhancedDescription: string;
    structuredRequirements: Array<{ skill: string; level: string; yearsRequired?: number; required?: boolean }>;
    inferredResponsibilities: string[];
    niceToHave: string[];
    suggestedWeights: ScoringWeights;
  };

  const handleEnhance = async () => {
    if (!form) return;
    setEnhancing(true);
    try {
      const result = await dispatch(enhanceJob({ title: form.title, description: form.description })).unwrap() as EnhanceResult;
      setForm(f => f ? ({
        ...f,
        description: result.enhancedDescription || f.description,
        requirements: result.structuredRequirements?.map(r => ({
          skill: r.skill, level: (r.level as JobRequirement["level"]) || "Intermediate",
          yearsRequired: r.yearsRequired ?? 0, required: r.required ?? true,
        })) || f.requirements,
        responsibilities: result.inferredResponsibilities?.length ? result.inferredResponsibilities : f.responsibilities,
        niceToHave: result.niceToHave?.length ? result.niceToHave : f.niceToHave,
        weights: result.suggestedWeights || f.weights,
      }) : null);
      toast.success("Job enhanced by AI! Review and adjust.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enhancement failed");
    } finally {
      setEnhancing(false);
    }
  };

  const handleFieldAI = async (field: "description" | "responsibilities" | "skills" | "niceToHave") => {
    if (!form) return;
    setEnhancingField(field);
    try {
      const result = await dispatch(enhanceJob({ title: form.title, description: form.description })).unwrap() as EnhanceResult;
      setForm(f => {
        if (!f) return null;
        if (field === "description") return { ...f, description: result.enhancedDescription || f.description };
        if (field === "responsibilities") return { ...f, responsibilities: result.inferredResponsibilities?.length ? result.inferredResponsibilities : f.responsibilities };
        if (field === "skills") return { ...f, requirements: result.structuredRequirements?.map(r => ({ skill: r.skill, level: (r.level as JobRequirement["level"]) || "Intermediate", yearsRequired: r.yearsRequired ?? 0, required: r.required ?? true })) || f.requirements };
        if (field === "niceToHave") return { ...f, niceToHave: result.niceToHave?.length ? result.niceToHave : f.niceToHave };
        return f;
      });
      toast.success("Field updated by AI");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setEnhancingField(null);
    }
  };

  const setWeight = (key: keyof ScoringWeights, val: number) => {
    setForm(f => f ? { ...f, weights: { ...f.weights, [key]: val } } : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightsValid) return toast.error(`Weights must sum to 100 (current: ${weightsTotal})`);
    if (!form) return;

    setSaving(true);
    try {
      const payload: Partial<Job> & { id: string } = {
        id: job._id,
        title: form.title,
        description: form.description,
        department: form.department || undefined,
        location: form.location,
        type: form.type,
        experienceLevel: form.experienceLevel,
        requirements: form.requirements.filter(r => r.skill.trim()),
        niceToHave: form.niceToHave.filter(Boolean),
        responsibilities: form.responsibilities.filter(Boolean),
        weights: form.weights,
        isActive: form.isActive,
        ...(form.salaryMin && form.salaryMax ? {
          salaryRange: { min: Number(form.salaryMin), max: Number(form.salaryMax), currency: form.currency },
        } : {}),
      };
      await dispatch(updateJob(payload)).unwrap();
      toast.success("Job updated!");
      router.push(`/jobs/${job._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/jobs/${job._id}`} className="p-2 rounded-xl transition-all hover:bg-white/5 text-gray-400">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Edit Job</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>{form.title}</p>
        </div>
        <button
          type="button"
          onClick={handleEnhance}
          disabled={enhancing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
        >
          {enhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {enhancing ? "Enhancing…" : "AI Enhance"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <Section title="Basic Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Job Title *">
              <Input value={form.title} onChange={v => setForm(f => f ? { ...f, title: v } : null)} placeholder="e.g. Senior Backend Engineer" required />
            </Field>
            <Field label="Department">
              <Input value={form.department} onChange={v => setForm(f => f ? { ...f, department: v } : null)} placeholder="e.g. Engineering" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Location *">
              <Input value={form.location} onChange={v => setForm(f => f ? { ...f, location: v } : null)} placeholder="Remote / Kigali" required />
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={v => setForm(f => f ? { ...f, type: v as Job["type"] } : null)}
                options={["Full-time","Part-time","Contract","Freelance"]} />
            </Field>
            <Field label="Level">
              <Select value={form.experienceLevel} onChange={v => setForm(f => f ? { ...f, experienceLevel: v as Job["experienceLevel"] } : null)}
                options={["Junior","Mid-level","Senior","Lead","Executive"]} />
            </Field>
          </div>
          <Field label="Description *">
            <div className="relative">
              <textarea
                required
                value={form.description}
                onChange={e => setForm(f => f ? { ...f, description: e.target.value } : null)}
                rows={5}
                placeholder="Describe the role, team, and what makes it exciting…"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none resize-none pr-24"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
              />
              <button
                type="button"
                onClick={() => handleFieldAI("description")}
                disabled={enhancingField === "description"}
                className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40"
                style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.35)", color: "#c4b5fd" }}
              >
                {enhancingField === "description" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {enhancingField === "description" ? "Writing…" : "AI Write"}
              </button>
            </div>
          </Field>
          <Field label="Status">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive}
                onChange={e => setForm(f => f ? { ...f, isActive: e.target.checked } : null)}
                className="accent-blue-500" />
              <span className="text-sm">Active</span>
            </label>
          </Field>
        </Section>

        {/* Required Skills */}
        <Section title="Required Skills" action={<AIFieldButton loading={enhancingField === "skills"} onClick={() => handleFieldAI("skills")} />}>
          <div className="space-y-2">
            {form.requirements.map((req, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-4">
                  <Input value={req.skill} onChange={v => setForm(f => f ? { ...f, requirements: f.requirements.map((r, j) => j === i ? { ...r, skill: v } : r) } : null)} placeholder="Skill name" />
                </div>
                <div className="col-span-3">
                  <Select value={req.level || "Intermediate"} onChange={v => setForm(f => f ? { ...f, requirements: f.requirements.map((r, j) => j === i ? { ...r, level: v as JobRequirement["level"] } : r) } : null)}
                    options={["Beginner","Intermediate","Advanced","Expert"]} />
                </div>
                <div className="col-span-2">
                  <input type="number" min={0} max={20} value={req.yearsRequired || ""}
                    onChange={e => setForm(f => f ? { ...f, requirements: f.requirements.map((r, j) => j === i ? { ...r, yearsRequired: Number(e.target.value) } : r) } : null)}
                    placeholder="Yrs"
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }} />
                </div>
                <div className="col-span-2 flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={req.required}
                      onChange={e => setForm(f => f ? { ...f, requirements: f.requirements.map((r, j) => j === i ? { ...r, required: e.target.checked } : r) } : null)}
                      className="accent-blue-500" />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Required</span>
                  </label>
                </div>
                <button type="button" onClick={() => setForm(f => f ? { ...f, requirements: f.requirements.filter((_, j) => j !== i) } : null)}
                  className="col-span-1 text-gray-600 hover:text-red-400 transition-colors pt-2.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button type="button"
              onClick={() => setForm(f => f ? { ...f, requirements: [...f.requirements, { skill: "", level: "Intermediate", yearsRequired: 0, required: true }] } : null)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add skill
            </button>
          </div>
        </Section>

        {/* Responsibilities & Nice-to-Have */}
        <Section title="Responsibilities" action={<AIFieldButton loading={enhancingField === "responsibilities"} onClick={() => handleFieldAI("responsibilities")} label="Generate" />}>
          <ListEditor
            items={form.responsibilities}
            onChange={v => setForm(f => f ? { ...f, responsibilities: v } : null)}
            placeholder="e.g. Design and implement scalable APIs"
          />
        </Section>

        <Section title="Nice to Have" action={<AIFieldButton loading={enhancingField === "niceToHave"} onClick={() => handleFieldAI("niceToHave")} label="Suggest" />}>
          <ListEditor
            items={form.niceToHave}
            onChange={v => setForm(f => f ? { ...f, niceToHave: v } : null)}
            placeholder="e.g. GraphQL, Docker, AWS"
          />
        </Section>

        {/* Scoring Weights */}
        <Section title={`AI Scoring Weights (Total: ${weightsTotal}/100)`}>
          <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Customize how the AI weights each evaluation dimension for this specific role.
          </p>
          <div className="space-y-4">
            {(Object.keys(form.weights) as (keyof ScoringWeights)[]).map(key => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-sm capitalize" style={{ color: "var(--text-muted)" }}>{key}</label>
                  <span className="text-sm font-semibold text-blue-400">{form.weights[key]}%</span>
                </div>
                <input type="range" min={0} max={60} step={5} value={form.weights[key]}
                  onChange={e => setWeight(key, Number(e.target.value))} className="w-full" />
              </div>
            ))}
          </div>
          {!weightsValid && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              ⚠️ Weights must sum to 100. Currently: {weightsTotal}
            </p>
          )}
        </Section>

        {/* Salary */}
        <Section title="Salary Range (Optional)">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Min">
              <Input type="number" value={form.salaryMin} onChange={v => setForm(f => f ? { ...f, salaryMin: v } : null)} placeholder="50000" />
            </Field>
            <Field label="Max">
              <Input type="number" value={form.salaryMax} onChange={v => setForm(f => f ? { ...f, salaryMax: v } : null)} placeholder="90000" />
            </Field>
            <Field label="Currency">
              <Select value={form.currency} onChange={v => setForm(f => f ? { ...f, currency: v } : null)} options={["USD","EUR","GBP","RWF"]} />
            </Field>
          </div>
        </Section>

        <div className="flex gap-3">
          <Link href={`/jobs/${job._id}`}
            className="px-6 py-3 rounded-xl text-white text-sm font-semibold text-center"
            style={{ background: "rgba(255,255,255,0.1)" }}>
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Reusable form components ─────────────────────────────────────────────────

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 space-y-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

function AIFieldButton({ loading, onClick, label = "Generate Skills" }: {
  loading: boolean; onClick: () => void; label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40"
      style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
      {loading ? "Generating…" : label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, required, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      required={required}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none appearance-none"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
    >
      {options.map(o => <option key={o} value={o} style={{ background: "#0d1220" }}>{o}</option>)}
    </select>
  );
}

function ListEditor({ items, onChange, placeholder }: {
  items: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input value={item} onChange={v => onChange(items.map((it, j) => j === i ? v : it))} placeholder={placeholder} />
          {items.length > 1 && (
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-gray-600 hover:text-red-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, ""])} className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
        <Plus className="w-3.5 h-3.5" /> Add item
      </button>
    </div>
  );
}
