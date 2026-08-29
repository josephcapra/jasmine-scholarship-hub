/**
 * Resume Builder - AI-powered resume generation from student profile
 */

const ResumeBuilder = (function() {
  'use strict';

  const FORMATS = [
    { id: 'standard', name: 'Standard', description: 'Clean, professional format for general use' },
    { id: 'academic', name: 'Academic', description: 'Emphasizes education, GPA, and coursework' },
    { id: 'activities', name: 'Activities-Focused', description: 'Highlights extracurriculars and leadership' },
    { id: 'creative', name: 'Creative', description: 'Modern design for arts/media scholarships' }
  ];

  let currentResume = null;
  let isGenerating = false;

  function getProfile() {
    if (typeof KnowledgeVault !== 'undefined' && KnowledgeVault.buildProfile) {
      return KnowledgeVault.buildProfile();
    }

    // Fallback: build profile from localStorage
    try {
      const profile = JSON.parse(localStorage.getItem('jasmine_student_profile') || '{}');
      const vault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');
      const achievements = JSON.parse(localStorage.getItem('jasmine_achievements') || '[]');
      const activities = JSON.parse(localStorage.getItem('jasmine_activities') || '[]');

      return {
        ...profile,
        ...vault,
        achievements,
        activities
      };
    } catch (e) {
      console.error('Error loading profile:', e);
      return {};
    }
  }

  function hasMinimumProfile(profile) {
    return profile.firstName && (
      profile.school ||
      profile.achievements?.length > 0 ||
      profile.activities?.length > 0 ||
      profile.workExperience?.length > 0
    );
  }

  async function generateResume(format = 'standard', targetScholarship = null) {
    if (isGenerating) {
      throw new Error('Resume generation already in progress');
    }

    const profile = getProfile();

    if (!hasMinimumProfile(profile)) {
      throw new Error('Please complete your profile first. At minimum, add your name and some achievements or activities.');
    }

    isGenerating = true;

    try {
      const response = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, format, targetScholarship })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate resume');
      }

      currentResume = {
        html: data.resume,
        format,
        targetScholarship,
        generatedAt: data.generatedAt
      };

      // Save to history
      saveToHistory(currentResume);

      return currentResume;

    } finally {
      isGenerating = false;
    }
  }

  function saveToHistory(resume) {
    try {
      const history = JSON.parse(localStorage.getItem('jasmine_resume_history') || '[]');
      history.unshift({
        ...resume,
        id: 'resume_' + Date.now()
      });
      // Keep last 10 resumes
      localStorage.setItem('jasmine_resume_history', JSON.stringify(history.slice(0, 10)));
    } catch (e) {
      console.error('Error saving resume history:', e);
    }
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem('jasmine_resume_history') || '[]');
    } catch (e) {
      return [];
    }
  }

  function downloadAsPDF() {
    if (!currentResume) {
      throw new Error('No resume to download. Generate one first.');
    }

    // Create a printable window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Resume - ${getProfile().firstName || 'Student'}</title>
        <style>
          @media print {
            body { margin: 0; padding: 20px; }
            @page { margin: 0.5in; }
          }
        </style>
      </head>
      <body>
        ${currentResume.html}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

  function downloadAsHTML() {
    if (!currentResume) {
      throw new Error('No resume to download. Generate one first.');
    }

    const profile = getProfile();
    const fileName = `resume-${profile.firstName || 'student'}-${new Date().toISOString().split('T')[0]}.html`;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume - ${profile.firstName || 'Student'} ${profile.lastName || ''}</title>
</head>
<body>
${currentResume.html}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    if (!currentResume) {
      throw new Error('No resume to copy. Generate one first.');
    }

    // Create a temporary element to extract text
    const temp = document.createElement('div');
    temp.innerHTML = currentResume.html;
    const text = temp.innerText || temp.textContent;

    navigator.clipboard.writeText(text).then(() => {
      console.log('Resume copied to clipboard');
    });

    return text;
  }

  function showModal() {
    // Remove existing modal if any
    const existing = document.getElementById('resume-builder-modal');
    if (existing) existing.remove();

    const profile = getProfile();
    const hasProfile = hasMinimumProfile(profile);

    const modal = document.createElement('div');
    modal.id = 'resume-builder-modal';
    modal.innerHTML = `
      <style>
        #resume-builder-modal {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          padding: 20px;
        }
        .rb-container {
          background: white;
          border-radius: 16px;
          max-width: 900px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        @media (prefers-color-scheme: dark) {
          .rb-container { background: #1e1b2e; color: #f3f0ff; }
        }
        .rb-header {
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        @media (prefers-color-scheme: dark) {
          .rb-header { border-color: #3d3654; }
        }
        .rb-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .rb-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 4px;
        }
        .rb-close:hover { color: #111; }
        @media (prefers-color-scheme: dark) {
          .rb-close:hover { color: #fff; }
        }
        .rb-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }
        .rb-section {
          margin-bottom: 24px;
        }
        .rb-section h3 {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
          margin: 0 0 12px 0;
        }
        .rb-formats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
        }
        .rb-format {
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }
        @media (prefers-color-scheme: dark) {
          .rb-format { background: #2d2640; border-color: #3d3654; }
        }
        .rb-format:hover { border-color: #7c3aed; }
        .rb-format.selected { border-color: #7c3aed; background: #f5f3ff; }
        @media (prefers-color-scheme: dark) {
          .rb-format.selected { background: #3d2d5c; }
        }
        .rb-format h4 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 600;
        }
        .rb-format p {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }
        .rb-scholarship-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 15px;
          outline: none;
        }
        @media (prefers-color-scheme: dark) {
          .rb-scholarship-input { background: #2d2640; border-color: #3d3654; color: #f3f0ff; }
        }
        .rb-scholarship-input:focus { border-color: #7c3aed; }
        .rb-generate-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .rb-generate-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
        }
        .rb-generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .rb-preview {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          min-height: 300px;
          overflow: auto;
        }
        @media (prefers-color-scheme: dark) {
          .rb-preview { background: #2d2640; }
        }
        .rb-preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #9ca3af;
          text-align: center;
        }
        .rb-preview-placeholder svg {
          width: 48px;
          height: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }
        .rb-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }
        .rb-action-btn {
          flex: 1;
          padding: 10px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        @media (prefers-color-scheme: dark) {
          .rb-action-btn { background: #2d2640; border-color: #3d3654; color: #f3f0ff; }
        }
        .rb-action-btn:hover { border-color: #7c3aed; }
        .rb-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rb-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .rb-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #e5e7eb;
          border-top-color: #7c3aed;
          border-radius: 50%;
          animation: rb-spin 1s linear infinite;
        }
        @keyframes rb-spin {
          to { transform: rotate(360deg); }
        }
        .rb-warning {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 12px 16px;
          color: #92400e;
          font-size: 14px;
        }
        @media (prefers-color-scheme: dark) {
          .rb-warning { background: #451a03; border-color: #92400e; color: #fcd34d; }
        }
      </style>
      <div class="rb-container">
        <div class="rb-header">
          <h2>Resume Builder</h2>
          <button class="rb-close" onclick="document.getElementById('resume-builder-modal').remove()">&times;</button>
        </div>
        <div class="rb-body">
          ${!hasProfile ? `
            <div class="rb-warning">
              Complete your profile first to generate a resume. Add your name, school, and some achievements or activities.
            </div>
          ` : `
            <div class="rb-section">
              <h3>Choose Format</h3>
              <div class="rb-formats">
                ${FORMATS.map((f, i) => `
                  <div class="rb-format ${i === 0 ? 'selected' : ''}" data-format="${f.id}">
                    <h4>${f.name}</h4>
                    <p>${f.description}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="rb-section">
              <h3>Tailor for Scholarship (Optional)</h3>
              <input type="text" class="rb-scholarship-input" id="rb-scholarship"
                placeholder="e.g., National Merit Scholarship, STEM Award...">
            </div>

            <button class="rb-generate-btn" id="rb-generate">
              Generate Resume
            </button>

            <div class="rb-section" style="margin-top: 24px;">
              <h3>Preview</h3>
              <div class="rb-preview" id="rb-preview">
                <div class="rb-preview-placeholder">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <p>Your resume will appear here</p>
                </div>
              </div>
              <div class="rb-actions" id="rb-actions" style="display: none;">
                <button class="rb-action-btn" id="rb-download-pdf">Print / Save PDF</button>
                <button class="rb-action-btn" id="rb-download-html">Download HTML</button>
                <button class="rb-action-btn" id="rb-copy">Copy Text</button>
              </div>
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Format selection
    modal.querySelectorAll('.rb-format').forEach(el => {
      el.addEventListener('click', () => {
        modal.querySelectorAll('.rb-format').forEach(f => f.classList.remove('selected'));
        el.classList.add('selected');
      });
    });

    // Generate button
    const generateBtn = modal.querySelector('#rb-generate');
    if (generateBtn) {
      generateBtn.addEventListener('click', async () => {
        const selectedFormat = modal.querySelector('.rb-format.selected')?.dataset.format || 'standard';
        const scholarship = modal.querySelector('#rb-scholarship')?.value || null;
        const preview = modal.querySelector('#rb-preview');
        const actions = modal.querySelector('#rb-actions');

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<div class="rb-loading"><div class="rb-spinner"></div>Generating...</div>';
        preview.innerHTML = '<div class="rb-loading" style="height:300px;"><div class="rb-spinner"></div>Creating your resume...</div>';

        try {
          const result = await generateResume(selectedFormat, scholarship);
          preview.innerHTML = result.html;
          actions.style.display = 'flex';
          generateBtn.textContent = 'Regenerate';
        } catch (error) {
          preview.innerHTML = `<div class="rb-preview-placeholder" style="color:#ef4444;">${error.message}</div>`;
        } finally {
          generateBtn.disabled = false;
        }
      });
    }

    // Action buttons
    modal.querySelector('#rb-download-pdf')?.addEventListener('click', () => {
      try {
        downloadAsPDF();
      } catch (e) {
        alert(e.message);
      }
    });

    modal.querySelector('#rb-download-html')?.addEventListener('click', () => {
      try {
        downloadAsHTML();
      } catch (e) {
        alert(e.message);
      }
    });

    modal.querySelector('#rb-copy')?.addEventListener('click', () => {
      try {
        copyToClipboard();
        const btn = modal.querySelector('#rb-copy');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy Text', 2000);
      } catch (e) {
        alert(e.message);
      }
    });
  }

  // Public API
  return {
    FORMATS,
    getProfile,
    hasMinimumProfile,
    generateResume,
    downloadAsPDF,
    downloadAsHTML,
    copyToClipboard,
    getHistory,
    showModal,
    getCurrentResume: () => currentResume,
    isGenerating: () => isGenerating
  };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResumeBuilder;
}
