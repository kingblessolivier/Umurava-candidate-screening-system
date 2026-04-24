'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Code2,
  CheckCircle,
  XCircle,
  Loader2,
  Bell,
} from 'lucide-react';
import { AppDispatch, RootState } from '@/store';
import { bulkImportJSON, uploadCSV, uploadPDFs } from '@/store/candidatesSlice';
import { Modal } from '@/components/ui/Modal';

type UploadTab = 'csv' | 'pdf' | 'json';

type JobOption = {
  _id?: string;
  title: string;
};

interface CandidateUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: () => void;
  jobs: JobOption[];
  defaultJobId?: string;
}

const SAMPLE_JSON = JSON.stringify(
  [
    {
      firstName: 'Alice',
      lastName: 'Uwimana',
      email: 'alice@example.com',
      headline: 'Senior React Developer',
      location: 'Kigali, Rwanda',
      skills: [
        { name: 'React', level: 'Expert', yearsOfExperience: 5 },
        { name: 'TypeScript', level: 'Advanced', yearsOfExperience: 4 },
      ],
      availability: { status: 'Available', type: 'Full-time' },
    },
  ],
  null,
  2
);

export function CandidateUploadModal({
  isOpen,
  onClose,
  onUploaded,
  jobs,
  defaultJobId,
}: CandidateUploadModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { uploading } = useSelector((s: RootState) => s.candidates);

  const [tab, setTab] = useState<UploadTab>('csv');
  const [files, setFiles] = useState<File[]>([]);
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [selectedJobId, setSelectedJobId] = useState(defaultJobId || '');
  const [pdfQueued, setPdfQueued] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedJobId(defaultJobId || '');
    }
  }, [isOpen, defaultJobId]);

  const accept = useMemo(() => (tab === 'pdf' ? '.pdf' : '.csv,.xlsx,.xls'), [tab]);
  const multiple = tab === 'pdf';

  const onSelectFiles = (selected: FileList | null) => {
    if (!selected) return;
    const picked = Array.from(selected);
    if (tab === 'pdf') {
      const pdfs = picked.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      setFiles(pdfs);
      return;
    }
    setFiles(picked.length > 0 ? [picked[0]] : []);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files;
    onSelectFiles(dropped);
  };

  const resetTransientState = () => {
    setFiles([]);
    setPdfQueued(false);
    setResult(null);
  };

  const handleUpload = async () => {
    setResult(null);
    setPdfQueued(false);

    try {
      if (!selectedJobId) {
        toast.error('Select a job position first');
        return;
      }

      if (tab === 'json') {
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonText);
        } catch {
          toast.error('Invalid JSON');
          return;
        }

        if (!Array.isArray(parsed)) {
          toast.error('JSON must be an array of candidate objects');
          return;
        }

        const withJobId = parsed.map((profile) => ({
          ...(typeof profile === 'object' && profile !== null ? profile : {}),
          jobId: selectedJobId,
        }));

        const res = (await dispatch(bulkImportJSON(withJobId)).unwrap()) as {
          created: number;
          skipped: number;
          errors: string[];
        };

        setResult(res);
        if (res.created > 0) toast.success(`${res.created} candidates imported`);
        onUploaded?.();
        return;
      }

      if (tab === 'csv') {
        if (!files[0]) {
          toast.error('Select a CSV or Excel file first');
          return;
        }

        const res = (await dispatch(uploadCSV({ file: files[0], jobId: selectedJobId })).unwrap()) as {
          created: number;
          skipped: number;
          errors: string[];
        };

        setResult(res);
        if (res.created > 0) toast.success(`${res.created} candidates imported`);
        onUploaded?.();
        return;
      }

      if (!files.length) {
        toast.error('Select PDF resumes first');
        return;
      }

      await dispatch(uploadPDFs({ files, jobId: selectedJobId })).unwrap();
      setPdfQueued(true);
      setFiles([]);
      toast.success('Resumes uploaded successfully');
      onUploaded?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Candidates"
      subtitle="Import using CSV, PDF resumes, or JSON"
      size="xl"
      icon={<Upload className="w-4 h-4" />}
      panelClassName="bg-white"
      className="p-0"
    >
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-gray-50 border border-gray-200">
          {[
            { id: 'csv' as const, label: 'CSV / Excel', icon: FileSpreadsheet },
            { id: 'pdf' as const, label: 'PDF Resumes', icon: FileText },
            { id: 'json' as const, label: 'JSON', icon: Code2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                resetTransientState();
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === id
                  ? 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Job Position (required)</label>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="">Select job</option>
            {jobs.map((job) => (
              <option key={job._id} value={job._id}>
                {job.title}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">All imported candidates will be linked to the selected job.</p>
        </div>

        {tab !== 'json' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl p-8 border-2 border-dashed border-gray-300 bg-gray-50 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition"
          >
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              multiple={multiple}
              className="hidden"
              onChange={(e) => onSelectFiles(e.target.files)}
            />
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm font-semibold text-gray-800">
              {tab === 'csv' ? 'Drop CSV/Excel file' : 'Drop PDF resumes'}
            </p>
            <p className="text-xs text-gray-500 mt-1">or click to select files</p>

            {files.length > 0 && (
              <div className="mt-4 space-y-1 text-left max-w-md mx-auto">
                {files.map((f, i) => (
                  <p key={`${f.name}-${i}`} className="text-xs text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {f.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'json' && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Candidate JSON Array</span>
              <button
                type="button"
                onClick={() => setJsonText(SAMPLE_JSON)}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Restore Sample
              </button>
            </div>
            <textarea
              rows={14}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full p-3 text-xs font-mono bg-white text-gray-800 outline-none resize-none"
              spellCheck={false}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !selectedJobId || (tab !== 'json' && files.length === 0)}
          className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Import Candidates
            </>
          )}
        </button>

        {pdfQueued && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 flex items-start gap-2">
            <Bell className="w-4 h-4 text-blue-500 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-800">Resumes received</p>
              <p className="text-xs text-blue-700">Candidates will appear once processing is complete.</p>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> {result.created} created
              </span>
              {result.skipped > 0 && <span className="text-amber-700">{result.skipped} skipped</span>}
            </div>
            {result.errors.length > 0 && (
              <div>
                <p className="text-xs text-red-700 font-semibold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {result.errors.length} errors
                </p>
                <ul className="mt-1 space-y-0.5">
                  {result.errors.slice(0, 3).map((err, i) => (
                    <li key={`${err}-${i}`} className="text-xs text-red-600">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
