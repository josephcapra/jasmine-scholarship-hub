/**
 * Friends & Social Service
 * Friend invites, profile comparison, challenges
 */

const FriendsService = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_friends';
  const INVITES_KEY = 'jasmine_friend_invites';

  let state = {
    friends: [],
    pendingInvites: [],
    myInviteCode: null
  };

  function init() {
    loadState();
    if (!state.myInviteCode) {
      state.myInviteCode = generateInviteCode();
      saveState();
    }
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      state = { ...state, ...saved };
    } catch (e) {
      console.error('Friends load error:', e);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function getMyInviteCode() {
    return state.myInviteCode;
  }

  function getInviteLink() {
    return `${window.location.origin}?invite=${state.myInviteCode}`;
  }

  function addFriend(friendData) {
    if (state.friends.find(f => f.code === friendData.code)) return false;

    state.friends.push({
      id: 'friend_' + Date.now(),
      code: friendData.code,
      name: friendData.name || 'Friend',
      addedAt: new Date().toISOString(),
      // Profile comparison data (would sync from their account)
      profile: friendData.profile || null
    });
    saveState();

    // Award badge
    if (typeof Engagement !== 'undefined') {
      Engagement.awardBadge('invited_friend');
      if (state.friends.length >= 3) {
        Engagement.awardBadge('social_butterfly');
      }
    }

    return true;
  }

  function removeFriend(friendId) {
    const index = state.friends.findIndex(f => f.id === friendId);
    if (index > -1) {
      state.friends.splice(index, 1);
      saveState();
      return true;
    }
    return false;
  }

  function getFriends() {
    return state.friends;
  }

  function getFriendCount() {
    return state.friends.length;
  }

  // Profile comparison
  function compareProfiles(myProfile, friendProfile) {
    if (!myProfile || !friendProfile) return null;

    const comparison = {
      similarities: [],
      differences: [],
      sharedInterests: [],
      compatibilityScore: 0
    };

    // Compare RIASEC dimensions
    if (myProfile.topDimensions && friendProfile.topDimensions) {
      const myTop = myProfile.topDimensions.map(d => d.code);
      const friendTop = friendProfile.topDimensions.map(d => d.code);
      const shared = myTop.filter(d => friendTop.includes(d));

      if (shared.length > 0) {
        comparison.similarities.push(`You both score high in ${shared.join(' and ')}`);
        comparison.compatibilityScore += shared.length * 20;
      }

      const myUnique = myTop.filter(d => !friendTop.includes(d));
      const friendUnique = friendTop.filter(d => !myTop.includes(d));
      if (myUnique.length > 0 || friendUnique.length > 0) {
        comparison.differences.push(`You bring ${myUnique.join('/')} energy, they bring ${friendUnique.join('/')}`);
      }
    }

    // Compare personality types
    if (myProfile.personality && friendProfile.personality) {
      if (myProfile.personality.name === friendProfile.personality.name) {
        comparison.similarities.push(`You're both ${myProfile.personality.name}s!`);
        comparison.compatibilityScore += 30;
      } else {
        comparison.differences.push(`You're a ${myProfile.personality.name}, they're a ${friendProfile.personality.name}`);
      }
    }

    // Compare saved careers
    if (myProfile.savedCareers && friendProfile.savedCareers) {
      const myCareers = myProfile.savedCareers.map(c => c.id);
      const friendCareers = friendProfile.savedCareers.map(c => c.id);
      const shared = myCareers.filter(c => friendCareers.includes(c));

      if (shared.length > 0) {
        const sharedNames = myProfile.savedCareers.filter(c => shared.includes(c.id)).map(c => c.name);
        comparison.sharedInterests.push(...sharedNames);
        comparison.compatibilityScore += shared.length * 10;
      }
    }

    // Normalize score
    comparison.compatibilityScore = Math.min(100, comparison.compatibilityScore);

    return comparison;
  }

  // Challenge system
  function sendChallenge(friendId, challengeType) {
    // Would integrate with notification system
    const challenge = {
      id: 'chal_' + Date.now(),
      friendId,
      type: challengeType,
      status: 'sent',
      createdAt: new Date().toISOString()
    };

    // Store in pending challenges
    const challenges = JSON.parse(localStorage.getItem('jasmine_challenges') || '[]');
    challenges.push(challenge);
    localStorage.setItem('jasmine_challenges', JSON.stringify(challenges));

    return challenge;
  }

  // Share a Would You Rather with a friend
  function shareWYR(friendId, questionId) {
    // Would integrate with notification system
    if (typeof Engagement !== 'undefined') {
      Engagement.showToast('Would You Rather sent to friend!');
    }
    return true;
  }

  // Render functions
  function renderInviteCard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="invite-card">
        <div class="invite-header">
          <span class="invite-icon">🤝</span>
          <h3>Invite Friends</h3>
        </div>
        <p class="invite-desc">Share your journey! Friends can compare profiles and challenge each other.</p>
        <div class="invite-code-box">
          <span class="invite-label">Your Code:</span>
          <span class="invite-code">${state.myInviteCode}</span>
          <button class="copy-btn" onclick="FriendsService.copyInviteCode()">📋</button>
        </div>
        <button class="btn btn-primary btn-share-invite" onclick="FriendsService.shareInvite()">
          📤 Share Invite Link
        </button>
      </div>
    `;
  }

  function renderFriendsList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const friends = getFriends();

    if (friends.length === 0) {
      container.innerHTML = `
        <div class="friends-empty">
          <span class="empty-icon">👥</span>
          <p>No friends yet! Share your invite code to connect.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="friends-list">
        ${friends.map(friend => `
          <div class="friend-item">
            <div class="friend-avatar">${friend.name.charAt(0).toUpperCase()}</div>
            <div class="friend-info">
              <div class="friend-name">${friend.name}</div>
              <div class="friend-since">Friends since ${new Date(friend.addedAt).toLocaleDateString()}</div>
            </div>
            <div class="friend-actions">
              <button class="btn-compare" onclick="FriendsService.compareWith('${friend.id}')" title="Compare Profiles">🔄</button>
              <button class="btn-challenge" onclick="FriendsService.challengeFriend('${friend.id}')" title="Send Challenge">⚔️</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function copyInviteCode() {
    navigator.clipboard.writeText(state.myInviteCode).then(() => {
      if (typeof Engagement !== 'undefined') {
        Engagement.showToast('Invite code copied!');
      }
    });
  }

  function shareInvite() {
    const link = getInviteLink();
    const text = `Join me on Scholarship Hub! Use my invite code: ${state.myInviteCode}`;

    if (navigator.share) {
      navigator.share({
        title: 'Join Scholarship Hub',
        text: text,
        url: link
      }).catch(() => {
        navigator.clipboard.writeText(link);
        if (typeof Engagement !== 'undefined') {
          Engagement.showToast('Invite link copied!');
        }
      });
    } else {
      navigator.clipboard.writeText(link);
      if (typeof Engagement !== 'undefined') {
        Engagement.showToast('Invite link copied!');
      }
    }
  }

  function compareWith(friendId) {
    const friend = state.friends.find(f => f.id === friendId);
    if (!friend) return;

    // Get current user's profile
    const myProfile = typeof VyliumProfile !== 'undefined' ? VyliumProfile.getProfile() : null;
    const friendProfile = friend.profile;

    if (!myProfile || !myProfile.isComplete) {
      if (typeof Engagement !== 'undefined') {
        Engagement.showToast('Complete your VYLIUM profile first!');
      }
      return;
    }

    // Show comparison modal
    const comparison = compareProfiles(myProfile, friendProfile) || {
      similarities: ['Both exploring futures!'],
      differences: ['Unique paths ahead'],
      sharedInterests: [],
      compatibilityScore: 50
    };

    const modal = document.createElement('div');
    modal.id = 'compare-modal';
    modal.innerHTML = `
      <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div style="background: var(--card); border-radius: 20px; width: 100%; max-width: 400px; padding: 24px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 2rem; margin-bottom: 8px;">🔄</div>
            <h3 style="margin: 0;">You & ${friend.name}</h3>
          </div>
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 2rem; font-weight: 800; color: var(--jazz-purple);">${comparison.compatibilityScore}%</div>
            <div style="color: var(--muted); font-size: 0.9rem;">Compatibility</div>
          </div>
          ${comparison.similarities.length > 0 ? `
            <div style="margin-bottom: 16px;">
              <div style="font-weight: 700; margin-bottom: 8px;">✨ Similarities</div>
              ${comparison.similarities.map(s => `<div style="font-size: 0.9rem; color: var(--muted); padding: 4px 0;">• ${s}</div>`).join('')}
            </div>
          ` : ''}
          ${comparison.differences.length > 0 ? `
            <div style="margin-bottom: 16px;">
              <div style="font-weight: 700; margin-bottom: 8px;">🌈 Differences</div>
              ${comparison.differences.map(d => `<div style="font-size: 0.9rem; color: var(--muted); padding: 4px 0;">• ${d}</div>`).join('')}
            </div>
          ` : ''}
          ${comparison.sharedInterests.length > 0 ? `
            <div style="margin-bottom: 16px;">
              <div style="font-weight: 700; margin-bottom: 8px;">🎯 Shared Career Interests</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${comparison.sharedInterests.map(i => `<span style="padding: 4px 10px; background: #ede9fe; color: var(--jazz-purple); border-radius: 12px; font-size: 0.8rem;">${i}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          <button onclick="document.getElementById('compare-modal').remove()" style="width: 100%; padding: 14px; background: var(--jazz-purple); color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer;">
            Close
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  function challengeFriend(friendId) {
    const friend = state.friends.find(f => f.id === friendId);
    if (!friend) return;

    if (typeof Engagement !== 'undefined') {
      Engagement.showToast(`Challenge sent to ${friend.name}!`);
    }

    sendChallenge(friendId, 'daily_mission');
  }

  // Check for invite code in URL on load
  function checkInviteCode() {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (inviteCode && inviteCode !== state.myInviteCode) {
      // Would trigger add friend flow
      console.log('Received invite code:', inviteCode);
    }
  }

  // Initialize
  init();

  return {
    getMyInviteCode,
    getInviteLink,
    addFriend,
    removeFriend,
    getFriends,
    getFriendCount,
    compareProfiles,
    sendChallenge,
    shareWYR,
    renderInviteCard,
    renderFriendsList,
    copyInviteCode,
    shareInvite,
    compareWith,
    challengeFriend,
    checkInviteCode
  };
})();
