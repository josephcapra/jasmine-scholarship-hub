/**
 * Trust Banner - Rotating security/privacy value propositions
 * Shows prominently on key pages to build trust with parents and students
 */

const TrustBanner = (function() {
  'use strict';

  const MESSAGES = [
    { icon: '🔒', text: 'Your data is encrypted with bank-level security (AES-256)' },
    { icon: '🚫', text: 'We never sell your data. Ever. Period.' },
    { icon: '👨‍👩‍👧', text: 'Parents: You control what you see. Students control what they share.' },
    { icon: '🛡️', text: 'Student essays are YOUR work — AI helps, never writes for you' },
    { icon: '🤖', text: 'AI never trains on your data — zero retention policy' },
    { icon: '🔐', text: 'Max 2 parents per student — you choose who connects' },
    { icon: '📍', text: 'Data stored on secure US servers, encrypted at rest' },
    { icon: '✨', text: 'No ads. No tracking. No selling your future.' },
    { icon: '👁️', text: 'Your scholarship search is private — only you see it' },
    { icon: '🗑️', text: 'Delete your account anytime — we erase everything' }
  ];

  let currentIndex = 0;
  let intervalId = null;

  function createBanner(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const style = options.style || 'default';
    const interval = options.interval || 5000;

    container.innerHTML = `
      <div class="trust-banner trust-banner-${style}">
        <div class="trust-content">
          <span class="trust-icon">${MESSAGES[0].icon}</span>
          <span class="trust-text">${MESSAGES[0].text}</span>
        </div>
        <div class="trust-dots">
          ${MESSAGES.map((_, i) => `<span class="trust-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
        </div>
      </div>
    `;

    // Add styles if not already present
    if (!document.getElementById('trust-banner-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'trust-banner-styles';
      styleEl.textContent = `
        .trust-banner {
          padding: 16px 20px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 20px;
        }
        .trust-banner-default {
          background: transparent;
          border: none;
        }
        .trust-banner-purple {
          background: transparent;
          border: none;
        }
        .trust-banner-dark {
          background: transparent;
          color: white;
        }
        .trust-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 32px;
        }
        .trust-icon {
          font-size: 1.3rem;
          animation: trustPulse 2s ease-in-out infinite;
        }
        .trust-text {
          font-weight: 600;
          font-size: 0.95rem;
          transition: opacity 0.3s ease;
        }
        .trust-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 10px;
        }
        .trust-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(0,0,0,0.2);
          cursor: pointer;
          transition: background 0.3s, transform 0.3s;
        }
        .trust-dot.active {
          background: #10b981;
          transform: scale(1.3);
        }
        .trust-banner-dark .trust-dot {
          background: rgba(255,255,255,0.3);
        }
        .trust-banner-dark .trust-dot.active {
          background: #10b981;
        }
        @keyframes trustPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .trust-mini {
          background: #f0fdf4;
          padding: 8px 16px;
          border-radius: 20px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #166534;
        }
      `;
      document.head.appendChild(styleEl);
    }

    // Set up rotation
    const iconEl = container.querySelector('.trust-icon');
    const textEl = container.querySelector('.trust-text');
    const dots = container.querySelectorAll('.trust-dot');

    function showMessage(index) {
      currentIndex = index;
      textEl.style.opacity = '0';

      setTimeout(() => {
        iconEl.textContent = MESSAGES[index].icon;
        textEl.textContent = MESSAGES[index].text;
        textEl.style.opacity = '1';

        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      }, 200);
    }

    // Click handlers for dots
    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index);
        showMessage(index);
        restartInterval();
      });
    });

    function restartInterval() {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        const next = (currentIndex + 1) % MESSAGES.length;
        showMessage(next);
      }, interval);
    }

    restartInterval();
  }

  // Create a minimal inline badge
  function createMiniTrust(containerId, messageIndex = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const msg = MESSAGES[messageIndex];
    container.innerHTML = `
      <div class="trust-mini">
        <span>${msg.icon}</span>
        <span>${msg.text}</span>
      </div>
    `;
  }

  // Get a random security message
  function getRandomMessage() {
    return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
  }

  return {
    createBanner,
    createMiniTrust,
    getRandomMessage,
    MESSAGES
  };
})();

if (typeof window !== 'undefined') {
  window.TrustBanner = TrustBanner;
}
