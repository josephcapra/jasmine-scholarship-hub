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
            <button class="pam-btn pam-btn-primary" onclick="ParentAuth.handleStep1()">Continue</button>

            <div class="pam-divider">
              <span>or sign in faster</span>
            </div>

            <div id="pam-passkey-section" style="display: none;">
              <button class="pam-btn pam-btn-passkey" onclick="ParentAuth.signInWithPasskey()">
                <span class="passkey-icon">🔐</span>
                Sign in with Face ID
              </button>
            </div>

            <button class="pam-btn pam-btn-google" onclick="ParentAuth.signInWithGoogle()">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>

            <div id="pam-passkey-setup" style="display: none; margin-top: 12px;">
              <button class="pam-btn-link" onclick="ParentAuth.setupPasskey()" style="font-size: 0.85rem; color: #7c3aed;">
                🔐 Set up Face ID for faster sign-in
              </button>
            </div>
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

            <div class="pam-option pam-option-highlight" onclick="ParentAuth.showSetupChild()">
              <div class="pam-option-icon">👶</div>
              <div class="pam-option-text">
                <strong>Set up account for my child</strong>
                <span>Create their profile now, they can take over later</span>
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

          <div id="pam-step-setup-child" style="display: none;">
            <p class="pam-question">Set up your child's profile</p>
            <div class="pam-field">
              <label>Child's First Name</label>
              <input type="text" id="pam-child-first" placeholder="First name">
            </div>
            <div class="pam-field">
              <label>Child's Last Name</label>
              <input type="text" id="pam-child-last" placeholder="Last name">
            </div>
            <div class="pam-field">
              <label>Child's Email (optional)</label>
              <input type="email" id="pam-child-email" placeholder="child@email.com">
            </div>
            <div class="pam-field">
              <label>Grade Level</label>
              <select id="pam-child-grade">
                <option value="">Select grade...</option>
                <option value="9">9th Grade (Freshman)</option>
                <option value="10">10th Grade (Sophomore)</option>
                <option value="11">11th Grade (Junior)</option>
                <option value="12">12th Grade (Senior)</option>
                <option value="college">College Student</option>
              </select>
            </div>
            <button class="pam-btn pam-btn-primary" onclick="ParentAuth.createChildAccount()">Create Account</button>
            <button class="pam-btn pam-btn-secondary" onclick="ParentAuth.backToStep2()">Back</button>
            <div id="pam-child-error" class="pam-error"></div>
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
        color: #1f2937;
      }
      .pam-box h2 {
        margin: 0 0 8px 0;
        color: #7c3aed;
        font-size: 1.5rem;
      }
      .pam-subtitle {
        color: #4b5563;
        margin-bottom: 24px;
      }
      .pam-field {
        margin-bottom: 16px;
      }
      .pam-field label {
        display: block;
        font-weight: 600;
        margin-bottom: 6px;
        color: #1f2937;
      }
      .pam-field input, .pam-field select {
        width: 100%;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        font-size: 1rem;
        transition: border-color 0.2s;
        background: white;
        color: #1f2937;
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
      .pam-btn-google {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background: white;
        border: 2px solid #e5e7eb;
        color: #374151;
      }
      .pam-btn-google:hover {
        background: #f9fafb;
        border-color: #d1d5db;
      }
      .pam-btn-passkey {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        background: linear-gradient(135deg, #1f2937, #374151);
        color: white;
        margin-bottom: 12px;
      }
      .pam-btn-passkey:hover {
        background: linear-gradient(135deg, #374151, #4b5563);
      }
      .pam-btn-passkey .passkey-icon {
        font-size: 1.2rem;
      }
      .pam-btn-link {
        background: none;
        border: none;
        color: #7c3aed;
        cursor: pointer;
        text-decoration: underline;
        padding: 8px;
      }
      .pam-divider {
        display: flex;
        align-items: center;
        margin: 16px 0;
        color: #9ca3af;
        font-size: 0.85rem;
      }
      .pam-divider::before, .pam-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #e5e7eb;
      }
      .pam-divider span {
        padding: 0 12px;
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
        color: #1f2937;
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
      .pam-option-highlight {
        background: linear-gradient(135deg, #ede9fe, #fce7f3);
        border-color: #c4b5fd;
      }
      .pam-option-highlight:hover {
        border-color: #7c3aed;
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

    // Check for Face ID / Passkey availability
    checkPasskeyAvailability();
  }

  async function handleStep1() {
    const name = document.getElementById('pam-name').value.trim();
    const email = document.getElementById('pam-email').value.trim();

    if (!name || !email) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await signup(name, email, 'weekly'); // Default to weekly
      document.getElementById('pam-step-1').style.display = 'none';
      document.getElementById('pam-step-2').style.display = 'block';
    } catch (e) {
      alert('Error: ' + e.message);
    }
  }

  let googleInitialized = false;
  let googleInitializing = false;
  let googleScriptInjected = false;

  let googleScriptLoadPromise = null;

  function injectGoogleScript() {
    if (googleScriptLoadPromise) return googleScriptLoadPromise;

    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existingScript) {
      googleScriptInjected = true;
      googleScriptLoadPromise = Promise.resolve(true);
      return googleScriptLoadPromise;
    }

    googleScriptLoadPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        console.log('Google Identity Services script loaded');
        googleScriptInjected = true;
        resolve(true);
      };
      script.onerror = () => {
        console.error('Failed to load Google Identity Services');
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return googleScriptLoadPromise;
  }

  async function waitForGoogle(maxWait = 10000) {
    // Inject and wait for script to load
    const scriptLoaded = await injectGoogleScript();
    if (!scriptLoaded) return false;

    // Now wait for google.accounts.id to be available
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        return true;
      }
      await new Promise(r => setTimeout(r, 100));
    }
    return false;
  }

  async function initializeGoogle() {
    if (googleInitialized) return true;
    if (googleInitializing) {
      // Wait for existing initialization
      await new Promise(r => setTimeout(r, 500));
      return googleInitialized;
    }

    googleInitializing = true;
    const clientId = '383923649216-diemrggcq4c0ln9m6mfs3g4gft3d5lhu.apps.googleusercontent.com';

    try {
      const loaded = await waitForGoogle();
      if (!loaded) {
        console.warn('Google Identity Services not loaded');
        googleInitializing = false;
        return false;
      }

      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      googleInitialized = true;
      googleInitializing = false;
      return true;
    } catch (e) {
      console.error('Google init error:', e);
      googleInitializing = false;
      return false;
    }
  }

  async function signInWithGoogle() {
    // Show loading indicator
    const loadingToast = document.createElement('div');
    loadingToast.textContent = 'Loading Google Sign-In...';
    loadingToast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1f2937;color:white;padding:12px 24px;border-radius:25px;z-index:10000;font-size:14px;';
    document.body.appendChild(loadingToast);

    try {
      const initialized = await initializeGoogle();

      if (!initialized) {
        loadingToast.textContent = 'Google Sign-In unavailable. Try email sign-in.';
        loadingToast.style.background = '#dc2626';
        setTimeout(() => loadingToast.remove(), 3000);
        return;
      }

      loadingToast.remove();

      // Show the One Tap prompt or button
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('One Tap not displayed, showing button');
          showGoogleButton();
        }
      });
    } catch (e) {
      console.error('Google Sign-In error:', e);
      loadingToast.textContent = 'Sign-in error. Try email instead.';
      loadingToast.style.background = '#dc2626';
      setTimeout(() => loadingToast.remove(), 3000);
    }
  }

  function showGoogleButton() {
    // Render Google Sign-In button in a container if One Tap fails
    const container = document.createElement('div');
    container.id = 'google-signin-container';
    container.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10002; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);';
    container.innerHTML = `
      <h3 style="margin: 0 0 16px; text-align: center;">Sign in with Google</h3>
      <div id="google-btn-target"></div>
      <button onclick="document.getElementById('google-signin-container').remove()" style="margin-top: 16px; width: 100%; padding: 10px; background: #f3f4f6; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
    `;
    document.body.appendChild(container);

    // Render the Google button
    google.accounts.id.renderButton(
      document.getElementById('google-btn-target'),
      { theme: 'outline', size: 'large', width: 280 }
    );
  }

  function handleGoogleResponse(response) {
    // Remove popup if present
    const container = document.getElementById('google-signin-container');
    if (container) container.remove();

    // Decode JWT token to get user info
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      const name = payload.name;
      const email = payload.email;

      // Prefill the form
      document.getElementById('pam-name').value = name;
      document.getElementById('pam-email').value = email;

      // Auto-submit
      handleStep1();
    } catch (e) {
      console.error('Error parsing Google response:', e);
      alert('Error with Google Sign-In. Please try again.');
    }
  }

  async function signInWithPasskey() {
    try {
      if (typeof PasskeyAuth === 'undefined') {
        throw new Error('Passkey service not loaded');
      }

      const result = await PasskeyAuth.authenticate();
      if (result.success && result.user) {
        // Use stored user info
        const name = result.user.name;
        const email = result.user.email;

        // Check if parent exists
        if (typeof SupabaseClient !== 'undefined') {
          const parent = await SupabaseClient.getParentByEmail(email);
          if (parent) {
            localStorage.setItem('jasmine_parent_id', parent.id);
            localStorage.setItem('jasmine_parent_email', email);
            closeModal();
            if (onAuthCallback) onAuthCallback();
            return;
          }
        }

        // Prefill form for new signup
        document.getElementById('pam-name').value = name;
        document.getElementById('pam-email').value = email;
        handleStep1();
      }
    } catch (e) {
      console.error('Passkey auth error:', e);
      alert(e.message || 'Face ID authentication failed');
    }
  }

  async function setupPasskey() {
    const name = document.getElementById('pam-name').value.trim();
    const email = document.getElementById('pam-email').value.trim();

    if (!name || !email) {
      alert('Please enter your name and email first');
      return;
    }

    try {
      if (typeof PasskeyAuth === 'undefined') {
        throw new Error('Passkey service not loaded');
      }

      await PasskeyAuth.register(name, email);
      alert('Face ID set up successfully! You can now sign in with Face ID.');
    } catch (e) {
      console.error('Passkey setup error:', e);
      alert(e.message || 'Failed to set up Face ID');
    }
  }

  function checkPasskeyAvailability() {
    // Show/hide passkey options based on availability
    setTimeout(async () => {
      const passkeySection = document.getElementById('pam-passkey-section');
      const passkeySetup = document.getElementById('pam-passkey-setup');

      if (typeof PasskeyAuth !== 'undefined') {
        const available = await PasskeyAuth.isPlatformAuthenticatorAvailable();
        if (available) {
          if (PasskeyAuth.hasPasskey()) {
            // Show sign-in button
            if (passkeySection) passkeySection.style.display = 'block';
          } else {
            // Show setup link
            if (passkeySetup) passkeySetup.style.display = 'block';
          }
        }
      }
    }, 100);
  }

  function showCodeEntry() {
    document.getElementById('pam-step-2').style.display = 'none';
    document.getElementById('pam-step-code').style.display = 'block';
  }

  function showInviteStudent() {
    document.getElementById('pam-step-2').style.display = 'none';
    document.getElementById('pam-step-invite').style.display = 'block';
  }

  function showSetupChild() {
    document.getElementById('pam-step-2').style.display = 'none';
    document.getElementById('pam-step-setup-child').style.display = 'block';
  }

  async function createChildAccount() {
    const firstName = document.getElementById('pam-child-first').value.trim();
    const lastName = document.getElementById('pam-child-last').value.trim();
    const email = document.getElementById('pam-child-email').value.trim();
    const grade = document.getElementById('pam-child-grade').value;
    const errorEl = document.getElementById('pam-child-error');

    if (!firstName || !lastName) {
      errorEl.textContent = 'Please enter your child\'s name';
      return;
    }

    try {
      const parentId = getParentId();
      if (!parentId) throw new Error('Parent not logged in');

      // Calculate graduation year from grade
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const schoolYear = currentMonth >= 8 ? currentYear + 1 : currentYear;
      const gradYearMap = { '9': schoolYear + 3, '10': schoolYear + 2, '11': schoolYear + 1, '12': schoolYear, 'college': schoolYear };
      const graduationYear = gradYearMap[grade] || schoolYear + 1;

      // Create student via Supabase
      if (typeof SupabaseClient !== 'undefined') {
        const studentData = {
          email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@parent-created.local`,
          firstName,
          lastName,
          graduationYear,
          state: 'FL'
        };

        const student = await SupabaseClient.createStudent(studentData);

        // Link parent to student
        await SupabaseClient.acceptStudentInvite(parentId, student.invite_code);

        // Show success
        document.getElementById('pam-step-setup-child').style.display = 'none';
        document.getElementById('pam-success-title').textContent = 'Account Created!';
        document.getElementById('pam-success-message').innerHTML = `
          ${firstName}'s account is ready.<br>
          <strong>Their login code:</strong> ${student.invite_code}<br>
          <span style="font-size: 0.85rem; color: #6b7280;">Share this so they can access their account.</span>
        `;
        document.getElementById('pam-step-success').style.display = 'block';
      } else {
        throw new Error('Database not available');
      }
    } catch (e) {
      console.error('Create child error:', e);
      errorEl.textContent = e.message || 'Failed to create account';
    }
  }

  function backToStep2() {
    document.getElementById('pam-step-code').style.display = 'none';
    document.getElementById('pam-step-invite').style.display = 'none';
    document.getElementById('pam-step-setup-child').style.display = 'none';
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
    signInWithGoogle,
    signInWithPasskey,
    setupPasskey,
    handleGoogleResponse,
    showCodeEntry,
    showInviteStudent,
    showSetupChild,
    createChildAccount,
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
