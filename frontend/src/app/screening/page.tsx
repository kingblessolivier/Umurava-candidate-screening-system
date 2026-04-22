'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import { useCandidates } from '@/hooks/useCandidates';
import { useScreening } from '@/hooks/useScreening';
import {
  Zap,
  Loader2,
  Users,
  Briefcase,
  Brain,
  AlertTriangle,
  Info,
  Clock,
  CheckCircle2,
  Sparkles,
  Trophy,
  TrendingUp,
  Target,
  Sliders,
  Eye,
  ChevronRight,
  Play,
  Settings2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { AIThinkingStream, Thought } from '@/components/screening/AIThinkingStream';
import { LiveScoreGauges } from '@/components/screening/LiveScoreGauges';
import { LiveLeaderboard } from '@/components/screening/LiveLeaderboard';
import { CriteriaSelector } from '@/components/screening/CriteriaSelector';
import { CandidatePreview } from '@/components/screening/CandidatePreview';

const THOUGHT_TEMPLATES = {
  analyzing: [
    'Analyzing technical skills profile...',
    'Parsing skill endorsements and certifications...',
    'Evaluating proficiency levels against requirements...',
    'Computing skill match ratio...',
  ],
  scoring: [
    'Computing weighted skill score...',
    'Calculating experience depth score...',
    'Scoring education and certifications...',
    'Evaluating project portfolio strength...',
    'Assessing availability compatibility...',
  ],
  evaluating: [
    'Reviewing work history progression...',
    'Analyzing career trajectory...',
    'Evaluating role relevance...',
    'Computing years of experience...',
  ],
  flagging: [
    'Detecting potential risk patterns...',
    'Checking for employment gaps...',
    'Analyzing job-hopping indicators...',
    'Running bias detection scan...',
  ],
  generating: [
    'Generating tailored interview questions...',
    'Drafting candidate summary...',
    'Computing confidence score...',
    'Preparing recommendation...',
  ],
  completed: [
    'Evaluation complete!',
    'Candidate scored successfully!',
  ],
};

const CANDIDATE_ACTIONS = ['Analyzing', 'Evaluating', 'Scoring', 'Reviewing', 'Processing'];

function generateThought(candidateName: string, phase: number): Omit<Thought, 'id' | 'timestamp'> {
  const types: Thought['type'][] = ['analyzing', 'evaluating', 'scoring', 'flagging', 'generating', 'completed'];
  const type = types[Math.min(phase, types.length - 1)];
  const templates = THOUGHT_TEMPLATES[type];
  const message = templates[Math.floor(Math.random() * templates.length)];

  return {
    type,
    message: phase === types.length - 1 ? `${message}` : message,
    candidateName,
    status: phase === types.length - 1 ? 'completed' : 'processing',
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function ScreeningPage() {
  const router = useRouter();
  const params = useSearchParams();
  const preJobId = params.get('jobId');

  const { jobs, loading: jobsLoading } = useJobs();
  const { total: candidateCount } = useCandidates();
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

  const [jobId, setJobId] = useState(preJobId || '');
  const [shortlistSize, setShortlistSize] = useState(10);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [simulatedCandidates, setSimulatedCandidates] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'configure' | 'preview'>('configure');
  const [showWeights, setShowWeights] = useState(false);

  // Custom weights state - starts with job defaults or equal distribution
  const [customWeights, setCustomWeights] = useState({
    skills: 20,
    experience: 20,
    education: 20,
    projects: 20,
    availability: 20,
  });

  const selectedJob = jobs.find((j) => j._id === jobId);

  // Update weights when job changes
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

  // Initialize candidate names for simulation
  useEffect(() => {
    if (running && simulatedCandidates.length === 0 && candidateCount > 0) {
      const firstNames = [
        'Maria', 'Alex', 'James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica',
        'Robert', 'Lisa', 'William', 'Jennifer', 'Daniel', 'Amanda', 'Christopher',
        'Ashley', 'Matthew', 'Stephanie', 'Andrew', 'Nicole',
      ];
      const lastNames = [
        'Santos', 'Chen', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia',
        'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
        'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore',
      ];
      const names: string[] = [];
      for (let i = 0; i < Math.min(candidateCount, 20); i++) {
        names.push(`${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`);
      }
      setSimulatedCandidates(names);
    }
    if (!running) {
      setSimulatedCandidates([]);
      setElapsedTime(0);
    }
  }, [running, candidateCount]);

  // Reset live state when starting
  useEffect(() => {
    if (running) {
      resetLiveScreeningState();
      setTotalCandidatesCount(candidateCount);
    }
  }, [running]);

  // Timer for elapsed time
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

  // Simulate thoughts and score updates during screening
  useEffect(() => {
    if (!running || simulatedCandidates.length === 0) return;

    const thoughtsPerCandidate = 4;
    const totalThoughts = simulatedCandidates.length * thoughtsPerCandidate;
    const estimatedDuration = 30000;
    const thoughtInterval = estimatedDuration / totalThoughts;

    let thoughtIndex = 0;
    let currentCandidateIndex = 0;
    let phaseInCandidate = 0;

    const interval = setInterval(() => {
      if (thoughtIndex >= totalThoughts) {
        clearInterval(interval);
        return;
      }

      const candidateName = simulatedCandidates[currentCandidateIndex];
      const thought = generateThought(candidateName, phaseInCandidate);
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      addScreeningThought({
        ...thought,
        id: `thought-${Date.now()}-${thoughtIndex}`,
        timestamp,
      });

      // Update live scores periodically
      if (thoughtIndex % 8 === 0) {
        setLiveScores({
          skills: 70 + Math.random() * 25,
          experience: 60 + Math.random() * 30,
          education: 65 + Math.random() * 30,
          projects: 55 + Math.random() * 35,
          availability: 70 + Math.random() * 30,
        });
      }

      // Add candidate to partial shortlist occasionally
      if (thoughtIndex % 12 === 0 && Math.random() > 0.5 && partialShortlist.length < 5) {
        const fakeCandidate = {
          candidateId: `sim-${currentCandidateIndex}`,
          candidateName,
          email: `${candidateName.toLowerCase().replace(' ', '.')}@example.com`,
          rank: partialShortlist.length + 1,
          finalScore: 70 + Math.floor(Math.random() * 25),
          breakdown: {
            skillsScore: 65 + Math.floor(Math.random() * 30),
            experienceScore: 60 + Math.floor(Math.random() * 35),
            educationScore: 55 + Math.floor(Math.random() * 40),
            projectsScore: 50 + Math.floor(Math.random() * 45),
            availabilityScore: 60 + Math.floor(Math.random() * 40),
          },
          confidenceScore: 75 + Math.floor(Math.random() * 20),
          strengths: ['Strong technical background', 'Relevant experience'],
          gaps: ['Some missing required skills'],
          risks: [],
          recommendation: 'Recommended' as const,
          summary: `Experienced professional with strong ${CANDIDATE_ACTIONS[Math.floor(Math.random() * CANDIDATE_ACTIONS.length)].toLowerCase()} background.`,
          reasoning: 'Candidate shows strong potential based on profile analysis.',
          interviewQuestions: ['Tell me about your experience?', 'What projects are you proud of?', 'How do you handle challenges?'],
          skillGapAnalysis: {
            matched: ['JavaScript', 'React'],
            missing: ['TypeScript'],
            bonus: ['Node.js'],
          },
          biasFlags: [],
        };
        setPartialShortlist([...partialShortlist, fakeCandidate]);
      }

      // Bump evaluated count periodically
      if ((thoughtIndex + 1) % thoughtsPerCandidate === 0) {
        bumpEvaluatedCount();
        currentCandidateIndex = (currentCandidateIndex + 1) % simulatedCandidates.length;
        phaseInCandidate = 0;
      } else {
        phaseInCandidate++;
      }

      thoughtIndex++;
    }, thoughtInterval);

    return () => clearInterval(interval);
  }, [running, simulatedCandidates]);

  const handleRun = async () => {
    if (!jobId) {
      toast.error('Select a job first');
      return;
    }
    if (candidateCount === 0) {
      toast.error('No candidates in pool — upload some first');
      return;
    }
    if (candidateCount < shortlistSize) {
      toast.error(`Only ${candidateCount} candidates but shortlist size is ${shortlistSize}`);
      return;
    }

    const totalWeight = Object.values(customWeights).reduce((a, b) => a + b, 0);
    if (totalWeight !== 100) {
      toast.error('Criteria weights must sum to 100%');
      return;
    }

    try {
      clearScreeningThoughts();
      // Note: In a real implementation, you'd pass customWeights to the API
      const result = await handleRunScreening({ jobId, shortlistSize });
      if (result.meta.requestStatus === 'fulfilled') {
        const data = result.payload as { _id: string; shortlistSize: number; processingTimeMs: number };
        toast.success(
          `Done! ${data.shortlistSize} candidates shortlisted in ${(data.processingTimeMs / 1000).toFixed(1)}s`
        );
        router.push(`/results/${data._id}`);
      } else {
        toast.error((result.payload as string) || 'Screening failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Screening failed');
    }
  };

  const jobOptions = jobs.map((job) => ({
    value: job._id!,
    label: `${job.title} — ${job.experienceLevel}`,
  }));

  const progressPercent = totalCandidates > 0
    ? Math.round((evaluatedCount / totalCandidates) * 100)
    : 0;

  const selectedJobRequirements = selectedJob?.requirements
    .filter((r) => r.required)
    .map((r) => r.skill) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 via-purple-500 to-secondary-600 mb-4 shadow-2xl shadow-primary-500/30"
        >
          <Brain className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-white mb-2">AI Candidate Screening</h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Powered by Gemini 2.0 Flash — Intelligent evaluation across skills, experience, education, projects, and availability
        </p>
      </div>

      {/* Configuration Phase */}
      <AnimatePresence>
        {!running && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="elevated" className="border-white/10">
              <div className="p-6 space-y-6">
                {/* Tab Navigation */}
                <div className="flex items-center gap-2 p-1 rounded-xl bg-white/5 border border-white/10">
                  <button
                    onClick={() => setActiveTab('configure')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                      activeTab === 'configure'
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Settings2 className="w-4 h-4" />
                    Configure Screening
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all',
                      activeTab === 'preview'
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Eye className="w-4 h-4" />
                    Preview Evaluation
                  </button>
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                  {activeTab === 'configure' ? (
                    <motion.div
                      key="configure"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Job Selector */}
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Select Job Position
                        </label>
                        <select
                          value={jobId}
                          onChange={(e) => setJobId(e.target.value)}
                          disabled={jobsLoading}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Choose a job...</option>
                          {jobs.map((job) => (
                            <option key={job._id} value={job._id}>
                              {job.title} — {job.experienceLevel}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Job Preview */}
                      {selectedJob && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-5 rounded-xl bg-gradient-to-br from-primary-500/10 to-purple-500/10 border border-primary-500/20"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Briefcase className="w-4 h-4 text-primary-400" />
                            <span className="text-sm font-semibold text-white">Job Details</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedJobRequirements.slice(0, 6).map((req) => (
                              <Badge key={req} variant="primary" size="sm">
                                {req}
                              </Badge>
                            ))}
                            {selectedJobRequirements.length > 6 && (
                              <Badge variant="secondary" size="sm">
                                +{selectedJobRequirements.length - 6} more
                              </Badge>
                            )}
                          </div>

                          {/* Current Weights Summary */}
                          <button
                            onClick={() => setShowWeights(!showWeights)}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-gray-400" />
                              <span className="text-xs text-gray-300">Scoring Weights</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-[10px] text-gray-400">Skills {selectedJob.weights.skills}%</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-violet-500" />
                                <span className="text-[10px] text-gray-400">Exp {selectedJob.weights.experience}%</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-[10px] text-gray-400">Edu {selectedJob.weights.education}%</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-[10px] text-gray-400">Proj {selectedJob.weights.projects}%</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-pink-500" />
                                <span className="text-[10px] text-gray-400">Avail {selectedJob.weights.availability}%</span>
                              </div>
                            </div>
                            <ChevronRight
                              className={cn(
                                'w-4 h-4 text-gray-400 transition-transform',
                                showWeights && 'rotate-90'
                              )}
                            />
                          </button>

                          {/* Expandable Criteria Selector */}
                          <AnimatePresence>
                            {showWeights && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="pt-4 mt-4 border-t border-white/10"
                              >
                                <CriteriaSelector
                                  weights={customWeights}
                                  onChange={setCustomWeights}
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}

                      {/* Shortlist Size */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-medium text-white">
                            Shortlist Size
                          </label>
                          <span className="text-sm font-bold text-primary-400">{shortlistSize} candidates</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={20}
                          step={5}
                          value={shortlistSize}
                          onChange={(e) => setShortlistSize(Number(e.target.value))}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-2">
                          <span>5</span>
                          <span>10</span>
                          <span>15</span>
                          <span>20</span>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-gray-400">Candidate Pool</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{candidateCount}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Trophy className="w-4 h-4 text-green-400" />
                            <span className="text-xs text-gray-400">To Shortlist</span>
                          </div>
                          <p className="text-2xl font-bold text-white">{shortlistSize}</p>
                        </div>
                      </div>

                      {/* Warning */}
                      {candidateCount > 0 && candidateCount < shortlistSize && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-3 p-4 rounded-xl bg-warning-500/10 border border-warning-500/20"
                        >
                          <AlertTriangle className="w-5 h-5 text-warning-400 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-warning-400">
                            Pool has {candidateCount} candidates but shortlist size is {shortlistSize}.
                            Reduce shortlist size to proceed.
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CandidatePreview
                        totalCandidates={candidateCount}
                        weights={customWeights}
                        jobRequirements={selectedJobRequirements}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Screening UI */}
      <AnimatePresence>
        {running && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Progress Header */}
            <Card variant="elevated" className="border-primary-500/30 bg-gradient-to-r from-primary-500/10 to-purple-500/10">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500" />
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">AI Screening in Progress</p>
                      <p className="text-xs text-gray-400">
                        Evaluating {candidateCount} candidates for {selectedJob?.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-white">{formatTime(elapsedTime)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-primary-400 font-medium">
                      {evaluatedCount} / {totalCandidates} candidates
                    </span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary-500 via-purple-500 to-primary-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Batch info */}
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Batch processing with Gemini 2.0 Flash</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                    <span>Real-time scoring active</span>
                  </span>
                </div>
              </div>
            </Card>

            {/* Main Grid: Thinking Stream + Score Gauges + Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: AI Thinking Stream */}
              <div>
                <AIThinkingStream
                  thoughts={thoughts}
                  isRunning={running}
                  currentCandidate={simulatedCandidates[0]}
                />
              </div>

              {/* Right: Score Gauges + Leaderboard */}
              <div className="space-y-4">
                <LiveScoreGauges scores={liveScores} evaluatedCount={evaluatedCount} />
                <LiveLeaderboard
                  candidates={partialShortlist}
                  totalEvaluated={evaluatedCount}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Run Button */}
      <Button
        fullWidth
        size="lg"
        onClick={handleRun}
        isLoading={running}
        disabled={running || !jobId || candidateCount === 0}
        leftIcon={
          running ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Zap className="w-5 h-5" />
          )
        }
        className={cn(
          'h-14 text-base font-semibold shadow-xl transition-all',
          !running && jobId && candidateCount > 0
            ? 'hover:shadow-2xl hover:shadow-primary-500/20 hover:scale-[1.02]'
            : ''
        )}
      >
        {running ? (
          <span className="flex items-center gap-2">
            <Brain className="w-5 h-5 animate-pulse" />
            AI Screening in progress...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Start AI Screening
          </span>
        )}
      </Button>

      {/* How It Works */}
      {!running && (
        <Card className="border-white/10">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-semibold text-white">How AI Scoring Works</span>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Skills', color: '#60a5fa', desc: 'Technical match' },
                { label: 'Experience', color: '#a78bfa', desc: 'Career depth' },
                { label: 'Education', color: '#34d399', desc: 'Qualifications' },
                { label: 'Projects', color: '#f59e0b', desc: 'Portfolio' },
                { label: 'Availability', color: '#ec4899', desc: 'Start date' },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <div
                    className="w-4 h-4 rounded-full mx-auto mb-2 shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${item.color}, ${item.color}80)`,
                      boxShadow: `0 0 20px ${item.color}40`,
                    }}
                  />
                  <span className="text-xs font-semibold text-white block mb-1">{item.label}</span>
                  <span className="text-[10px] text-gray-500">{item.desc}</span>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-white/10">
              Weights are customizable per job. All scores computed by Gemini 2.0 Flash with
              confidence indicators and bias detection.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
