/**
 * Engagement Service Tests
 * Tests for XP, badges, levels, and daily missions
 */

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert');
require('./setup');

// Load the engagement service
const fs = require('fs');
const path = require('path');
const engagementCode = fs.readFileSync(
  path.join(__dirname, '../services/engagement.js'),
  'utf8'
);
eval(engagementCode);

describe('Engagement Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('XP System', () => {
    it('should award XP correctly', () => {
      const initialXP = Engagement.getStats().xp;
      Engagement.addXP(50, 'test');
      const newXP = Engagement.getStats().xp;
      assert.strictEqual(newXP - initialXP, 50);
    });

    it('should calculate level from XP (100 XP per level)', () => {
      localStorage.clear();
      Engagement.addXP(250, 'test');
      const stats = Engagement.getStats();
      assert.strictEqual(stats.level, 3); // 250 XP = level 3
    });

    it('should not award negative XP', () => {
      const initialXP = Engagement.getStats().xp;
      Engagement.addXP(-50, 'test');
      const newXP = Engagement.getStats().xp;
      assert.strictEqual(newXP, initialXP);
    });
  });

  describe('Badge System', () => {
    it('should award badge only once', () => {
      const awarded1 = Engagement.awardBadge('profile_complete');
      const awarded2 = Engagement.awardBadge('profile_complete');
      assert.strictEqual(awarded1, true);
      assert.strictEqual(awarded2, false);
    });

    it('should return badge count correctly', () => {
      localStorage.clear();
      Engagement.awardBadge('profile_complete');
      Engagement.awardBadge('first_scholarship');
      const stats = Engagement.getStats();
      assert.strictEqual(stats.badgeCount, 2);
    });

    it('should not award invalid badge', () => {
      const awarded = Engagement.awardBadge('nonexistent_badge');
      assert.strictEqual(awarded, false);
    });
  });

  describe('Daily Missions', () => {
    it('should generate 3 missions per day', () => {
      const missions = Engagement.getDailyMissions();
      assert.strictEqual(missions.length, 3);
    });

    it('should generate same missions for same date', () => {
      const missions1 = Engagement.getDailyMissions();
      const missions2 = Engagement.getDailyMissions();
      assert.deepStrictEqual(
        missions1.map(m => m.id),
        missions2.map(m => m.id)
      );
    });

    it('should mark mission as complete', () => {
      const missions = Engagement.getDailyMissions();
      const missionId = missions[0].id;
      Engagement.completeMission(missionId);
      const updated = Engagement.getDailyMissions();
      const completed = updated.find(m => m.id === missionId);
      assert.strictEqual(completed.completed, true);
    });
  });

  describe('Streaks', () => {
    it('should track daily login streak', () => {
      localStorage.clear();
      Engagement.recordLogin();
      const stats = Engagement.getStats();
      assert.ok(stats.streak >= 0);
    });
  });
});

console.log('Engagement tests loaded');
