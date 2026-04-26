import {
  TalentProfile, Job, PreprocessedCandidate, RiskFlag,
  SKILL_LEVEL_SCORE,
} from "../types";

// ─── Skill Normalization ──────────────────────────────────────────────────────

function normalizeSkillName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .replace(/javascript/g, "js")
    .replace(/typescript/g, "ts")
    .replace(/node\.?js/g, "nodejs")
    .replace(/react\.?js/g, "react")
    .replace(/vue\.?js/g, "vue")
    .replace(/next\.?js/g, "nextjs")
    .replace(/express\.?js/g, "express");
}

function skillsMatch(profileSkill: string, jobSkill: string): boolean {
  const a = normalizeSkillName(profileSkill);
  const b = normalizeSkillName(jobSkill);
  // Exact match or one contains the other (handles "React" vs "React.js")
  return a === b || a.includes(b) || b.includes(a);
}

// ─── Experience Duration Calculator ──────────────────────────────────────────

function calcExperienceMonths(profile: TalentProfile): number {
  return profile.experience.reduce((total, exp) => {
    if (!exp.startDate) return total;
    const [sy, sm] = exp.startDate.split("-").map(Number);
    const start = new Date(sy, (sm || 1) - 1);

    let end: Date;
    if (exp.isCurrent || !exp.endDate) {
      end = new Date();
    } else {
      const [ey, em] = exp.endDate.split("-").map(Number);
      end = new Date(ey, (em || 1) - 1);
    }

    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return total + Math.max(0, months);
  }, 0);
}

// ─── Skill Match Analysis ─────────────────────────────────────────────────────

function analyzeSkillMatch(profile: TalentProfile, job: Job) {
  const requiredSkills = job.requirements.filter(r => r.required).map(r => r.skill);
  const allJobSkills = job.requirements.map(r => r.skill);
  const profileSkillNames = profile.skills.map(s => s.name);

  const matched: string[] = [];
  const missing: string[] = [];
  const bonus: string[] = [];

  for (const jobSkill of requiredSkills) {
    const found = profileSkillNames.some(ps => skillsMatch(ps, jobSkill));
    if (found) matched.push(jobSkill);
    else missing.push(jobSkill);
  }

  for (const ps of profileSkillNames) {
    const isRequired = allJobSkills.some(js => skillsMatch(ps, js));
    const isBonus = job.niceToHave?.some(nth => skillsMatch(ps, nth)) ?? false;
    if (!isRequired && isBonus) bonus.push(ps);
    // Skills that are neither required nor nice-to-have are neutral — not shown as bonus to AI
  }

  const ratio = requiredSkills.length > 0 ? matched.length / requiredSkills.length : 0;
  return { matched, missing, bonus, ratio };
}

// ─── Pre-Score Calculators ────────────────────────────────────────────────────

function computeRawSkillScore(profile: TalentProfile, job: Job, matchRatio: number): number {
  // Base score from match ratio
  let score = matchRatio * 70;

  // Bonus for skill level matching
  for (const req of job.requirements.filter(r => r.required && r.level)) {
    const profileSkill = profile.skills.find(ps => skillsMatch(ps.name, req.skill));
    if (profileSkill && req.level) {
      const profileLevel = SKILL_LEVEL_SCORE[profileSkill.level] || 0;
      const requiredLevel = SKILL_LEVEL_SCORE[req.level] || 0;
      if (profileLevel >= requiredLevel) score += 5;
    }
  }

  // Bonus for years of experience per skill
  for (const req of job.requirements.filter(r => r.required && r.yearsRequired)) {
    const profileSkill = profile.skills.find(ps => skillsMatch(ps.name, req.skill));
    if (profileSkill && req.yearsRequired && profileSkill.yearsOfExperience >= req.yearsRequired) {
      score += 3;
    }
  }

  // Certifications bonus
  const certSkills = (profile.certifications || []).map(c => c.name.toLowerCase());
  const matchingCerts = job.requirements.filter(r =>
    certSkills.some(c => c.includes(r.skill.toLowerCase()))
  );
  score += matchingCerts.length * 4;

  return Math.min(100, Math.round(score));
}

