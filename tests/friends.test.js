/**
 * Friends Service Tests
 * Tests for friend invites and profile comparison
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
require('./setup');

// Load the service
const fs = require('fs');
const path = require('path');
const friendsCode = fs.readFileSync(
  path.join(__dirname, '../services/friends.js'),
  'utf8'
);

// Mock dependencies
globalThis.Engagement = {
  awardBadge: () => true,
  showToast: () => {}
};
globalThis.VyliumProfile = {
  getProfile: () => null
};

eval(friendsCode);

describe('Friends Service', () => {
  beforeEach(() => {
    localStorage.clear();
    eval(friendsCode); // Re-init to generate new invite code
  });

  describe('Invite Codes', () => {
    it('should generate a 6-character invite code', () => {
      const code = FriendsService.getMyInviteCode();
      assert.strictEqual(code.length, 6);
      assert.match(code, /^[A-Z0-9]+$/);
    });

    it('should maintain same code across calls', () => {
      const code1 = FriendsService.getMyInviteCode();
      const code2 = FriendsService.getMyInviteCode();
      assert.strictEqual(code1, code2);
    });

    it('should generate invite link with code', () => {
      const link = FriendsService.getInviteLink();
      const code = FriendsService.getMyInviteCode();
      assert.ok(link.includes(`invite=${code}`));
    });
  });

  describe('Friend Management', () => {
    it('should add a friend', () => {
      const added = FriendsService.addFriend({
        code: 'ABC123',
        name: 'Test Friend'
      });
      assert.strictEqual(added, true);
      assert.strictEqual(FriendsService.getFriendCount(), 1);
    });

    it('should not add duplicate friends', () => {
      FriendsService.addFriend({ code: 'DUP123', name: 'Friend 1' });
      const added = FriendsService.addFriend({ code: 'DUP123', name: 'Friend 1' });
      assert.strictEqual(added, false);
      assert.strictEqual(FriendsService.getFriendCount(), 1);
    });

    it('should remove a friend', () => {
      FriendsService.addFriend({ code: 'REM123', name: 'To Remove' });
      const friends = FriendsService.getFriends();
      const friendId = friends[0].id;

      const removed = FriendsService.removeFriend(friendId);
      assert.strictEqual(removed, true);
      assert.strictEqual(FriendsService.getFriendCount(), 0);
    });
  });

  describe('Profile Comparison', () => {
    it('should compare two profiles', () => {
      const profile1 = {
        topDimensions: [{ code: 'R' }, { code: 'I' }],
        personality: { name: 'Analyst' },
        savedCareers: [{ id: 'eng', name: 'Engineer' }]
      };
      const profile2 = {
        topDimensions: [{ code: 'R' }, { code: 'A' }],
        personality: { name: 'Creative' },
        savedCareers: [{ id: 'eng', name: 'Engineer' }]
      };

      const comparison = FriendsService.compareProfiles(profile1, profile2);

      assert.ok(comparison.similarities.length > 0);
      assert.ok(comparison.differences.length > 0);
      assert.ok(comparison.sharedInterests.includes('Engineer'));
      assert.ok(comparison.compatibilityScore >= 0);
      assert.ok(comparison.compatibilityScore <= 100);
    });

    it('should handle null profiles', () => {
      const comparison = FriendsService.compareProfiles(null, null);
      assert.strictEqual(comparison, null);
    });

    it('should calculate higher compatibility for similar profiles', () => {
      const profile1 = {
        topDimensions: [{ code: 'R' }, { code: 'I' }, { code: 'A' }],
        personality: { name: 'Analyst' },
        savedCareers: [{ id: 'eng', name: 'Engineer' }]
      };
      const profile2 = {
        topDimensions: [{ code: 'R' }, { code: 'I' }, { code: 'A' }],
        personality: { name: 'Analyst' },
        savedCareers: [{ id: 'eng', name: 'Engineer' }]
      };

      const comparison = FriendsService.compareProfiles(profile1, profile2);
      assert.ok(comparison.compatibilityScore >= 70);
    });
  });

  describe('Challenge System', () => {
    it('should send a challenge', () => {
      FriendsService.addFriend({ code: 'CHAL123', name: 'Challenger' });
      const friends = FriendsService.getFriends();
      const challenge = FriendsService.sendChallenge(friends[0].id, 'daily_mission');

      assert.ok(challenge.id.startsWith('chal_'));
      assert.strictEqual(challenge.type, 'daily_mission');
      assert.strictEqual(challenge.status, 'sent');
    });
  });
});

console.log('Friends tests loaded');
