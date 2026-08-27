/**
 * Weekly Report Service
 * Generate weekly progress summaries for students and parents
 */

const WeeklyReport = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_weekly_reports';
  const ACTIVITY_KEY = 'jasmine_weekly_activity';

  function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getWeekKey(date = new Date()) {
    const weekStart = getWeekStart(date);
    return weekStart.toISOString().split('T')[0];
  }

  function logActivity(type, details = {}) {
    const weekKey = getWeekKey();
    const activity = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}');

    if (!activity[weekKey]) {
      activity[weekKey] = {
        logins: 0,
        activeDays: new Set(),
        careersExplored: 0,
        scholarshipsSaved: 0,
        essayWork: 0,
        wyrAnswered: 0,
        profileProgress: 0,
        missionsCompleted: 0,
        badgesEarned: [],
        minutesActive: 0
      };
    }

    const today = new Date().toDateString();

    switch (type) {
      case 'login':
        activity[weekKey].logins++;
        activity[weekKey].activeDays = [...new Set([...(activity[weekKey].activeDays || []), today])];
        break;
      case 'career_explored':
        activity[weekKey].careersExplored++;
        break;
      case 'scholarship_saved':
        activity[weekKey].scholarshipsSaved++;
        break;
      case 'essay_work':
        activity[weekKey].essayWork += details.minutes || 1;
        break;
      case 'wyr_answered':
        activity[weekKey].wyrAnswered++;
        break;
      case 'profile_update':
        activity[weekKey].profileProgress += details.points || 1;
        break;
      case 'mission_completed':
        activity[weekKey].missionsCompleted++;
        break;
      case 'badge_earned':
        activity[weekKey].badgesEarned.push(details.badge);
        break;
      case 'active_time':
        activity[weekKey].minutesActive += details.minutes || 1;
        break;
    }

    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity));
  }

  function getWeekActivity(weekKey = getWeekKey()) {
    const activity = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '{}');
    return activity[weekKey] || {
      logins: 0,
      activeDays: [],
      careersExplored: 0,
      scholarshipsSaved: 0,
      essayWork: 0,
      wyrAnswered: 0,
      profileProgress: 0,
      missionsCompleted: 0,
      badgesEarned: [],
      minutesActive: 0
    };
  }

  function generateReport(weekKey = getWeekKey()) {
    const activity = getWeekActivity(weekKey);
    const weekStart = new Date(weekKey);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Get additional data
    const stats = typeof Engagement !== 'undefined' ? Engagement.getStats() : { xp: 0, level: 1 };
    const appStats = typeof ApplicationTracker !== 'undefined' ? ApplicationTracker.getStats() : { total: 0, submitted: 0 };
    const profile = typeof VyliumProfile !== 'undefined' ? VyliumProfile.getProfile() : null;

    const report = {
      weekKey,
      weekRange: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
      generatedAt: new Date().toISOString(),

      // Activity metrics
      activeDays: Array.isArray(activity.activeDays) ? activity.activeDays.length : 0,
      totalLogins: activity.logins,
      minutesActive: activity.minutesActive,

      // Progress metrics
      careersExplored: activity.careersExplored,
      scholarshipsSaved: activity.scholarshipsSaved,
      essayMinutes: activity.essayWork,
      wyrAnswered: activity.wyrAnswered,
      missionsCompleted: activity.missionsCompleted,
      badgesEarned: activity.badgesEarned || [],

      // Overall status
      currentLevel: stats.level,
      totalXP: stats.xp,
      totalBadges: stats.badgeCount || 0,
      applicationsInProgress: appStats.total,
      applicationsSubmitted: appStats.submitted,

      // Profile status
      profileComplete: profile?.isComplete || false,
      personalityType: profile?.personality?.name || null,

      // Insights
      insights: generateInsights(activity, stats, appStats),

      // Parent suggestions
      parentSuggestions: generateParentSuggestions(activity)
    };

    // Save report
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    reports[weekKey] = report;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));

    return report;
  }

  function generateInsights(activity, stats, appStats) {
    const insights = [];
    const activeDays = Array.isArray(activity.activeDays) ? activity.activeDays.length : 0;

    // Consistency insights
    if (activeDays >= 5) {
      insights.push({ type: 'success', text: '🔥 Amazing consistency! Active 5+ days this week.' });
    } else if (activeDays >= 3) {
      insights.push({ type: 'good', text: '👍 Good momentum! Active 3+ days.' });
    } else if (activeDays > 0) {
      insights.push({ type: 'encourage', text: '💪 Every day counts! Try for 3+ active days next week.' });
    }

    // Career exploration
    if (activity.careersExplored >= 5) {
      insights.push({ type: 'success', text: '🎯 Explored 5+ careers - great curiosity!' });
    }

    // Scholarship progress
    if (activity.scholarshipsSaved >= 3) {
      insights.push({ type: 'success', text: '💰 Saved 3+ scholarships - building a strong list!' });
    }

    // WYR engagement
    if (activity.wyrAnswered >= 7) {
      insights.push({ type: 'fun', text: '🎮 Would You Rather champion! 7+ answers this week.' });
    }

    // Badge achievements
    if (activity.badgesEarned && activity.badgesEarned.length > 0) {
      insights.push({ type: 'achievement', text: `🏆 Earned ${activity.badgesEarned.length} new badge(s)!` });
    }

    // Application progress
    if (appStats.submitted > 0) {
      insights.push({ type: 'milestone', text: `🚀 ${appStats.submitted} application(s) submitted!` });
    }

    return insights;
  }

  function generateParentSuggestions(activity) {
    const suggestions = [];
    const activeDays = Array.isArray(activity.activeDays) ? activity.activeDays.length : 0;

    if (activeDays >= 5) {
      suggestions.push({
        action: 'celebrate',
        text: "Your student was incredibly consistent this week! Consider acknowledging their effort.",
        prompt: "I noticed you've been really consistent with your future planning this week. I'm proud of the habit you're building."
      });
    }

    if (activity.careersExplored > 0) {
      suggestions.push({
        action: 'discuss',
        text: `Your student explored ${activity.careersExplored} career path(s).`,
        prompt: "What careers caught your attention this week? I'd love to hear what interested you."
      });
    }

    if (activity.scholarshipsSaved > 0) {
      suggestions.push({
        action: 'encourage',
        text: `${activity.scholarshipsSaved} scholarship(s) saved.`,
        prompt: "Nice job finding scholarships! You don't have to apply to all of them right away - saving good ones is progress."
      });
    }

    if (activeDays === 0) {
      suggestions.push({
        action: 'gentle-nudge',
        text: "No activity this week. Consider a gentle check-in.",
        prompt: "Hey, I noticed you haven't been on the scholarship app this week. Everything okay? No pressure, just checking in."
      });
    }

    return suggestions;
  }

  function getReport(weekKey) {
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return reports[weekKey];
  }

  function getAllReports() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  }

  function renderWeeklyReport(containerId, weekKey = getWeekKey()) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let report = getReport(weekKey);
    if (!report) {
      report = generateReport(weekKey);
    }

    container.innerHTML = `
      <div class="weekly-report">
        <div class="report-header">
          <h3>📊 Weekly Report</h3>
          <span class="report-date">${report.weekRange}</span>
        </div>

        <!-- Activity Summary -->
        <div class="report-stats-grid">
          <div class="report-stat">
            <div class="report-stat-value">${report.activeDays}</div>
            <div class="report-stat-label">Active Days</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-value">${report.careersExplored}</div>
            <div class="report-stat-label">Careers Explored</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-value">${report.scholarshipsSaved}</div>
            <div class="report-stat-label">Scholarships Saved</div>
          </div>
          <div class="report-stat">
            <div class="report-stat-value">${report.missionsCompleted}</div>
            <div class="report-stat-label">Missions Done</div>
          </div>
        </div>

        <!-- Level Progress -->
        <div class="report-level">
          <div class="level-badge">Level ${report.currentLevel}</div>
          <div class="xp-earned">+${report.totalXP} XP total</div>
        </div>

        <!-- Insights -->
        ${report.insights.length > 0 ? `
          <div class="report-insights">
            <h4>This Week's Highlights</h4>
            ${report.insights.map(insight => `
              <div class="insight-item insight-${insight.type}">
                ${insight.text}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Badges Earned -->
        ${report.badgesEarned.length > 0 ? `
          <div class="report-badges">
            <h4>🏆 Badges Earned</h4>
            <div class="badges-row">
              ${report.badgesEarned.map(b => `<span class="badge-mini">${b}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        <div class="report-footer">
          <button class="btn btn-secondary" onclick="WeeklyReport.shareReport('${weekKey}')">
            📤 Share Report
          </button>
        </div>
      </div>
    `;
  }

  function renderParentReport(containerId, weekKey = getWeekKey()) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let report = getReport(weekKey);
    if (!report) {
      report = generateReport(weekKey);
    }

    container.innerHTML = `
      <div class="parent-report">
        <div class="report-header">
          <h3>👨‍👩‍👧 Parent Weekly Update</h3>
          <span class="report-date">${report.weekRange}</span>
        </div>

        <!-- Quick Stats -->
        <div class="parent-stats">
          <div class="parent-stat">
            <span class="stat-emoji">📅</span>
            <span class="stat-text">${report.activeDays} active day${report.activeDays !== 1 ? 's' : ''}</span>
          </div>
          <div class="parent-stat">
            <span class="stat-emoji">🎯</span>
            <span class="stat-text">${report.careersExplored} career${report.careersExplored !== 1 ? 's' : ''} explored</span>
          </div>
          <div class="parent-stat">
            <span class="stat-emoji">💰</span>
            <span class="stat-text">${report.scholarshipsSaved} scholarship${report.scholarshipsSaved !== 1 ? 's' : ''} saved</span>
          </div>
          <div class="parent-stat">
            <span class="stat-emoji">📝</span>
            <span class="stat-text">${report.applicationsInProgress} application${report.applicationsInProgress !== 1 ? 's' : ''} in progress</span>
          </div>
        </div>

        <!-- Suggestions -->
        ${report.parentSuggestions.length > 0 ? `
          <div class="parent-suggestions">
            <h4>💡 Suggested Conversations</h4>
            ${report.parentSuggestions.map(suggestion => `
              <div class="suggestion-card">
                <div class="suggestion-context">${suggestion.text}</div>
                <div class="suggestion-prompt">
                  <span class="prompt-label">What to say:</span>
                  <span class="prompt-text">"${suggestion.prompt}"</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Encouragement Reminder -->
        <div class="encouragement-cta">
          <p>💌 Send an encouragement message to your student!</p>
          <button class="btn btn-primary" onclick="WeeklyReport.openEncouragementModal()">
            Send Encouragement
          </button>
        </div>
      </div>
    `;
  }

  function shareReport(weekKey) {
    const report = getReport(weekKey);
    if (!report) return;

    const text = `📊 My Week on Scholarship Hub:
• ${report.activeDays} active days
• ${report.careersExplored} careers explored
• ${report.scholarshipsSaved} scholarships saved
• Level ${report.currentLevel} (${report.totalXP} XP)
#ScholarshipHub #FuturePlanning`;

    if (navigator.share) {
      navigator.share({ title: 'My Weekly Report', text }).catch(() => {
        navigator.clipboard.writeText(text);
      });
    } else {
      navigator.clipboard.writeText(text);
      if (typeof Engagement !== 'undefined') {
        Engagement.showToast('Report copied!');
      }
    }
  }

  function openEncouragementModal() {
    const modal = document.createElement('div');
    modal.id = 'encouragement-modal';
    modal.innerHTML = `
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div style="background: var(--card); border-radius: 20px; width: 100%; max-width: 400px; padding: 24px;">
          <h3 style="margin: 0 0 16px;">💌 Send Encouragement</h3>
          <textarea id="encouragement-text" placeholder="Write your message of encouragement..." style="width: 100%; min-height: 120px; padding: 12px; border: 2px solid var(--border); border-radius: 12px; font-family: inherit; resize: vertical;"></textarea>
          <div style="display: flex; gap: 12px; margin-top: 16px;">
            <button onclick="document.getElementById('encouragement-modal').remove()" style="flex: 1; padding: 12px; background: var(--border); border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">Cancel</button>
            <button onclick="WeeklyReport.sendEncouragement()" style="flex: 1; padding: 12px; background: var(--jazz-purple); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">Send 💜</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function sendEncouragement() {
    const textarea = document.getElementById('encouragement-text');
    if (!textarea || !textarea.value.trim()) return;

    if (typeof Engagement !== 'undefined') {
      Engagement.addParentEncouragement(textarea.value.trim(), 'Parent');
      Engagement.showToast('Encouragement sent! 💜');
    }

    document.getElementById('encouragement-modal')?.remove();
  }

  return {
    logActivity,
    getWeekActivity,
    generateReport,
    getReport,
    getAllReports,
    renderWeeklyReport,
    renderParentReport,
    shareReport,
    openEncouragementModal,
    sendEncouragement
  };
})();
