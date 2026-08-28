/**
 * Engagement & Gamification Service
 * Phase 4: Badges, Missions, Shareable Cards, Parent Encouragement
 */

const Engagement = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_engagement';
  const MISSIONS_KEY = 'jasmine_missions';

  let state = {
    badges: [],
    xp: 0,
    level: 1,
    missionsCompleted: [],
    lastMissionDate: null,
    parentEncouragements: []
  };

  // Badge Definitions
  const BADGES = [
    // Getting Started
    { id: 'first_login', name: 'Welcome!', emoji: '👋', description: 'Logged in for the first time', xp: 10 },
    { id: 'profile_complete', name: 'All Set', emoji: '✅', description: 'Completed your profile', xp: 25 },
    { id: 'first_essay', name: 'Writer', emoji: '✍️', description: 'Started your first essay', xp: 20 },

    // Scholarship Progress
    { id: 'first_scholarship', name: 'Money Hunter', emoji: '💰', description: 'Saved your first scholarship', xp: 15 },
    { id: 'five_scholarships', name: 'Collector', emoji: '📚', description: 'Saved 5 scholarships', xp: 30 },
    { id: 'ten_scholarships', name: 'Treasure Hunter', emoji: '🏴‍☠️', description: 'Saved 10 scholarships', xp: 50 },
    { id: 'first_application', name: 'Go-Getter', emoji: '🚀', description: 'Marked first scholarship as applied', xp: 40 },

    // Engagement
    { id: 'wyr_streak_3', name: 'On a Roll', emoji: '🔥', description: '3-day WYR streak', xp: 20 },
    { id: 'wyr_streak_7', name: 'Weekly Warrior', emoji: '⚔️', description: '7-day WYR streak', xp: 50 },
    { id: 'wyr_streak_30', name: 'Monthly Master', emoji: '👑', description: '30-day WYR streak', xp: 150 },
    { id: 'wyr_50', name: 'Decision Maker', emoji: '🎯', description: 'Answered 50 WYR questions', xp: 40 },

    // Profile & Discovery
    { id: 'vylium_complete', name: 'Self-Aware', emoji: '🧠', description: 'Completed VYLIUM assessment', xp: 35 },
    { id: 'career_saver', name: 'Future Planner', emoji: '🎯', description: 'Saved 3 career paths', xp: 25 },
    { id: 'trade_explorer', name: 'Skilled Up', emoji: '🔧', description: 'Explored trade paths', xp: 20 },

    // Social & Sharing
    { id: 'shared_profile', name: 'Social Butterfly', emoji: '🦋', description: 'Shared your profile card', xp: 30 },
    { id: 'invited_friend', name: 'Connector', emoji: '🤝', description: 'Invited a friend', xp: 40 },

    // Essay Excellence
    { id: 'essay_ai_review', name: 'Polished', emoji: '💎', description: 'Got AI feedback on essay', xp: 25 },
    { id: 'essay_revised', name: 'Perfectionist', emoji: '🎨', description: 'Revised an essay 3+ times', xp: 35 },
    { id: 'essay_complete', name: 'Storyteller', emoji: '📖', description: 'Completed an essay draft', xp: 30 },

    // Milestones
    { id: 'level_5', name: 'Rising Star', emoji: '⭐', description: 'Reached Level 5', xp: 0 },
    { id: 'level_10', name: 'Superstar', emoji: '🌟', description: 'Reached Level 10', xp: 0 },
    { id: 'power_user', name: 'Power User', emoji: '💪', description: '7 consecutive days of activity', xp: 75 }
  ];

  // Daily Missions
  const MISSION_TEMPLATES = [
    { id: 'wyr_daily', name: 'Daily Dilemma', emoji: '🤔', description: 'Answer today\'s Would You Rather', xp: 15, action: 'wyr' },
    { id: 'explore_career', name: 'Career Scout', emoji: '🔭', description: 'Explore 3 career paths', xp: 20, action: 'careers' },
    { id: 'save_scholarship', name: 'Money Move', emoji: '💵', description: 'Save a new scholarship', xp: 15, action: 'scholarships' },
    { id: 'work_essay', name: 'Word Smith', emoji: '📝', description: 'Work on an essay for 10 minutes', xp: 25, action: 'essays' },
    { id: 'check_deadlines', name: 'Time Keeper', emoji: '⏰', description: 'Review upcoming deadlines', xp: 10, action: 'deadlines' },
    { id: 'profile_update', name: 'Fresh Look', emoji: '🔄', description: 'Update your profile', xp: 15, action: 'profile' }
  ];

  function init() {
    loadState();
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      state = { ...state, ...saved };
    } catch (e) {
      console.error('Engagement load error:', e);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function addXP(amount) {
    state.xp += amount;
    const newLevel = Math.floor(state.xp / 100) + 1;
    if (newLevel > state.level) {
      state.level = newLevel;
      showLevelUp(newLevel);
      if (newLevel === 5) awardBadge('level_5');
      if (newLevel === 10) awardBadge('level_10');
    }
    saveState();
  }

  function awardBadge(badgeId) {
    if (state.badges.includes(badgeId)) return false;

    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return false;

    state.badges.push(badgeId);
    if (badge.xp > 0) addXP(badge.xp);
    saveState();
    showBadgeNotification(badge);
    return true;
  }

  function hasBadge(badgeId) {
    return state.badges.includes(badgeId);
  }

  function showBadgeNotification(badge) {
    const notification = document.createElement('div');
    notification.className = 'badge-notification';
    notification.innerHTML = `
      <div class="badge-popup">
        <div class="badge-popup-emoji">${badge.emoji}</div>
        <div class="badge-popup-content">
          <div class="badge-popup-title">Badge Earned!</div>
          <div class="badge-popup-name">${badge.name}</div>
          <div class="badge-popup-desc">${badge.description}</div>
          <div class="badge-popup-xp">+${badge.xp} XP</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  function showLevelUp(level) {
    const notification = document.createElement('div');
    notification.className = 'level-notification';
    notification.innerHTML = `
      <div class="level-popup">
        <div class="level-popup-icon">🎉</div>
        <div class="level-popup-content">
          <div class="level-popup-title">Level Up!</div>
          <div class="level-popup-level">Level ${level}</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2500);
  }

  function getDailyMissions() {
    const today = new Date().toDateString();

    // Seed random with date for consistent daily missions
    const seed = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const shuffled = [...MISSION_TEMPLATES].sort(() =>
      Math.sin(seed * MISSION_TEMPLATES.indexOf(MISSION_TEMPLATES[0])) - 0.5
    );

    return shuffled.slice(0, 3).map(m => ({
      ...m,
      completed: state.missionsCompleted.includes(`${today}_${m.id}`)
    }));
  }

  function completeMission(missionId) {
    const today = new Date().toDateString();
    const key = `${today}_${missionId}`;

    if (state.missionsCompleted.includes(key)) return false;

    const mission = MISSION_TEMPLATES.find(m => m.id === missionId);
    if (!mission) return false;

    state.missionsCompleted.push(key);
    addXP(mission.xp);
    saveState();
    return true;
  }

  function getStats() {
    return {
      xp: state.xp,
      level: state.level,
      xpToNext: 100 - (state.xp % 100),
      xpProgress: state.xp % 100,
      badges: state.badges.map(id => BADGES.find(b => b.id === id)).filter(Boolean),
      badgeCount: state.badges.length,
      totalBadges: BADGES.length
    };
  }

  function renderXPBar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = getStats();
    container.innerHTML = `
      <div class="xp-bar-container">
        <div class="xp-level">Level ${stats.level}</div>
        <div class="xp-bar">
          <div class="xp-fill" style="width: ${stats.xpProgress}%"></div>
        </div>
        <div class="xp-text">${stats.xpProgress}/100 XP</div>
      </div>
    `;
  }

  function renderBadgeGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const earnedIds = state.badges;
    container.innerHTML = `
      <div class="badges-header">
        <h3>🏆 Your Badges</h3>
        <span class="badges-count">${earnedIds.length}/${BADGES.length}</span>
      </div>
      <div class="badges-grid">
        ${BADGES.map(badge => `
          <div class="badge-item ${earnedIds.includes(badge.id) ? 'earned' : 'locked'}">
            <span class="badge-emoji">${earnedIds.includes(badge.id) ? badge.emoji : '🔒'}</span>
            <span class="badge-name">${badge.name}</span>
            ${!earnedIds.includes(badge.id) ? `<span class="badge-hint">${badge.description}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderDailyMissions(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const missions = getDailyMissions();
    const completed = missions.filter(m => m.completed).length;

    container.innerHTML = `
      <div class="missions-header">
        <h3>📋 Daily Missions</h3>
        <span class="missions-progress">${completed}/3</span>
      </div>
      <div class="missions-list">
        ${missions.map(mission => `
          <div class="mission-item ${mission.completed ? 'completed' : ''}">
            <span class="mission-emoji">${mission.emoji}</span>
            <div class="mission-content">
              <div class="mission-name">${mission.name}</div>
              <div class="mission-desc">${mission.description}</div>
            </div>
            <div class="mission-reward">
              ${mission.completed ? '✅' : `+${mission.xp} XP`}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function generateShareableCard() {
    const stats = getStats();
    const profile = typeof VyliumProfile !== 'undefined' ? VyliumProfile.getProfile() : null;
    const savedCareers = typeof CareerDiscovery !== 'undefined' ? CareerDiscovery.getSavedCareers() : [];

    return {
      level: stats.level,
      badges: stats.badges.slice(0, 6),
      personality: profile?.personality || null,
      topCareers: savedCareers.slice(0, 3),
      xp: stats.xp
    };
  }

  function renderShareableCard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const data = generateShareableCard();

    container.innerHTML = `
      <div class="share-card">
        <div class="share-card-header">
          <div class="share-logo">✨</div>
          <div class="share-title">My Scholarship Journey</div>
        </div>
        <div class="share-card-body">
          <div class="share-level">
            <span class="share-level-badge">Level ${data.level}</span>
            <span class="share-xp">${data.xp} XP</span>
          </div>
          ${data.personality ? `
            <div class="share-personality">
              <span class="share-personality-emoji">${data.personality.emoji}</span>
              <span class="share-personality-name">${data.personality.name}</span>
            </div>
          ` : ''}
          ${data.badges.length > 0 ? `
            <div class="share-badges">
              ${data.badges.map(b => `<span class="share-badge">${b.emoji}</span>`).join('')}
            </div>
          ` : ''}
          ${data.topCareers.length > 0 ? `
            <div class="share-careers">
              <span class="share-careers-label">Exploring:</span>
              ${data.topCareers.map(c => `<span class="share-career">${c.emoji} ${c.name}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="share-card-footer">
          Built for my daughter and shared with the world
        </div>
      </div>
      <div class="share-actions">
        <button class="btn btn-share" onclick="Engagement.shareCard()">
          📤 Share My Journey
        </button>
      </div>
    `;
  }

  function shareCard() {
    const data = generateShareableCard();
    const text = `🎓 My Scholarship Journey: Level ${data.level} with ${data.xp} XP!${data.personality ? ` I'm ${data.personality.name}!` : ''} #ScholarshipHub`;

    if (navigator.share) {
      navigator.share({
        title: 'My Scholarship Journey',
        text: text,
        url: window.location.href
      }).catch(() => {
        copyToClipboard(text);
      });
    } else {
      copyToClipboard(text);
    }

    awardBadge('shared_profile');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!');
    });
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // Parent Encouragement System
  function addParentEncouragement(message, parentName = 'Parent') {
    state.parentEncouragements.push({
      message,
      parentName,
      date: new Date().toISOString(),
      read: false
    });
    saveState();
  }

  function getParentEncouragements() {
    return state.parentEncouragements;
  }

  function renderParentEncouragements(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const messages = getParentEncouragements();

    if (messages.length === 0) {
      container.innerHTML = `
        <div class="encouragements-empty">
          <span class="empty-icon">💌</span>
          <p>No messages yet! Parents can send you encouragement.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="encouragements-header">
        <h3>💌 Messages from Family</h3>
      </div>
      <div class="encouragements-list">
        ${messages.slice(-5).reverse().map(m => `
          <div class="encouragement-item ${m.read ? '' : 'unread'}">
            <div class="encouragement-from">${m.parentName}</div>
            <div class="encouragement-message">"${m.message}"</div>
            <div class="encouragement-date">${new Date(m.date).toLocaleDateString()}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Check and award badges based on current state
  function checkBadges() {
    // WYR badges
    if (typeof WouldYouRather !== 'undefined') {
      const wyrStats = WouldYouRather.getStats();
      if (wyrStats.streak >= 3) awardBadge('wyr_streak_3');
      if (wyrStats.streak >= 7) awardBadge('wyr_streak_7');
      if (wyrStats.streak >= 30) awardBadge('wyr_streak_30');
      if (wyrStats.totalAnswered >= 50) awardBadge('wyr_50');
    }

    // VYLIUM badge
    if (typeof VyliumProfile !== 'undefined') {
      const profile = VyliumProfile.getProfile();
      if (profile && profile.completed) awardBadge('vylium_complete');
    }

    // Career badges
    if (typeof CareerDiscovery !== 'undefined') {
      const saved = CareerDiscovery.getSavedCareers();
      if (saved.length >= 3) awardBadge('career_saver');
    }
  }

  init();

  return {
    addXP,
    awardBadge,
    hasBadge,
    completeMission,
    getDailyMissions,
    getStats,
    checkBadges,
    renderXPBar,
    renderBadgeGrid,
    renderDailyMissions,
    renderShareableCard,
    shareCard,
    addParentEncouragement,
    getParentEncouragements,
    renderParentEncouragements,
    showToast,
    BADGES
  };
})();
