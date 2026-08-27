/**
 * Application Tracker Tests
 * Tests for scholarship application tracking workflow
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
require('./setup');

// Load the service
const fs = require('fs');
const path = require('path');
const trackerCode = fs.readFileSync(
  path.join(__dirname, '../services/application-tracker.js'),
  'utf8'
);

// Mock Engagement if needed
globalThis.Engagement = {
  awardBadge: () => true,
  showToast: () => {}
};

eval(trackerCode);

describe('Application Tracker', () => {
  beforeEach(() => {
    localStorage.clear();
    // Re-initialize after clearing storage
    eval(trackerCode);
  });

  describe('Application Creation', () => {
    it('should create a new application', () => {
      const scholarship = {
        id: 'test-123',
        name: 'Test Scholarship',
        amount: 5000,
        deadline: '2027-03-15'
      };
      const app = ApplicationTracker.createApplication(scholarship);
      assert.ok(app.id.startsWith('app_'));
      assert.strictEqual(app.scholarshipName, 'Test Scholarship');
      assert.strictEqual(app.amount, 5000);
      assert.strictEqual(app.status, 'discovered');
    });

    it('should not create duplicate applications', () => {
      const scholarship = { id: 'dup-123', name: 'Dup Test', amount: 1000 };
      const app1 = ApplicationTracker.createApplication(scholarship);
      const app2 = ApplicationTracker.createApplication(scholarship);
      assert.strictEqual(app1.id, app2.id);
    });
  });

  describe('Status Flow', () => {
    it('should have 9 status stages', () => {
      assert.strictEqual(ApplicationTracker.STATUS_FLOW.length, 9);
    });

    it('should update status correctly', () => {
      const scholarship = { id: 'status-test', name: 'Status Test', amount: 2000 };
      const app = ApplicationTracker.createApplication(scholarship);

      ApplicationTracker.updateStatus(app.id, 'researching');
      const updated = ApplicationTracker.getApplication(app.id);

      assert.strictEqual(updated.status, 'researching');
      assert.strictEqual(updated.statusHistory.length, 2);
    });

    it('should track status history', () => {
      const scholarship = { id: 'hist-test', name: 'History Test', amount: 3000 };
      const app = ApplicationTracker.createApplication(scholarship);

      ApplicationTracker.updateStatus(app.id, 'materials');
      ApplicationTracker.updateStatus(app.id, 'drafting');
      ApplicationTracker.updateStatus(app.id, 'submitted');

      const final = ApplicationTracker.getApplication(app.id);
      assert.strictEqual(final.statusHistory.length, 4);
      assert.strictEqual(final.statusHistory[3].status, 'submitted');
    });
  });

  describe('Materials Checklist', () => {
    it('should add materials to application', () => {
      const scholarship = { id: 'mat-test', name: 'Materials Test', amount: 1500 };
      const app = ApplicationTracker.createApplication(scholarship);

      ApplicationTracker.addMaterial(app.id, { name: 'Transcript', type: 'document' });
      ApplicationTracker.addMaterial(app.id, { name: 'Essay', type: 'document' });

      const updated = ApplicationTracker.getApplication(app.id);
      assert.strictEqual(updated.materials.length, 2);
    });

    it('should toggle material completion', () => {
      const scholarship = { id: 'toggle-test', name: 'Toggle Test', amount: 1000 };
      const app = ApplicationTracker.createApplication(scholarship);
      ApplicationTracker.addMaterial(app.id, { name: 'Test Doc', type: 'document' });

      const withMaterial = ApplicationTracker.getApplication(app.id);
      const materialId = withMaterial.materials[0].id;

      ApplicationTracker.toggleMaterial(app.id, materialId);
      const toggled = ApplicationTracker.getApplication(app.id);

      assert.strictEqual(toggled.materials[0].completed, true);
    });
  });

  describe('Statistics', () => {
    it('should calculate stats correctly', () => {
      // Clear and re-init
      localStorage.clear();
      eval(trackerCode);

      ApplicationTracker.createApplication({ id: 's1', name: 'S1', amount: 1000 });
      ApplicationTracker.createApplication({ id: 's2', name: 'S2', amount: 2000 });
      ApplicationTracker.createApplication({ id: 's3', name: 'S3', amount: 3000 });

      const stats = ApplicationTracker.getStats();
      assert.strictEqual(stats.total, 3);
      assert.strictEqual(stats.totalPotential, 6000);
    });

    it('should track submitted applications', () => {
      localStorage.clear();
      eval(trackerCode);

      const app = ApplicationTracker.createApplication({ id: 'sub', name: 'Submitted', amount: 5000 });
      ApplicationTracker.updateStatus(app.id, 'submitted');

      const stats = ApplicationTracker.getStats();
      assert.strictEqual(stats.submitted, 1);
    });
  });

  describe('Deadlines', () => {
    it('should return upcoming deadlines', () => {
      localStorage.clear();
      eval(trackerCode);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      ApplicationTracker.createApplication({
        id: 'deadline-test',
        name: 'Deadline Test',
        amount: 1000,
        deadline: futureDate.toISOString()
      });

      const upcoming = ApplicationTracker.getUpcomingDeadlines(14);
      assert.strictEqual(upcoming.length, 1);
    });
  });
});

console.log('Application Tracker tests loaded');
