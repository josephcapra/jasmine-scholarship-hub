/**
 * DataSync - Unified data layer that syncs between localStorage and Supabase
 * Provides offline-first storage with cloud sync for cross-device access
 */

const DataSync = (function() {
  'use strict';

  const SYNC_QUEUE_KEY = 'jasmine_sync_queue';
  const LAST_SYNC_KEY = 'jasmine_last_sync';

  let isOnline = navigator.onLine;
  let currentStudentId = null;
  let syncInProgress = false;

  // Listen for online/offline events
  window.addEventListener('online', () => {
    isOnline = true;
    processQueue();
  });
  window.addEventListener('offline', () => { isOnline = false; });

  // ========== QUEUE MANAGEMENT ==========

  function getQueue() {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
  }

  function addToQueue(operation) {
    const queue = getQueue();
    queue.push({ ...operation, timestamp: Date.now() });
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  function clearQueue() {
    localStorage.setItem(SYNC_QUEUE_KEY, '[]');
  }

  async function processQueue() {
    if (syncInProgress || !isOnline) return;
    syncInProgress = true;

    const queue = getQueue();
    const failed = [];

    for (const op of queue) {
      try {
        await executeOperation(op);
      } catch (e) {
        console.warn('Sync operation failed, will retry:', e);
        failed.push(op);
      }
    }

    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failed));
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    syncInProgress = false;
  }

  async function executeOperation(op) {
    switch (op.type) {
      case 'updateProfile':
        await SupabaseClient.updateStudent(op.studentId, op.data);
        break;
      case 'addScholarship':
        await SupabaseClient.addScholarship(op.studentId, op.data);
        break;
      case 'updateScholarship':
        await SupabaseClient.updateScholarship(op.id, op.data);
        break;
      case 'addEssay':
        await SupabaseClient.addEssay(op.studentId, op.data);
        break;
      case 'updateEssay':
        await SupabaseClient.updateEssay(op.id, op.data);
        break;
      case 'logActivity':
        await SupabaseClient.logActivity(op.studentId, op.action, op.details);
        break;
    }
  }

  // ========== INITIALIZATION ==========

  async function initialize(userEmail) {
    if (!userEmail) return null;

    try {
      // Try to get or create student record
      let student = await SupabaseClient.getStudentByEmail(userEmail);

      if (!student) {
        // Check localStorage for existing profile to migrate
        const localProfile = JSON.parse(localStorage.getItem('jasmine_student_profile') || '{}');
        student = await SupabaseClient.createStudent({
          email: userEmail,
          ...localProfile
        });
      }

      if (student) {
        currentStudentId = student.id;
        localStorage.setItem('jasmine_student_id', student.id);

        // Load all data from Supabase into localStorage
        await loadFromCloud();

        // Process any pending queue items
        processQueue();
      }

      return student;
    } catch (e) {
      console.error('DataSync initialization error:', e);
      return null;
    }
  }

  async function loadFromCloud() {
    if (!currentStudentId || !isOnline) return;

    try {
      // Load student profile
      const student = await SupabaseClient.getStudent(currentStudentId);
      if (student) {
        const profile = {
          email: student.email,
          firstName: student.first_name,
          lastName: student.last_name,
          school: student.school,
          graduationYear: student.graduation_year,
          gpa: student.gpa,
          city: student.location_city,
          state: student.location_state,
          zip: student.location_zip,
          interests: student.interests || [],
          achievements: student.achievements || [],
          activities: student.activities || [],
          skills: student.skills || [],
          communityService: student.community_service || [],
          militaryFamily: student.military_family
        };
        localStorage.setItem('jasmine_student_profile', JSON.stringify(profile));
      }

      // Load scholarships
      const scholarships = await SupabaseClient.getScholarships(currentStudentId);
      const progressData = {};
      scholarships.forEach(s => {
        progressData[s.id] = {
          status: s.status,
          progress: s.progress_percent,
          checklist: s.checklist,
          notes: s.notes
        };
      });
      localStorage.setItem('jasmine_scholarship_progress', JSON.stringify(progressData));
      localStorage.setItem('jasmine_tracked_scholarships', JSON.stringify(scholarships));

      // Load essays
      const essays = await SupabaseClient.getEssays(currentStudentId);
      essays.forEach(essay => {
        if (essay.title) {
          localStorage.setItem(`essay_${essay.title}`, essay.content || '');
        }
      });
      localStorage.setItem('jasmine_essays_cloud', JSON.stringify(essays));

      // Load activity
      const activity = await SupabaseClient.getActivity(currentStudentId, 100);
      localStorage.setItem('jasmine_activity_log', JSON.stringify(activity.map(a => ({
        action: a.action,
        details: a.details,
        timestamp: a.created_at
      }))));

      console.log('DataSync: Loaded data from cloud');
    } catch (e) {
      console.error('DataSync: Error loading from cloud:', e);
    }
  }

  // ========== PROFILE ==========

  function getProfile() {
    return JSON.parse(localStorage.getItem('jasmine_student_profile') || '{}');
  }

  async function saveProfile(profile) {
    // Always save to localStorage immediately
    const existing = getProfile();
    const merged = { ...existing, ...profile };
    localStorage.setItem('jasmine_student_profile', JSON.stringify(merged));

    // Sync to cloud
    if (currentStudentId && isOnline) {
      try {
        await SupabaseClient.updateStudent(currentStudentId, profile);
      } catch (e) {
        addToQueue({ type: 'updateProfile', studentId: currentStudentId, data: profile });
      }
    } else if (currentStudentId) {
      addToQueue({ type: 'updateProfile', studentId: currentStudentId, data: profile });
    }

    return merged;
  }

  // ========== SCHOLARSHIPS ==========

  function getScholarshipProgress() {
    return JSON.parse(localStorage.getItem('jasmine_scholarship_progress') || '{}');
  }

  async function saveScholarshipProgress(scholarshipId, progress) {
    const all = getScholarshipProgress();
    all[scholarshipId] = { ...all[scholarshipId], ...progress, updatedAt: Date.now() };
    localStorage.setItem('jasmine_scholarship_progress', JSON.stringify(all));

    if (currentStudentId && isOnline) {
      try {
        await SupabaseClient.updateScholarship(scholarshipId, progress);
      } catch (e) {
        addToQueue({ type: 'updateScholarship', id: scholarshipId, data: progress });
      }
    } else if (currentStudentId) {
      addToQueue({ type: 'updateScholarship', id: scholarshipId, data: progress });
    }
  }

  function getCustomScholarships() {
    return JSON.parse(localStorage.getItem('jasmine_custom_scholarships') || '[]');
  }

  async function addCustomScholarship(scholarship) {
    const list = getCustomScholarships();
    const newScholarship = { ...scholarship, id: `custom_${Date.now()}`, createdAt: Date.now() };
    list.push(newScholarship);
    localStorage.setItem('jasmine_custom_scholarships', JSON.stringify(list));

    if (currentStudentId && isOnline) {
      try {
        const saved = await SupabaseClient.addScholarship(currentStudentId, scholarship);
        if (saved) {
          newScholarship.cloudId = saved.id;
          localStorage.setItem('jasmine_custom_scholarships', JSON.stringify(list));
        }
      } catch (e) {
        addToQueue({ type: 'addScholarship', studentId: currentStudentId, data: scholarship });
      }
    } else if (currentStudentId) {
      addToQueue({ type: 'addScholarship', studentId: currentStudentId, data: scholarship });
    }

    return newScholarship;
  }

  // ========== ESSAYS ==========

  function getEssay(essayKey) {
    return localStorage.getItem(`essay_${essayKey}`) || '';
  }

  async function saveEssay(essayKey, content) {
    localStorage.setItem(`essay_${essayKey}`, content);

    // Find or create essay in cloud
    if (currentStudentId && isOnline) {
      try {
        const essays = JSON.parse(localStorage.getItem('jasmine_essays_cloud') || '[]');
        const existing = essays.find(e => e.title === essayKey);

        if (existing) {
          await SupabaseClient.updateEssay(existing.id, { content });
        } else {
          const saved = await SupabaseClient.addEssay(currentStudentId, {
            title: essayKey,
            content,
            status: 'draft'
          });
          if (saved) {
            essays.push(saved);
            localStorage.setItem('jasmine_essays_cloud', JSON.stringify(essays));
          }
        }
      } catch (e) {
        addToQueue({ type: 'updateEssay', studentId: currentStudentId, essayKey, data: { content } });
      }
    }
  }

  // ========== INTERVIEW ANSWERS ==========

  function getInterviewAnswers(interviewType) {
    return JSON.parse(localStorage.getItem(`interview_${interviewType}`) || '{}');
  }

  async function saveInterviewAnswers(interviewType, answers) {
    localStorage.setItem(`interview_${interviewType}`, JSON.stringify(answers));

    // Store as essay type in cloud
    if (currentStudentId) {
      await saveEssay(`interview_${interviewType}`, JSON.stringify(answers));
    }
  }

  // ========== DOCUMENTS ==========

  function getDocuments() {
    return JSON.parse(localStorage.getItem('jasmine_documents') || '[]');
  }

  function saveDocument(doc) {
    const docs = getDocuments();
    docs.push({ ...doc, id: `doc_${Date.now()}`, uploadedAt: Date.now() });
    localStorage.setItem('jasmine_documents', JSON.stringify(docs));
    return docs;
  }

  // ========== BADGES ==========

  function getBadges() {
    return JSON.parse(localStorage.getItem('jasmine_badges') || '[]');
  }

  async function addBadge(badge) {
    const badges = getBadges();
    if (!badges.find(b => b.type === badge.type)) {
      badges.push({ ...badge, earnedAt: Date.now() });
      localStorage.setItem('jasmine_badges', JSON.stringify(badges));

      // Sync to cloud (badges table exists)
      if (currentStudentId && isOnline && typeof SupabaseClient !== 'undefined') {
        try {
          await fetch(`https://ntmsclblmncklbxlttlw.supabase.co/rest/v1/badges`, {
            method: 'POST',
            headers: {
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXNjbGJsbW5ja2xieGx0dGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDUyNzUsImV4cCI6MjEwMzI4MTI3NX0.BVm-mcQsxJQAKHBgLEhnNRTL0Yazrys9uXaSifFucQU',
              'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXNjbGJsbW5ja2xieGx0dGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDUyNzUsImV4cCI6MjEwMzI4MTI3NX0.BVm-mcQsxJQAKHBgLEhnNRTL0Yazrys9uXaSifFucQU`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              student_id: currentStudentId,
              badge_type: badge.type,
              badge_name: badge.name,
              details: badge.details || {}
            })
          });
        } catch (e) {
          console.warn('Badge sync failed:', e);
        }
      }
    }
    return badges;
  }

  // ========== ACTIVITY LOG ==========

  function getActivityLog() {
    return JSON.parse(localStorage.getItem('jasmine_activity_log') || '[]');
  }

  async function logActivity(action, details = {}) {
    const log = getActivityLog();
    log.unshift({ action, details, timestamp: Date.now() });
    localStorage.setItem('jasmine_activity_log', JSON.stringify(log.slice(0, 100)));

    if (currentStudentId && isOnline) {
      try {
        await SupabaseClient.logActivity(currentStudentId, action, details);
      } catch (e) {
        addToQueue({ type: 'logActivity', studentId: currentStudentId, action, details });
      }
    } else if (currentStudentId) {
      addToQueue({ type: 'logActivity', studentId: currentStudentId, action, details });
    }
  }

  // ========== THEME ==========

  function getTheme() {
    return localStorage.getItem('jasmine_theme') || 'light';
  }

  function setTheme(theme) {
    localStorage.setItem('jasmine_theme', theme);
  }

  // ========== KNOWLEDGE VAULT ==========

  function getKnowledgeVault() {
    return JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
  }

  async function saveKnowledgeVault(vault) {
    localStorage.setItem('jasmine_knowledge_vault', JSON.stringify(vault));

    // Sync relevant parts to student profile
    if (currentStudentId) {
      const updates = {};
      if (vault.skills) updates.skills = vault.skills;
      if (vault.achievements) updates.achievements = vault.achievements;
      if (vault.activities) updates.activities = vault.activities;

      if (Object.keys(updates).length > 0) {
        await saveProfile(updates);
      }
    }
  }

  // ========== FORCE SYNC ==========

  async function forceSync() {
    await processQueue();
    await loadFromCloud();
    return true;
  }

  // ========== STATUS ==========

  function getSyncStatus() {
    return {
      isOnline,
      studentId: currentStudentId,
      queueLength: getQueue().length,
      lastSync: localStorage.getItem(LAST_SYNC_KEY)
    };
  }

  return {
    // Init
    initialize,
    loadFromCloud,
    forceSync,
    getSyncStatus,

    // Profile
    getProfile,
    saveProfile,

    // Scholarships
    getScholarshipProgress,
    saveScholarshipProgress,
    getCustomScholarships,
    addCustomScholarship,

    // Essays
    getEssay,
    saveEssay,

    // Interviews
    getInterviewAnswers,
    saveInterviewAnswers,

    // Documents
    getDocuments,
    saveDocument,

    // Badges
    getBadges,
    addBadge,

    // Activity
    getActivityLog,
    logActivity,

    // Theme
    getTheme,
    setTheme,

    // Knowledge
    getKnowledgeVault,
    saveKnowledgeVault
  };
})();

