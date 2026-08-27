/**
 * Weekly Report Tests
 * Tests for activity logging and report generation
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
require('./setup');

// Load the service
const fs = require('fs');
const path = require('path');
const reportCode = fs.readFileSync(
  path.join(__dirname, '../services/weekly-report.js'),
  'utf8'
);

// Mock dependencies
globalThis.Engagement = {
  getStats: () => ({ xp: 500, level: 5, badgeCount: 3 }),
  showToast: () => {}
};
globalThis.ApplicationTracker = {
  getStats: () => ({ total: 5, submitted: 2 })
};
globalThis.VyliumProfile = {
  getProfile: () => ({ isComplete: true, personality: { name: 'Analyst' } })
};

eval(reportCode);

describe('Weekly Report Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Activity Logging', () => {
    it('should log login activity', () => {
      WeeklyReport.logActivity('login');
      const activity = WeeklyReport.getWeekActivity();
      assert.strictEqual(activity.logins, 1);
    });

    it('should track multiple activity types', () => {
      WeeklyReport.logActivity('login');
      WeeklyReport.logActivity('career_explored');
      WeeklyReport.logActivity('career_explored');
      WeeklyReport.logActivity('scholarship_saved');
      WeeklyReport.logActivity('wyr_answered');

      const activity = WeeklyReport.getWeekActivity();
      assert.strictEqual(activity.logins, 1);
      assert.strictEqual(activity.careersExplored, 2);
      assert.strictEqual(activity.scholarshipsSaved, 1);
      assert.strictEqual(activity.wyrAnswered, 1);
    });

    it('should track essay work minutes', () => {
      WeeklyReport.logActivity('essay_work', { minutes: 30 });
      WeeklyReport.logActivity('essay_work', { minutes: 15 });

      const activity = WeeklyReport.getWeekActivity();
      assert.strictEqual(activity.essayWork, 45);
    });

    it('should track badges earned', () => {
      WeeklyReport.logActivity('badge_earned', { badge: 'first_login' });
      WeeklyReport.logActivity('badge_earned', { badge: 'profile_complete' });

      const activity = WeeklyReport.getWeekActivity();
      assert.strictEqual(activity.badgesEarned.length, 2);
      assert.ok(activity.badgesEarned.includes('first_login'));
    });
  });

  describe('Report Generation', () => {
    it('should generate a weekly report', () => {
      WeeklyReport.logActivity('login');
      WeeklyReport.logActivity('career_explored');

      const report = WeeklyReport.generateReport();

      assert.ok(report.weekKey);
      assert.ok(report.weekRange);
      assert.ok(report.generatedAt);
      assert.strictEqual(report.totalLogins, 1);
      assert.strictEqual(report.careersExplored, 1);
    });

    it('should include overall stats', () => {
      const report = WeeklyReport.generateReport();

      assert.strictEqual(report.currentLevel, 5);
      assert.strictEqual(report.totalXP, 500);
      assert.strictEqual(report.applicationsInProgress, 5);
      assert.strictEqual(report.applicationsSubmitted, 2);
    });

    it('should generate insights', () => {
      // Log enough activity for insights
      WeeklyReport.logActivity('login');
      WeeklyReport.logActivity('career_explored');
      WeeklyReport.logActivity('career_explored');
      WeeklyReport.logActivity('career_explored');
      WeeklyReport.logActivity('career_explored');
      WeeklyReport.logActivity('career_explored');

      const report = WeeklyReport.generateReport();
      assert.ok(Array.isArray(report.insights));
    });

    it('should generate parent suggestions', () => {
      WeeklyReport.logActivity('career_explored');
      WeeklyReport.logActivity('scholarship_saved');

      const report = WeeklyReport.generateReport();
      assert.ok(Array.isArray(report.parentSuggestions));
    });
  });

  describe('Report Storage', () => {
    it('should save and retrieve reports', () => {
      const report = WeeklyReport.generateReport();
      const retrieved = WeeklyReport.getReport(report.weekKey);

      assert.strictEqual(retrieved.weekKey, report.weekKey);
    });

    it('should list all reports', () => {
      WeeklyReport.generateReport();
      const reports = WeeklyReport.getAllReports();

      assert.ok(Object.keys(reports).length >= 1);
    });
  });

  describe('Inactive User Handling', () => {
    it('should suggest gentle nudge for no activity', () => {
      // Generate report with no activity
      const report = WeeklyReport.generateReport();

      // Should have gentle-nudge suggestion
      const nudge = report.parentSuggestions.find(
        s => s.action === 'gentle-nudge'
      );
      assert.ok(nudge);
    });
  });
});

console.log('Weekly Report tests loaded');
