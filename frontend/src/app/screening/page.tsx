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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { ThinkingStream, Thought } from '@/components/screening/ThinkingStream';
import { LiveScoreGauges } from '@/components/screening/LiveScoreGauges';
import { LiveLeaderboard } from '@/components/screening/LiveLeaderboard';

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

const CANDIDATE_ACTIONS = [
  'Analyzing',
  'Evaluating',
  'Scoring',
  'Reviewing',
  'Processing',
];

function generateThought(
  candidateName: string,
  phase: number
): Omit<Thought, 'id' | 'timestamp'> {
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

  const selectedJob = jobs.find((j) => j._id === jobId);

  // Initialize candidate names for simulation
  useEffect(() => {
    if (running && simulatedCandidates.length === 0 && candidateCount > 0) {
      // Generate fake candidate names for the simulation
      const firstNames = ['Maria', 'Alex', 'James', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Lisa', 'William', 'Jennifer', 'Daniel', 'Amanda', 'Christopher', 'Ashley', 'Matthew', 'Stephanie', 'Andrew', 'Nicole'];
      const lastNames = ['Santos', 'Chen', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore'];
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

    const thoughtsPerCandidate = 4; // Number of thoughts per candidate
    const totalThoughts = simulatedCandidates.length * thoughtsPerCandidate;
    const estimatedDuration = 30000; // 30 seconds estimated
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

      // Add candidate to partial shortlist occasionally (simulating finding good candidates)
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
      toast.error(
        `Only ${candidateCount} candidates but shortlist size is ${shortlistSize}`
      );
      return;
    }

    try {
      clearScreeningThoughts();
      const result = await handleRunScreening({ jobId, shortlistSize });
      if (result.meta.requestStatus === 'fulfilled') {
        const data = result.payload as { _id: string; shortlistSize: number; processingTimeMs: number };
        toast.success(
          `Done! ${data.shortlistSize} candidates shortlisted in ${(
            data.processingTimeMs / 1000
          ).toFixed(1)}s`
        );
        router.push(`/results/${data._id}`);
      } else {
        toast.error(result.payload as string || 'Screening failed');
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-600 mb-4 shadow-lg shadow-primary-500/25">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-heading-2 text-primary mb-2">AI Screening</h1>
        <p className="text-body-large text-gray-400">
          Gemini 2.0 Flash evaluates, scores, and ranks your entire candidate pool
        </p>
      </div>

      {/* Configuration Card - Hide when running */}
      <AnimatePresence>
        {!running && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="elevated">
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-5 rounded-full bg-primary-500" />
                  <span className="text-caption text-tertiary">Configuration</span>
                </div>

                {/* Job Selector */}
                <div>
                  <Select
                    label="Job Position"
                    placeholder="Choose a job..."
                    options={jobOptions}
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    disabled={jobsLoading}
                    required
                  />
                </div>

                {/* Selected Job Preview */}
                {selectedJob && (
                  <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
                    <p className="text-sm text-tertiary mb-2">Selected Requirements:</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedJob.requirements
                        .filter((r) => r.required)
                        .slice(0, 6)
                        .map((r) => (
                          <Badge key={r.skill} variant="primary" size="sm">
                            {r.skill}
                            {r.level && ` (${r.level})`}
                          </Badge>
                        ))}
                    </div>
                    <p className="text-xs text-tertiary">
                      Scoring Weights: Skills {selectedJob.weights.skills}% / Exp{' '}
                      {selectedJob.weights.experience}% / Edu{' '}
                      {selectedJob.weights.education}% / Projects{' '}
                      {selectedJob.weights.projects}% / Avail{' '}
                      {selectedJob.weights.availability}%
                    </p>
                  </div>
                )}

                {/* Shortlist Size */}
                <div>
                  <label className="block text-sm font-medium text-secondary mb-3">
                    Shortlist Size:{' '}
                    <span className="text-primary-400">{shortlistSize}</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={5}
                    value={shortlistSize}
                    onChange={(e) => setShortlistSize(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-xs text-tertiary mt-2">
                    <span>5</span>
                    <span>10</span>
                    <span>15</span>
                    <span>20</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface-hover">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-secondary-500/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-secondary-400" />
                      </div>
                      <span className="text-caption text-tertiary">Candidate Pool</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {candidateCount}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-hover">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-primary-400" />
                      </div>
                      <span className="text-caption text-tertiary">Selected Job</span>
                    </div>
                    <p className="text-2xl font-bold text-primary truncate">
                      {selectedJob?.title || '—'}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                {candidateCount > 0 && candidateCount < shortlistSize && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-warning-500/10 border border-warning-500/20">
                    <AlertTriangle className="w-4 h-4 text-warning-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-warning-400">
                      Pool has {candidateCount} candidates but shortlist size is{' '}
                      {shortlistSize}. Reduce shortlist size.
                    </p>
                  </div>
                )}
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
            <Card variant="elevated" className="border-primary-500/30">
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500" />
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        AI Screening in Progress
                      </p>
                      <p className="text-xs text-gray-500">
                        Evaluating {candidateCount} candidates for {selectedJob?.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{formatTime(elapsedTime)}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-primary-400 font-medium">
                      {evaluatedCount} / {totalCandidates} candidates
                    </span>
                  </div>
                  <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Batch info */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    Batch processing with Gemini 2.0 Flash
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    Real-time scoring active
                  </span>
                </div>
              </div>
            </Card>

            {/* Main Grid: Thinking Stream + Score Gauges + Leaderboard */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Thinking Stream */}
              <div className="col-span-2 lg:col-span-1">
                <ThinkingStream thoughts={thoughts} isRunning={running} />
              </div>

              {/* Right: Score Gauges + Leaderboard */}
              <div className="col-span-2 lg:col-span-1 space-y-4">
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
        leftIcon={running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
      >
        {running ? 'AI Screening in progress...' : 'Run AI Screening'}
      </Button>

      {/* How Scoring Works */}
      {!running && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-primary-400" />
              <span className="text-caption text-tertiary">How AI Scoring Works</span>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: 'Skills Match', color: '#60a5fa', desc: 'Technical skills vs requirements' },
                { label: 'Work Experience', color: '#a78bfa', desc: 'Relevance & depth' },
                { label: 'Education', color: '#34d399', desc: 'Degree & certifications' },
                { label: 'Projects', color: '#f59e0b', desc: 'Portfolio strength' },
                { label: 'Availability', color: '#ec4899', desc: 'Start date fit' },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ background: item.color }}
                  />
                  <span className="text-xs font-medium text-primary block mb-1">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-tertiary mt-4 pt-4 border-t border-default">
              Weights are customizable per job. All scores computed by Gemini 2.0
              Flash with confidence indicators and bias detection.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
