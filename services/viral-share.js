/**
 * Viral Share Service
 * Secure share tokens, public result retrieval, guest sessions, analytics
 *
 * Core Loop: Take Test → Get Future Type → Share Result → Friend Opens → Friend Takes Test → Compare → Challenge
 */

const ViralShare = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_viral_share';
  const GUEST_SESSION_KEY = 'jasmine_guest_session';
  const SHARE_ANALYTICS_KEY = 'jasmine_share_analytics';

  // Share token format: 22 chars, URL-safe, cryptographically random
  function generateShareToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(22);
    crypto.getRandomValues(array);
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  }

  // ===========================================
  // SHARE TOKEN MANAGEMENT
  // ===========================================

  let state = {
    myShares: [],
    referredBy: null,
    guestSession: null
  };

  function init() {
    loadState();
    checkReferralParam();
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      state = { ...state, ...saved };

      // Load guest session
      const guestData = localStorage.getItem(GUEST_SESSION_KEY);
      if (guestData) {
        state.guestSession = JSON.parse(guestData);
      }
    } catch (e) {
      console.error('ViralShare load error:', e);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function saveGuestSession() {
    if (state.guestSession) {
      localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(state.guestSession));
    }
  }

  // Check URL for referral token
  function checkReferralParam() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('t') || params.get('share');
    if (token && !state.referredBy) {
      state.referredBy = {
        token,
        timestamp: new Date().toISOString()
      };
      saveState();
      trackEvent('share_link_opened', { token });
    }
    return token;
  }

  // ===========================================
  // CREATE SHARE (after completing Future Type)
  // ===========================================

  function createShare(options = {}) {
    const profile = typeof VyliumProfile !== 'undefined' ? VyliumProfile.getProfile() : null;
    if (!profile || !profile.type) {
      console.warn('Cannot create share: profile not complete');
      return null;
    }

    const token = generateShareToken();
    const shareData = {
      token,
      createdAt: new Date().toISOString(),
      isActive: true,

      // Public-safe data only
      futureType: profile.type.name,
      typeEmoji: profile.type.emoji,
      typeCode: profile.type.code,
      typeDescription: profile.type.description,

      // Top traits (safe to share)
      topTraits: profile.topDimensions.slice(0, 3).map(d => ({
        label: d.label,
        name: d.name,
        percent: profile.percentages[d.code]
      })),

      // Privacy settings
      showFirstName: options.showFirstName || false,
      firstName: options.showFirstName ? (options.firstName || '') : null,

      // Analytics
      shareCount: 0,
      openCount: 0,
      testStartCount: 0,
      testCompleteCount: 0,
      generation: options.generation || 0,
      parentShareToken: options.parentShareToken || null
    };

    state.myShares.push(shareData);
    saveState();

    trackEvent('share_created', {
      token,
      futureType: shareData.futureType,
      generation: shareData.generation
    });

    return shareData;
  }

  function getMyShares() {
    return state.myShares.filter(s => s.isActive);
  }

  function getShareByToken(token) {
    return state.myShares.find(s => s.token === token);
  }

  function disableShare(token) {
    const share = getShareByToken(token);
    if (share) {
      share.isActive = false;
      saveState();
      return true;
    }
    return false;
  }

  function getLatestShare() {
    const active = getMyShares();
    return active.length > 0 ? active[active.length - 1] : null;
  }

  // ===========================================
  // SHARE URLS AND MESSAGES
  // ===========================================

  function getShareUrl(token) {
    const base = window.location.origin;
    return `${base}/share.html?t=${token}`;
  }

  function getShortShareUrl(token) {
    const base = window.location.origin;
    return `${base}/t/${token}`;
  }

  function getDefaultShareMessage(share) {
    if (!share) return '';
    return `I got ${share.futureType}. Take this and see what you get.`;
  }

  function getChallengeMessage(share) {
    if (!share) return '';
    return `Think you'll get the same result as me? I got ${share.futureType}.`;
  }

  function getFriendshipMessage(share) {
    if (!share) return '';
    return `Let's see how similar we actually are. I'm ${share.futureType}.`;
  }

  // ===========================================
  // NATIVE SHARE
  // ===========================================

  async function shareNative(share, messageType = 'default') {
    if (!share) {
      share = getLatestShare() || createShare();
    }
    if (!share) return false;

    const url = getShareUrl(share.token);
    let text;

    switch (messageType) {
      case 'challenge':
        text = getChallengeMessage(share);
        break;
      case 'friendship':
        text = getFriendshipMessage(share);
        break;
      default:
        text = getDefaultShareMessage(share);
    }

    trackEvent('share_started', { token: share.token, messageType });

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'What Future Type are you?',
          text: text,
          url: url
        });
        share.shareCount++;
        saveState();
        trackEvent('share_completed', { token: share.token });

        // Award badge
        if (typeof Engagement !== 'undefined') {
          Engagement.awardBadge('shared_profile');
        }
        return true;
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.warn('Share failed:', e);
        }
      }
    }

    // Fallback: copy to clipboard
    const fullText = `${text}\n${url}`;
    try {
      await navigator.clipboard.writeText(fullText);
      showToast('Link copied!');
      trackEvent('share_link_copied', { token: share.token });
      return true;
    } catch (e) {
      console.error('Copy failed:', e);
      return false;
    }
  }

  // ===========================================
  // GUEST SESSION (No account required)
  // ===========================================

  function startGuestSession(referralToken = null) {
    const sessionId = generateShareToken();
    state.guestSession = {
      sessionId,
      startedAt: new Date().toISOString(),
      referralToken,
      referralData: null,
      testStarted: false,
      testCompleted: false,
      profile: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    saveGuestSession();
    trackEvent('guest_session_started', { sessionId, hasReferral: !!referralToken });
    return state.guestSession;
  }

  function getGuestSession() {
    if (!state.guestSession) return null;

    // Check expiration
    if (new Date(state.guestSession.expiresAt) < new Date()) {
      clearGuestSession();
      return null;
    }

    return state.guestSession;
  }

  function updateGuestSession(updates) {
    if (!state.guestSession) return null;
    state.guestSession = { ...state.guestSession, ...updates };
    saveGuestSession();
    return state.guestSession;
  }

  function clearGuestSession() {
    state.guestSession = null;
    localStorage.removeItem(GUEST_SESSION_KEY);
  }

  function isGuestMode() {
    return !!getGuestSession() && !isAuthenticated();
  }

  function isAuthenticated() {
    return typeof SupabaseAuth !== 'undefined' && SupabaseAuth.isAuthenticated();
  }

  // Convert guest to full account (preserve results)
  async function convertGuestToAccount(email, password) {
    const guest = getGuestSession();
    if (!guest || !guest.testCompleted) {
      throw new Error('No guest session to convert');
    }

    // Sign up
    if (typeof SupabaseAuth !== 'undefined') {
      await SupabaseAuth.signUp(email, password, {
        guest_session_id: guest.sessionId,
        future_type: guest.profile?.type?.name,
        referred_by: guest.referralToken
      });

      trackEvent('account_created', {
        fromGuest: true,
        referralToken: guest.referralToken
      });

      // Profile is already in VyliumProfile localStorage, will persist
      clearGuestSession();
      return true;
    }

    return false;
  }

  // ===========================================
  // REFERRAL DATA (for landing page)
  // ===========================================

  function getReferralData(token) {
    // In a real implementation, this would fetch from Supabase
    // For now, check localStorage for local shares
    const localShare = state.myShares.find(s => s.token === token);
    if (localShare) {
      return {
        futureType: localShare.futureType,
        typeEmoji: localShare.typeEmoji,
        topTraits: localShare.topTraits,
        firstName: localShare.showFirstName ? localShare.firstName : null,
        isValid: localShare.isActive
      };
    }

    // Check if we have cached referral data
    if (state.referredBy && state.referredBy.token === token && state.referredBy.data) {
      return state.referredBy.data;
    }

    return null;
  }

  function setReferralData(token, data) {
    if (!state.referredBy) {
      state.referredBy = { token, timestamp: new Date().toISOString() };
    }
    state.referredBy.data = data;
    saveState();
  }

  // ===========================================
  // COMPARISON
  // ===========================================

  function compareResults(myProfile, referralData) {
    if (!myProfile || !referralData) return null;

    const comparison = {
      myType: myProfile.type?.name,
      myEmoji: myProfile.type?.emoji,
      theirType: referralData.futureType,
      theirEmoji: referralData.typeEmoji,
      theirName: referralData.firstName,
      similarities: [],
      differences: [],
      compatibilityScore: 50 // Base score
    };

    // Compare top traits
    const myTraits = myProfile.topDimensions.map(d => d.label);
    const theirTraits = referralData.topTraits.map(t => t.label);

    const sharedTraits = myTraits.filter(t => theirTraits.includes(t));
    const myUnique = myTraits.filter(t => !theirTraits.includes(t));
    const theirUnique = theirTraits.filter(t => !myTraits.includes(t));

    if (sharedTraits.length > 0) {
      comparison.similarities.push(`You both are ${sharedTraits.join(' and ')}`);
      comparison.compatibilityScore += sharedTraits.length * 15;
    }

    if (myUnique.length > 0 && theirUnique.length > 0) {
      comparison.differences.push(`You bring ${myUnique[0]} energy, they bring ${theirUnique[0]}`);
    }

    // Same type bonus
    if (comparison.myType === comparison.theirType) {
      comparison.similarities.unshift('You got the same Future Type!');
      comparison.compatibilityScore += 25;
    }

    comparison.compatibilityScore = Math.min(100, comparison.compatibilityScore);

    return comparison;
  }

  // ===========================================
  // ANALYTICS
  // ===========================================

  function trackEvent(eventName, data = {}) {
    const event = {
      event: eventName,
      timestamp: new Date().toISOString(),
      ...data
    };

    // Store locally for now
    const analytics = JSON.parse(localStorage.getItem(SHARE_ANALYTICS_KEY) || '[]');
    analytics.push(event);

    // Keep last 1000 events
    if (analytics.length > 1000) {
      analytics.splice(0, analytics.length - 1000);
    }

    localStorage.setItem(SHARE_ANALYTICS_KEY, JSON.stringify(analytics));

    // Log for debugging
    console.log('[ViralShare]', eventName, data);
  }

  function getAnalytics() {
    return JSON.parse(localStorage.getItem(SHARE_ANALYTICS_KEY) || '[]');
  }

  function getFunnelStats() {
    const events = getAnalytics();
    const stats = {
      sharesCreated: events.filter(e => e.event === 'share_created').length,
      shareStarted: events.filter(e => e.event === 'share_started').length,
      shareCompleted: events.filter(e => e.event === 'share_completed').length,
      linksOpened: events.filter(e => e.event === 'share_link_opened').length,
      guestSessionsStarted: events.filter(e => e.event === 'guest_session_started').length,
      guestTestsStarted: events.filter(e => e.event === 'guest_test_started').length,
      guestTestsCompleted: events.filter(e => e.event === 'guest_test_completed').length,
      comparisonsViewed: events.filter(e => e.event === 'comparison_viewed').length,
      reShares: events.filter(e => e.event === 'share_created' && e.generation > 0).length,
      accountsCreated: events.filter(e => e.event === 'account_created').length
    };

    // Calculate rates
    stats.shareRate = stats.sharesCreated > 0 ? (stats.shareStarted / stats.sharesCreated * 100).toFixed(1) + '%' : '0%';
    stats.openRate = stats.shareCompleted > 0 ? (stats.linksOpened / stats.shareCompleted * 100).toFixed(1) + '%' : '0%';
    stats.testStartRate = stats.linksOpened > 0 ? (stats.guestTestsStarted / stats.linksOpened * 100).toFixed(1) + '%' : '0%';
    stats.testCompleteRate = stats.guestTestsStarted > 0 ? (stats.guestTestsCompleted / stats.guestTestsStarted * 100).toFixed(1) + '%' : '0%';
    stats.reShareRate = stats.guestTestsCompleted > 0 ? (stats.reShares / stats.guestTestsCompleted * 100).toFixed(1) + '%' : '0%';

    return stats;
  }

  // ===========================================
  // UI HELPERS
  // ===========================================

  function showToast(message) {
    if (typeof Engagement !== 'undefined' && Engagement.showToast) {
      Engagement.showToast(message);
    } else {
      const toast = document.createElement('div');
      toast.className = 'toast-notification show';
      toast.textContent = message;
      toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1f2937;color:white;padding:12px 24px;border-radius:25px;z-index:10000;font-weight:600;';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    }
  }

  // ===========================================
  // SHARE RESULT PAGE RENDERER
  // ===========================================

  function renderShareResult(containerId, onShare) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const profile = typeof VyliumProfile !== 'undefined' ? VyliumProfile.getProfile() : null;
    if (!profile || !profile.type) {
      container.innerHTML = '<p>Complete your assessment first!</p>';
      return;
    }

    const type = profile.type;
    const topTraits = profile.topDimensions.slice(0, 4);

    container.innerHTML = `
      <div class="share-result-page">
        <!-- Type Reveal -->
        <div class="type-reveal-card">
          <div class="type-emoji-large">${type.emoji}</div>
          <div class="type-name-large">${type.name}</div>
          <div class="type-tagline">${type.description}</div>
        </div>

        <!-- Top Traits -->
        <div class="traits-section">
          <h3 class="traits-heading">Your Strongest Traits</h3>
          <div class="traits-bars">
            ${topTraits.map(t => `
              <div class="trait-bar-item">
                <div class="trait-bar-header">
                  <span class="trait-bar-label">${t.label}</span>
                  <span class="trait-bar-percent">${profile.percentages[t.code]}%</span>
                </div>
                <div class="trait-bar-track">
                  <div class="trait-bar-fill" style="width: ${profile.percentages[t.code]}%; background: ${t.color}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Career Directions -->
        ${profile.careerClusters && profile.careerClusters.length > 0 ? `
          <div class="directions-section">
            <h3 class="directions-heading">Potential Directions</h3>
            <div class="directions-tags">
              ${profile.careerClusters.slice(0, 5).map(c => `<span class="direction-tag">${c}</span>`).join('')}
            </div>
            <p class="directions-note">Directions that may fit your interests and strengths</p>
          </div>
        ` : ''}

        <!-- Primary Share CTA -->
        <div class="share-cta-section">
          <button class="btn-share-primary" id="share-result-btn">
            <span class="share-icon">📤</span>
            <span class="share-text">Share My Result</span>
          </button>
          <p class="share-subtext">Challenge a friend to see what they get!</p>
        </div>

        <!-- Privacy Note -->
        <div class="share-privacy-note">
          <span class="privacy-icon">🔒</span>
          <span>Only your Future Type and traits are shared. No personal info.</span>
        </div>

        <!-- Disclaimer -->
        <div class="result-disclaimer">
          This result is designed for self-reflection and exploration. It is not a clinical or psychological diagnosis.
        </div>
      </div>
    `;

    // Attach share handler
    const shareBtn = container.querySelector('#share-result-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const share = createShare();
        const success = await shareNative(share);
        if (success && onShare) {
          onShare(share);
        }
      });
    }
  }

  // ===========================================
  // COMPARISON PAGE RENDERER
  // ===========================================

  function renderComparison(containerId, myProfile, referralData, onChallenge) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const comparison = compareResults(myProfile, referralData);
    if (!comparison) {
      container.innerHTML = '<p>Could not load comparison.</p>';
      return;
    }

    trackEvent('comparison_viewed', {
      myType: comparison.myType,
      theirType: comparison.theirType,
      score: comparison.compatibilityScore
    });

    const friendLabel = comparison.theirName || 'Your Friend';

    container.innerHTML = `
      <div class="comparison-page">
        <!-- Header -->
        <div class="comparison-header">
          <h2>You + ${friendLabel}</h2>
        </div>

        <!-- Type Cards Side by Side -->
        <div class="comparison-types">
          <div class="comparison-type-card">
            <div class="comparison-type-emoji">${comparison.theirEmoji}</div>
            <div class="comparison-type-label">${friendLabel}</div>
            <div class="comparison-type-name">${comparison.theirType}</div>
          </div>
          <div class="comparison-vs">VS</div>
          <div class="comparison-type-card highlight">
            <div class="comparison-type-emoji">${comparison.myEmoji}</div>
            <div class="comparison-type-label">You</div>
            <div class="comparison-type-name">${comparison.myType}</div>
          </div>
        </div>

        <!-- Compatibility Score -->
        <div class="compatibility-section">
          <div class="compatibility-score">${comparison.compatibilityScore}%</div>
          <div class="compatibility-label">Similarity</div>
        </div>

        <!-- Similarities -->
        ${comparison.similarities.length > 0 ? `
          <div class="comparison-section">
            <h3 class="comparison-section-title">What You Share</h3>
            <ul class="comparison-list">
              ${comparison.similarities.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Differences -->
        ${comparison.differences.length > 0 ? `
          <div class="comparison-section">
            <h3 class="comparison-section-title">Your Differences</h3>
            <ul class="comparison-list differences">
              ${comparison.differences.map(d => `<li>${d}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Challenge CTA -->
        <div class="challenge-section">
          <h3 class="challenge-heading">Challenge a Friend</h3>
          <p class="challenge-subtext">Who in your group is most different from you?</p>
          <button class="btn-challenge" id="challenge-friend-btn">
            <span>🎯</span>
            <span>Challenge a Friend</span>
          </button>
        </div>

        <!-- Continue to App -->
        <div class="continue-section">
          <h3>Turn Your Result Into a Future Plan</h3>
          <p>Build a free profile to see scholarships, colleges, and careers matched to you.</p>
          <button class="btn-continue" id="build-profile-btn">
            Build My Future Profile
          </button>
          <button class="btn-skip" id="skip-profile-btn">
            Not now
          </button>
        </div>
      </div>
    `;

    // Challenge handler
    const challengeBtn = container.querySelector('#challenge-friend-btn');
    if (challengeBtn) {
      challengeBtn.addEventListener('click', async () => {
        const referralToken = state.referredBy?.token;
        const share = createShare({
          generation: (referralData.generation || 0) + 1,
          parentShareToken: referralToken
        });
        await shareNative(share, 'challenge');
        if (onChallenge) onChallenge(share);
      });
    }

    // Build profile handler
    const buildBtn = container.querySelector('#build-profile-btn');
    if (buildBtn) {
      buildBtn.addEventListener('click', () => {
        trackEvent('account_cta_viewed');
        // Navigate to main app / signup
        window.location.href = '/index.html?signup=true';
      });
    }

    // Skip handler
    const skipBtn = container.querySelector('#skip-profile-btn');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        trackEvent('account_cta_skipped');
        // Just close or navigate home
        window.location.href = '/index.html';
      });
    }
  }

  // Initialize
  init();

  return {
    // Core functions
    generateShareToken,
    createShare,
    getMyShares,
    getShareByToken,
    getLatestShare,
    disableShare,

    // Share URLs and messages
    getShareUrl,
    getShortShareUrl,
    getDefaultShareMessage,
    getChallengeMessage,
    getFriendshipMessage,

    // Native sharing
    shareNative,

    // Guest mode
    startGuestSession,
    getGuestSession,
    updateGuestSession,
    clearGuestSession,
    isGuestMode,
    convertGuestToAccount,

    // Referral
    checkReferralParam,
    getReferralData,
    setReferralData,

    // Comparison
    compareResults,

    // Analytics
    trackEvent,
    getAnalytics,
    getFunnelStats,

    // UI
    showToast,
    renderShareResult,
    renderComparison
  };
})();

if (typeof window !== 'undefined') {
  window.ViralShare = ViralShare;
}
