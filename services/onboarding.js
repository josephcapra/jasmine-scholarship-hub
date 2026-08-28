/**
 * Onboarding Wizard - Standalone module
 * Shows for first-time users to collect profile data
 * Includes age verification and consent for legal compliance
 */

const Onboarding = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_onboarding_complete';
  const PROFILE_KEY = 'jasmine_student_profile';
  const CONSENT_KEY = 'jasmine_consent';

  const STEPS = [
    {
      id: 'welcome',
      title: "Jasmine's Scholarship Hub",
      subtitle: "",
      fields: [
        { id: 'appInfo', type: 'appInfo' }
      ]
    },
    {
      id: 'role',
      title: 'Are You a Student or Parent?',
      subtitle: 'This helps us show you the right experience',
      fields: [
        { id: 'userRole', type: 'roleSelect' }
      ]
    },
    {
      id: 'age',
      title: 'Let\'s Verify Your Age',
      subtitle: 'This app is designed for students age 14 and older',
      fields: [
        { id: 'birthMonth', type: 'select', label: 'Birth Month', required: true, options: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] },
        { id: 'birthYear', type: 'select', label: 'Birth Year', required: true, options: generateYearOptions() }
      ]
    },
    {
      id: 'consent',
      title: 'Privacy & Terms',
      subtitle: 'Please review and accept to continue',
      fields: [
        { id: 'privacyConsent', type: 'consent' }
      ]
    },
    {
      id: 'resume',
      title: 'Do You Have a Resume?',
      subtitle: 'Upload it and we\'ll fill in your profile automatically',
      fields: [
        { id: 'hasResume', type: 'resumeUpload' }
      ]
    },
    {
      id: 'reportcards',
      title: 'Report Cards & Transcripts',
      subtitle: 'Upload your report cards or transcripts (optional)',
      fields: [
        { id: 'reportCards', type: 'multiFileUpload', category: 'reportcard', accept: '.pdf,image/*', label: 'Report Cards / Transcripts' }
      ]
    },
    {
      id: 'awards',
      title: 'Awards & Certificates',
      subtitle: 'Upload photos or PDFs of your awards (optional)',
      fields: [
        { id: 'awardDocs', type: 'multiFileUpload', category: 'award', accept: '.pdf,image/*', label: 'Awards & Certificates' }
      ]
    }
  ];

  function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear - 13; y >= currentYear - 22; y--) {
      years.push(y.toString());
    }
    return years;
  }

  let currentStep = 0;
  let formData = {};

  function shouldShow() {
    if (localStorage.getItem(STORAGE_KEY) === 'true') return false;
    if (localStorage.getItem('jasmine_wizard_seen') === 'true') return false;
    return true;
  }

  function getProfile() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      const vault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
      return { ...profile, ...vault };
    } catch (e) {
      return {};
    }
  }

  function calculateAge(birthMonth, birthYear) {
    const monthIndex = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(birthMonth);
    const birthDate = new Date(parseInt(birthYear), monthIndex, 1);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0) age--;
    return age;
  }

  function show(manual = false) {
    if (!manual) {
      localStorage.setItem('jasmine_wizard_seen', 'true');
    }

    injectStyles();
    currentStep = 0;
    formData = getProfile();

    const overlay = document.createElement('div');
    overlay.id = 'onboarding-overlay';
    overlay.innerHTML = '<div id="onboarding-container"></div>';
    document.body.appendChild(overlay);

    render();
  }

  function render() {
    const container = document.getElementById('onboarding-container');
    if (!container) return;

    const step = STEPS[currentStep];
    const progress = ((currentStep) / (STEPS.length - 1)) * 100;
    const isFirst = currentStep === 0;
    const isLast = currentStep === STEPS.length - 1;

    container.innerHTML = `
      <div class="ob-card">
        ${step.id !== 'welcome' ? `
        <div class="ob-progress"><div class="ob-progress-bar" style="width:${progress}%"></div></div>
        <div class="ob-step">Step ${currentStep} of ${STEPS.length - 1}</div>
        ` : ''}

        <h2 class="ob-title">${step.title}</h2>
        ${step.subtitle ? `<p class="ob-subtitle">${step.subtitle}</p>` : ''}

        <div class="ob-fields">
          ${step.fields.map(f => renderField(f)).join('')}
        </div>

        ${step.id !== 'welcome' ? `
        <div class="ob-actions">
          ${!isFirst ? `<button class="ob-btn ob-btn-secondary" onclick="Onboarding.prev()">← Back</button>` : '<div></div>'}
          <button class="ob-btn ob-btn-primary" id="ob-next-btn" onclick="Onboarding.next()">
            ${isLast ? 'Finish Setup →' : 'Continue →'}
          </button>
        </div>

        ${(currentStep > 2) ? `<button class="ob-skip" onclick="Onboarding.skip()">Skip for now</button>` : ''}
        ` : ''}
      </div>
    `;

    step.fields.forEach(f => {
      const el = document.getElementById('ob-' + f.id);
      if (el && formData[f.id]) {
        if (f.type === 'toggle' || f.type === 'consent') {
        } else {
          el.value = formData[f.id];
        }
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderField(f) {
    const val = formData[f.id] || '';
    const safeVal = escapeHtml(val);
    switch (f.type) {
      case 'text':
      case 'email':
      case 'number':
        return `
          <div class="ob-field">
            <label>${f.label}${f.required ? ' *' : ''}</label>
            <input type="${f.type}" id="ob-${f.id}" placeholder="${f.placeholder || ''}"
              value="${safeVal}" ${f.step ? `step="${f.step}"` : ''} ${f.required ? 'required' : ''}>
          </div>`;

      case 'select':
        return `
          <div class="ob-field">
            <label>${f.label}${f.required ? ' *' : ''}</label>
            <select id="ob-${f.id}" ${f.required ? 'required' : ''}>
              <option value="">Select...</option>
              ${f.options.map(o => `<option value="${escapeHtml(o)}" ${val === o ? 'selected' : ''}>${escapeHtml(o)}</option>`).join('')}
            </select>
          </div>`;

      case 'toggle':
        return `
          <div class="ob-toggle" onclick="Onboarding.toggle('${f.id}')">
            <div>
              <div class="ob-toggle-label">${f.label}</div>
              ${f.desc ? `<div class="ob-toggle-desc">${f.desc}</div>` : ''}
            </div>
            <div class="ob-switch ${formData[f.id] ? 'active' : ''}" id="ob-${f.id}">
              <div class="ob-knob"></div>
            </div>
          </div>`;

      case 'appInfo':
        return `
          <div class="ob-app-info">
            <div class="ob-hero">
              <div class="ob-hero-badges">
                <span class="ob-badge">🎓 Free</span>
                <span class="ob-badge">🔒 Private</span>
                <span class="ob-badge">✨ AI-Powered</span>
              </div>
              <h1 class="ob-hero-title">Your Scholarship Journey Starts Here</h1>
            </div>

            <div class="ob-value-props">
              <div class="ob-value-card ob-value-discover">
                <div class="ob-value-icon">🔍</div>
                <div class="ob-value-label">DISCOVER</div>
                <div class="ob-value-text">Find scholarships that match YOUR unique profile</div>
              </div>
              <div class="ob-value-card ob-value-guide">
                <div class="ob-value-icon">🧭</div>
                <div class="ob-value-label">GUIDE</div>
                <div class="ob-value-text">Essay writing tools & deadline tracking</div>
              </div>
              <div class="ob-value-card ob-value-win">
                <div class="ob-value-icon">🏆</div>
                <div class="ob-value-label">WIN</div>
                <div class="ob-value-text">Students using our app win 3x more scholarships</div>
              </div>
            </div>

            <div class="ob-auth-buttons">
              <button type="button" class="ob-btn ob-btn-primary ob-btn-large" onclick="Onboarding.selectRole('student'); Onboarding.next();">
                I'm a Student →
              </button>
              <button type="button" class="ob-btn ob-btn-secondary ob-btn-large" onclick="window.location.href='parents.html'">
                I'm a Parent →
              </button>
            </div>
            <div style="text-align: center; margin-top: 12px;">
              <button type="button" class="ob-btn ob-btn-link" onclick="Onboarding.showLogin()">
                Already have an account? Sign in
              </button>
            </div>

            <div class="ob-trust-row">
              <span>🔒 Your data is never sold</span>
              <span>•</span>
              <span>🤖 AI doesn't train on your essays</span>
            </div>

            <div class="ob-beta-notice">
              <div class="ob-beta-badge">🎉 INVITED</div>
              <div class="ob-beta-text">
                <strong>You've been invited to join our Beta Testing Team!</strong>
                <p>Get full access to all features completely free in exchange for answering periodic survey questions to help us improve.</p>
              </div>
            </div>
          </div>`;

      case 'roleSelect':
        return `
          <div class="ob-role-section">
            <div class="ob-role-options">
              <button type="button" class="ob-role-btn ${formData.userRole === 'student' ? 'selected' : ''}" onclick="Onboarding.selectRole('student', this)">
                <div class="ob-role-emoji">🎓</div>
                <div class="ob-role-title">I'm a Student</div>
                <div class="ob-role-desc">Looking for scholarships and planning for college</div>
              </button>
              <button type="button" class="ob-role-btn ${formData.userRole === 'parent' ? 'selected' : ''}" onclick="Onboarding.selectRole('parent', this)">
                <div class="ob-role-emoji">👨‍👩‍👧</div>
                <div class="ob-role-title">I'm a Parent</div>
                <div class="ob-role-desc">Supporting my child's scholarship journey</div>
              </button>
            </div>
          </div>`;

      case 'consent':
        const isAccepted = formData.privacyAccepted && formData.termsAccepted;
        return `
          <div class="ob-consent-section">
            <div class="ob-consent-box">
              <div class="ob-consent-header">Your Privacy Matters</div>
              <ul class="ob-consent-list">
                <li>✓ We do NOT sell your personal information</li>
                <li>✓ We do NOT use your data for targeted advertising</li>
                <li>✓ Essay tools help you improve - YOU remain the author</li>
                <li>✓ Your data is stored securely and you can delete it anytime</li>
              </ul>
            </div>

            <div class="ob-consent-checks">
              <label class="ob-checkbox-label" onclick="Onboarding.toggleConsent('privacy')">
                <div class="ob-checkbox ${formData.privacyAccepted ? 'checked' : ''}" id="ob-privacy-check">
                  ${formData.privacyAccepted ? '✓' : ''}
                </div>
                <span>I have read and agree to the <a href="privacy.html" target="_blank" onclick="event.stopPropagation()">Privacy Policy</a></span>
              </label>

              <label class="ob-checkbox-label" onclick="Onboarding.toggleConsent('terms')">
                <div class="ob-checkbox ${formData.termsAccepted ? 'checked' : ''}" id="ob-terms-check">
                  ${formData.termsAccepted ? '✓' : ''}
                </div>
                <span>I agree to the <a href="terms.html" target="_blank" onclick="event.stopPropagation()">Terms of Service</a></span>
              </label>

              <label class="ob-checkbox-label" onclick="Onboarding.toggleConsent('age')">
                <div class="ob-checkbox ${formData.ageConfirmed ? 'checked' : ''}" id="ob-age-check">
                  ${formData.ageConfirmed ? '✓' : ''}
                </div>
                <span>I confirm I am 14 years of age or older</span>
              </label>
            </div>

            <div class="ob-consent-minor-note">
              If you are under 18, a parent or guardian should be aware of and consent to your use of this app.
            </div>
          </div>`;

      case 'resumeUpload':
        return `
          <div class="ob-resume-section">
            <div class="ob-resume-options">
              <button type="button" class="ob-resume-btn ${formData.resumeUploaded ? 'uploaded' : ''}" onclick="document.getElementById('ob-resume-input').click()">
                <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3"/>
                </svg>
                <span>${formData.resumeUploaded ? '✓ Resume Uploaded' : 'Upload Resume'}</span>
                <span class="ob-resume-hint">PDF, DOC, or TXT</span>
              </button>
              <input type="file" id="ob-resume-input" accept=".pdf,.doc,.docx,.txt" style="display:none" onchange="Onboarding.handleResumeUpload(event)">
            </div>
            <div id="ob-resume-status" class="ob-resume-status"></div>
            <button type="button" class="ob-skip-resume" onclick="Onboarding.skipResume()">
              I don't have a resume yet
            </button>
          </div>`;

      case 'multiFileUpload':
        const uploadedFiles = formData[f.id] || [];
        return `
          <div class="ob-multi-upload">
            <div class="ob-upload-area" onclick="document.getElementById('ob-${f.id}-input').click()">
              <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 8px; opacity: 0.6;">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div style="font-weight: 600; margin-bottom: 4px;">Tap to upload files</div>
              <div style="font-size: 0.85rem; color: #6b7280;">PDF or images • You can add multiple</div>
            </div>
            <input type="file" id="ob-${f.id}-input" accept="${f.accept || '.pdf,image/*'}" multiple style="display:none"
              onchange="Onboarding.handleMultiUpload(event, '${f.id}', '${f.category}')">

            <div id="ob-${f.id}-list" class="ob-file-list">
              ${uploadedFiles.map((file, i) => `
                <div class="ob-file-item">
                  <span class="ob-file-icon">${file.type?.includes('image') ? '🖼️' : '📄'}</span>
                  <span class="ob-file-name">${file.name}</span>
                  <button type="button" class="ob-file-remove" onclick="Onboarding.removeUploadedFile('${f.id}', ${i})">×</button>
                </div>
              `).join('')}
            </div>
            ${uploadedFiles.length > 0 ? `<div class="ob-file-count">${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} added</div>` : ''}
          </div>`;

      default:
        return '';
    }
  }

  function toggleConsent(type) {
    if (type === 'privacy') {
      formData.privacyAccepted = !formData.privacyAccepted;
    } else if (type === 'terms') {
      formData.termsAccepted = !formData.termsAccepted;
    } else if (type === 'age') {
      formData.ageConfirmed = !formData.ageConfirmed;
    }
    render();
  }

  async function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('ob-resume-status');
    status.innerHTML = '<div class="ob-loading">Analyzing your resume with AI... 🔍</div>';

    try {
      const reader = new FileReader();
      const fileData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/extract-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileData: fileData
        })
      });

      console.log('API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Extraction result:', data);
        if (data.profile && Object.keys(data.profile).length > 0) {
          Object.entries(data.profile).forEach(([key, value]) => {
            if (value && !formData[key]) {
              formData[key] = value;
            }
          });
          formData.resumeUploaded = true;
          console.log('formData after merge:', JSON.stringify(formData));

          localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));
          const existingVault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
          const mergedVault = { ...existingVault, ...data.profile };
          localStorage.setItem('jasmine_knowledge_vault', JSON.stringify(mergedVault));

          const p = data.profile;
          status.innerHTML = `
            <div class="ob-success">
              ✓ Found: ${p.firstName || ''} ${p.lastName || ''}<br>
              ${p.email ? '✓ Email: ' + p.email + '<br>' : ''}
              ${p.school ? '✓ School: ' + p.school + '<br>' : ''}
              ${p.gpa ? '✓ GPA: ' + p.gpa + '<br>' : ''}
              ${p.achievements?.length ? '✓ ' + p.achievements.length + ' achievements detected<br>' : ''}
              <small>We'll pre-fill your profile with this info!</small>
            </div>
          `;

          const btn = document.querySelector('.ob-resume-btn');
          if (btn) btn.classList.add('uploaded');
          return;
        }
      }

      formData.resumeUploaded = true;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));
      status.innerHTML = '<div class="ob-success">✓ Resume saved! Please fill in your details manually.</div>';
      const btn = document.querySelector('.ob-resume-btn');
      if (btn) btn.classList.add('uploaded');
    } catch (e) {
      console.error('Resume upload error:', e);
      formData.resumeUploaded = true;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));
      status.innerHTML = '<div class="ob-success">✓ Resume saved! Please fill in your details manually.</div>';
      const btn = document.querySelector('.ob-resume-btn');
      if (btn) btn.classList.add('uploaded');
    }
  }

  function skipResume() {
    formData.resumeSkipped = true;
    next();
  }

  function collectValues() {
    const step = STEPS[currentStep];
    step.fields.forEach(f => {
      const el = document.getElementById('ob-' + f.id);
      if (el && f.type !== 'toggle' && f.type !== 'chips' && f.type !== 'consent') {
        formData[f.id] = el.value;
      }
    });
  }

  function next() {
    collectValues();

    const step = STEPS[currentStep];

    // Age verification
    if (step.id === 'age') {
      const month = formData.birthMonth;
      const year = formData.birthYear;
      if (!month || !year) {
        alert('Please select your birth month and year.');
        return;
      }
      const age = calculateAge(month, year);
      formData.calculatedAge = age;
      if (age < 14) {
        showAgeBlocker();
        return;
      }
    }

    // Consent validation
    if (step.id === 'consent') {
      if (!formData.privacyAccepted || !formData.termsAccepted || !formData.ageConfirmed) {
        alert('Please accept all required items to continue.');
        return;
      }
      // Record consent
      const consent = {
        privacyVersion: '1.0',
        termsVersion: '1.0',
        timestamp: new Date().toISOString(),
        ageConfirmed: true
      };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    }

    // Required field validation
    for (const f of step.fields) {
      if (f.required && !formData[f.id] && f.type !== 'consent') {
        alert('Please fill in: ' + f.label);
        return;
      }
    }

    if (currentStep < STEPS.length - 1) {
      currentStep++;
      render();
    } else {
      complete();
    }
  }

  function showAgeBlocker() {
    const container = document.getElementById('onboarding-container');
    if (!container) return;

    container.innerHTML = `
      <div class="ob-card">
        <h2 class="ob-title">We're Sorry</h2>
        <p class="ob-subtitle" style="margin-bottom: 24px;">
          This app is currently available only to students age 14 and older.
        </p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 12px; margin-bottom: 24px;">
          <p style="margin: 0; color: #991b1b;">
            We take privacy seriously, especially for younger users. Please check back when you're 14, or ask a parent to help you find age-appropriate scholarship resources.
          </p>
        </div>
        <button class="ob-btn ob-btn-secondary" style="width: 100%;" onclick="Onboarding.close()">Close</button>
      </div>
    `;
  }

  function prev() {
    collectValues();
    if (currentStep > 0) {
      currentStep--;
      render();
    }
  }

  function toggle(fieldId) {
    formData[fieldId] = !formData[fieldId];
    const el = document.getElementById('ob-' + fieldId);
    if (el) el.classList.toggle('active', formData[fieldId]);
  }

  function selectRole(role, btnElement) {
    formData.userRole = role;
    // Update button states
    document.querySelectorAll('.ob-role-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    if (btnElement) btnElement.classList.add('selected');

    // If parent, redirect to parent page after a short delay
    if (role === 'parent') {
      setTimeout(() => {
        localStorage.setItem('jasmine_wizard_seen', 'true');
        window.location.href = 'parents.html';
      }, 300);
    } else {
      // Auto-advance to next step for students
      setTimeout(() => next(), 300);
    }
  }

  function showLogin() {
    // Close onboarding and show login screen
    close();
    // Show the login screen if it exists
    const loginScreen = document.getElementById('login-screen');
    const mainApp = document.getElementById('main-app');
    if (loginScreen) {
      loginScreen.style.display = 'flex';
      if (mainApp) mainApp.classList.remove('visible');
    } else {
      // Fallback: just close and let the app handle it
      alert('Please log in with your existing account credentials.');
    }
  }

  function skip() {
    if (confirm('You can complete your profile later. Skip for now?')) {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));
      close();
    }
  }

  async function complete() {
    try {
      collectValues();
      console.log('[Onboarding] Completing setup with formData:', JSON.stringify(formData));

      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));

      const existingVault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
      const mergedVault = { ...existingVault, ...formData };
      localStorage.setItem('jasmine_knowledge_vault', JSON.stringify(mergedVault));

      // Sync to Supabase if available
      if (typeof SupabaseClient !== 'undefined' && formData.firstName && formData.lastName) {
        try {
          console.log('[Onboarding] Syncing to Supabase...');
          const email = formData.email || `${formData.firstName.toLowerCase()}.${formData.lastName.toLowerCase()}@student.local`;
          const studentData = {
            email: email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            birthMonth: formData.birthMonth,
            birthYear: formData.birthYear,
            school: formData.school || null,
            graduationYear: formData.graduationYear,
            gpa: formData.gpa,
            state: formData.state || 'FL',
            interests: formData.interests || [],
            achievements: formData.achievements || [],
            activities: formData.activities || []
          };
          const student = await SupabaseClient.createOrUpdateStudent(studentData);
          if (student && student.id) {
            localStorage.setItem('jasmine_student_id', student.id);
            console.log('[Onboarding] Student synced to Supabase:', student.id);
          }
        } catch (syncError) {
          console.warn('[Onboarding] Supabase sync failed (continuing locally):', syncError);
        }
      }

      console.log('[Onboarding] Setup complete, closing modal');
      close();

      // Reload page to show the main app with new profile
      setTimeout(() => {
        window.location.reload();
      }, 100);

    } catch (error) {
      console.error('[Onboarding] Error completing setup:', error);
      alert('There was an error saving your profile. Please try again.');
    }
  }

  function close() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.remove();
  }

  function handleMultiUpload(event, fieldId, category) {
    const files = event.target.files;
    if (!files.length) return;

    if (!formData[fieldId]) formData[fieldId] = [];

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large (max 10MB)`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        formData[fieldId].push({
          name: file.name,
          type: file.type,
          dataUrl: reader.result,
          category: category
        });

        const docs = JSON.parse(localStorage.getItem('jasmine_documents') || '[]');
        docs.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          title: file.name.replace(/\.[^/.]+$/, ''),
          type: file.type,
          category: category,
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString()
        });
        localStorage.setItem('jasmine_documents', JSON.stringify(docs));

        render();
      };
      reader.readAsDataURL(file);
    }

    event.target.value = '';
  }

  function removeUploadedFile(fieldId, index) {
    if (formData[fieldId] && formData[fieldId][index]) {
      formData[fieldId].splice(index, 1);
      render();
    }
  }

  function injectStyles() {
    if (document.getElementById('onboarding-styles')) return;

    const style = document.createElement('style');
    style.id = 'onboarding-styles';
    style.textContent = `
      #onboarding-overlay {
        position: fixed; inset: 0; z-index: 99999;
        background: linear-gradient(135deg, #7c3aed, #ec4899);
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
      }
      .ob-card {
        background: white; border-radius: 20px; padding: 24px;
        width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .ob-progress { height: 6px; background: #e5e7eb; border-radius: 3px; margin-bottom: 8px; }
      .ob-progress-bar { height: 100%; background: linear-gradient(90deg, #7c3aed, #ec4899); border-radius: 3px; transition: width 0.3s; }
      .ob-step { text-align: center; font-size: 0.8rem; color: #9ca3af; margin-bottom: 16px; }
      .ob-title { font-size: 1.4rem; font-weight: 800; text-align: center; margin-bottom: 4px; }
      .ob-subtitle { text-align: center; color: #6b7280; font-size: 0.95rem; margin-bottom: 24px; }
      .ob-fields { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
      .ob-field label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; }
      .ob-field input, .ob-field select {
        width: 100%; padding: 12px 14px; border: 2px solid #e5e7eb; border-radius: 10px;
        font-size: 1rem; font-family: inherit;
      }
      .ob-field input:focus, .ob-field select:focus { outline: none; border-color: #7c3aed; }
      .ob-actions { display: flex; justify-content: space-between; gap: 12px; }
      .ob-btn {
        padding: 14px 24px; border-radius: 12px; font-size: 1rem; font-weight: 700;
        cursor: pointer; border: none; transition: all 0.2s;
      }
      .ob-btn-primary {
        background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; flex: 1;
      }
      .ob-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(124,58,237,0.4); }
      .ob-btn-secondary { background: #f3f4f6; color: #374151; }
      .ob-skip {
        display: block; width: 100%; text-align: center; margin-top: 16px;
        background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 0.9rem;
      }
      .ob-consent-section { text-align: left; }
      .ob-consent-box {
        background: #f5f3ff; border-radius: 12px; padding: 16px; margin-bottom: 20px;
      }
      .ob-consent-header { font-weight: 700; margin-bottom: 12px; color: #000000; }
      .ob-consent-list { margin: 0; padding-left: 0; list-style: none; color: #000000; }
      .ob-consent-list li { margin-bottom: 8px; font-size: 0.95rem; color: #000000; }
      .ob-consent-checks { display: flex; flex-direction: column; gap: 12px; }
      .ob-checkbox-label {
        display: flex; align-items: flex-start; gap: 12px; cursor: pointer;
        padding: 12px; background: #f9fafb; border-radius: 10px;
      }
      .ob-checkbox-label:hover { background: #f3f4f6; }
      .ob-checkbox {
        width: 24px; height: 24px; min-width: 24px; border: 2px solid #d1d5db;
        border-radius: 6px; display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: bold; color: white; background: white;
      }
      .ob-checkbox.checked { background: #7c3aed; border-color: #7c3aed; }
      .ob-checkbox-label span { font-size: 0.95rem; line-height: 1.4; color: #000000; }
      .ob-checkbox-label a { color: #7c3aed; text-decoration: underline; }
      .ob-consent-minor-note {
        margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px;
        font-size: 0.85rem; color: #000000;
      }
      .ob-role-section { padding: 10px 0; }
      .ob-role-options { display: flex; flex-direction: column; gap: 16px; }
      .ob-role-btn {
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        padding: 24px 20px; background: #f9fafb; border: 3px solid #e5e7eb;
        border-radius: 16px; cursor: pointer; transition: all 0.2s; text-align: center;
      }
      .ob-role-btn:hover { background: #f3f4f6; border-color: #d1d5db; transform: translateY(-2px); }
      .ob-role-btn.selected { background: #ede9fe; border-color: #7c3aed; }
      .ob-role-emoji { font-size: 3rem; }
      .ob-role-title { font-size: 1.2rem; font-weight: 800; color: #1f2937; }
      .ob-role-desc { font-size: 0.9rem; color: #6b7280; }
      .ob-app-info { text-align: center; }
      .ob-hero { margin-bottom: 24px; }
      .ob-hero-badges { display: flex; justify-content: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
      .ob-badge {
        background: linear-gradient(135deg, #ede9fe, #fce7f3);
        color: #7c3aed; padding: 6px 12px; border-radius: 20px;
        font-size: 0.75rem; font-weight: 700;
      }
      .ob-hero-title {
        font-size: 1.6rem; font-weight: 800; line-height: 1.3;
        background: linear-gradient(135deg, #7c3aed, #ec4899);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        background-clip: text; margin: 0;
      }
      .ob-value-props { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
      .ob-value-card {
        display: flex; align-items: center; gap: 14px; padding: 16px;
        border-radius: 14px; text-align: left; transition: transform 0.2s;
      }
      .ob-value-card:hover { transform: translateX(4px); }
      .ob-value-discover { background: linear-gradient(135deg, #dbeafe, #e0e7ff); }
      .ob-value-guide { background: linear-gradient(135deg, #dcfce7, #d1fae5); }
      .ob-value-win { background: linear-gradient(135deg, #fef3c7, #fde68a); }
      .ob-value-icon { font-size: 2rem; }
      .ob-value-label { font-size: 0.7rem; font-weight: 800; letter-spacing: 1px; color: #6b7280; }
      .ob-value-text { font-size: 0.9rem; color: #374151; line-height: 1.3; }
      .ob-auth-buttons { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; }
      .ob-btn-large { padding: 18px 24px !important; font-size: 1.1rem !important; }
      .ob-btn-link {
        background: none !important; color: #7c3aed !important;
        font-size: 0.9rem; text-decoration: underline;
      }
      .ob-trust-row {
        display: flex; justify-content: center; gap: 8px; flex-wrap: wrap;
        font-size: 0.75rem; color: #9ca3af;
      }
      .ob-beta-notice {
        display: flex; align-items: center; gap: 12px;
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border: 2px solid #f59e0b;
        border-radius: 12px; padding: 14px 18px; margin-top: 16px;
        text-align: left;
      }
      .ob-beta-badge {
        background: #f59e0b; color: white; font-weight: 800;
        padding: 6px 10px; border-radius: 8px; font-size: 0.75rem;
        white-space: nowrap;
      }
      .ob-beta-text { flex: 1; }
      .ob-beta-text strong { color: #92400e; font-size: 0.95rem; display: block; margin-bottom: 2px; }
      .ob-beta-text p { color: #78350f; font-size: 0.85rem; margin: 0; }
      .ob-resume-section { text-align: center; }
      .ob-resume-btn {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        width: 100%; padding: 30px 20px; border: 3px dashed #d1d5db; border-radius: 16px;
        background: #f9fafb; cursor: pointer; transition: all 0.2s; gap: 8px;
      }
      .ob-resume-btn:hover { border-color: #7c3aed; background: #ede9fe; }
      .ob-resume-btn.uploaded { border-color: #10b981; background: #d1fae5; border-style: solid; }
      .ob-resume-btn span { font-weight: 600; font-size: 1.1rem; }
      .ob-resume-hint { font-size: 0.8rem; color: #9ca3af; font-weight: 400; }
      .ob-resume-status { margin-top: 16px; text-align: left; }
      .ob-loading { color: #7c3aed; padding: 12px; background: #ede9fe; border-radius: 10px; }
      .ob-success { color: #065f46; padding: 12px; background: #d1fae5; border-radius: 10px; line-height: 1.6; }
      .ob-skip-resume {
        margin-top: 20px; background: none; border: none; color: #6b7280;
        cursor: pointer; font-size: 0.95rem; text-decoration: underline;
      }
      .ob-multi-upload { text-align: center; }
      .ob-upload-area {
        border: 3px dashed #c4b5fd; border-radius: 16px; padding: 32px 20px;
        cursor: pointer; transition: all 0.2s; background: rgba(124, 58, 237, 0.05);
      }
      .ob-upload-area:hover { border-color: #7c3aed; background: rgba(124, 58, 237, 0.1); }
      .ob-file-list { margin-top: 16px; text-align: left; }
      .ob-file-item {
        display: flex; align-items: center; gap: 10px; padding: 10px 14px;
        background: white; border-radius: 10px; margin-bottom: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      .ob-file-icon { font-size: 1.3rem; }
      .ob-file-name { flex: 1; font-weight: 500; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ob-file-remove {
        background: #fee2e2; color: #dc2626; border: none; width: 28px; height: 28px;
        border-radius: 50%; cursor: pointer; font-size: 1.2rem; font-weight: bold;
      }
      .ob-file-count { margin-top: 12px; font-weight: 600; color: #059669; }
    `;
    document.head.appendChild(style);
  }

  return {
    shouldShow,
    show,
    next,
    prev,
    toggle,
    toggleConsent,
    selectRole,
    showLogin,
    skip,
    skipResume,
    handleResumeUpload,
    handleMultiUpload,
    removeUploadedFile,
    getProfile,
    close
  };
})();
