'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { stopRunning } from '@/store/screeningSlice';
import { useJobs } from '@/hooks/useJobs';
import { useJobCandidates } from '@/hooks/useJobCandidates';
import { useScreening } from '@/hooks/useScreening';
import { useNotifications } from '@/contexts/NotificationsContext';
import {
  Zap,
  Loader2,
  Users,
  Brain,
  AlertTriangle,
  Clock,
  Sparkles,
  Trophy,
  ChevronRight,
  Eye,
  Settings2,
  Star,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { AIThinkingStream } from '@/components/screening/AIThinkingStream';
import { LiveScoreGauges } from '@/components/screening/LiveScoreGauges';
import { LiveLeaderboard } from '@/components/screening/LiveLeaderboard';
import { CriteriaSelector } from '@/components/screening/CriteriaSelector';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ScreeningPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const params = useSearchParams();
  const preJobId = params.get('jobId');

  // State declarations first
  const [jobId, setJobId] = useState(preJobId || '');
  const [shortlistSize, setShortlistSize] = useState(10);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'setup' | 'criteria' | 'preview'>('setup');

  // Hooks after state
  const { jobs, loading: jobsLoading } = useJobs();
  const { total: candidateCount } = useJobCandidates(jobId || null);
  const { notifications } = useNotifications();
  const pendingBgJobId = useSelector((s: RootState) => s.screening.pendingBgJobId);
  const {
    handleRunScreening,
    running,
    thoughts,
    liveScores,
    partialShortlist,
    evaluatedCount,
    totalCandidates,
    setTotalCandidatesCount,
    addScreeningThought,
    clearScreeningThoughts,
    setLiveScores,
    setPartialShortlist,
    bumpEvaluatedCount,
    resetLiveScreeningState,
  } = useScreening();

  const [customWeights, setCustomWeights] = useState({
    skills: 25,
    experience: 25,
    education: 20,
    projects: 20,
    availability: 10,
  });

  const selectedJob = jobs.find((j) => j._id === jobId);

  useEffect(() => {
    if (selectedJob?.weights) {
      setCustomWeights({
        skills: selectedJob.weights.skills,
        experience: selectedJob.weights.experience,
        education: selectedJob.weights.education,
        projects: selectedJob.weights.projects,
        availability: selectedJob.weights.availability,
      });
    }
  }, [selectedJob]);

  useEffect(() => {
    if (running) {
      resetLiveScreeningState();
      setTotalCandidatesCount(candidateCount);
    }
  }, [running]);

  useEffect(() => {
    if (!running) {
      setElapsedTime(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const progressPercent = totalCandidates > 0
    ? Math.round((evaluatedCount / totalCandidates) * 100)
    : 0;

  const selectedJobRequirements = selectedJob?.requirements
    .filter((r) => r.required)
    .map((r) => r.skill) || [];

  const totalWeight = Object.values(customWeights).reduce((a, b) => a + b, 0);

  // When an SSE notification arrives for our pending background job, navigate to results
  useEffect(() => {
    if (!pendingBgJobId) return;
    const completedNotif = notifications.find(
      (n) => n.bgJobId === pendingBgJobId
    );
    if (!completedNotif) return;
    dispatch(stopRunning());
    if (completedNotif.link) {
      router.push(completedNotif.link);
    }
  }, [notifications, pendingBgJobId, dispatch, router]);

  const handleRun = async () => {
    if (!jobId) {
      toast.error('Please select a job position');
      return;
    }
    if (candidateCount === 0) {
      toast.error('No candidates for this job — upload candidates first');
      return;
    }
    if (candidateCount < shortlistSize) {
      toast.error(`Only ${candidateCount} candidates available. Reduce shortlist size.`);
      return;
    }
    if (totalWeight !== 100) {
      toast.error('Criteria weights must sum to 100%');
      return;
    }

    try {
      clearScreeningThoughts();
      const result = await handleRunScreening({ jobId, shortlistSize });
      if (result.meta.requestStatus === 'fulfilled') {
        toast.success("Screening started! We'll notify you when it's done — feel free to navigate away.");
      } else {
        toast.error((result.payload as string) || 'Screening failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Screening failed');
    }
  };

  // Simulation for demo
  const [simulatedCandidates, setSimulatedCandidates] = useState<string[]>([]);

  useEffect(() => {
    if (running && simulatedCandidates.length === 0 && candidateCount > 0) {
      const firstNames = ['Alexandra', 'Marcus', 'Priya', 'James', 'Sofia', 'Chen', 'Maria', 'David', 'Emma', 'Kenji', 'Sarah', 'Michael', 'Yuki', 'Daniel', 'Aisha'];
      const lastNames = ['Chen', 'Rodriguez', 'Sharma', 'Williams', 'Martinez', 'Thompson', 'Kim', 'Johnson', 'Patel', 'Anderson', 'Garcia', 'Lee', 'Brown', 'Taylor', 'Nguyen'];
      const names: string[] = [];
      for (let i = 0; i < Math.min(candidateCount, 15); i++) {
        names.push(`${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`);
      }
      setSimulatedCandidates(names);
    }
    if (!running) {
      setSimulatedCandidates([]);
    }
  }, [running, candidateCount]);

  // Simulated scoring
  useEffect(() => {
    if (!running || simulatedCandidates.length === 0) return;

    const interval = setInterval(() => {
      const thoughtTypes = [
        { type: 'analyzing' as const, messages: ['Analyzing candidate profile...', 'Reviewing skills alignment...', 'Computing match score...'] },
        { type: 'scoring' as const, messages: ['Scoring technical skills...', 'Evaluating experience depth...', 'Assessing project portfolio...'] },
        { type: 'flagging' as const, messages: ['Running bias detection...', 'Checking availability windows...', 'Validating data integrity...'] },
      ];

      const candidate = simulatedCandidates[Math.floor(Math.random() * simulatedCandidates.length)];
      const thoughtType = thoughtTypes[Math.floor(Math.random() * thoughtTypes.length)];
      const message = thoughtType.messages[Math.floor(Math.random() * thoughtType.messages.length)];

      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      addScreeningThought({
        id: `thought-${Date.now()}-${Math.random()}`,
        type: thoughtType.type,
        message: `${message} ${candidate.split(' ')[0]}`,
        candidateName: candidate,
        timestamp,
        status: 'completed',
      });

      // Update scores
      setLiveScores({
        skills: 65 + Math.random() * 30,
        experience: 60 + Math.random() * 30,
        education: 70 + Math.random() * 25,
        projects: 55 + Math.random() * 35,
        availability: 65 + Math.random() * 30,
      });

      // Add to leaderboard
      if (Math.random() > 0.5 && partialShortlist.length < 5) {
        const score = 70 + Math.floor(Math.random() * 25);
        const newCandidate = {
          candidateId: `sim-${Date.now()}`,
          candidateName: candidate,
          email: `${candidate.toLowerCase().replace(' ', '.')}@example.com`,
          rank: partialShortlist.length + 1,
          finalScore: score,
          breakdown: {
            skillsScore: 60 + Math.floor(Math.random() * 35),
            experienceScore: 55 + Math.floor(Math.random() * 40),
            educationScore: 65 + Math.floor(Math.random() * 30),
            projectsScore: 50 + Math.floor(Math.random() * 45),
            availabilityScore: 60 + Math.floor(Math.random() * 40),
          },
          confidenceScore: 75 + Math.floor(Math.random() * 20),
          strengths: ['Strong technical background', 'Relevant experience', 'Good culture fit'],
          gaps: ['Could improve certain skills'],
          risks: [],
          recommendation: score >= 85 ? 'Strongly Recommended' as const : score >= 70 ? 'Recommended' as const : 'Consider' as const,
          summary: `Experienced professional with strong potential.`,
          reasoning: 'Candidate shows strong alignment with job requirements.',
          interviewQuestions: ['Tell me about your experience with...', 'Describe a challenging project...', 'How do you handle conflicts?'],
          skillGapAnalysis: {
            matched: ['JavaScript', 'React', 'Node.js'],
            missing: ['TypeScript'],
            bonus: ['AWS', 'Docker'],
          },
          biasFlags: [],
          riskFlags: [],
        };
        setPartialShortlist([...partialShortlist.slice(-4), newCandidate]);
      }

      bumpEvaluatedCount();
    }, 800);

    return () => clearInterval(interval);
  }, [running, simulatedCandidates]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900">AI Screening</h1>
                <p className="text-[10px] text-gray-500">Powered by Gemini 2.0 Flash</p>
              </div>
            </div>

            {/* Status Pill */}
            {running ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span className="text-xs font-medium text-blue-700">Running in background</span>
                  <span className="text-xs text-blue-500 font-mono">{formatTime(elapsedTime)}</span>
                </div>
                <button
                  onClick={() => router.push('/')}
                  className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  Go to dashboard →
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>System ready</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {!running ? (
          /* Configuration Mode */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {[
                { id: 'setup', label: 'Select Job', icon: Settings2 },
                { id: 'criteria', label: 'Set Criteria', icon: Star },
                { id: 'preview', label: 'Preview', icon: Eye },
              ].map((step, index) => (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => setActiveTab(step.id as typeof activeTab)}
                    className={cn(
                      'flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-all',
                      activeTab === step.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    )}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                      activeTab === step.id
                        ? 'bg-white/20'
                        : 'bg-gray-100'
                    )}>
                      {activeTab !== step.id && index < ['setup', 'criteria', 'preview'].indexOf(activeTab) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <step.icon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="font-medium text-xs">{step.label}</span>
                  </button>
                  {index < 2 && (
                    <div className="w-8 h-0.5 bg-gray-200 rounded-full" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === 'setup' && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="text-center mb-6">
                        <h2 className="text-sm font-bold text-gray-900 mb-1">Select Job Position</h2>
                        <p className="text-xs text-gray-500">Choose the position you want to screen candidates for</p>
                      </div>

                      {/* Job Selector */}
                      <div className="mb-5">
                        <label className="block text-xs font-medium text-gray-700 mb-2">Job Position</label>
                        <select
                          value={jobId}
                          onChange={(e) => setJobId(e.target.value)}
                          disabled={jobsLoading}
                          className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50"
                        >
                          <option value="">Choose a position...</option>
                          {jobs.map((job) => (
                            <option key={job._id} value={job._id}>
                              {job.title} — {job.experienceLevel}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Job Card */}
                      {selectedJob && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Settings2 className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs font-bold text-gray-900 mb-0.5">{selectedJob.title}</h3>
                              <p className="text-[10px] text-gray-500 mb-3">{selectedJob.experienceLevel} Level</p>

                              <div className="flex flex-wrap gap-1.5 mb-3">
                                {selectedJobRequirements.slice(0, 5).map((req) => (
                                  <span key={req} className="px-2 py-0.5 rounded-full bg-white text-[10px] font-medium text-blue-700 border border-blue-200">
                                    {req}
                                  </span>
                                ))}
                                {selectedJobRequirements.length > 5 && (
                                  <span className="px-2 py-0.5 rounded-full bg-white/80 text-[10px] font-medium text-gray-600">
                                    +{selectedJobRequirements.length - 5} more
                                  </span>
                                )}
                              </div>

                              {/* Weight Summary */}
                              <div className="flex items-center gap-4 p-2.5 rounded-lg bg-white/80">
                                <span className="text-[10px] font-medium text-gray-500">Weights:</span>
                                <div className="flex items-center gap-2.5">
                                  {[
                                    { label: 'Skills', value: selectedJob.weights.skills, color: '#3b82f6' },
                                    { label: 'Exp', value: selectedJob.weights.experience, color: '#8b5cf6' },
                                    { label: 'Edu', value: selectedJob.weights.education, color: '#10b981' },
                                    { label: 'Proj', value: selectedJob.weights.projects, color: '#f59e0b' },
                                    { label: 'Avail', value: selectedJob.weights.availability, color: '#ec4899' },
                                  ].map((w) => (
                                    <div key={w.label} className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: w.color }} />
                                      <span className="text-[10px] text-gray-600">{w.label} {w.value}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Stats Grid - Using same pattern as jobs page */}
                      <div className="grid grid-cols-2 gap-3 mt-5">
                        <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 border border-blue-200">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Users className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-gray-500">Candidates</p>
                              <p className="text-xl font-bold text-gray-900">{candidateCount}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-3 border border-green-200">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                              <Trophy className="w-3.5 h-3.5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-[10px] font-medium text-gray-500">To Shortlist</p>
                              <p className="text-xl font-bold text-gray-900">{shortlistSize}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Shortlist Slider */}
                      <div className="mt-5">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-gray-700">Shortlist Size</label>
                          <span className="text-xs font-bold text-blue-600">{shortlistSize} candidates</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={Math.max(1, Math.min(20, candidateCount || 1))}
                          step={1}
                          value={shortlistSize}
                          onChange={(e) => setShortlistSize(Number(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
                          <span>1</span>
                          <span>5</span>
                          <span>10</span>
                          <span>15</span>
                          <span>20</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
                      <Button
                        onClick={() => setActiveTab('criteria')}
                        disabled={!selectedJob}
                        size="sm"
                      >
                        Continue
                        <ArrowRight className="w-3 h-3 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'criteria' && (
                <motion.div
                  key="criteria"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="text-center mb-5">
                        <h2 className="text-sm font-bold text-gray-900 mb-1">Evaluation Criteria</h2>
                        <p className="text-xs text-gray-500">Adjust the importance of each criterion for scoring</p>
                      </div>

                      <CriteriaSelector
                        weights={customWeights}
                        onChange={setCustomWeights}
                      />

                      {/* Validation */}
                      <div className={cn(
                        'mt-5 p-3 rounded-lg flex items-center gap-2.5',
                        totalWeight === 100
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-amber-50 border border-amber-200'
                      )}>
                        {totalWeight === 100 ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-xs text-green-700">Weights are balanced and ready</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span className="text-xs text-amber-700">Weights must sum to 100% (currently {totalWeight}%)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        onClick={() => setActiveTab('setup')}
                        size="sm"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setActiveTab('preview')}
                        disabled={totalWeight !== 100}
                        size="sm"
                      >
                        Review & Start
                        <ArrowRight className="w-3 h-3 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6">
                      <div className="text-center mb-5">
                        <h2 className="text-sm font-bold text-gray-900 mb-1">Ready to Screen</h2>
                        <p className="text-xs text-gray-500">Review your screening configuration</p>
                      </div>

                      {/* Summary Card */}
                      <div className="p-4 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100/30 border border-gray-200 mb-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Settings2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-gray-900">{selectedJob?.title}</h3>
                            <p className="text-[10px] text-gray-500">{candidateCount} candidates to evaluate</p>
                          </div>
                        </div>

                        {/* Criteria Weights */}
                        <div className="space-y-2">
                          {[
                            { label: 'Skills', weight: customWeights.skills, color: '#3b82f6' },
                            { label: 'Experience', weight: customWeights.experience, color: '#8b5cf6' },
                            { label: 'Education', weight: customWeights.education, color: '#10b981' },
                            { label: 'Projects', weight: customWeights.projects, color: '#f59e0b' },
                            { label: 'Availability', weight: customWeights.availability, color: '#ec4899' },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center gap-2.5">
                              <div className="w-20 text-[10px] text-gray-600">{item.label}</div>
                              <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: item.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.weight}%` }}
                                  transition={{ duration: 0.5, ease: 'easeOut' }}
                                />
                              </div>
                              <div className="w-8 text-[10px] font-bold text-gray-700 text-right">{item.weight}%</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Output Preview */}
                      <div className="p-4 rounded-lg border border-gray-200">
                        <h4 className="text-xs font-bold text-gray-900 mb-3">What you'll get:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'Ranked candidate shortlist',
                            'Score breakdown by criteria',
                            'AI-generated interview questions',
                            'Skill gap analysis',
                            'Bias detection flags',
                            'Confidence scores',
                          ].map((item) => (
                            <div key={item} className="flex items-center gap-1.5 text-[10px] text-gray-600">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        onClick={() => setActiveTab('criteria')}
                        size="sm"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handleRun}
                        isLoading={running}
                        size="sm"
                      >
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        Start Screening
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Live Screening Mode */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-5"
          >
            {/* Progress Card */}
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-white animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">AI Screening in Progress</p>
                      <p className="text-[10px] text-gray-500">Evaluating candidates for {selectedJob?.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500">Elapsed</p>
                      <p className="text-sm font-bold font-mono text-gray-900">{formatTime(elapsedTime)}</p>
                    </div>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500">Progress</p>
                      <p className="text-sm font-bold text-blue-600">{progressPercent}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-gray-600">{evaluatedCount} / {totalCandidates} candidates</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    <span className="text-gray-600">Gemini 2.0 Flash</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    <span className="text-gray-600">{partialShortlist.length} in shortlist</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* AI Thinking Stream */}
              <AIThinkingStream
                thoughts={thoughts}
                isRunning={running}
                currentCandidate={thoughts[thoughts.length - 1]?.candidateName}
              />

              {/* Right Column */}
              <div className="space-y-5">
                {/* Live Scores */}
                <LiveScoreGauges scores={liveScores} evaluatedCount={evaluatedCount} />

                {/* Leaderboard */}
                <LiveLeaderboard
                  candidates={partialShortlist}
                  totalEvaluated={evaluatedCount}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}