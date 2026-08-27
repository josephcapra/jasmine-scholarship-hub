/**
 * Career Discovery Service
 * Swipeable career exploration, college/trade matching
 */

const CareerDiscovery = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_careers';
  let savedCareers = [];
  let dismissedCareers = [];
  let currentIndex = 0;

  function init() {
    loadState();
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      savedCareers = saved.savedCareers || [];
      dismissedCareers = saved.dismissedCareers || [];
    } catch (e) {
      console.error('Career load error:', e);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedCareers, dismissedCareers }));
  }

  function saveCareer(careerId) {
    if (!savedCareers.includes(careerId)) {
      savedCareers.push(careerId);
      saveState();
    }
  }

  function dismissCareer(careerId) {
    if (!dismissedCareers.includes(careerId)) {
      dismissedCareers.push(careerId);
      saveState();
    }
  }

  function getSavedCareers() {
    return savedCareers.map(id => CareerData.getCareerById(id)).filter(Boolean);
  }

  function getMatchingCareers() {
    const profile = typeof VyliumProfile !== 'undefined' ? VyliumProfile.getProfile() : null;
    let careers = CareerData.getMatchingCareers(profile, 30);
    return careers.filter(c => !savedCareers.includes(c.id) && !dismissedCareers.includes(c.id));
  }

  function renderCareerCard(career, onSwipe) {
    const card = document.createElement('div');
    card.className = 'career-card';
    card.innerHTML = `
      <div class="career-card-header">
        <span class="career-emoji">${career.emoji}</span>
        <div class="career-title-block">
          <h3 class="career-name">${career.name}</h3>
          <div class="career-riasec">${career.riasec.join(' + ')}</div>
        </div>
      </div>
      <p class="career-desc">${career.description}</p>
      <div class="career-stats">
        <div class="career-stat">
          <span class="stat-label">Salary</span>
          <span class="stat-value">${career.salary}</span>
        </div>
        <div class="career-stat">
          <span class="stat-label">Outlook</span>
          <span class="stat-value">${career.outlook}</span>
        </div>
        <div class="career-stat">
          <span class="stat-label">Training</span>
          <span class="stat-value">${career.training}</span>
        </div>
      </div>
      <div class="career-skills">
        <span class="skills-label">Key Skills:</span>
        ${career.skills.map(s => `<span class="skill-chip">${s}</span>`).join('')}
      </div>
      <div class="career-lifestyle">
        <span class="lifestyle-icon">🏠</span> ${career.lifestyle}
      </div>
      <div class="career-fit">
        <span class="fit-icon">✨</span>
        <span class="fit-text">This fits your ${career.riasec[0] === 'R' ? 'hands-on' : career.riasec[0] === 'I' ? 'analytical' : career.riasec[0] === 'A' ? 'creative' : career.riasec[0] === 'S' ? 'people' : career.riasec[0] === 'E' ? 'leadership' : 'organized'} side</span>
      </div>
      <div class="career-actions">
        <button class="career-btn career-dismiss" data-action="dismiss">
          <span>👎</span> Not for me
        </button>
        <button class="career-btn career-save" data-action="save">
          <span>💾</span> Save
        </button>
      </div>
    `;

    card.querySelector('.career-dismiss').addEventListener('click', () => {
      dismissCareer(career.id);
      if (onSwipe) onSwipe('dismiss', career);
    });

    card.querySelector('.career-save').addEventListener('click', () => {
      saveCareer(career.id);
      if (onSwipe) onSwipe('save', career);
    });

    return card;
  }

  function renderExplorer(containerId, onComplete) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const careers = getMatchingCareers();
    currentIndex = 0;

    function showNext() {
      if (currentIndex >= careers.length || currentIndex >= 10) {
        const saved = getSavedCareers();
        container.innerHTML = `
          <div class="career-complete">
            <div class="career-complete-icon">🎯</div>
            <h3>Exploration Complete!</h3>
            <p>You saved ${saved.length} careers to explore further.</p>
            ${saved.length > 0 ? `
              <div class="saved-careers-mini">
                ${saved.slice(0, 3).map(c => `<span class="saved-career-chip">${c.emoji} ${c.name}</span>`).join('')}
                ${saved.length > 3 ? `<span class="saved-more">+${saved.length - 3} more</span>` : ''}
              </div>
            ` : ''}
            <button class="btn btn-primary" onclick="CareerDiscovery.renderExplorer('${containerId}')">Explore More</button>
          </div>
        `;
        if (onComplete) onComplete(saved);
        return;
      }

      const career = careers[currentIndex];
      container.innerHTML = `<div class="career-progress">${currentIndex + 1} / ${Math.min(careers.length, 10)}</div>`;
      const card = renderCareerCard(career, (action) => {
        currentIndex++;
        setTimeout(showNext, 300);
      });
      container.appendChild(card);
    }

    showNext();
  }

  function renderTradesExplorer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const trades = CareerData.getTrades();

    container.innerHTML = `
      <div class="trades-header">
        <h3>🔧 Skilled Trades & Apprenticeships</h3>
        <p>Earn while you learn - no college debt required</p>
      </div>
      <div class="trades-grid">
        ${trades.map(trade => `
          <div class="trade-card">
            <div class="trade-emoji">${trade.emoji}</div>
            <h4 class="trade-name">${trade.name}</h4>
            <div class="trade-meta">
              <span class="trade-duration">⏱️ ${trade.duration}</span>
              <span class="trade-salary">💰 ${trade.salary_after}</span>
            </div>
            <div class="trade-demand trade-demand-${trade.demand.toLowerCase().replace(' ', '-')}">
              ${trade.demand} Demand
            </div>
            <p class="trade-desc">${trade.description}</p>
            ${trade.union ? '<span class="trade-union">🏛️ Union Available</span>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderCollegeTypes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const types = CareerData.getCollegeTypes();

    container.innerHTML = `
      <div class="college-header">
        <h3>🎓 Find Your College Fit</h3>
        <p>Different schools for different goals</p>
      </div>
      <div class="college-grid">
        ${types.map(type => `
          <div class="college-card">
            <div class="college-emoji">${type.emoji}</div>
            <h4 class="college-name">${type.name}</h4>
            <div class="college-size">Size: ${type.size}</div>
            <div class="college-vibe">"${type.vibe}"</div>
            <div class="college-pros">
              <span class="pros-label">✅ Pros:</span>
              ${type.pros.map(p => `<span class="pro-chip">${p}</span>`).join('')}
            </div>
            <div class="college-cons">
              <span class="cons-label">⚠️ Cons:</span>
              ${type.cons.map(c => `<span class="con-chip">${c}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderMiniWidget(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const saved = getSavedCareers();
    const profile = typeof VyliumProfile !== 'undefined' ? VyliumProfile.getProfile() : null;
    const topCareer = CareerData.getMatchingCareers(profile, 1)[0];

    container.innerHTML = `
      <div class="career-widget" onclick="openCareerExplorer()">
        <div class="career-widget-header">
          <span class="career-widget-icon">🎯</span>
          <span class="career-widget-title">Career Explorer</span>
        </div>
        ${topCareer ? `
          <div class="career-widget-match">
            <span class="match-emoji">${topCareer.emoji}</span>
            <span class="match-text">Top match: ${topCareer.name}</span>
          </div>
        ` : ''}
        <div class="career-widget-stats">
          <span class="saved-count">💾 ${saved.length} saved</span>
          <span class="explore-cta">Explore →</span>
        </div>
      </div>
    `;
  }

  init();

  return {
    saveCareer,
    dismissCareer,
    getSavedCareers,
    getMatchingCareers,
    renderCareerCard,
    renderExplorer,
    renderTradesExplorer,
    renderCollegeTypes,
    renderMiniWidget
  };
})();
