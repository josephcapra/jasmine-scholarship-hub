/**
 * Parent Authentication & Connection Flow
 * Handles parent signup and student linking
 */

const ParentAuth = (function() {
  'use strict';

  const PARENT_ID_KEY = 'jasmine_parent_id';
  const PARENT_EMAIL_KEY = 'jasmine_parent_email';

  function isLoggedIn() {
    return !!localStorage.getItem(PARENT_ID_KEY);
  }

  function getParentId() {
    return localStorage.getItem(PARENT_ID_KEY);
  }

  function getParentEmail() {
    return localStorage.getItem(PARENT_EMAIL_KEY);
  }

  async function login(email) {
    // Check if parent exists
    const parent = await SupabaseClient.getParentByEmail(email);
    if (parent) {
      localStorage.setItem(PARENT_ID_KEY, parent.id);
      localStorage.setItem(PARENT_EMAIL_KEY, email);
      return parent;
    }
    return null;
  }

  async function signup(name, email, reportFrequency = 'weekly') {
    // Check if already exists
    let parent = await SupabaseClient.getParentByEmail(email);
    if (parent) {
      localStorage.setItem(PARENT_ID_KEY, parent.id);
      localStorage.setItem(PARENT_EMAIL_KEY, email);
      return parent;
    }

    // Create new parent
    parent = await SupabaseClient.createParent({
      name,
      email,
      reportFrequency
    });

    localStorage.setItem(PARENT_ID_KEY, parent.id);
    localStorage.setItem(PARENT_EMAIL_KEY, email);
    return parent;
  }

  function logout() {
    localStorage.removeItem(PARENT_ID_KEY);
    localStorage.removeItem(PARENT_EMAIL_KEY);
  }

  // Link to student using student's invite code
  async function linkWithStudentCode(inviteCode) {
    const parentId = getParentId();
    if (!parentId) throw new Error('Not logged in');

    return await SupabaseClient.acceptStudentInvite(parentId, inviteCode);
  }

  // Create invite for student (parent-initiated)
  async function inviteStudent(studentEmail) {
    const parentId = getParentId();
    if (!parentId) throw new Error('Not logged in');

    return await SupabaseClient.createParentInvite(parentId, studentEmail);
  }

  // Get all linked students
  async function getLinkedStudents() {
    const parentId = getParentId();
    if (!parentId) return [];

    return await SupabaseClient.getLinkedStudents(parentId);
  }

  // Show parent signup/login modal
  function showAuthModal(onComplete) {
    const existing = document.getElementById('parent-auth-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'parent-auth-modal';
    modal.innerHTML = `
      <div class="pam-overlay">
        <div class="pam-box">
          <h2>👋 Welcome, Parent!</h2>
          <p class="pam-subtitle">Connect with your child's scholarship journey</p>

          <div id="pam-step-1">
            <div class="pam-field">
              <label>Your Name</label>
              <input type="text" id="pam-name" placeholder="Mom, Dad, Guardian...">
            </div>
            <div class="pam-field">
              <label>Your Email</label>
              <input type="email" id="pam-email" placeholder="your@email.com">
            </div>
            <div class="pam-field">
              <label>Report Frequency</label>
              <select id="pam-frequency">
                <option value="instant">Instant (notify on milestones)</option>
                <option value="weekly" selected>Weekly Summary (Sundays)</option>
                <option value="off">Off (I'll check manually)</option>
              </select>
            </div>
            <button class="pam-btn pam-btn-primary" onclick="ParentAuth.handleStep1()">Continue</button>
          </div>

          <div id="pam-step-2" style="display: none;">
            <p class="pam-question">How would you like to connect?</p>

            <div class="pam-option" onclick="ParentAuth.showCodeEntry()">
              <div class="pam-option-icon">🔗</div>
              <div class="pam-option-text">
                <strong>I have an invite code</strong>
                <span>My child gave me a code to connect</span>
              </div>
            </div>

            <div class="pam-option" onclick="ParentAuth.showInviteStudent()">
              <div class="pam-option-icon">✉️</div>
              <div class="pam-option-text">
                <strong>Invite my child</strong>
                <span>Send them a code to connect their account</span>
              </div>
            </div>

            <div class="pam-option" onclick="ParentAuth.skipConnection()">
              <div class="pam-option-icon">⏭️</div>
              <div class="pam-option-text">
                <strong>Skip for now</strong>
                <span>Connect later from the dashboard</span>
              </div>
            </div>
          </div>

          <div id="pam-step-code" style="display: none;">
            <p class="pam-question">Enter the code from your child</p>
            <div class="pam-field">
              <input type="text" id="pam-code" placeholder="ABCD1234" maxlength="8" style="text-transform: uppercase; text-align: center; font-size: 1.5rem; letter-spacing: 4px;">
            </div>
            <button class="pam-btn pam-btn-primary" onclick="ParentAuth.submitCode()">Connect</button>
            <button class="pam-btn pam-btn-secondary" onclick="ParentAuth.backToStep2()">Back</button>
            <div id="pam-code-error" class="pam-error"></div>
          </div>

          <div id="pam-step-invite" style="display: none;">
            <p class="pam-question">Enter your child's email</p>
            <div class="pam-field">
              <input type="email" id="pam-student-email" placeholder="child@email.com">
            </div>
            <button class="pam-btn pam-btn-primary" onclick="ParentAuth.sendInvite()">Send Invite</button>
            <button class="pam-btn pam-btn-secondary" onclick="ParentAuth.backToStep2()">Back</button>
            <div id="pam-invite-error" class="pam-error"></div>
          </div>

          <div id="pam-step-success" style="display: none;">
            <div class="pam-success-icon">✅</div>
            <h3 id="pam-success-title">Connected!</h3>
            <p id="pam-success-message">You're all set to track your child's progress.</p>
            <button class="pam-btn pam-btn-primary" onclick="ParentAuth.closeModal()">Go to Dashboard</button>
          </div>

          <div id="pam-step-invite-sent" style="display: none;">
            <div class="pam-success-icon">📧</div>
            <h3>Invite Created!</h3>
            <p>Share this code with your child:</p>
            <div class="pam-code-display" id="pam-invite-code-display">XXXXXXXX</div>
            <p class="pam-hint">They'll enter this code in their app to connect with you.</p>
            <button class="pam-btn pam-btn-primary" onclick="ParentAuth.closeModal()">Go to Dashboard</button>
          </div>

          <button class="pam-close" onclick="ParentAuth.closeModal()">&times;</button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .pam-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      }
      .pam-box {
        background: white;
        border-radius: 20px;
        padding: 32px;
        max-width: 420px;
        width: 100%;
        position: relative;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      }
      .pam-box h2 {
        margin: 0 0 8px 0;
        color: #7c3aed;
        font-size: 1.5rem;
      }
      .pam-subtitle {
        color: #6b7280;
        margin-bottom: 24px;
      }
      .pam-field {
        margin-bottom: 16px;
      }
      .pam-field label {
        display: block;
        font-weight: 600;
        margin-bottom: 6px;
        color: #374151;
      }
      .pam-field input, .pam-field select {
        width: 100%;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 1rem;
        transition: border-color 0.2s;
      }
      .pam-field input:focus, .pam-field select:focus {
        outline: none;
        border-color: #7c3aed;
      }
      .pam-btn {
        width: 100%;
        padding: 14px;
        border: none;
        border-radius: 10px;
        font-size: 1rem;
        font-weight: 700;
        cursor: pointer;
        margin-top: 8px;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      .pam-btn:active { transform: scale(0.98); }
      .pam-btn-primary {
        background: linear-gradient(135deg, #7c3aed, #ec4899);
        color: white;
      }
      .pam-btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }
      .pam-close {
        position: absolute;
        top: 12px; right: 16px;
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #9ca3af;
        cursor: pointer;
      }
      .pam-question {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 16px;
        color: #374151;
      }
      .pam-option {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border: 2px solid #e5e7eb;
        border-radius: 12px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
      }
      .pam-option:hover {
        border-color: #7c3aed;
        background: #faf5ff;
      }
      .pam-option-icon {
        font-size: 1.5rem;
      }
      .pam-option-text strong {
        display: block;
        color: #1f2937;
      }
      .pam-option-text span {
        font-size: 0.85rem;
        color: #6b7280;
      }
      .pam-success-icon {
        font-size: 3rem;
        text-align: center;
        margin-bottom: 16px;
      }
      .pam-code-display {
        background: #f3f4f6;
        padding: 20px;
        text-align: center;
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: 6px;
        border-radius: 12px;
        color: #7c3aed;
        margin: 16px 0;
      }
      .pam-hint {
        font-size: 0.85rem;
        color: #6b7280;
        text-align: center;
      }
      .pam-error {
        color: #dc2626;
        font-size: 0.9rem;
        margin-top: 12px;
        text-align: center;
      }
      #pam-step-success h3, #pam-step-invite-sent h3 {
        text-align: center;
        color: #1f2937;
      }
      #pam-step-success p, #pam-step-invite-sent p {
        text-align: center;
        color: #6b7280;
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(modal);

    ParentAuth._onComplete = onComplete;
  }

  async function handleStep1() {
    const name = document.getElementById('pam-name').value.trim();
    const email = document.getElementById('pam-email').value.trim();
    const frequency = document.getElementById('pam-frequency').value;

    if (!name || !email) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await signup(name, email, frequency);
      document.getElementById('pam-step-1').style.display = 'none';
      document.getElementById('pam-step-2').style.display = 'block';
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  function showCodeEntry() {
    document.getElementById('pam-step-2').style.display = 'none';
    document.getElementById('pam-step-code').style.display = 'block';
  }

  function showInviteStudent() {
    document.getElementById('pam-step-2').style.display = 'none';
    document.getElementById('pam-step-invite').style.display = 'block';
  }

  function backToStep2() {
    document.getElementById('pam-step-code').style.display = 'none';
    document.getElementById('pam-step-invite').style.display = 'none';
    document.getElementById('pam-step-2').style.display = 'block';
  }

  async function submitCode() {
    const code = document.getElementById('pam-code').value.trim().toUpperCase();
    const errorEl = document.getElementById('pam-code-error');

    if (!code || code.length < 6) {
      errorEl.textContent = 'Please enter a valid code';
      return;
    }

    try {
      await linkWithStudentCode(code);
      document.getElementById('pam-step-code').style.display = 'none';
      document.getElementById('pam-step-success').style.display = 'block';
    } catch (e) {
      errorEl.textContent = e.message;
    }
  }

  async function sendInvite() {
    const email = document.getElementById('pam-student-email').value.trim();
    const errorEl = document.getElementById('pam-invite-error');

    if (!email) {
      errorEl.textContent = 'Please enter an email address';
      return;
    }

    try {
      const invite = await inviteStudent(email);
      document.getElementById('pam-invite-code-display').textContent = invite.invite_code;
      document.getElementById('pam-step-invite').style.display = 'none';
      document.getElementById('pam-step-invite-sent').style.display = 'block';
    } catch (e) {
      errorEl.textContent = e.message;
    }
  }

  function skipConnection() {
    document.getElementById('pam-step-2').style.display = 'none';
    document.getElementById('pam-success-title').textContent = 'Account Created!';
    document.getElementById('pam-success-message').textContent = 'You can connect with your child later from the dashboard.';
    document.getElementById('pam-step-success').style.display = 'block';
  }

  function closeModal() {
    const modal = document.getElementById('parent-auth-modal');
    if (modal) modal.remove();
    if (ParentAuth._onComplete) {
      ParentAuth._onComplete();
    }
  }

  return {
    isLoggedIn,
    getParentId,
    getParentEmail,
    login,
    signup,
    logout,
    linkWithStudentCode,
    inviteStudent,
    getLinkedStudents,
    showAuthModal,
    handleStep1,
    showCodeEntry,
    showInviteStudent,
    backToStep2,
    submitCode,
    sendInvite,
    skipConnection,
    closeModal,
    _onComplete: null
  };
})();

if (typeof window !== 'undefined') {
  window.ParentAuth = ParentAuth;
}
