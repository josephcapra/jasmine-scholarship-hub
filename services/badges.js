/**
 * Badges Service - Gamification for Jasmine Scholarship Hub
 * Tracks achievements and awards badges for milestones
 */

const BadgeService = (function() {
  'use strict';

  const BADGE_DEFINITIONS = {
    first_steps: {
      id: 'first_steps',
      name: 'First Steps',
      icon: '🌟',
      description: 'Started your journey',
      check: (stats) => stats.profileComplete
    },
    wordsmith: {
      id: 'wordsmith',
      name: 'Wordsmith',
      icon: '📝',
      description: 'Wrote first essay',
      check: (stats) => stats.essaysWritten >= 1
    },
    on_fire: {
      id: 'on_fire',
      name: 'On Fire',
      icon: '🔥',
      description: '7-day streak',
      check: (stats) => stats.streak >= 7
    },
    goal_getter: {
      id: 'goal_getter',
      name: 'Goal Getter',
      icon: '🎯',
      description: 'Complete 5 goals',
      check: (stats) => stats.goalsCompleted >= 5
    },
    sender: {
      id: 'sender',
      name: 'Sender',
      icon: '📮',
      description: 'Submit first app',
      check: (stats) => stats.applicationsSubmitted >= 1
    },
    unstoppable: {
      id: 'unstoppable',
      name: 'Unstoppable',
      icon: '💪',
      description: '5 apps submitted',
      check: (stats) => stats.applicationsSubmitted >= 5
    },
    scholar: {
      id: 'scholar',
      name: 'Scholar',
      icon: '🎓',
      description: 'Win a scholarship!',
      check: (stats) => stats.scholarshipsWon >= 1
    },
    queen: {
      id: 'queen',
      name: 'Queen',
      icon: '👑',
      description: '10+ scholarships',
      check: (stats) => stats.scholarshipsTracked >= 10
    },
    transformed: {
      id: 'transformed',
      name: 'Transformed',
      icon: '🦋',
      description: 'Complete all essays',
      check: (stats) => stats.essaysComplete && stats.essaysComplete >= 3
    },
    early_bird: {
      id: 'early_bird',
      name: 'Early Bird',
      icon: '🐦',
      description: 'Submit 2 weeks early',
      check: (stats) => stats.earlySubmissions >= 1
    },
    researcher: {
      id: 'researcher',
      name: 'Researcher',
      icon: '🔍',
      description: 'Save 20 scholarships',
      check: (stats) => stats.scholarshipsSaved >= 20
    },
    connector: {
      id: 'connector',
      name: 'Connector',
      icon: '🤝',
      description: 'Link with parents',
      check: (stats) => stats.parentsLinked >= 1
    }
  };

  const LOCAL_KEY = 'jasmine_badges';

  function getEarnedBadges() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveBadge(badgeId) {
    const earned = getEarnedBadges();
    if (!earned.includes(badgeId)) {
      earned.push(badgeId);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(earned));
      return true;
    }
    return false;
  }

  function getCurrentStats() {
    const profile = JSON.parse(localStorage.getItem('jasmine_profile') || '{}');
    const savedScholarships = JSON.parse(localStorage.getItem('jasmine_saved_scholarships') || '[]');
    const customScholarships = JSON.parse(localStorage.getItem('jasmine_custom_scholarships') || '[]');
    const essays = JSON.parse(localStorage.getItem('jasmine_essays') || '[]');
    const appliedIds = JSON.parse(localStorage.getItem('jasmine_applied_scholarships') || '[]');
    const awards = JSON.parse(localStorage.getItem('jasmine_awards_won') || '[]');
    const streak = parseInt(localStorage.getItem('jasmine_streak') || '0');
    const goals = JSON.parse(localStorage.getItem('jasmine_goals') || '{}');
    const parentsLinked = localStorage.getItem('jasmine_parent_linked') === 'true';

    const goalsCompleted = Object.values(goals).filter(v => v && v.length > 0).length;
    const essaysComplete = essays.filter(e => e.status === 'final' || e.status === 'submitted').length;

    return {
      profileComplete: !!(profile.firstName && profile.school),
      essaysWritten: essays.length,
      essaysComplete: essaysComplete,
      streak: streak,
      goalsCompleted: goalsCompleted,
      applicationsSubmitted: appliedIds.length,
      scholarshipsWon: awards.length,
      scholarshipsTracked: savedScholarships.length + customScholarships.length,
      scholarshipsSaved: savedScholarships.length,
      parentsLinked: parentsLinked ? 1 : 0,
      earlySubmissions: 0 // Would need deadline tracking
    };
  }

  function checkAndAwardBadges() {
    const stats = getCurrentStats();
    const earned = getEarnedBadges();
    const newBadges = [];

    for (const [badgeId, badge] of Object.entries(BADGE_DEFINITIONS)) {
      if (!earned.includes(badgeId) && badge.check(stats)) {
        if (saveBadge(badgeId)) {
          newBadges.push(badge);
        }
      }
    }

    return newBadges;
  }

  function showBadgeNotification(badge) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #fef3c7, #fde68a);
      color: #78350f;
      padding: 16px 24px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 10000;
      text-align: center;
      animation: slideDown 0.5s ease, fadeOut 0.5s ease 3s forwards;
    `;
    notification.innerHTML = `
      <div style="font-size: 2.5rem; margin-bottom: 8px;">${badge.icon}</div>
      <div style="font-weight: 800; font-size: 1.1rem;">Badge Unlocked!</div>
      <div style="font-weight: 700;">${badge.name}</div>
      <div style="font-size: 0.85rem; opacity: 0.8;">${badge.description}</div>
    `;

    document.body.appendChild(notification);

    // Add animation styles if not present
    if (!document.getElementById('badge-animations')) {
      const style = document.createElement('style');
      style.id = 'badge-animations';
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes fadeOut {
          to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => notification.remove(), 4000);
  }

  function renderBadgesGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const earned = getEarnedBadges();
    const badges = Object.values(BADGE_DEFINITIONS);

    container.innerHTML = badges.map(badge => {
      const isEarned = earned.includes(badge.id);
      return `
        <div class="badge-item ${isEarned ? '' : 'locked'}">
          <div class="badge-icon">${badge.icon}</div>
          <div class="badge-name">${badge.name}</div>
          <div class="badge-desc">${badge.description}</div>
        </div>
      `;
    }).join('');

    // Update counter if exists
    const counter = document.querySelector('[data-badge-counter]');
    if (counter) {
      counter.textContent = `${earned.length} / ${badges.length}`;
    }
  }

  // Check badges on key actions
  function onAction(actionType) {
    const newBadges = checkAndAwardBadges();
    newBadges.forEach(badge => {
      showBadgeNotification(badge);
      // Trigger confetti for first badge
      if (typeof celebrate === 'function') {
        celebrate();
      }
    });
    return newBadges;
  }

  return {
    getEarnedBadges,
    checkAndAwardBadges,
    onAction,
    renderBadgesGrid,
    BADGE_DEFINITIONS,
    getCurrentStats
  };
})();

// Auto-check badges on page load
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    BadgeService.checkAndAwardBadges();
  }, 2000);
});
