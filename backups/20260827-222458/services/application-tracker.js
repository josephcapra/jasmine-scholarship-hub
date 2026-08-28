/**
 * Application Tracker Service
 * Track scholarship application progress, deadlines, and status
 */

const ApplicationTracker = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_applications';

  const STATUS_FLOW = [
    { id: 'discovered', label: 'Discovered', emoji: '🔍', color: '#6b7280' },
    { id: 'researching', label: 'Researching', emoji: '📚', color: '#8b5cf6' },
    { id: 'materials', label: 'Gathering Materials', emoji: '📋', color: '#f59e0b' },
    { id: 'drafting', label: 'Drafting Essay', emoji: '✍️', color: '#3b82f6' },
    { id: 'reviewing', label: 'Reviewing', emoji: '🔎', color: '#10b981' },
    { id: 'submitted', label: 'Submitted!', emoji: '🚀', color: '#059669' },
    { id: 'waitlisted', label: 'Waitlisted', emoji: '⏳', color: '#f97316' },
    { id: 'awarded', label: 'Awarded!', emoji: '🏆', color: '#10b981' },
    { id: 'denied', label: 'Not Selected', emoji: '❌', color: '#ef4444' }
  ];

  let applications = [];

  function init() {
    loadState();
  }

  function loadState() {
    try {
      applications = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      console.error('ApplicationTracker load error:', e);
      applications = [];
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }

  function createApplication(scholarship) {
    const existing = applications.find(a => a.scholarshipId === scholarship.id);
    if (existing) return existing;

    const app = {
      id: 'app_' + Date.now(),
      scholarshipId: scholarship.id,
      scholarshipName: scholarship.name,
      amount: scholarship.amount,
      deadline: scholarship.deadline,
      status: 'discovered',
      statusHistory: [{ status: 'discovered', date: new Date().toISOString() }],
      notes: '',
      essayDraft: '',
      materials: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    applications.push(app);
    saveState();

    // Award badge for first application
    if (applications.length === 1 && typeof Engagement !== 'undefined') {
      Engagement.awardBadge('first_scholarship');
    }

    return app;
  }

  function updateStatus(appId, newStatus) {
    const app = applications.find(a => a.id === appId);
    if (!app) return null;

    app.status = newStatus;
    app.statusHistory.push({ status: newStatus, date: new Date().toISOString() });
    app.updatedAt = new Date().toISOString();
    saveState();

    // Award badges based on status
    if (typeof Engagement !== 'undefined') {
      if (newStatus === 'submitted') {
        Engagement.awardBadge('first_application');
        const submitted = applications.filter(a => a.status === 'submitted' || a.status === 'awarded').length;
        if (submitted >= 5) Engagement.awardBadge('five_applications');
      }
      if (newStatus === 'awarded') {
        Engagement.awardBadge('scholarship_winner');
      }
    }

    return app;
  }

  function updateNotes(appId, notes) {
    const app = applications.find(a => a.id === appId);
    if (!app) return null;

    app.notes = notes;
    app.updatedAt = new Date().toISOString();
    saveState();
    return app;
  }

  function updateEssayDraft(appId, draft) {
    const app = applications.find(a => a.id === appId);
    if (!app) return null;

    app.essayDraft = draft;
    app.updatedAt = new Date().toISOString();
    saveState();
    return app;
  }

  function addMaterial(appId, material) {
    const app = applications.find(a => a.id === appId);
    if (!app) return null;

    app.materials.push({
      id: 'mat_' + Date.now(),
      name: material.name,
      type: material.type,
      completed: false,
      addedAt: new Date().toISOString()
    });
    app.updatedAt = new Date().toISOString();
    saveState();
    return app;
  }

  function toggleMaterial(appId, materialId) {
    const app = applications.find(a => a.id === appId);
    if (!app) return null;

    const material = app.materials.find(m => m.id === materialId);
    if (material) {
      material.completed = !material.completed;
      app.updatedAt = new Date().toISOString();
      saveState();
    }
    return app;
  }

  function getApplication(appId) {
    return applications.find(a => a.id === appId);
  }

  function getApplicationByScholarship(scholarshipId) {
    return applications.find(a => a.scholarshipId === scholarshipId);
  }

  function getAllApplications() {
    return [...applications].sort((a, b) => {
      // Sort by deadline, closest first
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      return 0;
    });
  }

  function getApplicationsByStatus(status) {
    return applications.filter(a => a.status === status);
  }

  function getUpcomingDeadlines(days = 30) {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return applications
      .filter(a => {
        if (!a.deadline) return false;
        const deadline = new Date(a.deadline);
        return deadline >= now && deadline <= cutoff && !['submitted', 'awarded', 'denied'].includes(a.status);
      })
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }

  function getStats() {
    const total = applications.length;
    const inProgress = applications.filter(a => !['submitted', 'awarded', 'denied'].includes(a.status)).length;
    const submitted = applications.filter(a => a.status === 'submitted').length;
    const awarded = applications.filter(a => a.status === 'awarded').length;
    const totalAwarded = applications
      .filter(a => a.status === 'awarded')
      .reduce((sum, a) => sum + (parseInt(a.amount) || 0), 0);
    const totalPotential = applications
      .filter(a => !['denied'].includes(a.status))
      .reduce((sum, a) => sum + (parseInt(a.amount) || 0), 0);

    return {
      total,
      inProgress,
      submitted,
      awarded,
      denied: applications.filter(a => a.status === 'denied').length,
      totalAwarded,
      totalPotential,
      upcomingDeadlines: getUpcomingDeadlines(14).length
    };
  }

  function deleteApplication(appId) {
    const index = applications.findIndex(a => a.id === appId);
    if (index > -1) {
      applications.splice(index, 1);
      saveState();
      return true;
    }
    return false;
  }

  // Render functions
  function renderStatusBadge(status) {
    const statusInfo = STATUS_FLOW.find(s => s.id === status) || STATUS_FLOW[0];
    return `<span class="app-status-badge" style="background: ${statusInfo.color}20; color: ${statusInfo.color}; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">${statusInfo.emoji} ${statusInfo.label}</span>`;
  }

  function renderApplicationCard(app) {
    const daysUntil = app.deadline ? Math.ceil((new Date(app.deadline) - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const statusInfo = STATUS_FLOW.find(s => s.id === app.status) || STATUS_FLOW[0];
    const materialsComplete = app.materials.filter(m => m.completed).length;
    const materialsTotal = app.materials.length;

    return `
      <div class="application-card" data-app-id="${app.id}" onclick="ApplicationTracker.openDetail('${app.id}')">
        <div class="app-card-header">
          <div class="app-card-title">${app.scholarshipName}</div>
          ${renderStatusBadge(app.status)}
        </div>
        <div class="app-card-meta">
          <span class="app-amount">💰 $${(app.amount || 0).toLocaleString()}</span>
          ${daysUntil !== null ? `<span class="app-deadline ${daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'soon' : ''}">${daysUntil <= 0 ? '⚠️ Past due' : `📅 ${daysUntil} days`}</span>` : ''}
        </div>
        ${materialsTotal > 0 ? `
          <div class="app-materials-progress">
            <span>📋 Materials: ${materialsComplete}/${materialsTotal}</span>
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" style="width: ${(materialsComplete / materialsTotal) * 100}%"></div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderDashboard(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = getStats();
    const upcoming = getUpcomingDeadlines(14);
    const inProgress = getApplicationsByStatus('researching')
      .concat(getApplicationsByStatus('materials'))
      .concat(getApplicationsByStatus('drafting'))
      .concat(getApplicationsByStatus('reviewing'));

    container.innerHTML = `
      <div class="app-tracker-dashboard">
        <!-- Stats Row -->
        <div class="app-stats-row">
          <div class="app-stat-card">
            <div class="app-stat-number">${stats.total}</div>
            <div class="app-stat-label">Total Apps</div>
          </div>
          <div class="app-stat-card">
            <div class="app-stat-number">${stats.submitted}</div>
            <div class="app-stat-label">Submitted</div>
          </div>
          <div class="app-stat-card awarded">
            <div class="app-stat-number">$${(stats.totalAwarded / 1000).toFixed(1)}k</div>
            <div class="app-stat-label">Won!</div>
          </div>
        </div>

        ${upcoming.length > 0 ? `
          <div class="app-section">
            <h3 class="app-section-title">🔥 Upcoming Deadlines</h3>
            <div class="app-list">
              ${upcoming.map(app => renderApplicationCard(app)).join('')}
            </div>
          </div>
        ` : ''}

        ${inProgress.length > 0 ? `
          <div class="app-section">
            <h3 class="app-section-title">📝 In Progress</h3>
            <div class="app-list">
              ${inProgress.map(app => renderApplicationCard(app)).join('')}
            </div>
          </div>
        ` : ''}

        ${stats.total === 0 ? `
          <div class="app-empty-state">
            <div class="app-empty-icon">📋</div>
            <h3>No Applications Yet</h3>
            <p>Save scholarships from the Money tab to start tracking your applications!</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  function openDetail(appId) {
    const app = getApplication(appId);
    if (!app) return;

    const modal = document.createElement('div');
    modal.id = 'app-detail-modal';
    modal.className = 'app-modal';
    modal.innerHTML = `
      <div class="app-modal-backdrop" onclick="ApplicationTracker.closeDetail()"></div>
      <div class="app-modal-content">
        <div class="app-modal-header">
          <h2>${app.scholarshipName}</h2>
          <button class="app-modal-close" onclick="ApplicationTracker.closeDetail()">×</button>
        </div>
        <div class="app-modal-body">
          <div class="app-detail-amount">💰 $${(app.amount || 0).toLocaleString()}</div>
          ${app.deadline ? `<div class="app-detail-deadline">📅 Deadline: ${new Date(app.deadline).toLocaleDateString()}</div>` : ''}

          <div class="app-status-section">
            <label>Status:</label>
            <div class="app-status-selector">
              ${STATUS_FLOW.map(s => `
                <button class="status-option ${app.status === s.id ? 'active' : ''}"
                  style="--status-color: ${s.color}"
                  onclick="ApplicationTracker.setStatus('${app.id}', '${s.id}')">
                  ${s.emoji} ${s.label}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="app-materials-section">
            <label>Materials Checklist:</label>
            <div class="materials-list" id="materials-list-${app.id}">
              ${app.materials.map(m => `
                <div class="material-item ${m.completed ? 'completed' : ''}" onclick="ApplicationTracker.toggleMat('${app.id}', '${m.id}')">
                  <span class="material-check">${m.completed ? '✅' : '⬜'}</span>
                  <span class="material-name">${m.name}</span>
                </div>
              `).join('')}
            </div>
            <div class="add-material">
              <input type="text" id="new-material-${app.id}" placeholder="Add material (e.g., Transcript, Essay)">
              <button onclick="ApplicationTracker.addMat('${app.id}')">+</button>
            </div>
          </div>

          <div class="app-notes-section">
            <label>Notes:</label>
            <textarea id="app-notes-${app.id}" placeholder="Add notes about this application...">${app.notes || ''}</textarea>
            <button class="btn-save-notes" onclick="ApplicationTracker.saveNotes('${app.id}')">Save Notes</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
  }

  function closeDetail() {
    const modal = document.getElementById('app-detail-modal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  }

  function setStatus(appId, status) {
    updateStatus(appId, status);
    // Refresh modal content
    closeDetail();
    openDetail(appId);
  }

  function toggleMat(appId, materialId) {
    toggleMaterial(appId, materialId);
    // Refresh the materials list
    const app = getApplication(appId);
    const list = document.getElementById(`materials-list-${appId}`);
    if (list && app) {
      list.innerHTML = app.materials.map(m => `
        <div class="material-item ${m.completed ? 'completed' : ''}" onclick="ApplicationTracker.toggleMat('${app.id}', '${m.id}')">
          <span class="material-check">${m.completed ? '✅' : '⬜'}</span>
          <span class="material-name">${m.name}</span>
        </div>
      `).join('');
    }
  }

  function addMat(appId) {
    const input = document.getElementById(`new-material-${appId}`);
    if (!input || !input.value.trim()) return;

    addMaterial(appId, { name: input.value.trim(), type: 'custom' });
    input.value = '';

    // Refresh the materials list
    const app = getApplication(appId);
    const list = document.getElementById(`materials-list-${appId}`);
    if (list && app) {
      list.innerHTML = app.materials.map(m => `
        <div class="material-item ${m.completed ? 'completed' : ''}" onclick="ApplicationTracker.toggleMat('${app.id}', '${m.id}')">
          <span class="material-check">${m.completed ? '✅' : '⬜'}</span>
          <span class="material-name">${m.name}</span>
        </div>
      `).join('');
    }
  }

  function saveNotes(appId) {
    const textarea = document.getElementById(`app-notes-${appId}`);
    if (textarea) {
      updateNotes(appId, textarea.value);
      if (typeof Engagement !== 'undefined') {
        Engagement.showToast('Notes saved!');
      }
    }
  }

  // Initialize
  init();

  return {
    STATUS_FLOW,
    createApplication,
    updateStatus,
    updateNotes,
    updateEssayDraft,
    addMaterial,
    toggleMaterial,
    getApplication,
    getApplicationByScholarship,
    getAllApplications,
    getApplicationsByStatus,
    getUpcomingDeadlines,
    getStats,
    deleteApplication,
    renderStatusBadge,
    renderApplicationCard,
    renderDashboard,
    openDetail,
    closeDetail,
    setStatus,
    toggleMat,
    addMat,
    saveNotes
  };
})();
