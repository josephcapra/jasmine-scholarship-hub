/**
 * Onboarding Wizard - Standalone module
 * Shows for first-time users to collect profile data
 * Does NOT modify existing navigation or sections
 */

const Onboarding = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_onboarding_complete';
  const PROFILE_KEY = 'jasmine_student_profile';

  // Simplified wizard: just uploads, then go to profile screen
  const STEPS = [
    {
      id: 'welcome',
      title: "Welcome to Your Scholarship Hub! 🌟",
      subtitle: "Upload your documents and we'll extract your profile info automatically",
      fields: []
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

  let currentStep = 0;
  let formData = {};

  function shouldShow() {
    // Only auto-show if user has NEVER seen the wizard
    // Once they've clicked through once, never auto-show again
    // They can still manually trigger via "Run Full Profile Setup"
    if (localStorage.getItem(STORAGE_KEY) === 'true') return false;
    if (localStorage.getItem('jasmine_wizard_seen') === 'true') return false;
    return true;
  }

  function getProfile() {
    try {
      // Merge from both storage keys - knowledge_vault has extracted data
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      const vault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
      // Vault data takes priority (more recently extracted)
      return { ...profile, ...vault };
    } catch (e) {
      return {};
    }
  }

  function show(manual = false) {
    // Mark that user has seen the wizard (prevents future auto-popup)
    if (!manual) {
      localStorage.setItem('jasmine_wizard_seen', 'true');
    }

    injectStyles();
    currentStep = 0;
    formData = getProfile();

    // Create overlay
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
        <div class="ob-progress"><div class="ob-progress-bar" style="width:${progress}%"></div></div>
        <div class="ob-step">Step ${currentStep + 1} of ${STEPS.length}</div>

        <h2 class="ob-title">${step.title}</h2>
        <p class="ob-subtitle">${step.subtitle}</p>

        <div class="ob-fields">
          ${step.fields.map(f => renderField(f)).join('')}
        </div>

        <div class="ob-actions">
          ${!isFirst ? `<button class="ob-btn ob-btn-secondary" onclick="Onboarding.prev()">← Back</button>` : '<div></div>'}
          <button class="ob-btn ob-btn-primary" onclick="Onboarding.next()">
            ${isLast ? 'Finish Setup →' : isFirst ? 'Get Started →' : 'Continue →'}
          </button>
        </div>

        ${!isFirst ? `<button class="ob-skip" onclick="Onboarding.skip()">Skip for now</button>` : ''}
      </div>
    `;

    // Restore values
    step.fields.forEach(f => {
      const el = document.getElementById('ob-' + f.id);
      if (el && formData[f.id]) {
        if (f.type === 'toggle') {
          // handled separately
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

      case 'chips':
        return `
          <div class="ob-chips">
            ${f.options.map(o => `
              <button type="button" class="ob-chip ${(formData[f.id] || []).includes(o.value) ? 'selected' : ''}"
                onclick="Onboarding.toggleChip('${f.id}', '${o.value}')">
                ${o.label}
              </button>
            `).join('')}
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

  async function handleResumeUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('ob-resume-status');
    status.innerHTML = '<div class="ob-loading">Analyzing your resume with AI... 🔍</div>';

    try {
      // Convert file to base64 for AI extraction
      const reader = new FileReader();
      const fileData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Call AI extraction API
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
          // Merge extracted profile into formData
          Object.entries(data.profile).forEach(([key, value]) => {
            if (value && !formData[key]) {
              formData[key] = value;
            }
          });
          formData.resumeUploaded = true;
          console.log('formData after merge:', JSON.stringify(formData));

          // Save to localStorage immediately so data persists - save to BOTH keys for compatibility
          localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));
          // Also sync to jasmine_knowledge_vault so profile displays immediately
          const existingVault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
          const mergedVault = { ...existingVault, ...data.profile };
          localStorage.setItem('jasmine_knowledge_vault', JSON.stringify(mergedVault));
          console.log('Saved to both storage keys, vault now:', JSON.stringify(mergedVault));

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

          // Update button state
          const btn = document.querySelector('.ob-resume-btn');
          if (btn) btn.classList.add('uploaded');
          return;
        }
      }

      // Fallback to basic text extraction if AI fails
      const text = await extractTextFromFile(file);
      if (text) {
        const parsed = parseResumeText(text);
        Object.assign(formData, parsed);
        formData.resumeUploaded = true;
        formData.resumeText = text;

        // Save to localStorage immediately - save to BOTH keys
        localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));
        const existingVault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
        const mergedVault = { ...existingVault, ...parsed };
        localStorage.setItem('jasmine_knowledge_vault', JSON.stringify(mergedVault));

        status.innerHTML = `
          <div class="ob-success">
            ✓ Found: ${parsed.firstName || ''} ${parsed.lastName || ''}<br>
            ${parsed.school ? '✓ School: ' + parsed.school + '<br>' : ''}
            ${parsed.achievements?.length ? '✓ ' + parsed.achievements.length + ' achievements detected<br>' : ''}
            <small>We'll pre-fill your profile with this info!</small>
          </div>
        `;

        const btn = document.querySelector('.ob-resume-btn');
        if (btn) btn.classList.add('uploaded');
      } else {
        // PDF/DOC files can't be text-extracted locally, but API should have handled them
        status.innerHTML = '<div class="ob-success">✓ Resume saved! Fill in your details on the next screens.</div>';
        formData.resumeUploaded = true;
        localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));
        const btn = document.querySelector('.ob-resume-btn');
        if (btn) btn.classList.add('uploaded');
      }
    } catch (e) {
      console.error('Resume upload error:', e);
      // Still mark as uploaded so user can proceed
      formData.resumeUploaded = true;
      localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));
      status.innerHTML = '<div class="ob-success">✓ Resume saved! Please fill in your details manually.</div>';
      const btn = document.querySelector('.ob-resume-btn');
      if (btn) btn.classList.add('uploaded');
    }
  }

  async function extractTextFromFile(file) {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (name.endsWith('.txt') || type === 'text/plain') {
      return await file.text();
    }

    if (name.endsWith('.pdf') || type === 'application/pdf') {
      // For PDF, we'll store the file and try to extract basic info
      // Full PDF parsing would require a library
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = () => {
          // Try to extract text from PDF (basic approach)
          const text = extractTextFromPDFBuffer(reader.result);
          resolve(text);
        };
        reader.readAsArrayBuffer(file);
      });
    }

    // For DOC/DOCX, store for later and prompt manual entry
    formData.resumeFile = file;
    return null;
  }

  function extractTextFromPDFBuffer(buffer) {
    // Basic PDF text extraction - looks for text between parentheses
    try {
      const bytes = new Uint8Array(buffer);
      let text = '';
      let inText = false;
      let current = '';

      for (let i = 0; i < bytes.length; i++) {
        const char = String.fromCharCode(bytes[i]);
        if (char === '(' && !inText) {
          inText = true;
          current = '';
        } else if (char === ')' && inText) {
          inText = false;
          if (current.length > 2) text += current + ' ';
        } else if (inText) {
          if (bytes[i] >= 32 && bytes[i] < 127) {
            current += char;
          }
        }
      }
      return text.trim() || null;
    } catch (e) {
      return null;
    }
  }

  function parseResumeText(text) {
    const data = {};
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

    // Try to extract name (usually first line or near top)
    const namePatterns = [
      /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,
      /^([A-Z][a-z]+)\s+[A-Z]\.?\s+([A-Z][a-z]+)$/
    ];
    for (const line of lines.slice(0, 5)) {
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match) {
          data.firstName = match[1];
          data.lastName = match[2];
          break;
        }
      }
      if (data.firstName) break;
    }

    // Try to extract email
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+)/);
    if (emailMatch) data.email = emailMatch[1];

    // Try to extract school
    const schoolPatterns = [
      /(?:high school|hs):\s*(.+)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+High\s+School)/i,
      /(?:education|school)[\s:]+([A-Z][^,\n]+)/i
    ];
    for (const pattern of schoolPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.school = match[1].trim();
        break;
      }
    }

    // Try to extract GPA
    const gpaMatch = text.match(/GPA[:\s]+([0-9]\.[0-9]+)/i);
    if (gpaMatch) data.gpa = gpaMatch[1];

    // Try to extract graduation year
    const yearMatch = text.match(/(?:class of|graduation|grad)[:\s]+(\d{4})/i) ||
                      text.match(/(\d{4})\s*(?:graduate|graduation)/i);
    if (yearMatch) data.graduationYear = yearMatch[1];

    // Extract achievements/activities
    data.achievements = [];
    const achievementKeywords = ['award', 'honor', 'scholar', 'president', 'captain', 'leader', 'volunteer', 'national', 'state', 'first place', 'winner'];
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (achievementKeywords.some(k => lower.includes(k)) && line.length > 10 && line.length < 200) {
        data.achievements.push(line);
      }
    }
    data.achievements = data.achievements.slice(0, 5);

    // Detect interests from keywords
    data.interests = [];
    const interestMap = {
      arts: ['art', 'paint', 'draw', 'design', 'photo', 'visual'],
      music: ['music', 'band', 'orchestra', 'choir', 'instrument', 'piano', 'guitar'],
      writing: ['writ', 'journal', 'newspaper', 'editor', 'publish', 'author'],
      stem: ['science', 'math', 'engineer', 'computer', 'robot', 'code', 'program', 'research'],
      business: ['business', 'entrepreneur', 'market', 'finance', 'econom'],
      sports: ['athlet', 'sport', 'team', 'varsity', 'captain', 'basketball', 'football', 'soccer', 'swim', 'track'],
      service: ['volunteer', 'community', 'service', 'nonprofit', 'charity', 'help'],
      leadership: ['president', 'leader', 'captain', 'officer', 'director', 'founder']
    };
    const textLower = text.toLowerCase();
    for (const [interest, keywords] of Object.entries(interestMap)) {
      if (keywords.some(k => textLower.includes(k))) {
        data.interests.push(interest);
      }
    }

    return data;
  }

  function skipResume() {
    formData.resumeSkipped = true;
    next();
  }

  function collectValues() {
    const step = STEPS[currentStep];
    step.fields.forEach(f => {
      const el = document.getElementById('ob-' + f.id);
      if (el && f.type !== 'toggle' && f.type !== 'chips') {
        formData[f.id] = el.value;
      }
    });
  }

  function next() {
    collectValues();

    // Validate required fields
    const step = STEPS[currentStep];
    for (const f of step.fields) {
      if (f.required && !formData[f.id]) {
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

  function toggleChip(fieldId, value) {
    if (!formData[fieldId]) formData[fieldId] = [];
    const idx = formData[fieldId].indexOf(value);
    if (idx >= 0) {
      formData[fieldId].splice(idx, 1);
    } else {
      formData[fieldId].push(value);
    }
    render();
  }

  function skip() {
    if (confirm('You can complete your profile later. Skip for now?')) {
      localStorage.setItem(STORAGE_KEY, 'true');
      localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));
      close();
    }
  }

  function complete() {
    collectValues();
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem(PROFILE_KEY, JSON.stringify(formData));

    // Sync to knowledge vault for immediate profile display
    const existingVault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
    const mergedVault = { ...existingVault, ...formData };
    localStorage.setItem('jasmine_knowledge_vault', JSON.stringify(mergedVault));

    close();

    // Navigate to Profile section and refresh it
    if (typeof window.switchSection === 'function') {
      window.switchSection('profile');
    }
    if (typeof loadProfileSection === 'function') {
      loadProfileSection();
    }
  }

  function close() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) overlay.remove();
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
      .ob-toggle {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 14px; background: #f9fafb; border-radius: 10px; cursor: pointer;
      }
      .ob-toggle-label { font-weight: 600; }
      .ob-toggle-desc { font-size: 0.8rem; color: #6b7280; }
      .ob-switch {
        width: 44px; height: 26px; background: #d1d5db; border-radius: 13px;
        position: relative; transition: background 0.2s;
      }
      .ob-switch.active { background: #7c3aed; }
      .ob-knob {
        width: 20px; height: 20px; background: white; border-radius: 50%;
        position: absolute; top: 3px; left: 3px; transition: transform 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .ob-switch.active .ob-knob { transform: translateX(18px); }
      .ob-chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .ob-chip {
        padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 20px;
        background: white; cursor: pointer; font-size: 0.9rem; font-family: inherit;
        transition: all 0.2s;
      }
      .ob-chip:hover { border-color: #7c3aed; }
      .ob-chip.selected { border-color: #7c3aed; background: #ede9fe; }
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
      .ob-error { color: #dc2626; padding: 12px; background: #fee2e2; border-radius: 10px; }
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

  // Handle multi-file upload (for report cards, awards, etc.)
  function handleMultiUpload(event, fieldId, category) {
    const files = event.target.files;
    if (!files.length) return;

    // Initialize array if needed
    if (!formData[fieldId]) formData[fieldId] = [];

    // Process each file
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large (max 10MB)`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        // Add to formData
        formData[fieldId].push({
          name: file.name,
          type: file.type,
          dataUrl: reader.result,
          category: category
        });

        // Save to localStorage documents
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

        // Re-render the step to show updated list
        renderCurrentStep();
      };
      reader.readAsDataURL(file);
    }

    // Clear the input so the same file can be selected again
    event.target.value = '';
  }

  function removeUploadedFile(fieldId, index) {
    if (formData[fieldId] && formData[fieldId][index]) {
      formData[fieldId].splice(index, 1);
      renderCurrentStep();
    }
  }

  function renderCurrentStep() {
    const container = document.getElementById('ob-content');
    if (container && STEPS[currentStep]) {
      const step = STEPS[currentStep];
      container.innerHTML = `
        <h2 class="ob-title">${step.title}</h2>
        ${step.subtitle ? `<p class="ob-subtitle">${step.subtitle}</p>` : ''}
        <div class="ob-fields">
          ${step.fields.map(renderField).join('')}
        </div>
      `;
    }
  }

  return {
    shouldShow,
    show,
    next,
    prev,
    toggle,
    toggleChip,
    skip,
    skipResume,
    handleResumeUpload,
    handleMultiUpload,
    removeUploadedFile,
    getProfile
  };
})();
