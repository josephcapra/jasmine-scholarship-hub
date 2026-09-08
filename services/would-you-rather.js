/**
 * Would You Rather Game Service
 * Handles game state, scoring, streaks, and UI
 */

const WouldYouRather = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_wyr';
  const STREAK_KEY = 'jasmine_wyr_streak';
  const LAST_PLAY_KEY = 'jasmine_wyr_last_play';

  let currentQuestion = null;
  let answeredIds = [];
  let scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  function init() {
    loadState();
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      answeredIds = saved.answeredIds || [];
      scores = saved.scores || { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    } catch (e) {
      console.error('WYR load error:', e);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answeredIds, scores }));
  }

  function getStreak() {
    const streak = parseInt(localStorage.getItem(STREAK_KEY) || '0');
    const lastPlay = localStorage.getItem(LAST_PLAY_KEY);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastPlay === today) return streak;
    if (lastPlay === yesterday) return streak;
    if (lastPlay && lastPlay !== today && lastPlay !== yesterday) {
      localStorage.setItem(STREAK_KEY, '0');
      return 0;
    }
    return streak;
  }

  function incrementStreak() {
    const lastPlay = localStorage.getItem(LAST_PLAY_KEY);
    const today = new Date().toDateString();

    if (lastPlay === today) return getStreak();

    let streak = getStreak();
    streak++;
    localStorage.setItem(STREAK_KEY, streak.toString());
    localStorage.setItem(LAST_PLAY_KEY, today);
    return streak;
  }

  function answer(questionId, choice) {
    const question = WouldYouRatherData.getQuestionById(questionId);
    if (!question) return null;

    if (!answeredIds.includes(questionId)) {
      answeredIds.push(questionId);

      // Apply RIASEC scoring if applicable
      if (question.score && question.score[choice]) {
        const scoreUpdate = question.score[choice];
        for (const [dim, points] of Object.entries(scoreUpdate)) {
          scores[dim] = (scores[dim] || 0) + points;
        }

        // Also feed into VyliumProfile for unified scoring
        if (typeof VyliumProfile !== 'undefined' && question.category.includes('PROFILE')) {
          VyliumProfile.addScores(scoreUpdate);
        }
      }

      saveState();
    }

    return {
      question,
      choice,
      streak: incrementStreak(),
      totalAnswered: answeredIds.length,
      scores: { ...scores }
    };
  }

  function getNextQuestion(category = null) {
    return WouldYouRatherData.getRandomQuestion(answeredIds, category);
  }

  function getDailyQuestion() {
    return WouldYouRatherData.getDailyQuestion();
  }

  function hasAnsweredToday() {
    const lastPlay = localStorage.getItem(LAST_PLAY_KEY);
    return lastPlay === new Date().toDateString();
  }

  function getTopDimensions(count = 3) {
    const sorted = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);
    return sorted.map(([dim, score]) => ({
      code: dim,
      name: WouldYouRatherData.DIMENSIONS[dim],
      score
    }));
  }

  function getStats() {
    return {
      totalAnswered: answeredIds.length,
      streak: getStreak(),
      scores: { ...scores },
      topDimensions: getTopDimensions(3),
      hasAnsweredToday: hasAnsweredToday()
    };
  }

  // UI Components
  function renderCard(question, onAnswer) {
    const card = document.createElement('div');
    card.className = 'wyr-card';
    card.innerHTML = `
      <div class="wyr-header">
        <span class="wyr-badge">${question.category.includes('FUN') ? '😂 Fun' : question.category.includes('FUTURE') ? '🚀 Future' : question.category.includes('MONEY') ? '💰 Money' : '🧠 Profile'}</span>
        <span class="wyr-number">#${question.id}</span>
      </div>
      <div class="wyr-title">Would You Rather...</div>
      <div class="wyr-options">
        <button class="wyr-option wyr-option-a" data-choice="a">
          <span class="wyr-emoji">🅰️</span>
          <span class="wyr-text">${question.a}</span>
        </button>
        <div class="wyr-or">OR</div>
        <button class="wyr-option wyr-option-b" data-choice="b">
          <span class="wyr-emoji">🅱️</span>
          <span class="wyr-text">${question.b}</span>
        </button>
      </div>
    `;

    card.querySelectorAll('.wyr-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset.choice;
        card.querySelectorAll('.wyr-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        setTimeout(() => {
          const result = answer(question.id, choice);
          if (onAnswer) onAnswer(result);
        }, 300);
      });
    });

    return card;
  }

  function renderDailyCard(containerId, onComplete) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const question = getDailyQuestion();
    const stats = getStats();

    if (stats.hasAnsweredToday) {
      container.innerHTML = `
        <div class="wyr-complete">
          <div class="wyr-complete-icon">✅</div>
          <div class="wyr-complete-text">You answered today's question!</div>
          <div class="wyr-streak">🔥 ${stats.streak} day streak</div>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    const card = renderCard(question, (result) => {
      container.innerHTML = `
        <div class="wyr-result">
          <div class="wyr-result-icon">🎉</div>
          <div class="wyr-result-text">Great choice!</div>
          <div class="wyr-streak">🔥 ${result.streak} day streak</div>
          <div class="wyr-answered">${result.totalAnswered} questions answered</div>
        </div>
      `;
      if (onComplete) onComplete(result);
    });
    container.appendChild(card);
  }

  function renderGameMode(containerId, onComplete) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let questionsAnswered = 0;
    const maxQuestions = 5;

    function showNext() {
      const question = getNextQuestion();
      if (!question || questionsAnswered >= maxQuestions) {
        const stats = getStats();

        // Check if Vylium assessment is complete
        const vyliumComplete = typeof VyliumProfile !== 'undefined' && VyliumProfile.getProfile()?.isComplete;

        container.innerHTML = `
          <div class="wyr-game-over">
            <div class="wyr-game-icon">🏆</div>
            <div class="wyr-game-title">Round Complete!</div>
            <div class="wyr-game-stats">
              <div>🔥 ${stats.streak} day streak</div>
              <div>📊 ${stats.totalAnswered} total answered</div>
            </div>
            ${stats.topDimensions.length > 0 ? `
              <div class="wyr-top-traits">
                <div class="wyr-traits-title">Your Top Traits</div>
                ${stats.topDimensions.map(d => `<span class="wyr-trait">${d.name}</span>`).join('')}
              </div>
            ` : ''}
            ${!vyliumComplete ? `
              <div style="background: linear-gradient(135deg, #ede9fe, #fce7f3); padding: 16px; border-radius: 12px; margin: 16px 0; text-align: center;">
                <div style="font-size: 1.5rem; margin-bottom: 8px;">✨</div>
                <div style="font-weight: 700; color: #7c3aed; margin-bottom: 8px;">Discover Your Full Profile!</div>
                <div style="font-size: 0.9rem; color: #6b7280; margin-bottom: 12px;">Take the complete Vylium assessment to unlock your personality type and career matches.</div>
                <button class="btn btn-primary" onclick="if(typeof openVyliumAssessment === 'function') openVyliumAssessment();" style="background: linear-gradient(135deg, #7c3aed, #ec4899); border: none; color: white; padding: 12px 24px; border-radius: 10px; font-weight: 700; cursor: pointer;">Take Vylium Assessment</button>
              </div>
            ` : ''}
            <button class="btn btn-primary" onclick="WouldYouRather.renderGameMode('${containerId}')" style="margin-top: 8px;">Play Again</button>
          </div>
        `;
        if (onComplete) onComplete(stats);
        return;
      }

      container.innerHTML = `<div class="wyr-progress">${questionsAnswered + 1} / ${maxQuestions}</div>`;
      const card = renderCard(question, () => {
        questionsAnswered++;
        setTimeout(showNext, 500);
      });
      container.appendChild(card);
    }

    showNext();
  }

  // Initialize on load
  init();

  return {
    answer,
    getNextQuestion,
    getDailyQuestion,
    getStats,
    getStreak,
    hasAnsweredToday,
    getTopDimensions,
    renderCard,
    renderDailyCard,
    renderGameMode
  };
})();
