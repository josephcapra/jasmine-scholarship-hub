/**
 * Trust Banner - Rotating security/privacy value propositions
 * Shows prominently on key pages to build trust with parents and students
 */

const TrustBanner = (function() {
  'use strict';

  const MESSAGES = [
    { icon: '🎯', text: 'The right scholarship may already exist. You just have to find it.' },
    { icon: '⏰', text: 'Missing one deadline can mean missing the entire opportunity.' },
    { icon: '🏘️', text: 'Local scholarships often face less competition than national awards.' },
    { icon: '🚀', text: 'Starting earlier gives students more scholarships to pursue.' },
    { icon: '✍️', text: 'One strong essay can often be adapted for multiple applications.' },
    { icon: '📋', text: 'Better organization makes it easier to submit more applications on time.' },
    { icon: '💰', text: 'Scholarships can make a more expensive college surprisingly affordable.' },
    { icon: '🎓', text: 'The best college financially may not have the lowest sticker price.' },
    { icon: '⚖️', text: 'Comparing financial aid can change which college offers the best value.' },
    { icon: '🌟', text: 'Scholarships exist for interests, achievements, careers, communities, and backgrounds.' },
    { icon: '🪙', text: 'Smaller scholarships can add up to meaningful college savings.' },
    { icon: '📈', text: 'Applying to more well-matched scholarships creates more chances to win.' },
    { icon: '🔍', text: 'A scholarship you never discover is an opportunity you cannot apply for.' },
    { icon: '📅', text: 'Tracking deadlines helps turn opportunities into completed applications.' },
    { icon: '📁', text: 'Keeping achievements in one place makes future applications easier.' },
    { icon: '⏱️', text: 'Finding opportunities matched to you can save hours of searching.' },
    { icon: '🧭', text: 'Knowing what to do next can make college planning less overwhelming.' },
    { icon: '👤', text: 'The earlier students build their profile, the more time they have to discover opportunities.' },
    { icon: '🏆', text: 'Your achievements may qualify you for opportunities you do not know exist.' },
    { icon: '📊', text: 'A better plan can turn scholarship searching into consistent progress.' },
    { icon: '✨', text: 'The opportunities are out there. Vylium helps you find the ones that fit you.' }
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
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
        }
        .trust-icon.fade-out {
          opacity: 0;
          transform: scale(0.8);
        }
        .trust-icon.fade-in {
          opacity: 1;
          transform: scale(1);
        }
        .trust-text {
          font-weight: 600;
          font-size: 0.95rem;
          transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
        }
        .trust-text.fade-out {
          opacity: 0;
          transform: translateY(-8px);
        }
        .trust-text.fade-in {
          opacity: 1;
          transform: translateY(0);
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

      // Fade out current content
      iconEl.classList.add('fade-out');
      iconEl.classList.remove('fade-in');
      textEl.classList.add('fade-out');
      textEl.classList.remove('fade-in');

      setTimeout(() => {
        // Update content
        iconEl.textContent = MESSAGES[index].icon;
        textEl.textContent = MESSAGES[index].text;

        // Fade in new content
        iconEl.classList.remove('fade-out');
        iconEl.classList.add('fade-in');
        textEl.classList.remove('fade-out');
        textEl.classList.add('fade-in');

        // Update dots
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      }, 500);
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
