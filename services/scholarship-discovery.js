/**
 * Scholarship Discovery Engine
 * Auto-matches scholarships to student profile
 * Prioritizes by urgency, match score, competition, and geography
 */

const ScholarshipDiscovery = (function() {
  'use strict';

  const APPLICATIONS_KEY = 'jasmine_applications';
  const SAVED_KEY = 'jasmine_saved_scholarships';

  // Competition levels
  const COMPETITION = {
    LOW: { label: 'Low Competition', color: '#22c55e', description: 'Random drawing or low applicants' },
    MODERATE: { label: 'Moderate', color: '#eab308', description: 'Merit-based but accessible' },
    COMPETITIVE: { label: 'Competitive', color: '#f97316', description: 'Strong applicants compete' },
    HIGHLY_COMPETITIVE: { label: 'Highly Competitive', color: '#dc2626', description: 'Elite competition' }
  };

  // Geography levels
  const GEOGRAPHY = {
    SCHOOL: { label: 'School', priority: 1, description: 'Your high school only' },
    LOCAL: { label: 'Local', priority: 2, description: 'Your city/area' },
    COUNTY: { label: 'County', priority: 3, description: 'Martin County' },
    REGIONAL: { label: 'Regional', priority: 4, description: 'South Florida' },
    STATE: { label: 'State', priority: 5, description: 'Florida' },
    NATIONAL: { label: 'National', priority: 6, description: 'Nationwide' }
  };

  // Get student profile
  function getProfile() {
    if (typeof KnowledgeVault !== 'undefined') {
      return KnowledgeVault.buildProfile();
    }
    try {
      const vault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
      const profile = JSON.parse(localStorage.getItem('jasmine_student_profile') || '{}');
      return { ...profile, ...vault };
    } catch (e) {
      return {};
    }
  }

  // Calculate match score based on profile
  function calculateMatchScore(scholarship, profile) {
    let score = 0;
    let maxScore = 0;
    const reasons = [];

    // Location matching (20 points)
    maxScore += 20;
    const scope = (scholarship.scope || '').toUpperCase();
    if (scope === 'SCHOOL' && profile.school) {
      score += 20;
      reasons.push('Your school');
    } else if (scope === 'LOCAL' || scope === 'COUNTY') {
      score += 18;
      reasons.push('Local to Martin County');
    } else if (scope === 'STATE' && profile.state === 'Florida') {
      score += 15;
      reasons.push('Florida resident');
    } else if (scope === 'NATIONAL') {
      score += 10;
    }

    // GPA matching (15 points)
    if (scholarship.gpaRequired) {
      maxScore += 15;
      const studentGpa = parseFloat(profile.gpa) || 0;
      const reqGpa = parseFloat(scholarship.gpaRequired) || 0;
      if (studentGpa >= reqGpa) {
        score += 15;
        reasons.push(`GPA ${studentGpa} exceeds ${reqGpa} requirement`);
      } else if (studentGpa >= reqGpa - 0.3) {
        score += 8;
        reasons.push(`GPA close to requirement`);
      }
    }

    // Interest/category matching (25 points)
    maxScore += 25;
    const category = (scholarship.category || '').toLowerCase();
    const interests = (profile.interests || []).map(i => i.toLowerCase());
    const skills = (profile.skills || []).map(s => (typeof s === 'string' ? s : s.name || '').toLowerCase());

    // Photography/Arts matching
    if (category === 'photography' || category === 'arts' || category === 'creative') {
      if (interests.includes('arts') || skills.some(s => s.includes('photo'))) {
        score += 25;
        reasons.push('Matches your photography/arts interest');
      }
    }
    // Community service
    if (category === 'service' || category === 'community' || category === 'volunteer') {
      if (interests.includes('service') || (profile.communityService && profile.communityService.length > 0)) {
        score += 25;
        reasons.push('Matches your community service');
      }
    }
    // Leadership
    if (category === 'leadership') {
      if (interests.includes('leadership') || (profile.activities && profile.activities.some(a =>
        (typeof a === 'string' ? a : a.title || '').toLowerCase().includes('leader')
      ))) {
        score += 25;
        reasons.push('Matches your leadership experience');
      }
    }
    // STEM
    if (category === 'stem' || category === 'science' || category === 'technology') {
      if (interests.includes('stem') || interests.includes('technology')) {
        score += 25;
        reasons.push('Matches your STEM interest');
      }
    }
    // Business/Entrepreneurship
    if (category === 'business' || category === 'entrepreneurship') {
      if (interests.includes('business') || profile.businessName) {
        score += 25;
        reasons.push('Matches your entrepreneurship');
      }
    }
    // General - give partial points
    if (category === 'general' || !category) {
      score += 15;
    }

    // Military family (10 points)
    if (scholarship.militaryFamily || (scholarship.category || '').toLowerCase().includes('military') ||
        (scholarship.category || '').toLowerCase().includes('veteran')) {
      maxScore += 10;
      if (profile.militaryFamily) {
        score += 10;
        reasons.push('Military family background');
      }
    }

    // Achievements matching (15 points)
    maxScore += 15;
    if (profile.achievements && profile.achievements.length > 0) {
      score += Math.min(15, profile.achievements.length * 3);
      if (profile.achievements.some(a =>
        (typeof a === 'string' ? a : a.title || '').toLowerCase().includes('gold') ||
        (typeof a === 'string' ? a : a.title || '').toLowerCase().includes('national')
      )) {
        reasons.push('National recognition strengthens application');
      }
    }

    // Academic program matching (10 points)
    if (profile.academicProgram) {
      maxScore += 10;
      score += 10;
      reasons.push(`${profile.academicProgram} candidate`);
    }

    // Essay difficulty consideration (5 points for no-essay)
    if (!scholarship.essayRequired) {
      maxScore += 5;
      score += 5;
      reasons.push('No essay required');
    }

    // Calculate final percentage
    const finalScore = Math.round((score / Math.max(maxScore, 1)) * 100);

    return {
      score: Math.min(100, Math.max(0, finalScore)),
      reasons: reasons.slice(0, 4),
      confidence: maxScore >= 40 ? 'high' : 'medium'
    };
  }

  // Calculate urgency based on deadline
  function calculateUrgency(deadline) {
    if (!deadline || deadline === 'Ongoing' || deadline === 'Rolling' || deadline === 'Monthly') {
      return { level: 'ongoing', label: 'Ongoing', color: '#6b7280', daysLeft: null, priority: 5 };
    }

    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { level: 'expired', label: 'Expired', color: '#9ca3af', daysLeft: diffDays, priority: 99 };
    }
    if (diffDays === 0) {
      return { level: 'today', label: 'Due Today!', color: '#dc2626', daysLeft: 0, priority: 1 };
    }
    if (diffDays <= 7) {
      return { level: 'week', label: `${diffDays} days left`, color: '#f97316', daysLeft: diffDays, priority: 2 };
    }
    if (diffDays <= 30) {
      return { level: 'month', label: `${diffDays} days`, color: '#eab308', daysLeft: diffDays, priority: 3 };
    }
    return { level: 'upcoming', label: `${diffDays} days`, color: '#22c55e', daysLeft: diffDays, priority: 4 };
  }

  // Estimate application time
  function estimateApplicationTime(scholarship) {
    let minutes = 10; // Base time for any application

    if (scholarship.essayRequired) {
      const wordCount = scholarship.essayWordCount || 500;
      minutes += Math.round(wordCount / 10); // ~10 words per minute for thoughtful writing
    }

    if (scholarship.documentsRequired && scholarship.documentsRequired.length > 0) {
      minutes += scholarship.documentsRequired.length * 5;
    }

    if (scholarship.recommendationsRequired) {
      minutes += 15; // Coordination time
    }

    if (minutes < 15) return '< 15 min';
    if (minutes < 30) return '15-30 min';
    if (minutes < 60) return '30-60 min';
    if (minutes < 120) return '1-2 hours';
    return '2+ hours';
  }

  // Get competition level
  function getCompetitionLevel(scholarship) {
    const tier = (scholarship.tier || '').toUpperCase();

    if (tier.includes('LOW_HANGING') || tier === 'LOW' || !scholarship.essayRequired) {
      return COMPETITION.LOW;
    }
    if (tier.includes('EFFICIENT') || tier === 'MODERATE') {
      return COMPETITION.MODERATE;
    }
    if (tier.includes('COMPETITIVE') && !tier.includes('HIGHLY')) {
      return COMPETITION.COMPETITIVE;
    }
    if (tier.includes('HIGHLY') || tier.includes('PRESTIGE')) {
      return COMPETITION.HIGHLY_COMPETITIVE;
    }

    // Estimate from other factors
    const amount = parseFloat((scholarship.amount || '0').replace(/[^0-9]/g, '')) || 0;
    if (amount > 10000) return COMPETITION.HIGHLY_COMPETITIVE;
    if (amount > 5000) return COMPETITION.COMPETITIVE;
    if (amount > 1000) return COMPETITION.MODERATE;
    return COMPETITION.LOW;
  }

  // Find similar scholarships for application stacking
  function findSimilarScholarships(scholarship, allScholarships) {
    const similar = [];
    const category = (scholarship.category || '').toLowerCase();
    const essayTheme = (scholarship.essayTheme || scholarship.essayTopic || '').toLowerCase();

    for (const other of allScholarships) {
      if (other.id === scholarship.id) continue;

      let similarity = 0;

      // Same category
      if ((other.category || '').toLowerCase() === category && category) {
        similarity += 40;
      }

      // Similar essay theme
      if (essayTheme && (other.essayTheme || other.essayTopic || '').toLowerCase().includes(essayTheme.split(' ')[0])) {
        similarity += 30;
      }

      // Similar amount range
      const amt1 = parseFloat((scholarship.amount || '0').replace(/[^0-9]/g, '')) || 0;
      const amt2 = parseFloat((other.amount || '0').replace(/[^0-9]/g, '')) || 0;
      if (Math.abs(amt1 - amt2) < 2000) {
        similarity += 10;
      }

      // Same tier
      if ((other.tier || '').toLowerCase() === (scholarship.tier || '').toLowerCase()) {
        similarity += 15;
      }

      // Both require essays or both don't
      if (other.essayRequired === scholarship.essayRequired) {
        similarity += 5;
      }

      if (similarity >= 40) {
        similar.push({
          id: other.id,
          name: other.name,
          amount: other.amount,
          similarity: similarity,
          reason: category ? `Both ${category} scholarships` : 'Similar requirements'
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  // Get all scholarships with enriched data
  function getAllScholarships() {
    const curated = typeof CURATED_SCHOLARSHIPS !== 'undefined' ? CURATED_SCHOLARSHIPS : [];
    const custom = typeof ScholarshipSearch !== 'undefined' ? ScholarshipSearch.getCustomScholarships() : [];
    return [...curated, ...custom];
  }

  // Discover and rank scholarships for student
  function discoverScholarships() {
    const profile = getProfile();
    const allScholarships = getAllScholarships();
    const applications = getApplications();
    const saved = getSavedScholarships();

    const results = [];

    for (const scholarship of allScholarships) {
      // Skip already applied
      if (applications.some(a => a.scholarshipId === scholarship.id && a.status === 'submitted')) {
        continue;
      }

      const match = calculateMatchScore(scholarship, profile);
      const urgency = calculateUrgency(scholarship.deadline);

      // Skip expired unless it's rolling/ongoing
      if (urgency.level === 'expired') continue;

      const competition = getCompetitionLevel(scholarship);
      const timeEstimate = estimateApplicationTime(scholarship);
      const similar = findSimilarScholarships(scholarship, allScholarships);
      const isSaved = saved.includes(scholarship.id);
      const inProgress = applications.some(a => a.scholarshipId === scholarship.id && a.status !== 'submitted');

      results.push({
        ...scholarship,
        matchScore: match.score,
        matchReasons: match.reasons,
        matchConfidence: match.confidence,
        urgency: urgency,
        competition: competition,
        timeEstimate: timeEstimate,
        similarScholarships: similar,
        applicationsUnlocked: similar.length,
        isSaved: isSaved,
        inProgress: inProgress,
        // Combined priority score (lower is better)
        priorityScore: (100 - match.score) + (urgency.priority * 10) +
          (competition === COMPETITION.LOW ? 0 : competition === COMPETITION.MODERATE ? 5 : 10)
      });
    }

    // Sort by priority
    results.sort((a, b) => a.priorityScore - b.priorityScore);

    return results;
  }

  // Get scholarships grouped by urgency
  function getByUrgency() {
    const scholarships = discoverScholarships();
    return {
      today: scholarships.filter(s => s.urgency.level === 'today'),
      thisWeek: scholarships.filter(s => s.urgency.level === 'week'),
      thisMonth: scholarships.filter(s => s.urgency.level === 'month'),
      upcoming: scholarships.filter(s => s.urgency.level === 'upcoming'),
      ongoing: scholarships.filter(s => s.urgency.level === 'ongoing')
    };
  }

  // Get top recommendations
  function getTopRecommendations(limit = 5) {
    const scholarships = discoverScholarships();
    return scholarships.slice(0, limit);
  }

  // Get quick wins (low competition, good match)
  function getQuickWins() {
    const scholarships = discoverScholarships();
    return scholarships.filter(s =>
      s.competition === COMPETITION.LOW && s.matchScore >= 50
    ).slice(0, 10);
  }

  // Get strong matches
  function getStrongMatches() {
    const scholarships = discoverScholarships();
    return scholarships.filter(s => s.matchScore >= 75).slice(0, 10);
  }

  // Application tracking
  function getApplications() {
    try {
      return JSON.parse(localStorage.getItem(APPLICATIONS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveApplication(scholarshipId, status, data = {}) {
    const apps = getApplications();
    const existing = apps.findIndex(a => a.scholarshipId === scholarshipId);

    const app = {
      scholarshipId,
      status, // 'saved', 'in_progress', 'submitted', 'awarded', 'rejected'
      ...data,
      updatedAt: new Date().toISOString()
    };

    if (existing >= 0) {
      apps[existing] = { ...apps[existing], ...app };
    } else {
      app.createdAt = new Date().toISOString();
      apps.push(app);
    }

    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(apps));
    return app;
  }

  // Saved scholarships
  function getSavedScholarships() {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function toggleSaved(scholarshipId) {
    const saved = getSavedScholarships();
    const idx = saved.indexOf(scholarshipId);
    if (idx >= 0) {
      saved.splice(idx, 1);
    } else {
      saved.push(scholarshipId);
    }
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    return saved.includes(scholarshipId);
  }

  // Get dashboard stats
  function getDashboardStats() {
    const scholarships = discoverScholarships();
    const apps = getApplications();
    const submitted = apps.filter(a => a.status === 'submitted');
    const awarded = apps.filter(a => a.status === 'awarded');

    // Calculate potential value
    let potentialValue = 0;
    let awardedValue = 0;

    for (const s of scholarships) {
      const amount = parseFloat((s.amount || '0').replace(/[^0-9]/g, '')) || 0;
      potentialValue += amount;
    }

    for (const a of awarded) {
      const scholarship = scholarships.find(s => s.id === a.scholarshipId);
      if (scholarship) {
        awardedValue += parseFloat((scholarship.amount || '0').replace(/[^0-9]/g, '')) || 0;
      }
    }

    // Count essays ready for reuse
    const essays = JSON.parse(localStorage.getItem('jasmine_essays') || '[]');
    const essaysReady = essays.filter(e => e.status === 'complete' || e.content?.length > 200).length;

    // Applications unlocked (similar scholarships to ones we've applied to)
    let unlocked = 0;
    for (const app of submitted) {
      const scholarship = scholarships.find(s => s.id === app.scholarshipId);
      if (scholarship && scholarship.similarScholarships) {
        unlocked += scholarship.similarScholarships.length;
      }
    }

    return {
      totalScholarships: scholarships.length,
      applied: submitted.length,
      inProgress: apps.filter(a => a.status === 'in_progress').length,
      awarded: awarded.length,
      potentialValue: potentialValue,
      awardedValue: awardedValue,
      essaysReady: essaysReady,
      applicationsUnlocked: unlocked,
      strongMatches: scholarships.filter(s => s.matchScore >= 75).length,
      quickWins: scholarships.filter(s => s.competition === COMPETITION.LOW && s.matchScore >= 50).length,
      dueSoon: scholarships.filter(s => s.urgency.level === 'week' || s.urgency.level === 'today').length
    };
  }

  return {
    COMPETITION,
    GEOGRAPHY,
    discoverScholarships,
    getByUrgency,
    getTopRecommendations,
    getQuickWins,
    getStrongMatches,
    calculateMatchScore,
    calculateUrgency,
    estimateApplicationTime,
    getCompetitionLevel,
    findSimilarScholarships,
    getApplications,
    saveApplication,
    getSavedScholarships,
    toggleSaved,
    getDashboardStats
  };
})();