function computeRawExperienceScore(profile: TalentProfile, job: Job, totalMonths: number): number {
  // Map experience level to expected years
  const expectedYears: Record<string, number> = {
    Junior: 1, "Mid-level": 3, Senior: 6, Lead: 8, Executive: 12,
  };
  const target = expectedYears[job.experienceLevel] || 3;
  const actual = totalMonths / 12;

  let score = 0;

  // Years match
  if (actual >= target) score = 60 + Math.min(20, (actual - target) * 3);
  else score = Math.max(10, (actual / target) * 60);

  // Role relevance: check if any past roles match job title keywords
  const jobTitleWords = job.title.toLowerCase().split(" ");
  const relevantRoles = profile.experience.filter(e =>
    jobTitleWords.some(w => w.length > 3 && e.role.toLowerCase().includes(w))
  );
  score += relevantRoles.length * 5;

  // Technology overlap in experience
  const jobTechs = job.requirements.map(r => normalizeSkillName(r.skill));
  const expTechs = profile.experience.flatMap(e => e.technologies.map(t => normalizeSkillName(t)));
  const techOverlap = jobTechs.filter(t => expTechs.includes(t)).length;
  score += Math.min(15, techOverlap * 3);

  return Math.min(100, Math.round(score));
}

function computeRawEducationScore(profile: TalentProfile): number {
  if (!profile.education?.length) return 30;

  // Degree level scoring
  const degreeMap: Record<string, number> = {
    phd: 100, doctorate: 100, "master": 85, msc: 85, mba: 85,
    bachelor: 70, bsc: 70, ba: 70, be: 70, "associate": 55,
    diploma: 45, certificate: 40,
  };

  // Pick the highest-scoring degree — candidates may list Bachelor's before Master's
  const bestDegreeScore = Math.max(
    ...profile.education.map(edu => {
      const norm = edu.degree.toLowerCase();
      return Object.entries(degreeMap).find(([k]) => norm.includes(k))?.[1] ?? 55;
    })
  );

  let score = bestDegreeScore;
  const topEdu = profile.education[0];

  // Field relevance (rough heuristic)
  const techFields = ["computer", "software", "information", "data", "engineering", "math", "physics"];
  const field = (topEdu.fieldOfStudy || "").toLowerCase();
  if (techFields.some(f => field.includes(f))) score += 10;

  // Certifications bonus (5 per cert, up to 20)
  score += Math.min(20, (profile.certifications?.length || 0) * 5);

  return Math.min(100, Math.round(score));
}

function computeRawProjectScore(profile: TalentProfile, job: Job): number {
  if (!profile.projects?.length) return 20;

  let score = 30; // Base for having projects
  const jobTechs = job.requirements.map(r => normalizeSkillName(r.skill));

  for (const project of profile.projects.slice(0, 5)) {
    const projectTechs = project.technologies.map(t => normalizeSkillName(t));
    const overlap = jobTechs.filter(t => projectTechs.includes(t)).length;
    score += overlap * 4;

    if (project.link) score += 5; // Live/public project
    if (project.impact) score += 3; // Documented impact
  }

  return Math.min(100, Math.round(score));
}

function computeAvailabilityScore(profile: TalentProfile, job: Job): number {
  let score = 0;

  if (profile.availability.status === "Available") score = 100;
  else if (profile.availability.status === "Open to Opportunities") score = 70;
  else score = 20;

  // Employment type match
  if (profile.availability.type === job.type) score = Math.min(100, score + 10);
  // Contract to Full-time is flexible
  else if (profile.availability.type === "Contract" && job.type === "Full-time") score = Math.min(100, score + 5);

  return Math.min(100, score);
}

// ─── Risk Detection ───────────────────────────────────────────────────────────

