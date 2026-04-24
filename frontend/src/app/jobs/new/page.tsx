"use client";
import { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store";
import { createJob, enhanceJob } from "@/store/jobsSlice";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Sparkles, Loader2, Plus, X, Save } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Job, JobRequirement, ScoringWeights } from "@/types";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useFormValidation } from "@/hooks/useFormValidation";
import { DraftRecoveryModal } from "@/components/ui/DraftRecoveryModal";
import { SmartSkillInput } from "@/components/ui/SmartSkillInput";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

const DEFAULT_WEIGHTS: ScoringWeights = { skills: 35, experience: 30, education: 15, projects: 15, availability: 5 };

interface FormState {
  title: string; description: string; department: string;
  location: string; type: Job["type"]; experienceLevel: Job["experienceLevel"];
  requirements: { name: string; level: "Beginner" | "Intermediate" | "Advanced" | "Expert" }[];
  niceToHave: string[]; responsibilities: string[]; weights: ScoringWeights;
  salaryMin: string; salaryMax: string; currency: string;
}

export default function NewJobPage() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  const [form, setForm] = useState<FormState>({
    title: "", description: "", department: "", location: "",
    type: "Full-time", experienceLevel: "Mid-level",
    requirements: [],
    niceToHave: [""], responsibilities: [""],
    weights: { ...DEFAULT_WEIGHTS },
    salaryMin: "", salaryMax: "", currency: "USD",
  });

  const [saving, setSaving] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Auto-save functionality
  const { getDraft, clearDraft, save } = useAutoSave({
    key: "job-draft",
    data: form,
    interval: 2000,
    onSave: () => {
      setAutoSaveStatus("saving");
      setTimeout(() => setAutoSaveStatus("saved"), 500);
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    },
  });

  // Form validation
  const { errors, validate, getError } = useFormValidation({
    title: { required: true, minLength: 3, maxLength: 100 },
    description: { required: true, minLength: 50 },
    location: { required: true, minLength: 2 },
  });

  // Check for draft on mount
  useEffect(() => {
    const draft = getDraft();
    if (draft?.data) {
      setShowDraftRecovery(true);
    }
  }, [getDraft]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isMod = event.ctrlKey || event.metaKey;
      if (!isMod) return;

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
        toast.success("Draft saved");
      }

      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        if (formRef.current) formRef.current.requestSubmit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  const handleRestoreDraft = (data: Record<string, any>) => {
    setForm(data as FormState);
    setShowDraftRecovery(false);
    toast.success("Draft restored!");
  };

  // Weights slider (must sum to 100)
  const weightsTotal = Object.values(form.weights).reduce((a, b) => a + b, 0);
  const weightsValid = Math.abs(weightsTotal - 100) <= 1;

  const setWeight = (key: keyof ScoringWeights, val: number) => {
    setForm(f => ({ ...f, weights: { ...f.weights, [key]: val } }));
  };

  // AI Enhance Job
  const handleEnhance = async () => {
    if (!form.title || !form.description) {
      return toast.error("Fill in Title and Description before enhancing");
    }
    setEnhancing(true);
    try {
      const result = await dispatch(enhanceJob({ title: form.title, description: form.description })).unwrap() as {
        enhancedDescription: string;
        structuredRequirements: Array<{ skill: string; level: string; yearsRequired?: number; required?: boolean }>;
        inferredResponsibilities: string[];
        niceToHave: string[];
        suggestedWeights: ScoringWeights;
      };

      setForm(f => ({
        ...f,
        description: result.enhancedDescription || f.description,
        requirements: result.structuredRequirements?.map(r => ({
          name: r.skill,
          level: (r.level as any) || "Intermediate",
        })) || f.requirements,
        responsibilities: result.inferredResponsibilities?.length ? result.inferredResponsibilities : f.responsibilities,
        niceToHave: result.niceToHave?.length ? result.niceToHave : f.niceToHave,
        weights: result.suggestedWeights || f.weights,
      }));
      toast.success("Job enhanced by AI! Review and adjust as needed.");
      clearDraft();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enhancement failed");
    } finally {
      setEnhancing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validate("title", form.title) || !validate("description", form.description) || !validate("location", form.location)) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!weightsValid) {
      return toast.error(`Weights must sum to 100 (current: ${weightsTotal})`);
    }

    setSaving(true);
    try {
      const payload: Partial<Job> = {
        title: form.title,
        description: form.description,
        department: form.department || undefined,
        location: form.location,
        type: form.type,
        experienceLevel: form.experienceLevel,
        requirements: form.requirements.map(r => ({
          skill: r.name,
          level: r.level,
          yearsRequired: 0,
          required: true,
        })).filter(r => r.skill.trim()),
        niceToHave: form.niceToHave.filter(Boolean),
        responsibilities: form.responsibilities.filter(Boolean),
        weights: form.weights,
        isActive: true,
        ...(form.salaryMin && form.salaryMax ? {
          salaryRange: { min: Number(form.salaryMin), max: Number(form.salaryMax), currency: form.currency },
        } : {}),
      };
      const job = await dispatch(createJob(payload)).unwrap();
      clearDraft();
      toast.success("Job created!");
      router.push(`/jobs/${job._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DraftRecoveryModal
        draftKey="job-draft"
        onRestore={handleRestoreDraft}
        onDiscard={() => setShowDraftRecovery(false)}
        isOpen={showDraftRecovery}
      />

      <div className="max-w-3xl space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb items={[{ label: "Jobs", href: "/jobs", icon: "📋" }, { label: "Create Job" }]} />

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/jobs" className="p-2 rounded-xl transition-all hover:bg-white/5 text-gray-400">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Create Job</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>Define the role requirements</p>
          </div>

          {/* Auto-save indicator */}
          {autoSaveStatus === "saving" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}>
              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
              <span style={{ color: "var(--text-muted)" }}>Saving…</span>
            </div>
          )}
          {autoSaveStatus === "saved" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}>
              <Save className="w-3 h-3 text-green-400" />
              <span style={{ color: "var(--text-muted)" }}>Saved</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleEnhance}
            disabled={enhancing || !form.title || !form.description}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
          >
            {enhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {enhancing ? "Enhancing…" : "AI Enhance"}
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Shortcuts: <span className="font-medium">Ctrl/Cmd+S</span> save draft, <span className="font-medium">Ctrl/Cmd+Shift+Enter</span> submit
          </div>
          {/* Basic Info */}
          <Section title="Basic Information">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Job Title *" error={getError("title")}>
                <Input
                  value={form.title}
                  onChange={v => {
                    setForm(f => ({ ...f, title: v }));
                    validate("title", v);
                  }}
                  placeholder="e.g. Senior Backend Engineer"
                  required
                />
              </Field>
              <Field label="Department">
                <Input value={form.department} onChange={v => setForm(f => ({ ...f, department: v }))} placeholder="e.g. Engineering" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Location *" error={getError("location")}>
                <Input
                  value={form.location}
                  onChange={v => {
                    setForm(f => ({ ...f, location: v }));
                    validate("location", v);
                  }}
                  placeholder="Remote / Kigali"
                  required
                />
              </Field>
              <Field label="Type">
                <Select
                  value={form.type}
                  onChange={v => setForm(f => ({ ...f, type: v as Job["type"] }))}
                  options={["Full-time", "Part-time", "Contract", "Freelance"]}
                />
              </Field>
              <Field label="Level">
                <Select
                  value={form.experienceLevel}
                  onChange={v => setForm(f => ({ ...f, experienceLevel: v as Job["experienceLevel"] }))}
                  options={["Junior", "Mid-level", "Senior", "Lead", "Executive"]}
                />
              </Field>
            </div>
            <Field label="Description *" error={getError("description")}>
              <textarea
                required
                value={form.description}
                onChange={e => {
                  setForm(f => ({ ...f, description: e.target.value }));
                  validate("description", e.target.value);
                }}
                rows={5}
                placeholder="Describe the role, team, and what makes it exciting…"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)" }}
              />
            </Field>
          </Section>

          {/* Required Skills - Using Smart Input */}
          <Section title="Required Skills">
            <SmartSkillInput
              skills={form.requirements}
              onSkillsChange={v => setForm(f => ({ ...f, requirements: v }))}
            />
          </Section>

          {/* Responsibilities */}
          <Section title="Responsibilities">
            <ListEditor
              items={form.responsibilities}
              onChange={v => setForm(f => ({ ...f, responsibilities: v }))}
              placeholder="e.g. Design and implement scalable APIs"
            />
          </Section>

          {/* Nice to Have */}
          <Section title="Nice to Have">
            <ListEditor
              items={form.niceToHave}
              onChange={v => setForm(f => ({ ...f, niceToHave: v }))}
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
                    <label className="text-sm capitalize" style={{ color: "var(--text-muted)" }}>
                      {key}
                    </label>
                    <span className="text-sm font-semibold text-blue-400">{form.weights[key]}%</span>
                  </div>
                  <input type="range" min={0} max={60} step={5} value={form.weights[key]} onChange={e => setWeight(key, Number(e.target.value))} className="w-full" />
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
                <Input type="number" value={form.salaryMin} onChange={v => setForm(f => ({ ...f, salaryMin: v }))} placeholder="50000" />
              </Field>
              <Field label="Max">
                <Input type="number" value={form.salaryMax} onChange={v => setForm(f => ({ ...f, salaryMax: v }))} placeholder="90000" />
              </Field>
              <Field label="Currency">
                <Select value={form.currency} onChange={v => setForm(f => ({ ...f, currency: v }))} options={["USD", "EUR", "GBP", "RWF"]} />
              </Field>
            </div>
          </Section>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating…
                </>
              ) : (
                "Create Job"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Reusable form components ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 space-y-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {children}
    </motion.div>
  );
}

function Field({ label, error, children }: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: error ? "#ef4444" : "var(--text-muted)" }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
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
