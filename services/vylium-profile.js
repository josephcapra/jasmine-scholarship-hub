/**
 * VYLIUM Profile - Personality & Future Discovery Assessment
 * "Light on your path"
 *
 * Based on Holland RIASEC + Big Five-style dimensions
 * Non-clinical, education and career discovery assessment
 */

const VyliumProfile = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_vylium_profile';

  // RIASEC Dimensions
  const DIMENSIONS = {
    R: { code: 'R', name: 'Realistic', label: 'Builder', color: '#ef4444', description: 'Hands-on, practical, physical work' },
    I: { code: 'I', name: 'Investigative', label: 'Analyst', color: '#3b82f6', description: 'Research, analysis, problem-solving' },
    A: { code: 'A', name: 'Artistic', label: 'Creator', color: '#ec4899', description: 'Creative, expressive, original' },
    S: { code: 'S', name: 'Social', label: 'Helper', color: '#10b981', description: 'Helping, teaching, connecting' },
    E: { code: 'E', name: 'Enterprising', label: 'Leader', color: '#f59e0b', description: 'Leading, persuading, managing' },
    C: { code: 'C', name: 'Conventional', label: 'Organizer', color: '#6366f1', description: 'Organizing, detail-oriented, systematic' }
  };

  // 36 Personality Types based on top 2 RIASEC dimensions
  const TYPES = {
    'RI': { name: 'The Engineer', emoji: '⚙️', description: 'You combine hands-on skills with analytical thinking. You love understanding how things work and making them better.' },
    'RA': { name: 'The Maker', emoji: '🛠️', description: 'You blend practical skills with creative vision. You build things that are both functional and beautiful.' },
    'RS': { name: 'The Coach', emoji: '🏆', description: 'You combine physical skills with people skills. You excel at training others and hands-on leadership.' },
    'RE': { name: 'The Builder-Leader', emoji: '🏗️', description: 'You lead with action. You prefer managing projects where you can see tangible results.' },
    'RC': { name: 'The Operator', emoji: '🔧', description: 'You combine technical skills with precision. You excel at systematic, hands-on work.' },
    'IR': { name: 'The Technologist', emoji: '💻', description: 'You blend research with practical application. You love turning ideas into working solutions.' },
    'IA': { name: 'The Inventor', emoji: '💡', description: 'You combine deep thinking with creativity. You generate original ideas backed by research.' },
    'IS': { name: 'The Problem Solver', emoji: '🧩', description: 'You use analysis to help people. You find solutions to complex human challenges.' },
    'IE': { name: 'The Strategist', emoji: '♟️', description: 'You combine research with business sense. You develop winning strategies based on data.' },
    'IC': { name: 'The Analyst', emoji: '📊', description: 'You love data and precision. You excel at detailed research and systematic analysis.' },
    'AR': { name: 'The Artisan', emoji: '🎨', description: 'You blend creativity with craftsmanship. You create beautiful things with your hands.' },
    'AI': { name: 'The Innovator', emoji: '🚀', description: 'You combine artistic vision with analytical thinking. You create groundbreaking ideas.' },
    'AS': { name: 'The Storyteller', emoji: '📖', description: 'You use creativity to connect with people. You excel at communication and expression.' },
    'AE': { name: 'The Visionary', emoji: '🌟', description: 'You combine creative vision with leadership. You inspire others with big ideas.' },
    'AC': { name: 'The Designer', emoji: '✏️', description: 'You blend creativity with precision. You create beautiful, well-organized work.' },
    'SR': { name: 'The Trainer', emoji: '🎯', description: 'You combine people skills with practical action. You teach through doing.' },
    'SI': { name: 'The Counselor', emoji: '🤝', description: 'You blend empathy with understanding. You help people solve problems thoughtfully.' },
    'SA': { name: 'The Performer', emoji: '🎭', description: 'You combine social energy with creativity. You entertain and inspire others.' },
    'SE': { name: 'The Influencer', emoji: '📣', description: 'You blend people skills with leadership. You motivate and guide others.' },
    'SC': { name: 'The Coordinator', emoji: '📋', description: 'You combine helping with organization. You keep teams running smoothly.' },
    'ER': { name: 'The Entrepreneur', emoji: '💼', description: 'You combine leadership with action. You build businesses and lead by doing.' },
    'EI': { name: 'The Executive', emoji: '🏢', description: 'You blend leadership with analysis. You make strategic decisions based on data.' },
    'EA': { name: 'The Producer', emoji: '🎬', description: 'You combine leadership with creativity. You bring creative projects to life.' },
    'ES': { name: 'The Director', emoji: '🎪', description: 'You blend leadership with people skills. You inspire and manage teams.' },
    'EC': { name: 'The Manager', emoji: '📈', description: 'You combine leadership with organization. You run efficient, successful operations.' },
    'CR': { name: 'The Technician', emoji: '🔬', description: 'You blend precision with practical skills. You excel at technical, detailed work.' },
    'CI': { name: 'The Researcher', emoji: '🔍', description: 'You combine organization with analysis. You conduct thorough, systematic research.' },
    'CA': { name: 'The Editor', emoji: '📝', description: 'You blend precision with creativity. You perfect and polish creative work.' },
    'CS': { name: 'The Administrator', emoji: '🗂️', description: 'You combine organization with people focus. You keep organizations running smoothly.' },
    'CE': { name: 'The Planner', emoji: '📅', description: 'You blend organization with business sense. You plan and execute efficiently.' }
  };

  // Quick Assessment Questions (10-15 questions)
  const ASSESSMENT_QUESTIONS = [
    { id: 1, text: 'Indoors or outdoors?', a: 'Indoors', b: 'Outdoors', score: { a: { I: 1, C: 1 }, b: { R: 1 } } },
    { id: 2, text: 'Build it or brainstorm it?', a: 'Build it', b: 'Brainstorm it', score: { a: { R: 1 }, b: { I: 1, A: 1 } } },
    { id: 3, text: 'Work with people or work with systems?', a: 'People', b: 'Systems', score: { a: { S: 1, E: 1 }, b: { I: 1, C: 1 } } },
    { id: 4, text: 'Big city energy or smaller community vibes?', a: 'Big city', b: 'Smaller community', score: { a: { E: 1, A: 1 }, b: { S: 1, R: 1 } } },
    { id: 5, text: 'Lead the team or be the expert?', a: 'Lead the team', b: 'Be the expert', score: { a: { E: 1 }, b: { I: 1 } } },
    { id: 6, text: 'Predictable routine or variety every day?', a: 'Predictable', b: 'Variety', score: { a: { C: 1 }, b: { A: 1, E: 1 } } },
    { id: 7, text: 'Desk work or hands-on work?', a: 'Desk', b: 'Hands-on', score: { a: { I: 1, C: 1 }, b: { R: 1 } } },
    { id: 8, text: 'Creative freedom or clear structure?', a: 'Creative freedom', b: 'Clear structure', score: { a: { A: 1 }, b: { C: 1 } } },
    { id: 9, text: 'Travel for work or stay local?', a: 'Travel', b: 'Stay local', score: { a: { E: 1, A: 1 }, b: { S: 1, C: 1 } } },
    { id: 10, text: 'Solo focus or team energy?', a: 'Solo focus', b: 'Team energy', score: { a: { I: 1, A: 1 }, b: { S: 1, E: 1 } } },
    { id: 11, text: 'Help directly or help through systems?', a: 'Directly', b: 'Through systems', score: { a: { S: 1 }, b: { I: 1, C: 1 } } },
    { id: 12, text: 'Create something new or improve what exists?', a: 'Create new', b: 'Improve existing', score: { a: { A: 1, I: 1 }, b: { R: 1, C: 1 } } },
    { id: 13, text: 'Fast-paced environment or steady rhythm?', a: 'Fast-paced', b: 'Steady rhythm', score: { a: { E: 1 }, b: { C: 1, R: 1 } } },
    { id: 14, text: 'Express yourself or solve problems?', a: 'Express yourself', b: 'Solve problems', score: { a: { A: 1, S: 1 }, b: { I: 1, R: 1 } } },
    { id: 15, text: 'Make money early or build for later?', a: 'Money early', b: 'Build for later', score: { a: { E: 1, R: 1 }, b: { I: 1, A: 1 } } }
  ];

  // Career clusters mapped to RIASEC
  const CAREER_CLUSTERS = {
    R: ['Construction', 'Engineering', 'Manufacturing', 'Agriculture', 'Mechanics', 'Military', 'Trades'],
    I: ['Science', 'Technology', 'Medicine', 'Research', 'Data Analysis', 'Law', 'Psychology'],
    A: ['Arts', 'Design', 'Music', 'Writing', 'Photography', 'Film', 'Architecture'],
    S: ['Education', 'Healthcare', 'Social Work', 'Counseling', 'Nonprofits', 'Ministry'],
    E: ['Business', 'Sales', 'Marketing', 'Entrepreneurship', 'Politics', 'Real Estate'],
    C: ['Finance', 'Accounting', 'Administration', 'IT Support', 'Quality Control', 'Logistics']
  };

  let scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  let answers = {};
  let profileComplete = false;

  function init() {
    loadState();
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      scores = saved.scores || { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
      answers = saved.answers || {};
      profileComplete = saved.profileComplete || false;
    } catch (e) {
      console.error('Vylium load error:', e);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scores, answers, profileComplete }));
  }

  function answer(questionId, choice) {
    const question = ASSESSMENT_QUESTIONS.find(q => q.id === questionId);
    if (!question) return null;

    answers[questionId] = choice;

    // Apply scoring
    if (question.score && question.score[choice]) {
      const scoreUpdate = question.score[choice];
      for (const [dim, points] of Object.entries(scoreUpdate)) {
        scores[dim] = (scores[dim] || 0) + points;
      }
    }

    // Check if assessment is complete
    if (Object.keys(answers).length >= ASSESSMENT_QUESTIONS.length) {
      profileComplete = true;
    }

    saveState();
    return getProfile();
  }

  function addScores(newScores) {
    for (const [dim, points] of Object.entries(newScores)) {
      scores[dim] = (scores[dim] || 0) + points;
    }
    saveState();
  }

  function getTopDimensions(count = 2) {
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([code, score]) => ({
        ...DIMENSIONS[code],
        score
      }));
  }

  function getTypeCode() {
    const top2 = getTopDimensions(2);
    if (top2.length < 2) return null;
    return top2[0].code + top2[1].code;
  }

  function getPersonalityType() {
    const code = getTypeCode();
    if (!code) return null;

    // Try exact match first, then reversed
    let type = TYPES[code];
    if (!type) {
      const reversed = code[1] + code[0];
      type = TYPES[reversed];
    }

    if (!type) return null;

    return {
      code,
      ...type,
      topDimensions: getTopDimensions(2)
    };
  }

  function getProfile() {
    const top = getTopDimensions(3);
    const type = getPersonalityType();
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

    // Calculate percentages
    const percentages = {};
    for (const [dim, score] of Object.entries(scores)) {
      percentages[dim] = totalScore > 0 ? Math.round((score / totalScore) * 100) : 0;
    }

    // Get career clusters
    const careerClusters = [];
    if (top.length > 0) {
      top.forEach(d => {
        careerClusters.push(...(CAREER_CLUSTERS[d.code] || []).slice(0, 3));
      });
    }

    return {
      scores,
      percentages,
      topDimensions: top,
      type,
      careerClusters: [...new Set(careerClusters)].slice(0, 6),
      completionPercent: Math.round((Object.keys(answers).length / ASSESSMENT_QUESTIONS.length) * 100),
      isComplete: profileComplete
    };
  }

  function getEnergizers() {
    const top = getTopDimensions(2);
    const energizers = [];

    const energizerMap = {
      R: ['Working with tools', 'Physical activity', 'Seeing tangible results'],
      I: ['Solving complex problems', 'Research and discovery', 'Understanding why'],
      A: ['Creative expression', 'Original ideas', 'Aesthetic beauty'],
      S: ['Helping others', 'Meaningful connections', 'Making a difference'],
      E: ['Leading projects', 'Persuading others', 'Taking charge'],
      C: ['Organization', 'Clear procedures', 'Accuracy and detail']
    };

    top.forEach(d => {
      energizers.push(...(energizerMap[d.code] || []));
    });

    return energizers.slice(0, 4);
  }

  function getDrains() {
    const bottom = Object.entries(scores)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .map(([code]) => code);

    const drainMap = {
      R: ['Too much desk work', 'Abstract concepts without application'],
      I: ['Repetitive tasks', 'Small talk'],
      A: ['Rigid rules', 'Lack of creative freedom'],
      S: ['Working alone', 'Conflict'],
      E: ['Following without input', 'Lack of influence'],
      C: ['Chaos and disorder', 'Ambiguity']
    };

    const drains = [];
    bottom.forEach(code => {
      drains.push(...(drainMap[code] || []));
    });

    return drains.slice(0, 3);
  }

  function reset() {
    scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    answers = {};
    profileComplete = false;
    saveState();
  }

  // UI Rendering Functions
  function renderAssessment(containerId, onComplete) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let currentIndex = 0;

    function showQuestion(index) {
      if (index >= ASSESSMENT_QUESTIONS.length) {
        const profile = getProfile();
        renderResults(containerId, profile);
        if (onComplete) onComplete(profile);
        return;
      }

      const q = ASSESSMENT_QUESTIONS[index];
      container.innerHTML = `
        <div class="vylium-progress">
          <div class="vylium-progress-bar" style="width: ${((index + 1) / ASSESSMENT_QUESTIONS.length) * 100}%"></div>
        </div>
        <div class="vylium-question-number">${index + 1} of ${ASSESSMENT_QUESTIONS.length}</div>
        <div class="vylium-question">${q.text}</div>
        <div class="vylium-options">
          <button class="vylium-option" data-choice="a">
            <span class="vylium-option-text">${q.a}</span>
          </button>
          <button class="vylium-option" data-choice="b">
            <span class="vylium-option-text">${q.b}</span>
          </button>
        </div>
      `;

      container.querySelectorAll('.vylium-option').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.add('selected');
          answer(q.id, btn.dataset.choice);
          setTimeout(() => {
            currentIndex++;
            showQuestion(currentIndex);
          }, 300);
        });
      });
    }

    showQuestion(0);
  }

  function renderResults(containerId, profile) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const type = profile.type;
    const energizers = getEnergizers();
    const drains = getDrains();

    container.innerHTML = `
      <div class="vylium-results">
        <div class="vylium-type-reveal">
          <div class="vylium-type-emoji">${type?.emoji || '🌟'}</div>
          <div class="vylium-type-name">${type?.name || 'Your Profile'}</div>
          <div class="vylium-type-desc">${type?.description || ''}</div>
        </div>

        <div class="vylium-traits">
          <div class="vylium-traits-title">Your Top Traits</div>
          <div class="vylium-traits-grid">
            ${profile.topDimensions.map(d => `
              <div class="vylium-trait" style="border-color: ${d.color}">
                <div class="vylium-trait-label" style="color: ${d.color}">${d.label}</div>
                <div class="vylium-trait-name">${d.name}</div>
                <div class="vylium-trait-bar">
                  <div class="vylium-trait-fill" style="width: ${profile.percentages[d.code]}%; background: ${d.color}"></div>
                </div>
                <div class="vylium-trait-percent">${profile.percentages[d.code]}%</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="vylium-section">
          <div class="vylium-section-title">⚡ What Energizes You</div>
          <div class="vylium-tags">
            ${energizers.map(e => `<span class="vylium-tag vylium-tag-green">${e}</span>`).join('')}
          </div>
        </div>

        <div class="vylium-section">
          <div class="vylium-section-title">😴 What Drains You</div>
          <div class="vylium-tags">
            ${drains.map(d => `<span class="vylium-tag vylium-tag-red">${d}</span>`).join('')}
          </div>
        </div>

        <div class="vylium-section">
          <div class="vylium-section-title">🎯 Career Clusters to Explore</div>
          <div class="vylium-tags">
            ${profile.careerClusters.map(c => `<span class="vylium-tag">${c}</span>`).join('')}
          </div>
        </div>

        <div class="vylium-footer">
          <em>Your profile can change as you answer more questions and explore.</em>
        </div>

        <button class="btn btn-primary btn-block" onclick="VyliumProfile.reset(); location.reload();">Retake Assessment</button>
      </div>
    `;
  }

  function renderMiniProfile(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const profile = getProfile();

    if (!profile.isComplete && profile.completionPercent < 50) {
      container.innerHTML = `
        <div class="vylium-mini vylium-mini-start">
          <div class="vylium-mini-icon">🧭</div>
          <div class="vylium-mini-text">
            <div class="vylium-mini-title">Discover Your Future Profile</div>
            <div class="vylium-mini-desc">Answer 15 quick questions to unlock your personality type</div>
          </div>
          <button class="btn btn-primary btn-small" onclick="openVyliumAssessment()">Start</button>
        </div>
      `;
      return;
    }

    const type = profile.type;
    container.innerHTML = `
      <div class="vylium-mini">
        <div class="vylium-mini-icon">${type?.emoji || '🌟'}</div>
        <div class="vylium-mini-text">
          <div class="vylium-mini-title">${type?.name || 'Your Profile'}</div>
          <div class="vylium-mini-traits">
            ${profile.topDimensions.slice(0, 2).map(d => `<span style="color: ${d.color}">${d.label}</span>`).join(' + ')}
          </div>
        </div>
        <button class="btn btn-secondary btn-small" onclick="openVyliumAssessment()">View</button>
      </div>
    `;
  }

  // Scholarship matching boost
  function getScholarshipBoost(scholarshipCategories) {
    const profile = getProfile();
    const top = profile.topDimensions;
    let boost = 0;

    const categoryMap = {
      'stem': ['R', 'I'],
      'arts': ['A'],
      'business': ['E', 'C'],
      'service': ['S'],
      'military': ['R', 'E'],
      'academic': ['I', 'C'],
      'athletic': ['R'],
      'general': []
    };

    scholarshipCategories.forEach(cat => {
      const relevantDims = categoryMap[cat.toLowerCase()] || [];
      top.forEach(d => {
        if (relevantDims.includes(d.code)) {
          boost += 10;
        }
      });
    });

    return Math.min(boost, 25);
  }

  init();

  return {
    DIMENSIONS,
    TYPES,
    ASSESSMENT_QUESTIONS,
    answer,
    addScores,
    getProfile,
    getPersonalityType,
    getTopDimensions,
    getEnergizers,
    getDrains,
    reset,
    renderAssessment,
    renderResults,
    renderMiniProfile,
    getScholarshipBoost
  };
})();
