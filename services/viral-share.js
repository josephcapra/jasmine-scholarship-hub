/**
 * Viral Share Service
 * Secure share tokens, public result retrieval, guest sessions, analytics
 *
 * Core Loop: Take Test → Get Vylium Type → Share Result → Friend Opens → Friend Takes Test → Compare → Challenge
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
  // CREATE SHARE (after completing Vylium Personality Test)
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

      // Top traits (safe to share) - now uses 0-100 normalized scores
      topTraits: profile.topDimensions.slice(0, 3).map(d => ({
        label: d.label,
        name: d.name,
        score: d.score,
        color: d.color
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
          title: 'What Vylium Type are you?',
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
      comparison.similarities.unshift('You got the same Vylium Type!');
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
                  <span class="trait-bar-score">${t.score}</span>
                </div>
                <div class="trait-bar-track">
                  <div class="trait-bar-fill" style="width: ${t.score}%; background: ${t.color}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Career Directions -->
        ${profile.careerSuggestions && profile.careerSuggestions.length > 0 ? `
          <div class="directions-section">
            <h3 class="directions-heading">Careers Worth Exploring</h3>
            <div class="directions-tags">
              ${profile.careerSuggestions.slice(0, 5).map(c => `<span class="direction-tag">${c}</span>`).join('')}
            </div>
            <p class="directions-note">Starting points based on your profile, not predictions</p>
          </div>
        ` : ''}

        <!-- Primary Share CTA -->
        <div class="share-cta-section">
          <button class="btn-share-primary" id="share-result-btn">
            <span class="share-icon">📤</span>
            <span class="share-text">Share & Challenge a Friend</span>
          </button>
          <p class="share-subtext">See if they get the same result!</p>
        </div>

        <!-- VIRAL CONVERSION SECTION -->
        <div style="background:linear-gradient(180deg, var(--bg) 0%, rgba(124,58,237,0.08) 100%);padding:40px 20px 60px;text-align:center;">
          <h2 style="font-size:1.6rem;font-weight:800;margin-bottom:8px;color:var(--text);">Now turn this into action</h2>
          <p style="color:var(--muted);font-size:1rem;margin-bottom:32px;">Your Vylium Type unlocks scholarships & opportunities matched to YOU</p>

          <!-- Value Props -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:400px;margin:0 auto 32px;">
            <div style="background:var(--card);border:2px solid var(--border);border-radius:16px;padding:20px 16px;text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">💰</div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:4px;">AI Scholarship Match</div>
              <div style="font-size:0.75rem;color:var(--muted);line-height:1.3;">Find scholarships that fit YOUR profile</div>
            </div>
            <div style="background:var(--card);border:2px solid var(--border);border-radius:16px;padding:20px 16px;text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">📝</div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:4px;">Essay Builder</div>
              <div style="font-size:0.75rem;color:var(--muted);line-height:1.3;">AI-powered help for winning essays</div>
            </div>
            <div style="background:var(--card);border:2px solid var(--border);border-radius:16px;padding:20px 16px;text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">🎯</div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:4px;">Goal Tracker</div>
              <div style="font-size:0.75rem;color:var(--muted);line-height:1.3;">Never miss a deadline</div>
            </div>
            <div style="background:var(--card);border:2px solid var(--border);border-radius:16px;padding:20px 16px;text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">📊</div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:4px;">Progress Reports</div>
              <div style="font-size:0.75rem;color:var(--muted);line-height:1.3;">See growth over time</div>
            </div>
          </div>

          <!-- Social Proof -->
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;color:var(--muted);font-size:0.85rem;margin-bottom:24px;">
            <div style="display:flex;">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:700;border:2px solid var(--card);">J</div>
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:700;margin-left:-8px;border:2px solid var(--card);">M</div>
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:700;margin-left:-8px;border:2px solid var(--card);">S</div>
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:700;margin-left:-8px;border:2px solid var(--card);">+</div>
            </div>
            <span>Students are finding scholarships matched to them</span>
          </div>

          <!-- Dual CTAs -->
          <div style="display:flex;flex-direction:column;gap:12px;max-width:320px;margin:0 auto 24px;">
            <button id="result-student-signup-btn" style="display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;font-size:1.1rem;font-weight:800;padding:18px 24px;border:none;border-radius:50px;cursor:pointer;width:100%;">
              <span>🎓</span>
              <span>I'm a Student - Sign Up Free</span>
            </button>
            <button id="result-parent-signup-btn" style="display:flex;align-items:center;justify-content:center;gap:10px;background:var(--card);color:#7c3aed;font-size:1rem;font-weight:700;padding:16px 24px;border:2px solid #7c3aed;border-radius:50px;cursor:pointer;width:100%;">
              <span>👨‍👩‍👧</span>
              <span>I'm a Parent - Track My Child</span>
            </button>
          </div>

          <!-- Free Badge -->
          <div style="display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;color:#065f46;padding:8px 16px;border-radius:20px;font-size:0.85rem;font-weight:700;">
            <span>✓</span>
            <span>100% Free • No Credit Card</span>
          </div>

          <!-- Benefits List -->
          <div style="max-width:300px;margin:24px auto 0;text-align:left;">
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;font-size:0.9rem;color:var(--text);">
              <span style="color:#10b981;font-weight:700;">✓</span>
              <span>Search thousands of scholarships</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;font-size:0.9rem;color:var(--text);">
              <span style="color:#10b981;font-weight:700;">✓</span>
              <span>AI chatbot answers your questions</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;font-size:0.9rem;color:var(--text);">
              <span style="color:#10b981;font-weight:700;">✓</span>
              <span>Parents get weekly progress reports</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;font-size:0.9rem;color:var(--text);">
              <span style="color:#10b981;font-weight:700;">✓</span>
              <span>Upload resume, we extract your profile</span>
            </div>
          </div>
        </div>

        <!-- Privacy Note -->
        <div style="padding: 16px 20px; text-align: center; color: var(--muted); font-size: 0.85rem;">
          <span class="privacy-icon">🔒</span>
          <span>Only your Vylium Type and traits are shared. No personal info.</span>
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

    // Student signup handler (from result page)
    const studentBtn = container.querySelector('#result-student-signup-btn');
    if (studentBtn) {
      studentBtn.addEventListener('click', () => {
        trackEvent('student_signup_clicked', { source: 'share_result' });
        window.location.href = '/index.html?signup=student';
      });
    }

    // Parent signup handler (from result page)
    const parentBtn = container.querySelector('#result-parent-signup-btn');
    if (parentBtn) {
      parentBtn.addEventListener('click', () => {
        trackEvent('parent_signup_clicked', { source: 'share_result' });
        window.location.href = '/parents.html?signup=true';
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

        <!-- VIRAL CONVERSION SECTION -->
        <div class="conversion-section">
          <h2 class="conversion-headline">Your Vylium Type is just the start</h2>
          <p class="conversion-subline">Turn this into a roadmap for scholarships, colleges & careers</p>

          <!-- Value Props -->
          <div class="value-props" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:400px;margin:0 auto 32px;">
            <div class="value-prop" style="background:var(--card);border:2px solid var(--border);border-radius:16px;padding:20px 16px;text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">💰</div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:4px;">AI Scholarship Match</div>
              <div style="font-size:0.75rem;color:var(--muted);line-height:1.3;">Find scholarships that fit YOUR profile</div>
            </div>
            <div class="value-prop" style="background:var(--card);border:2px solid var(--border);border-radius:16px;padding:20px 16px;text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">📝</div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:4px;">Essay Builder</div>
              <div style="font-size:0.75rem;color:var(--muted);line-height:1.3;">AI-powered help for winning essays</div>
            </div>
            <div class="value-prop" style="background:var(--card);border:2px solid var(--border);border-radius:16px;padding:20px 16px;text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">🎯</div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:4px;">Goal Tracker</div>
              <div style="font-size:0.75rem;color:var(--muted);line-height:1.3;">Never miss a deadline</div>
            </div>
            <div class="value-prop" style="background:var(--card);border:2px solid var(--border);border-radius:16px;padding:20px 16px;text-align:center;">
              <div style="font-size:2rem;margin-bottom:8px;">📊</div>
              <div style="font-size:0.9rem;font-weight:700;color:var(--text);margin-bottom:4px;">Progress Reports</div>
              <div style="font-size:0.75rem;color:var(--muted);line-height:1.3;">See growth over time</div>
            </div>
          </div>

          <!-- Social Proof -->
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;color:var(--muted);font-size:0.85rem;margin-bottom:24px;">
            <div style="display:flex;">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:700;border:2px solid var(--card);">J</div>
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:700;margin-left:-8px;border:2px solid var(--card);">M</div>
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:700;margin-left:-8px;border:2px solid var(--card);">S</div>
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#ec4899);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:white;font-weight:700;margin-left:-8px;border:2px solid var(--card);">+</div>
            </div>
            <span>Students are finding scholarships matched to them</span>
          </div>

          <!-- Dual CTAs -->
          <div style="display:flex;flex-direction:column;gap:12px;max-width:320px;margin:0 auto 24px;">
            <button class="btn-cta-student" id="student-signup-btn" style="display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:white;font-size:1.1rem;font-weight:800;padding:18px 24px;border:none;border-radius:50px;cursor:pointer;width:100%;">
              <span>🎓</span>
              <span>I'm a Student - Sign Up Free</span>
            </button>
            <button class="btn-cta-parent" id="parent-signup-btn" style="display:flex;align-items:center;justify-content:center;gap:10px;background:var(--card);color:#7c3aed;font-size:1rem;font-weight:700;padding:16px 24px;border:2px solid #7c3aed;border-radius:50px;cursor:pointer;width:100%;">
              <span>👨‍👩‍👧</span>
              <span>I'm a Parent - Track My Child</span>
            </button>
          </div>

          <!-- Free Badge -->
          <div style="display:inline-flex;align-items:center;gap:6px;background:#ecfdf5;color:#065f46;padding:8px 16px;border-radius:20px;font-size:0.85rem;font-weight:700;">
            <span>✓</span>
            <span>100% Free • No Credit Card</span>
          </div>

          <!-- Benefits List -->
          <div style="max-width:300px;margin:24px auto 0;text-align:left;">
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;font-size:0.9rem;color:var(--text);">
              <span style="color:#10b981;font-weight:700;">✓</span>
              <span>Search thousands of scholarships</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;font-size:0.9rem;color:var(--text);">
              <span style="color:#10b981;font-weight:700;">✓</span>
              <span>AI chatbot answers your questions</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;font-size:0.9rem;color:var(--text);">
              <span style="color:#10b981;font-weight:700;">✓</span>
              <span>Parents get weekly progress reports</span>
            </div>
            <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;font-size:0.9rem;color:var(--text);">
              <span style="color:#10b981;font-weight:700;">✓</span>
              <span>Upload resume, we extract your profile</span>
            </div>
          </div>
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

    // Student signup handler
    const studentBtn = container.querySelector('#student-signup-btn');
    if (studentBtn) {
      studentBtn.addEventListener('click', () => {
        trackEvent('student_signup_clicked', { source: 'share_comparison' });
        // Navigate to main app with signup flag
        window.location.href = '/index.html?signup=student';
      });
    }

    // Parent signup handler
    const parentBtn = container.querySelector('#parent-signup-btn');
    if (parentBtn) {
      parentBtn.addEventListener('click', () => {
        trackEvent('parent_signup_clicked', { source: 'share_comparison' });
        // Navigate to parent portal
        window.location.href = '/parents.html?signup=true';
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
