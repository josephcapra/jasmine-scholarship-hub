/**
 * Next Action Engine - Prioritizes student's next best steps
 * Returns top 3 actions based on deadlines, matches, and profile gaps
 */

const NextActions = (function() {
  'use strict';

  const ACTION_TYPES = {
    APPLY_SCHOLARSHIP: 'apply_scholarship',
    COMPLETE_PROFILE: 'complete_profile',
    UPLOAD_DOCUMENT: 'upload_document',
    WRITE_ESSAY: 'write_essay',
    ADD_ACHIEVEMENT: 'add_achievement'
  };

  function getScholarships() {
    try {
      return typeof SCHOLARSHIP_DATA !== 'undefined' ? SCHOLARSHIP_DATA : [];
    } catch (e) {
      return [];
    }
  }

  function getUserScholarships() {
    try {
      return JSON.parse(localStorage.getItem('jasmine_scholarships') || '[]');
    } catch (e) {
      return [];
    }
  }

  function calculatePriority(action) {
    let score = action.baseScore || 50;

    // Deadline urgency (higher = more urgent)
    if (action.daysUntilDeadline !== undefined) {
      if (action.daysUntilDeadline <= 3) score += 100;
      else if (action.daysUntilDeadline <= 7) score += 60;
      else if (action.daysUntilDeadline <= 14) score += 40;
      else if (action.daysUntilDeadline <= 30) score += 20;
    }

    // Match score boost
    if (action.matchScore) score += action.matchScore * 30;

    // Award amount boost
    if (action.awardAmount) {
      if (action.awardAmount >= 10000) score += 40;
      else if (action.awardAmount >= 5000) score += 30;
      else if (action.awardAmount >= 1000) score += 20;
    }

    // Profile completion impact
    if (action.profileImpact) score += action.profileImpact * 20;

    // Quick wins bonus (under 15 min estimated)
    if (action.estimatedMinutes && action.estimatedMinutes <= 15) score += 15;

    return score;
  }

  function generateActions() {
    const actions = [];
    const profile = typeof KnowledgeVault !== 'undefined' ? KnowledgeVault.buildProfile() : {};
    const userScholarships = getUserScholarships();
    const appliedIds = userScholarships.filter(s => s.status === 'applied' || s.status === 'submitted').map(s => s.id);

    // 1. Scholarship application actions
    const scholarships = getScholarships();
    const today = new Date();

    scholarships.forEach(s => {
      if (appliedIds.includes(s.id)) return;
      if (!s.deadline) return;

      const deadline = new Date(s.deadline);
      if (deadline < today) return;

      const daysUntil = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
      if (daysUntil > 90) return;

      const matchScore = typeof KnowledgeVault !== 'undefined'
        ? KnowledgeVault.calculateMatchScore(s)
        : 0.5;

      actions.push({
        type: ACTION_TYPES.APPLY_SCHOLARSHIP,
        title: `Apply for ${s.name}`,
        subtitle: `$${s.amount.toLocaleString()} • ${daysUntil} days left`,
        matchScore: matchScore,
        matchPercent: Math.round(matchScore * 100),
        daysUntilDeadline: daysUntil,
        awardAmount: s.amount,
        estimatedMinutes: s.essayRequired ? 45 : 20,
        icon: 'gift',
        action: () => window.viewScholarship && window.viewScholarship(s),
        scholarshipId: s.id,
        baseScore: 40
      });
    });

    // 2. Profile completion actions
    if (typeof KnowledgeVault !== 'undefined') {
      const missing = KnowledgeVault.getMissingItems();
      missing.forEach((m, idx) => {
        actions.push({
          type: ACTION_TYPES.COMPLETE_PROFILE,
          title: `Add your ${m.label}`,
          subtitle: m.impact,
          estimatedMinutes: 5,
          profileImpact: 0.3,
          icon: 'user',
          action: () => window.switchSection && window.switchSection('profile'),
          baseScore: 35 - idx * 5
        });
      });
    }

    // 3. Document upload suggestion
    if (!profile.documents || profile.documents.length === 0) {
      actions.push({
        type: ACTION_TYPES.UPLOAD_DOCUMENT,
        title: 'Upload your first document',
        subtitle: 'Transcript, resume, or recommendation',
        estimatedMinutes: 3,
        profileImpact: 0.25,
        icon: 'file',
        action: () => window.switchSection && window.switchSection('documents'),
        baseScore: 30
      });
    }

    // 4. Achievement suggestion
    if (!profile.achievements || profile.achievements.length === 0) {
      actions.push({
        type: ACTION_TYPES.ADD_ACHIEVEMENT,
        title: 'Add an achievement',
        subtitle: 'Awards, honors, or accomplishments',
        estimatedMinutes: 4,
        profileImpact: 0.2,
        icon: 'award',
        action: () => window.switchSection && window.switchSection('badges'),
        baseScore: 28
      });
    }

    // 5. Essay writing suggestion
    if (!profile.essays || profile.essays.length === 0) {
      actions.push({
        type: ACTION_TYPES.WRITE_ESSAY,
        title: 'Start your first essay',
        subtitle: 'Reusable across multiple applications',
        estimatedMinutes: 30,
        profileImpact: 0.3,
        icon: 'edit',
        action: () => window.switchSection && window.switchSection('essays'),
        baseScore: 25
      });
    }

    // Sort by priority and return top 3
    return actions
      .map(a => ({ ...a, priority: calculatePriority(a) }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }

  function renderActionCard(action) {
    const iconMap = {
      gift: '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8V21M3 12h18M12 8c0-2 1-3 3-3s3 1 3 3M12 8c0-2-1-3-3-3S6 6 6 8"/></svg>',
      user: '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>',
      file: '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>',
      award: '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>',
      edit: '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'
    };

    const matchBadge = action.matchPercent
      ? `<span class="na-match">${action.matchPercent}% match</span>`
      : '';

    const timeBadge = action.estimatedMinutes
      ? `<span class="na-time">${action.estimatedMinutes} min</span>`
      : '';

    return `
      <button class="na-card" onclick="this.action && this.action()" data-action-id="${action.scholarshipId || ''}">
        <div class="na-icon">${iconMap[action.icon] || iconMap.gift}</div>
        <div class="na-content">
          <div class="na-title">${action.title}</div>
          <div class="na-subtitle">${action.subtitle}</div>
          <div class="na-badges">${matchBadge}${timeBadge}</div>
        </div>
        <div class="na-arrow">
          <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </button>
    `;
  }

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const actions = generateActions();

    if (actions.length === 0) {
      container.innerHTML = `
        <div class="na-empty">
          <div class="na-empty-icon">
            <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="24" cy="24" r="20"/>
              <path d="M24 14v10l6 3"/>
            </svg>
          </div>
          <p>All caught up! Check back tomorrow.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="na-header">
        <h2>Your Next Steps</h2>
        <span class="na-count">${actions.length} priorities</span>
      </div>
      <div class="na-list">
        ${actions.map(a => renderActionCard(a)).join('')}
      </div>
    `;

    // Attach click handlers
    actions.forEach((a, idx) => {
      const card = container.querySelectorAll('.na-card')[idx];
      if (card && a.action) {
        card.onclick = a.action;
      }
    });
  }

  return {
    ACTION_TYPES,
    generateActions,
    render
  };
})();
