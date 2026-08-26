/**
 * Supabase Client - Database integration for Jasmine Scholarship Hub
 * Handles all cloud data storage, parent-student linking, and sync
 */

const SupabaseClient = (function() {
  'use strict';

  const SUPABASE_URL = 'https://ntmsclblmncklbxlttlw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXNjbGJsbW5ja2xieGx0dGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDUyNzUsImV4cCI6MjEwMzI4MTI3NX0.BVm-mcQsxJQAKHBgLEhnNRTL0Yazrys9uXaSifFucQU';

  const LOCAL_STUDENT_ID_KEY = 'jasmine_student_id';
  const LOCAL_PARENT_ID_KEY = 'jasmine_parent_id';

  async function request(endpoint, options = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation'
    };

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error: ${response.status} - ${error}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  // Generate 8-character invite code
  function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // ========== STUDENT FUNCTIONS ==========

  async function createStudent(profile) {
    const data = await request('students', {
      method: 'POST',
      body: {
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        birth_month: profile.birthMonth,
        birth_year: profile.birthYear ? parseInt(profile.birthYear) : null,
        school: profile.school,
        graduation_year: profile.graduationYear ? parseInt(profile.graduationYear) : null,
        gpa: profile.gpa ? parseFloat(profile.gpa) : null,
        location_city: profile.city,
        location_state: profile.state,
        location_zip: profile.zip,
        interests: profile.interests || [],
        achievements: profile.achievements || [],
        activities: profile.activities || [],
        skills: profile.skills || [],
        community_service: profile.communityService || [],
        military_family: profile.militaryFamily || false,
        invite_code: generateInviteCode()
      }
    });

    if (data && data[0]) {
      localStorage.setItem(LOCAL_STUDENT_ID_KEY, data[0].id);
      return data[0];
    }
    throw new Error('Failed to create student');
  }

  async function getStudent(id) {
    const data = await request(`students?id=eq.${id}`);
    return data && data[0] ? data[0] : null;
  }

  async function getStudentByEmail(email) {
    const data = await request(`students?email=eq.${encodeURIComponent(email)}`);
    return data && data[0] ? data[0] : null;
  }

  async function getStudentByInviteCode(code) {
    const data = await request(`students?invite_code=eq.${encodeURIComponent(code.toUpperCase())}`);
    return data && data[0] ? data[0] : null;
  }

  async function createOrUpdateStudent(profile) {
    // Check if student exists by email
    if (profile.email) {
      const existing = await getStudentByEmail(profile.email);
      if (existing) {
        // Update existing student
        const updated = await updateStudent(existing.id, profile);
        return updated || existing;
      }
    }

    // Check if we have a local student ID
    const localId = getLocalStudentId();
    if (localId) {
      const existing = await getStudent(localId);
      if (existing) {
        const updated = await updateStudent(existing.id, profile);
        return updated || existing;
      }
    }

    // Create new student
    return await createStudent(profile);
  }

  async function updateStudent(id, updates) {
    const body = {};
    if (updates.firstName) body.first_name = updates.firstName;
    if (updates.lastName) body.last_name = updates.lastName;
    if (updates.school) body.school = updates.school;
    if (updates.graduationYear) body.graduation_year = parseInt(updates.graduationYear);
    if (updates.gpa) body.gpa = parseFloat(updates.gpa);
    if (updates.interests) body.interests = updates.interests;
    if (updates.achievements) body.achievements = updates.achievements;
    if (updates.activities) body.activities = updates.activities;
    if (updates.skills) body.skills = updates.skills;
    body.updated_at = new Date().toISOString();

    const data = await request(`students?id=eq.${id}`, {
      method: 'PATCH',
      body
    });
    return data && data[0] ? data[0] : null;
  }

  function getLocalStudentId() {
    return localStorage.getItem(LOCAL_STUDENT_ID_KEY);
  }

  // ========== PARENT FUNCTIONS ==========

  async function createParent(profile) {
    const data = await request('parents', {
      method: 'POST',
      body: {
        email: profile.email,
        name: profile.name,
        report_frequency: profile.reportFrequency || 'weekly'
      }
    });

    if (data && data[0]) {
      localStorage.setItem(LOCAL_PARENT_ID_KEY, data[0].id);
      return data[0];
    }
    throw new Error('Failed to create parent');
  }

  async function getParent(id) {
    const data = await request(`parents?id=eq.${id}`);
    return data && data[0] ? data[0] : null;
  }

  async function getParentByEmail(email) {
    const data = await request(`parents?email=eq.${encodeURIComponent(email)}`);
    return data && data[0] ? data[0] : null;
  }

  async function updateParent(id, updates) {
    const body = {};
    if (updates.name) body.name = updates.name;
    if (updates.reportFrequency) body.report_frequency = updates.reportFrequency;

    const data = await request(`parents?id=eq.${id}`, {
      method: 'PATCH',
      body
    });
    return data && data[0] ? data[0] : null;
  }

  function getLocalParentId() {
    return localStorage.getItem(LOCAL_PARENT_ID_KEY);
  }

  // ========== PARENT-STUDENT LINKING ==========

  // Parent creates invite for student (parent-initiated)
  async function createParentInvite(parentId, studentEmail) {
    const inviteCode = generateInviteCode();
    const data = await request('parent_student_links', {
      method: 'POST',
      body: {
        parent_id: parentId,
        invite_code: inviteCode,
        invite_email: studentEmail,
        invited_by: 'parent',
        status: 'pending'
      }
    });

    if (data && data[0]) {
      return { ...data[0], invite_code: inviteCode };
    }
    throw new Error('Failed to create invite');
  }

  // Student accepts parent invite
  async function acceptParentInvite(studentId, inviteCode) {
    // Find the pending invite
    const invites = await request(`parent_student_links?invite_code=eq.${encodeURIComponent(inviteCode.toUpperCase())}&status=eq.pending`);

    if (!invites || !invites[0]) {
      throw new Error('Invalid or expired invite code');
    }

    const invite = invites[0];

    // Check max 2 parents
    const existingLinks = await request(`parent_student_links?student_id=eq.${studentId}&status=eq.active`);
    if (existingLinks && existingLinks.length >= 2) {
      throw new Error('Maximum of 2 parents already linked');
    }

    // Update the link
    const data = await request(`parent_student_links?id=eq.${invite.id}`, {
      method: 'PATCH',
      body: {
        student_id: studentId,
        status: 'active',
        confirmed_at: new Date().toISOString()
      }
    });

    return data && data[0] ? data[0] : null;
  }

  // Student creates invite for parent (student-initiated)
  async function createStudentInvite(studentId, parentEmail) {
    const inviteCode = generateInviteCode();
    const data = await request('parent_student_links', {
      method: 'POST',
      body: {
        student_id: studentId,
        invite_code: inviteCode,
        invite_email: parentEmail,
        invited_by: 'student',
        status: 'pending'
      }
    });

    if (data && data[0]) {
      return { ...data[0], invite_code: inviteCode };
    }
    throw new Error('Failed to create invite');
  }

  // Parent accepts student invite
  async function acceptStudentInvite(parentId, inviteCode) {
    const invites = await request(`parent_student_links?invite_code=eq.${encodeURIComponent(inviteCode.toUpperCase())}&status=eq.pending`);

    if (!invites || !invites[0]) {
      throw new Error('Invalid or expired invite code');
    }

    const invite = invites[0];

    // Check max 2 parents for this student
    const existingLinks = await request(`parent_student_links?student_id=eq.${invite.student_id}&status=eq.active`);
    if (existingLinks && existingLinks.length >= 2) {
      throw new Error('Student already has 2 parents linked');
    }

    const data = await request(`parent_student_links?id=eq.${invite.id}`, {
      method: 'PATCH',
      body: {
        parent_id: parentId,
        status: 'active',
        confirmed_at: new Date().toISOString()
      }
    });

    return data && data[0] ? data[0] : null;
  }

  // Get linked students for a parent
  async function getLinkedStudents(parentId) {
    const links = await request(`parent_student_links?parent_id=eq.${parentId}&status=eq.active&select=*,students(*)`);
    return links || [];
  }

  // Get linked parents for a student
  async function getLinkedParents(studentId) {
    const links = await request(`parent_student_links?student_id=eq.${studentId}&status=eq.active&select=*,parents(*)`);
    return links || [];
  }

  // ========== CONSENT TRACKING ==========

  async function recordConsent(studentId, consentType, version, ipAddress, userAgent) {
    const data = await request('consent_records', {
      method: 'POST',
      body: {
        student_id: studentId,
        consent_type: consentType,
        consent_version: version,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });
    return data && data[0] ? data[0] : null;
  }

  // ========== SCHOLARSHIPS ==========

  async function addScholarship(studentId, scholarship) {
    const data = await request('tracked_scholarships', {
      method: 'POST',
      body: {
        student_id: studentId,
        name: scholarship.name,
        organization: scholarship.organization,
        amount: scholarship.amount,
        deadline: scholarship.deadline,
        requirements: scholarship.requirements,
        url: scholarship.url,
        status: scholarship.status || 'researching',
        notes: scholarship.notes
      }
    });
    return data && data[0] ? data[0] : null;
  }

  async function getScholarships(studentId) {
    const data = await request(`tracked_scholarships?student_id=eq.${studentId}&order=deadline.asc`);
    return data || [];
  }

  async function updateScholarship(id, updates) {
    updates.updated_at = new Date().toISOString();
    const data = await request(`tracked_scholarships?id=eq.${id}`, {
      method: 'PATCH',
      body: updates
    });
    return data && data[0] ? data[0] : null;
  }

  // ========== ESSAYS ==========

  async function addEssay(studentId, essay) {
    const data = await request('essays', {
      method: 'POST',
      body: {
        student_id: studentId,
        scholarship_id: essay.scholarshipId,
        title: essay.title,
        prompt: essay.prompt,
        content: essay.content || '',
        word_count: essay.content ? essay.content.split(/\s+/).filter(Boolean).length : 0,
        status: essay.status || 'draft'
      }
    });
    return data && data[0] ? data[0] : null;
  }

  async function getEssays(studentId) {
    const data = await request(`essays?student_id=eq.${studentId}&order=updated_at.desc`);
    return data || [];
  }

  async function updateEssay(id, updates) {
    if (updates.content) {
      updates.word_count = updates.content.split(/\s+/).filter(Boolean).length;
    }
    updates.updated_at = new Date().toISOString();
    const data = await request(`essays?id=eq.${id}`, {
      method: 'PATCH',
      body: updates
    });
    return data && data[0] ? data[0] : null;
  }

  // ========== ACTIVITY LOG ==========

  async function logActivity(studentId, action, details = {}) {
    const data = await request('activity_log', {
      method: 'POST',
      body: {
        student_id: studentId,
        action: action,
        details: details
      }
    });
    return data && data[0] ? data[0] : null;
  }

  async function getActivity(studentId, limit = 20) {
    const data = await request(`activity_log?student_id=eq.${studentId}&order=created_at.desc&limit=${limit}`);
    return data || [];
  }

  // ========== NOTIFICATIONS ==========

  async function queueNotification(parentId, studentId, type, subject, body, scheduledFor = null) {
    const data = await request('notification_queue', {
      method: 'POST',
      body: {
        parent_id: parentId,
        student_id: studentId,
        notification_type: type,
        subject: subject,
        body: body,
        scheduled_for: scheduledFor || new Date().toISOString()
      }
    });
    return data && data[0] ? data[0] : null;
  }

  // ========== SYNC FROM LOCALSTORAGE ==========

  async function syncFromLocalStorage() {
    const studentId = getLocalStudentId();
    if (!studentId) return null;

    // Get profile from localStorage
    const localProfile = JSON.parse(localStorage.getItem('jasmine_student_profile') || '{}');
    const localVault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');

    // Merge and sync
    const profile = { ...localProfile, ...localVault };

    if (Object.keys(profile).length > 0) {
      await updateStudent(studentId, profile);
    }

    // Sync scholarships
    const localScholarships = JSON.parse(localStorage.getItem('jasmine_scholarships') || '[]');
    for (const scholarship of localScholarships) {
      await addScholarship(studentId, scholarship);
    }

    // Sync essays
    const localEssays = JSON.parse(localStorage.getItem('jasmine_essays') || '[]');
    for (const essay of localEssays) {
      await addEssay(studentId, essay);
    }

    return true;
  }

  return {
    // Student
    createStudent,
    createOrUpdateStudent,
    getStudent,
    getStudentByEmail,
    getStudentByInviteCode,
    updateStudent,
    getLocalStudentId,

    // Parent
    createParent,
    getParent,
    getParentByEmail,
    updateParent,
    getLocalParentId,

    // Linking
    createParentInvite,
    acceptParentInvite,
    createStudentInvite,
    acceptStudentInvite,
    getLinkedStudents,
    getLinkedParents,
    generateInviteCode,

    // Consent
    recordConsent,

    // Scholarships
    addScholarship,
    getScholarships,
    updateScholarship,

    // Essays
    addEssay,
    getEssays,
    updateEssay,

    // Activity
    logActivity,
    getActivity,

    // Notifications
    queueNotification,

    // Sync
    syncFromLocalStorage
  };
})();

if (typeof window !== 'undefined') {
  window.SupabaseClient = SupabaseClient;
}