function detectRisks(profile: TalentProfile, job: Job): RiskFlag[] {
  const risks: RiskFlag[] = [];

  // 1. Skill without proof: claimed skill not demonstrated in any project/experience
  for (const skill of profile.skills) {
    const usedInExp = profile.experience.some(e =>
      e.technologies.some(t => skillsMatch(t, skill.name)) || e.description.toLowerCase().includes(skill.name.toLowerCase())
    );
    const usedInProject = profile.projects?.some(p =>
      p.technologies.some(t => skillsMatch(t, skill.name))
    ) ?? false;

    if (!usedInExp && !usedInProject && (skill.level === "Expert" || skill.level === "Advanced")) {
      risks.push({
        type: "SKILL_UNVERIFIED",
        detail: `${skill.name} (${skill.level}) is claimed but not demonstrated in any work experience or project`,
        severity: skill.level === "Expert" ? "high" : "medium",
      });
    }
  }

  // 2. Short tenure: multiple positions < 12 months
  const shortPositions = profile.experience.filter(e => {
    if (e.isCurrent || !e.endDate) return false;
    const [sy, sm] = e.startDate.split("-").map(Number);
    const [ey, em] = e.endDate.split("-").map(Number);
    const months = (ey - sy) * 12 + (em - sm);
    return months < 12;
  });
  if (shortPositions.length >= 2) {
    risks.push({
      type: "SHORT_TENURE",
      detail: `${shortPositions.length} positions with tenure < 12 months: ${shortPositions.map(p => `${p.role} @ ${p.company}`).join(", ")}`,
      severity: shortPositions.length >= 3 ? "high" : "medium",
    });
  }

  // 3. Employment gap > 6 months
  const sortedExp = [...profile.experience]
    .filter(e => e.startDate && e.endDate && !e.isCurrent)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  for (let i = 1; i < sortedExp.length; i++) {
    const prevEnd = sortedExp[i - 1].endDate!;
    const currStart = sortedExp[i].startDate;
    const [py, pm] = prevEnd.split("-").map(Number);
    const [cy, cm] = currStart.split("-").map(Number);
    const gapMonths = (cy - py) * 12 + (cm - pm);
    if (gapMonths > 6) {
      risks.push({
        type: "EMPLOYMENT_GAP",
        detail: `${gapMonths}-month gap between ${sortedExp[i-1].company} and ${sortedExp[i].company}`,
        severity: gapMonths > 12 ? "high" : "medium",
      });
    }
  }

  // 4. Missing critical skills
  const criticalMissing = job.requirements
    .filter(r => r.required)
    .filter(r => !profile.skills.some(s => skillsMatch(s.name, r.skill)));
  if (criticalMissing.length >= 3) {
    risks.push({
      type: "MISSING_CRITICAL_SKILL",
      detail: `Missing ${criticalMissing.length} required skills: ${criticalMissing.map(r => r.skill).join(", ")}`,
      severity: criticalMissing.length >= 4 ? "high" : "medium",
    });
  }

  // 5. Overqualified
  const expYears = calcExperienceMonths(profile) / 12;
  const maxExpected: Record<string, number> = { Junior: 3, "Mid-level": 7, Senior: 12, Lead: 15, Executive: 25 };
  if (expYears > (maxExpected[job.experienceLevel] || 20)) {
    risks.push({
      type: "OVERQUALIFIED",
      detail: `${expYears.toFixed(1)} years of experience for a ${job.experienceLevel} role (expected ≤ ${maxExpected[job.experienceLevel]} years)`,
      severity: "low",
    });
  }

  return risks;
}

// ─── Main Preprocessing Entry Point ──────────────────────────────────────────

export function preprocessCandidates(
  candidates: TalentProfile[],
  job: Job
): PreprocessedCandidate[] {
  return candidates.map(c => {
    const { matched, missing, bonus, ratio } = analyzeSkillMatch(c, job);
    const totalMonths = calcExperienceMonths(c);
    const riskFlags = detectRisks(c, job);

    const rawSkillScore      = computeRawSkillScore(c, job, ratio);
    const rawExperienceScore = computeRawExperienceScore(c, job, totalMonths);
    const rawEducationScore  = computeRawEducationScore(c);
    const rawProjectScore    = computeRawProjectScore(c, job);
    const availabilityScore  = computeAvailabilityScore(c, job);

    return {
      candidateId:          c._id || c.email,
      candidateName:        `${c.firstName} ${c.lastName}`.trim(),
      email:                c.email,
      totalExperienceMonths: totalMonths,
      totalExperienceYears:  totalMonths / 12,
      skillsMatched:        matched,
      skillsMissing:        missing,
      skillsBonus:          [...new Set(bonus)].slice(0, 15),
      skillMatchRatio:      ratio,
      rawSkillScore,
      rawExperienceScore,
      rawEducationScore,
      rawProjectScore,
      availabilityScore,
      riskFlags,
      originalProfile:      c,
    };
  });
}
