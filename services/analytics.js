/**
 * Analytics Service
 * Tracks user behavior, feature usage, clicks, and funnels
 * Data stored in localStorage with Supabase sync option
 */

const Analytics = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_analytics';
  const SESSION_KEY = 'jasmine_session';
  const MAX_EVENTS = 5000;

  let events = [];
  let session = null;

  function init() {
    loadEvents();
    initSession();
    trackPageView();
    setupClickTracking();
    setupVisibilityTracking();
  }

  function loadEvents() {
    try {
      events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      events = [];
    }
  }

  function saveEvents() {
    // Keep max events
    if (events.length > MAX_EVENTS) {
      events = events.slice(-MAX_EVENTS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function initSession() {
    const existingSession = sessionStorage.getItem(SESSION_KEY);
    if (existingSession) {
      session = JSON.parse(existingSession);
      session.pageViews++;
    } else {
      session = {
        id: generateId(),
        startedAt: new Date().toISOString(),
        pageViews: 1,
        clicks: 0,
        features: [],
        referrer: document.referrer || 'direct',
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      };
      track('session_start', { sessionId: session.id });
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  // ===========================================
  // CORE TRACKING
  // ===========================================

  function track(eventName, data = {}) {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().split('T')[0],
      sessionId: session?.id,
      url: window.location.pathname,
      ...data
    };

    events.push(event);
    saveEvents();

    // Debug log
    if (window.ANALYTICS_DEBUG) {
      console.log('[Analytics]', eventName, data);
    }
  }

  function trackPageView() {
    track('page_view', {
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer
    });
  }

  function trackFeature(featureName, action = 'used') {
    if (session && !session.features.includes(featureName)) {
      session.features.push(featureName);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    track('feature_' + action, { feature: featureName });
  }

  // ===========================================
  // CLICK TRACKING
  // ===========================================

  function setupClickTracking() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('button, a, [data-track], .btn, .card');
      if (!target) return;

      if (session) {
        session.clicks++;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }

      const trackData = {
        element: getElementIdentifier(target),
        text: (target.textContent || '').trim().substring(0, 50),
        classes: target.className,
        href: target.href || null,
        dataTrack: target.dataset.track || null
      };

      track('click', trackData);
    });
  }

  function getElementIdentifier(el) {
    if (el.id) return '#' + el.id;
    if (el.dataset.track) return '[data-track="' + el.dataset.track + '"]';
    if (el.className) {
      const classes = el.className.split(' ').filter(c => c && !c.startsWith('hover')).slice(0, 2).join('.');
      if (classes) return '.' + classes;
    }
    return el.tagName.toLowerCase();
  }

  // ===========================================
  // VISIBILITY / ENGAGEMENT TRACKING
  // ===========================================

  function setupVisibilityTracking() {
    let startTime = Date.now();
    let totalTime = 0;
    let isVisible = true;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        totalTime += Date.now() - startTime;
        isVisible = false;
      } else {
        startTime = Date.now();
        isVisible = true;
      }
    });

    window.addEventListener('beforeunload', () => {
      if (isVisible) {
        totalTime += Date.now() - startTime;
      }
      track('session_end', {
        duration: Math.round(totalTime / 1000),
        pageViews: session?.pageViews || 1,
        clicks: session?.clicks || 0,
        features: session?.features || []
      });
      saveEvents();
    });
  }

  // ===========================================
  // ASSESSMENT TRACKING
  // ===========================================

  function trackAssessmentStart() {
    track('assessment_start');
  }

  function trackAssessmentProgress(questionNumber, totalQuestions) {
    track('assessment_progress', {
      question: questionNumber,
      total: totalQuestions,
      percent: Math.round((questionNumber / totalQuestions) * 100)
    });
  }

  function trackAssessmentComplete(profile) {
    track('assessment_complete', {
      futureType: profile.type?.name,
      typeCode: profile.type?.code,
      topDimensions: profile.topDimensions?.slice(0, 3).map(d => d.label),
      duration: 0 // TODO: calculate from start
    });
  }

  // ===========================================
  // QUERIES / REPORTS
  // ===========================================

  function getEvents(filter = {}) {
    let filtered = [...events];

    if (filter.event) {
      filtered = filtered.filter(e => e.event === filter.event);
    }
    if (filter.date) {
      filtered = filtered.filter(e => e.date === filter.date);
    }
    if (filter.startDate) {
      filtered = filtered.filter(e => e.timestamp >= filter.startDate);
    }
    if (filter.endDate) {
      filtered = filtered.filter(e => e.timestamp <= filter.endDate);
    }

    return filtered;
  }

  function getDailyStats(days = 30) {
    const stats = {};
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      stats[dateStr] = {
        date: dateStr,
        pageViews: 0,
        sessions: new Set(),
        assessmentStarts: 0,
        assessmentCompletes: 0,
        shares: 0,
        clicks: 0
      };
    }

    events.forEach(e => {
      if (!stats[e.date]) return;

      if (e.event === 'page_view') stats[e.date].pageViews++;
      if (e.event === 'session_start') stats[e.date].sessions.add(e.sessionId);
      if (e.event === 'assessment_start') stats[e.date].assessmentStarts++;
      if (e.event === 'assessment_complete') stats[e.date].assessmentCompletes++;
      if (e.event === 'share_created') stats[e.date].shares++;
      if (e.event === 'click') stats[e.date].clicks++;
    });

    // Convert sets to counts
    Object.values(stats).forEach(s => {
      s.sessions = s.sessions.size;
    });

    return Object.values(stats).reverse();
  }

  function getClickStats() {
    const clicks = events.filter(e => e.event === 'click');
    const byElement = {};

    clicks.forEach(c => {
      const key = c.dataTrack || c.element || 'unknown';
      if (!byElement[key]) {
        byElement[key] = {
          element: key,
          text: c.text,
          count: 0,
          lastClicked: c.timestamp
        };
      }
      byElement[key].count++;
      if (c.timestamp > byElement[key].lastClicked) {
        byElement[key].lastClicked = c.timestamp;
      }
    });

    return Object.values(byElement).sort((a, b) => b.count - a.count);
  }

  function getFeatureStats() {
    const features = events.filter(e => e.event.startsWith('feature_'));
    const byFeature = {};

    features.forEach(f => {
      const name = f.feature;
      if (!byFeature[name]) {
        byFeature[name] = { feature: name, uses: 0, users: new Set() };
      }
      byFeature[name].uses++;
      if (f.sessionId) byFeature[name].users.add(f.sessionId);
    });

    Object.values(byFeature).forEach(f => {
      f.users = f.users.size;
    });

    return Object.values(byFeature).sort((a, b) => b.uses - a.uses);
  }

  function getAssessmentStats() {
    const starts = events.filter(e => e.event === 'assessment_start').length;
    const completes = events.filter(e => e.event === 'assessment_complete');

    // Type distribution
    const typeDistribution = {};
    completes.forEach(c => {
      const type = c.futureType || 'Unknown';
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    return {
      totalStarts: starts,
      totalCompletes: completes.length,
      completionRate: starts > 0 ? ((completes.length / starts) * 100).toFixed(1) + '%' : '0%',
      typeDistribution: Object.entries(typeDistribution)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    };
  }

  function getViralStats() {
    const shareCreated = events.filter(e => e.event === 'share_created').length;
    const shareStarted = events.filter(e => e.event === 'share_started').length;
    const shareCompleted = events.filter(e => e.event === 'share_completed').length;
    const linkOpened = events.filter(e => e.event === 'share_link_opened').length;
    const guestStarts = events.filter(e => e.event === 'guest_test_started').length;
    const guestCompletes = events.filter(e => e.event === 'guest_test_completed').length;
    const reShares = events.filter(e => e.event === 'share_created' && e.generation > 0).length;

    return {
      sharesCreated: shareCreated,
      shareAttempts: shareStarted,
      sharesCompleted: shareCompleted,
      linksOpened: linkOpened,
      guestTestStarts: guestStarts,
      guestTestCompletes: guestCompletes,
      reShares: reShares,
      shareRate: shareCreated > 0 ? ((shareStarted / shareCreated) * 100).toFixed(1) + '%' : '0%',
      openRate: shareCompleted > 0 ? ((linkOpened / shareCompleted) * 100).toFixed(1) + '%' : '0%',
      testStartRate: linkOpened > 0 ? ((guestStarts / linkOpened) * 100).toFixed(1) + '%' : '0%',
      testCompleteRate: guestStarts > 0 ? ((guestCompletes / guestStarts) * 100).toFixed(1) + '%' : '0%',
      viralCoeff: guestCompletes > 0 && shareCreated > 0 ? (reShares / shareCreated).toFixed(2) : '0.00'
    };
  }

  function getSessionStats() {
    const sessions = events.filter(e => e.event === 'session_end');

    if (sessions.length === 0) return { avgDuration: 0, avgPageViews: 0, avgClicks: 0 };

    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalPageViews = sessions.reduce((sum, s) => sum + (s.pageViews || 0), 0);
    const totalClicks = sessions.reduce((sum, s) => sum + (s.clicks || 0), 0);

    return {
      totalSessions: sessions.length,
      avgDuration: Math.round(totalDuration / sessions.length),
      avgPageViews: (totalPageViews / sessions.length).toFixed(1),
      avgClicks: (totalClicks / sessions.length).toFixed(1)
    };
  }

  function getSummary() {
    return {
      totalEvents: events.length,
      daily: getDailyStats(7),
      clicks: getClickStats().slice(0, 20),
      features: getFeatureStats(),
      assessment: getAssessmentStats(),
      viral: getViralStats(),
      sessions: getSessionStats()
    };
  }

  function exportData() {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      events: events,
      summary: getSummary()
    }, null, 2);
  }

  function clearData() {
    events = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  // Initialize
  if (typeof window !== 'undefined') {
    init();
  }

  return {
    track,
    trackFeature,
    trackPageView,
    trackAssessmentStart,
    trackAssessmentProgress,
    trackAssessmentComplete,
    getEvents,
    getDailyStats,
    getClickStats,
    getFeatureStats,
    getAssessmentStats,
    getViralStats,
    getSessionStats,
    getSummary,
    exportData,
    clearData
  };
})();

if (typeof window !== 'undefined') {
  window.Analytics = Analytics;
}