if (typeof window !== 'undefined') {
  window.DataSync = DataSync;

  // ========== AUTO-SYNC INTERCEPTOR ==========
  // Intercept localStorage writes for automatic cloud sync
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const syncKeys = [
    'jasmine_student_profile',
    'jasmine_scholarship_progress',
    'jasmine_custom_scholarships',
    'jasmine_badges',
    'jasmine_knowledge_vault'
  ];
  const essayPattern = /^essay_/;
  const interviewPattern = /^interview_/;

  let syncDebounce = null;

  localStorage.setItem = function(key, value) {
    originalSetItem(key, value);

    // Auto-sync supported keys to cloud
    const studentId = localStorage.getItem('jasmine_student_id');
    if (!studentId || !navigator.onLine) return;

    // Debounce sync to avoid too many requests
    clearTimeout(syncDebounce);
    syncDebounce = setTimeout(async () => {
      try {
        if (key === 'jasmine_student_profile') {
          const profile = JSON.parse(value);
          await SupabaseClient.updateStudent(studentId, profile);
        } else if (key === 'jasmine_scholarship_progress') {
          // Progress is synced per-scholarship, handled separately
        } else if (key === 'jasmine_badges') {
          // Badges handled by addBadge method
        } else if (essayPattern.test(key) || interviewPattern.test(key)) {
          const essayKey = key.replace(/^(essay_|interview_)/, '');
          const essays = JSON.parse(localStorage.getItem('jasmine_essays_cloud') || '[]');
          const existing = essays.find(e => e.title === key);
          if (existing) {
            await SupabaseClient.updateEssay(existing.id, { content: value });
          } else {
            await SupabaseClient.addEssay(studentId, { title: key, content: value, status: 'draft' });
          }
        }
      } catch (e) {
        console.warn('Auto-sync failed for', key, e);
      }
    }, 2000); // 2 second debounce
  };
}
