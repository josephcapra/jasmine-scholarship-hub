/**
 * Scholarship Search Service
 * Personalized discovery + manual entry
 */

const ScholarshipSearch = (function() {
  'use strict';

  const CUSTOM_KEY = 'jasmine_custom_scholarships';
  const SEARCH_HISTORY_KEY = 'jasmine_search_history';

  // Manual scholarship entry
  function addCustomScholarship(data) {
    const scholarships = getCustomScholarships();
    const newScholarship = {
      id: 'custom_' + Date.now(),
      name: data.name,
      sponsor: data.sponsor || 'Unknown',
      amount: parseInt(data.amount) || 0,
      deadline: data.deadline || null,
      url: data.url || '',
      description: data.description || '',
      requirements: data.requirements || [],
      essayRequired: data.essayRequired || false,
      fit: data.fit || [],
      tier: data.tier || 'local',
      status: 'saved',
      source: 'manual',
      addedBy: data.addedBy || 'student',
      addedAt: new Date().toISOString(),
      matchScore: 0.5,
      notes: data.notes || ''
    };

    scholarships.push(newScholarship);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(scholarships));
    return newScholarship;
  }

  function getCustomScholarships() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function updateCustomScholarship(id, updates) {
    const scholarships = getCustomScholarships();
    const idx = scholarships.findIndex(s => s.id === id);
    if (idx >= 0) {
      scholarships[idx] = { ...scholarships[idx], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(scholarships));
      return scholarships[idx];
    }
    return null;
  }

  function deleteCustomScholarship(id) {
    const scholarships = getCustomScholarships().filter(s => s.id !== id);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(scholarships));
  }

  // Build AI search prompt from student profile
  function buildSearchPrompt() {
    const profile = typeof KnowledgeVault !== 'undefined' ? KnowledgeVault.buildProfile() : {};

    const currentDate = new Date().toISOString().split('T')[0];

    let resumeText = '';
    if (profile.achievements && profile.achievements.length > 0) {
      resumeText = profile.achievements.map(a => a.title || a).join('\n');
    }

    let additionalBackground = [];
    if (profile.militaryFamily) additionalBackground.push('Military family (parents are veterans)');
    if (profile.firstGeneration) additionalBackground.push('First-generation college student');
    if (profile.financialNeed) additionalBackground.push('Demonstrates financial need');

    const interests = (profile.interests || []).map(i => {
      const labels = {
        arts: 'Visual Arts / Photography',
        music: 'Music',
        writing: 'Creative Writing',
        stem: 'STEM (Science, Technology, Engineering, Math)',
        business: 'Business / Entrepreneurship',
        sports: 'Athletics',
        service: 'Community Service',
        leadership: 'Leadership'
      };
      return labels[i] || i;
    });

    return {
      CURRENT_DATE: currentDate,
      CITY: 'Stuart',
      COUNTY: 'Martin County',
      STATE: profile.state || 'Florida',
      ZIP_CODE: '34997',
      GRADE_LEVEL: calculateGradeLevel(profile.graduationYear),
      GRADUATION_YEAR: profile.graduationYear || '2027',
      STUDENT_PROFILE: `
        Name: ${profile.firstName || 'Student'} ${profile.lastName || ''}
        School: ${profile.school || 'High School'}
        GPA: ${profile.gpa || 'Not provided'}
        Interests: ${interests.join(', ') || 'Not specified'}
      `.trim(),
      RESUME_TEXT: resumeText || 'No achievements entered yet',
      ADDITIONAL_BACKGROUND: additionalBackground.join('\n') || 'None specified',
      INTENDED_MAJOR_OR_CAREER: 'Not specified',
      FINANCIAL_INFORMATION: profile.financialNeed ? 'Family demonstrates financial need' : 'Not provided',
      TARGET_SCHOLARSHIP_COUNT: 50
    };
  }

  function calculateGradeLevel(gradYear) {
    if (!gradYear) return 'Junior';
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const academicYear = currentMonth >= 7 ? currentYear + 1 : currentYear;
    const yearsUntilGrad = parseInt(gradYear) - academicYear;

    if (yearsUntilGrad <= 0) return 'Senior';
    if (yearsUntilGrad === 1) return 'Junior';
    if (yearsUntilGrad === 2) return 'Sophomore';
    return 'Freshman';
  }

  // Search UI
  function showSearchModal() {
    injectStyles();

    const profile = typeof KnowledgeVault !== 'undefined' ? KnowledgeVault.buildProfile() : {};
    const completion = typeof KnowledgeVault !== 'undefined' ? KnowledgeVault.getProfileCompletion() : 0;

    const modal = document.createElement('div');
    modal.id = 'scholarship-search-modal';
    modal.innerHTML = `
      <div class="ss-overlay" onclick="ScholarshipSearch.closeModal()"></div>
      <div class="ss-modal">
        <div class="ss-header">
          <h2>Find Scholarships</h2>
          <button class="ss-close" onclick="ScholarshipSearch.closeModal()">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="ss-tabs">
          <button class="ss-tab active" data-tab="ai">🔍 Find For Me</button>
          <button class="ss-tab" data-tab="upload">📄 Upload List</button>
          <button class="ss-tab" data-tab="manual">✏️ Add One</button>
        </div>

        <div class="ss-content">
          <div class="ss-panel active" id="ss-panel-ai">
            <div class="ss-profile-status">
              <div class="ss-profile-bar">
                <div class="ss-profile-fill" style="width: ${completion}%"></div>
              </div>
              <span>${completion}% profile complete</span>
            </div>

            ${completion < 50 ? `
              <div class="ss-warning">
                <strong>Tip:</strong> Complete your profile first for better scholarship matches.
                A more detailed profile helps find scholarships you're most likely to win.
              </div>
            ` : ''}

            <p class="ss-desc">
              We'll search for scholarships that match your profile, location, interests, and achievements.
            </p>

            <div class="ss-pathway-selector" style="margin-bottom: 16px;">
              <label style="font-weight: 700; font-size: 0.9rem; color: #374151; display: block; margin-bottom: 8px;">What's your path after high school?</label>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <label class="ss-pathway-option" style="flex: 1; min-width: 100px;">
                  <input type="radio" name="ss-pathway" value="college" checked style="display: none;">
                  <div class="ss-pathway-card" style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s;">
                    <div style="font-size: 1.5rem;">🎓</div>
                    <div style="font-size: 0.85rem; font-weight: 600;">College</div>
                  </div>
                </label>
                <label class="ss-pathway-option" style="flex: 1; min-width: 100px;">
                  <input type="radio" name="ss-pathway" value="trades" style="display: none;">
                  <div class="ss-pathway-card" style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s;">
                    <div style="font-size: 1.5rem;">🔧</div>
                    <div style="font-size: 0.85rem; font-weight: 600;">Trade/Career</div>
                  </div>
                </label>
                <label class="ss-pathway-option" style="flex: 1; min-width: 100px;">
                  <input type="radio" name="ss-pathway" value="both" style="display: none;">
                  <div class="ss-pathway-card" style="padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.2s;">
                    <div style="font-size: 1.5rem;">🌟</div>
                    <div style="font-size: 0.85rem; font-weight: 600;">Both</div>
                  </div>
                </label>
              </div>
            </div>

            <div class="ss-time-warning">
              <strong>Personalized In-Depth Search</strong><br><br>
              This isn't a basic scholarship list. We conduct an in-depth search customized to your qualifications, achievements, location, and goals.
              <br><br>
              It will:
              <ul style="margin: 8px 0 0 16px; padding: 0;">
                <li>Find opportunities matched specifically to your profile</li>
                <li>Focus on scholarships where you have a competitive advantage</li>
                <li>Prioritize local and regional scholarships (less competition)</li>
                <li>Suggest winning strategies for each scholarship</li>
              </ul>
            </div>

            <button class="ss-btn ss-btn-primary" onclick="ScholarshipSearch.runAISearch()">
              Start Scholarship Search
            </button>

            <div id="ss-search-status" class="ss-status"></div>
          </div>

          <div class="ss-panel" id="ss-panel-upload">
            <div style="text-align: center; padding: 20px 0;">
              <div style="font-size: 3rem; margin-bottom: 12px;">📋</div>
              <h3 style="margin-bottom: 8px; color: #374151;">Upload a Scholarship List</h3>
              <p style="color: #6b7280; font-size: 0.9rem; margin-bottom: 20px;">
                Upload a CSV, Excel, or text file with your scholarship list.<br>
                We'll import them all at once!
              </p>

              <div class="ss-upload-area" onclick="document.getElementById('ss-list-upload').click()" style="border: 3px dashed #c4b5fd; border-radius: 16px; padding: 30px 20px; cursor: pointer; background: rgba(124, 58, 237, 0.05); margin-bottom: 16px;">
                <div style="font-size: 2rem; margin-bottom: 8px;">📤</div>
                <div style="font-weight: 600; color: #7c3aed;">Click to upload file</div>
                <div style="font-size: 0.85rem; color: #6b7280; margin-top: 4px;">CSV, Excel (.xlsx), or Text file</div>
              </div>
              <input type="file" id="ss-list-upload" accept=".csv,.xlsx,.xls,.txt" style="display: none" onchange="ScholarshipSearch.handleListUpload(event)">

              <div id="ss-upload-status" style="margin-top: 12px;"></div>

              <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin-top: 20px; text-align: left;">
                <div style="font-weight: 700; margin-bottom: 8px; font-size: 0.9rem;">📝 File Format Tips</div>
                <ul style="font-size: 0.85rem; color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Include columns: Name, Amount, Deadline, URL</li>
                  <li>One scholarship per row</li>
                  <li>Or paste a list from ChatGPT/Google</li>
                </ul>
              </div>

              <div style="margin-top: 16px;">
                <textarea id="ss-paste-list" placeholder="Or paste scholarship list here..." style="width: 100%; height: 100px; padding: 12px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.9rem; resize: vertical;"></textarea>
                <button type="button" onclick="ScholarshipSearch.parseTextList()" class="ss-btn ss-btn-primary" style="margin-top: 8px;">Import Pasted List</button>
              </div>
            </div>
          </div>

          <div class="ss-panel" id="ss-panel-manual">
            <!-- URL Auto-Extract -->
            <div class="ss-extract-box" style="background: linear-gradient(135deg, #ede9fe, #fce7f3); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
              <div style="font-weight: 700; margin-bottom: 8px; color: #7c3aed;">🔗 Auto-Fill from URL</div>
              <p style="font-size: 0.85rem; color: #6b7280; margin-bottom: 12px;">Paste a scholarship URL and we'll extract the details automatically!</p>
              <div style="display: flex; gap: 8px;">
                <input type="url" id="ss-extract-url" placeholder="https://scholarship-website.com/..." style="flex: 1; padding: 10px 12px; border: 2px solid #c4b5fd; border-radius: 8px; font-size: 0.95rem;">
                <button type="button" onclick="ScholarshipSearch.extractFromUrl()" style="background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; white-space: nowrap;">Extract</button>
              </div>
              <div id="ss-extract-status" style="margin-top: 8px; font-size: 0.85rem;"></div>
            </div>

            <div style="text-align: center; color: #9ca3af; font-size: 0.85rem; margin-bottom: 16px;">— or fill in manually —</div>

            <form id="ss-manual-form" onsubmit="ScholarshipSearch.submitManual(event)">
              <div class="ss-field">
                <label>Scholarship Name *</label>
                <input type="text" name="name" id="ss-name" required placeholder="e.g., Florida Bright Futures">
              </div>

              <div class="ss-row">
                <div class="ss-field">
                  <label>Award Amount</label>
                  <input type="text" name="amount" id="ss-amount" placeholder="$5,000">
                </div>
                <div class="ss-field">
                  <label>Deadline</label>
                  <input type="text" name="deadline" id="ss-deadline" placeholder="October 31, 2026">
                </div>
              </div>

              <div class="ss-field">
                <label>Sponsor/Organization</label>
                <input type="text" name="sponsor" id="ss-sponsor" placeholder="e.g., Florida Department of Education">
              </div>

              <div class="ss-field">
                <label>Website URL</label>
                <input type="url" name="url" id="ss-url" placeholder="https://...">
              </div>

              <div class="ss-field">
                <label>Description</label>
                <textarea name="description" rows="2" placeholder="Brief description of requirements"></textarea>
              </div>

              <div class="ss-field">
                <label>
                  <input type="checkbox" name="essayRequired"> Essay Required
                </label>
              </div>

              <div class="ss-field">
                <label>Notes</label>
                <textarea name="notes" rows="2" placeholder="Personal notes about this scholarship"></textarea>
              </div>

              <button type="submit" class="ss-btn ss-btn-primary">Add Scholarship</button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Tab switching
    modal.querySelectorAll('.ss-tab').forEach(tab => {
      tab.onclick = () => {
        modal.querySelectorAll('.ss-tab').forEach(t => t.classList.remove('active'));
        modal.querySelectorAll('.ss-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('ss-panel-' + tab.dataset.tab).classList.add('active');
      };
    });

    // Pathway selector styling
    modal.querySelectorAll('.ss-pathway-option input').forEach(input => {
      const card = input.nextElementSibling;
      if (input.checked) {
        card.style.borderColor = '#7c3aed';
        card.style.background = '#ede9fe';
      }
      input.addEventListener('change', () => {
        modal.querySelectorAll('.ss-pathway-card').forEach(c => {
          c.style.borderColor = '#e5e7eb';
          c.style.background = 'transparent';
        });
        if (input.checked) {
          card.style.borderColor = '#7c3aed';
          card.style.background = '#ede9fe';
        }
      });
    });
  }

  function closeModal() {
    const modal = document.getElementById('scholarship-search-modal');
    if (modal) modal.remove();
  }

  function submitManual(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value,
      amount: form.amount.value,
      deadline: form.deadline.value,
      sponsor: form.sponsor.value,
      url: form.url.value,
      description: form.description.value,
      essayRequired: form.essayRequired.checked,
      notes: form.notes.value,
      addedBy: 'student'
    };

    addCustomScholarship(data);
    if (typeof showToast === 'function') showToast('Scholarship added!'); else console.log('Scholarship added');
    closeModal();

    // Refresh scholarship list if function exists
    if (typeof window.loadScholarships === 'function') {
      window.loadScholarships();
    }
  }

  async function runAISearch() {
    const status = document.getElementById('ss-search-status');
    if (!status) return;

    status.innerHTML = '<div class="ss-loading">Searching for scholarships...</div>';

    // Get selected pathway
    const pathwayInput = document.querySelector('input[name="ss-pathway"]:checked');
    const pathway = pathwayInput ? pathwayInput.value : 'college';

    const promptData = buildSearchPrompt();
    promptData.PATHWAY = pathway;

    try {
      const response = await fetch('/api/scholarship-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptData)
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const results = await response.json();

      // Save search history
      const history = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
      history.unshift({
        date: new Date().toISOString(),
        count: results.scholarships?.length || 0
      });
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));

      // Import results
      if (results.scholarships && results.scholarships.length > 0) {
        importSearchResults(results.scholarships);
        status.innerHTML = `
          <div class="ss-success">
            Found ${results.scholarships.length} scholarships!
            They've been added to your list.
          </div>
        `;
      } else {
        status.innerHTML = '<div class="ss-warning">No new scholarships found. Try updating your profile.</div>';
      }

    } catch (error) {
      status.innerHTML = `
        <div class="ss-error">
          Search unavailable right now. Try adding scholarships manually or check back later.
        </div>
      `;
    }
  }

  function importSearchResults(scholarships) {
    scholarships.forEach(s => {
      addCustomScholarship({
        name: s.scholarship_name,
        sponsor: s.sponsor,
        amount: parseInt(s.award?.amount?.replace(/\D/g, '')) || 0,
        deadline: s.deadline,
        url: s.official_url,
        description: s.why_this_student_matches?.join('. ') || '',
        essayRequired: s.essay_strategy?.required || false,
        fit: [],
        tier: s.scope?.toLowerCase().replace('_', '-') || 'national',
        addedBy: 'ai-search',
        notes: `Match Score: ${s.match_score || 0}. ${s.winning_positioning_strategy?.join('. ') || ''}`
      });
    });
  }

  function injectStyles() {
    if (document.getElementById('ss-styles')) return;

    const style = document.createElement('style');
    style.id = 'ss-styles';
    style.textContent = `
      #scholarship-search-modal { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; }
      .ss-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); }
      .ss-modal { position: relative; background: white; border-radius: 16px; width: 95%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
      .ss-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
      .ss-header h2 { margin: 0; font-size: 1.25rem; }
      .ss-close { background: none; border: none; cursor: pointer; padding: 4px; }
      .ss-tabs { display: flex; border-bottom: 1px solid #e5e7eb; }
      .ss-tab { flex: 1; padding: 12px; background: none; border: none; cursor: pointer; font-weight: 600; color: #6b7280; border-bottom: 2px solid transparent; }
      .ss-tab.active { color: #7c3aed; border-bottom-color: #7c3aed; }
      .ss-content { padding: 20px; }
      .ss-panel { display: none; }
      .ss-panel.active { display: block; }
      .ss-profile-status { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
      .ss-profile-bar { flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; }
      .ss-profile-fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #ec4899); border-radius: 4px; }
      .ss-warning { background: #fef3c7; color: #92400e; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 0.9rem; }
      .ss-desc { color: #6b7280; margin-bottom: 20px; }
      .ss-btn { width: 100%; padding: 14px; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 1rem; }
      .ss-btn-primary { background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; }
      .ss-field { margin-bottom: 14px; }
      .ss-field label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; }
      .ss-field input, .ss-field textarea, .ss-field select { width: 100%; padding: 10px 12px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 1rem; }
      .ss-field input[type="checkbox"] { width: auto; margin-right: 8px; }
      .ss-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .ss-status { margin-top: 16px; text-align: center; }
      .ss-loading { color: #7c3aed; }
      .ss-success { color: #059669; background: #d1fae5; padding: 12px; border-radius: 8px; }
      .ss-error { color: #dc2626; background: #fee2e2; padding: 12px; border-radius: 8px; }
      .ss-time-warning { background: #ede9fe; color: #5b21b6; padding: 14px; border-radius: 10px; margin-bottom: 16px; font-size: 0.9rem; line-height: 1.5; }
    `;
    document.head.appendChild(style);
  }

  async function extractFromUrl() {
    const urlInput = document.getElementById('ss-extract-url');
    const status = document.getElementById('ss-extract-status');
    const url = urlInput?.value.trim();

    if (!url) {
      status.innerHTML = '<span style="color: #dc2626;">Please enter a URL</span>';
      return;
    }

    status.innerHTML = '<span style="color: #7c3aed;">🔄 Extracting scholarship info...</span>';

    try {
      const response = await fetch('/api/extract-scholarship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      const s = data.scholarship;

      // Fill in the form fields
      if (s.name) document.getElementById('ss-name').value = s.name;
      if (s.amount) document.getElementById('ss-amount').value = s.amount;
      if (s.deadline) document.getElementById('ss-deadline').value = s.deadline;
      if (s.sponsor) document.getElementById('ss-sponsor').value = s.sponsor;
      if (s.url) document.getElementById('ss-url').value = s.url;
      if (s.description) {
        const descField = document.querySelector('#ss-manual-form textarea[name="description"]');
        if (descField) descField.value = s.description;
      }
      if (s.essayRequired) {
        const essayCheck = document.querySelector('#ss-manual-form input[name="essayRequired"]');
        if (essayCheck) essayCheck.checked = s.essayRequired;
      }

      // Build notes from requirements and eligibility
      let notes = '';
      if (s.requirements && s.requirements.length > 0) {
        notes += 'Requirements: ' + s.requirements.join(', ') + '\n';
      }
      if (s.eligibility && s.eligibility.length > 0) {
        notes += 'Eligibility: ' + s.eligibility.join(', ') + '\n';
      }
      if (s.essayTopic) {
        notes += 'Essay Topic: ' + s.essayTopic;
      }
      if (notes) {
        const notesField = document.querySelector('#ss-manual-form textarea[name="notes"]');
        if (notesField) notesField.value = notes.trim();
      }

      status.innerHTML = '<span style="color: #059669;">✅ Info extracted! Review and click Add Scholarship.</span>';

    } catch (error) {
      console.error('Extract error:', error);
      status.innerHTML = `<span style="color: #dc2626;">❌ ${error.message || 'Could not extract info. Try filling manually.'}</span>`;
    }
  }

  // Handle file upload for scholarship list
  async function handleListUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const status = document.getElementById('ss-upload-status');
    status.innerHTML = '<span style="color: #7c3aed;">📄 Reading file...</span>';

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target.result;
      await parseAndImportList(content, file.name);
    };
    reader.readAsText(file);
  }

  // Parse pasted text list
  async function parseTextList() {
    const textarea = document.getElementById('ss-paste-list');
    const content = textarea?.value.trim();
    if (!content) {
      if (typeof showToast === 'function') showToast('Please paste a scholarship list first'); else console.warn('Please paste a scholarship list first');
      return;
    }
    await parseAndImportList(content, 'pasted-list');
  }

  // Parse and import scholarship list using AI
  async function parseAndImportList(content, source) {
    const status = document.getElementById('ss-upload-status');
    status.innerHTML = '<span style="color: #7c3aed;">🔄 Parsing scholarships with AI...</span>';

    try {
      const response = await fetch('/api/parse-scholarship-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, source })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to parse list');
      }

      // Import each scholarship
      let imported = 0;
      for (const s of data.scholarships || []) {
        addCustomScholarship({
          name: s.name,
          amount: s.amount,
          deadline: s.deadline,
          sponsor: s.sponsor,
          url: s.url,
          description: s.description || '',
          essayRequired: s.essayRequired || false,
          notes: s.notes || '',
          addedBy: 'list-import'
        });
        imported++;
      }

      status.innerHTML = `<span style="color: #059669;">✅ Imported ${imported} scholarships!</span>`;

      // Refresh scholarship list if function exists
      if (typeof window.loadScholarships === 'function') {
        setTimeout(() => window.loadScholarships(), 500);
      }

    } catch (error) {
      console.error('Import error:', error);
      status.innerHTML = `<span style="color: #dc2626;">❌ ${error.message || 'Import failed'}</span>`;
    }
  }

  return {
    addCustomScholarship,
    getCustomScholarships,
    updateCustomScholarship,
    deleteCustomScholarship,
    buildSearchPrompt,
    showSearchModal,
    closeModal,
    submitManual,
    runAISearch,
    extractFromUrl,
    handleListUpload,
    parseTextList
  };
})();

// Ensure it's on window for onclick handlers
if (typeof window !== 'undefined') {
  window.ScholarshipSearch = ScholarshipSearch;
}
