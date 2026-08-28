/**
 * User Behavior Simulator
 * Generates realistic analytics data simulating teens and parents using the app
 * Used to populate the admin dashboard with live-looking data
 */

const Simulator = (function() {
  'use strict';

  // Persona types
  const PERSONAS = {
    TEEN_EXPLORER: {
      type: 'teen',
      name: 'Explorer Teen',
      traits: ['curious', 'adventurous', 'social'],
      completionRate: 0.9,
      shareRate: 0.7,
      avgSessionDuration: 420, // 7 minutes
      clickRate: 1.2,
      commonActions: ['assessment', 'explore_careers', 'share', 'profile_view']
    },
    TEEN_ACHIEVER: {
      type: 'teen',
      name: 'Achiever Teen',
      traits: ['focused', 'goal-oriented', 'competitive'],
      completionRate: 0.95,
      shareRate: 0.5,
      avgSessionDuration: 600, // 10 minutes
      clickRate: 0.9,
      commonActions: ['assessment', 'scholarships', 'deadlines', 'essay_draft']
    },
    TEEN_CASUAL: {
      type: 'teen',
      name: 'Casual Teen',
      traits: ['relaxed', 'social', 'distracted'],
      completionRate: 0.6,
      shareRate: 0.8,
      avgSessionDuration: 180, // 3 minutes
      clickRate: 1.5,
      commonActions: ['assessment', 'share', 'friend_compare', 'browse']
    },
    TEEN_SHY: {
      type: 'teen',
      name: 'Shy Teen',
      traits: ['reserved', 'thoughtful', 'careful'],
      completionRate: 0.85,
      shareRate: 0.2,
      avgSessionDuration: 540, // 9 minutes
      clickRate: 0.7,
      commonActions: ['assessment', 'explore_careers', 'read_content', 'scholarships']
    },
    PARENT_INVOLVED: {
      type: 'parent',
      name: 'Involved Parent',
      traits: ['supportive', 'engaged', 'monitoring'],
      completionRate: 0.7,
      shareRate: 0.3,
      avgSessionDuration: 300, // 5 minutes
      clickRate: 1.0,
      commonActions: ['parent_dashboard', 'view_progress', 'deadlines', 'scholarships']
    },
    PARENT_HANDS_OFF: {
      type: 'parent',
      name: 'Hands-off Parent',
      traits: ['busy', 'trusting', 'occasional'],
      completionRate: 0.4,
      shareRate: 0.1,
      avgSessionDuration: 120, // 2 minutes
      clickRate: 0.5,
      commonActions: ['parent_dashboard', 'quick_check', 'browse']
    }
  };

  // Vylium Types for assessment completion
  const VYLIUM_TYPES = [
    'The Innovator', 'The Engineer', 'The Maker', 'The Strategist',
    'The Designer', 'The Storyteller', 'The Coach', 'The Catalyst',
    'The Visionary', 'The Problem Solver', 'The Guide', 'The Executor'
  ];

  // Page paths
  const PAGES = ['/', '/profile', '/scholarships', '/careers', '/deadlines', '/essay', '/friends'];

  // Clickable elements
  const CLICK_TARGETS = [
    { element: '.btn-primary', text: 'Get Started', weight: 3 },
    { element: '#start-assessment', text: 'Take Assessment', weight: 4 },
    { element: '.scholarship-card', text: 'View Scholarship', weight: 2 },
    { element: '#share-result-btn', text: 'Share My Result', weight: 3 },
    { element: '.nav-item', text: 'Navigation', weight: 2 },
    { element: '.career-card', text: 'Explore Career', weight: 2 },
    { element: '#save-deadline', text: 'Save Deadline', weight: 1 },
    { element: '.friend-card', text: 'View Friend', weight: 2 },
    { element: '#essay-draft-btn', text: 'Start Essay', weight: 1 },
    { element: '.vylium-option', text: 'Assessment Answer', weight: 5 }
  ];

  // Features
  const FEATURES = [
    'assessment', 'scholarships', 'careers', 'deadlines', 'essay_helper',
    'friend_compare', 'profile', 'share', 'parent_view', 'notifications'
  ];

  let isRunning = false;
  let simulationInterval = null;
  let eventBuffer = [];

  // ===========================================
  // EVENT GENERATION
  // ===========================================

  function generateSessionId() {
    return 'sim_' + Math.random().toString(36).substring(2, 15);
  }

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function weightedChoice(items) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
      random -= item.weight || 1;
      if (random <= 0) return item;
    }
    return items[items.length - 1];
  }

  function generateTimestamp(hoursAgo = 0, minutesAgo = 0) {
    const date = new Date();
    date.setHours(date.getHours() - hoursAgo);
    date.setMinutes(date.getMinutes() - minutesAgo);
    return date.toISOString();
  }

  function generateEvent(eventName, data = {}, timestamp = null) {
    return {
      event: eventName,
      timestamp: timestamp || new Date().toISOString(),
      date: (timestamp || new Date().toISOString()).split('T')[0],
      sessionId: data.sessionId || generateSessionId(),
      url: data.url || '/',
      simulated: true,
      ...data
    };
  }

  // ===========================================
  // SESSION SIMULATION
  // ===========================================

  function simulateSession(persona, baseTime = new Date()) {
    const sessionId = generateSessionId();
    const events = [];
    let currentTime = new Date(baseTime);

    // Session start
    events.push(generateEvent('session_start', {
      sessionId,
      referrer: Math.random() > 0.7 ? 'https://google.com' : 'direct',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)',
      screenSize: '390x844',
      viewport: '390x844'
    }, currentTime.toISOString()));

    // Page view
    currentTime.setSeconds(currentTime.getSeconds() + 2);
    events.push(generateEvent('page_view', {
      sessionId,
      path: '/',
      title: 'Jasmine Scholarship Hub'
    }, currentTime.toISOString()));

    // Clicks and navigation
    const numClicks = Math.floor(Math.random() * 10 * persona.clickRate) + 3;
    for (let i = 0; i < numClicks; i++) {
      currentTime.setSeconds(currentTime.getSeconds() + Math.random() * 30 + 5);
      const target = weightedChoice(CLICK_TARGETS);
      events.push(generateEvent('click', {
        sessionId,
        element: target.element,
        text: target.text,
        dataTrack: target.element.replace('.', '').replace('#', '')
      }, currentTime.toISOString()));
    }

    // Feature usage
    const numFeatures = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numFeatures; i++) {
      currentTime.setSeconds(currentTime.getSeconds() + Math.random() * 60 + 10);
      const feature = randomChoice(FEATURES);
      events.push(generateEvent('feature_used', {
        sessionId,
        feature
      }, currentTime.toISOString()));
    }

    // Assessment flow (if applicable)
    if (persona.commonActions.includes('assessment') && Math.random() < persona.completionRate) {
      currentTime.setSeconds(currentTime.getSeconds() + 10);
      events.push(generateEvent('assessment_start', { sessionId }, currentTime.toISOString()));

      // Progress through questions
      for (let q = 1; q <= 50; q += Math.floor(Math.random() * 5) + 1) {
        currentTime.setSeconds(currentTime.getSeconds() + Math.random() * 8 + 3);
        events.push(generateEvent('assessment_progress', {
          sessionId,
          question: q,
          total: 50,
          percent: Math.round((q / 50) * 100)
        }, currentTime.toISOString()));
      }

      // Complete
      currentTime.setSeconds(currentTime.getSeconds() + 5);
      const futureType = randomChoice(VYLIUM_TYPES);
      events.push(generateEvent('assessment_complete', {
        sessionId,
        futureType,
        typeCode: futureType.substring(4, 6).toUpperCase(),
        topDimensions: ['Creator', 'Analyst', 'Leader'].sort(() => Math.random() - 0.5).slice(0, 3)
      }, currentTime.toISOString()));

      // Share (maybe)
      if (Math.random() < persona.shareRate) {
        currentTime.setSeconds(currentTime.getSeconds() + 15);
        events.push(generateEvent('share_created', {
          sessionId,
          futureType,
          generation: 0
        }, currentTime.toISOString()));

        events.push(generateEvent('share_started', {
          sessionId,
          messageType: 'default'
        }, currentTime.toISOString()));

        if (Math.random() > 0.3) {
          events.push(generateEvent('share_completed', {
            sessionId
          }, currentTime.toISOString()));
        }
      }
    }

    // Session end
    const duration = Math.floor(persona.avgSessionDuration * (0.5 + Math.random()));
    currentTime.setSeconds(currentTime.getSeconds() + duration);
    events.push(generateEvent('session_end', {
      sessionId,
      duration,
      pageViews: Math.floor(Math.random() * 5) + 1,
      clicks: numClicks,
      features: persona.commonActions.slice(0, Math.floor(Math.random() * 3) + 1)
    }, currentTime.toISOString()));

    return events;
  }

  // ===========================================
  // VIRAL CHAIN SIMULATION
  // ===========================================

  function simulateViralChain(depth = 3) {
    const events = [];
    let parentToken = null;
    let generation = 0;

    for (let i = 0; i < depth; i++) {
      const sessionId = generateSessionId();
      const baseTime = new Date();
      baseTime.setHours(baseTime.getHours() - (depth - i) * 2);

      // Link opened
      if (parentToken) {
        events.push(generateEvent('share_link_opened', {
          sessionId,
          token: parentToken
        }, baseTime.toISOString()));

        // Guest session
        events.push(generateEvent('guest_session_started', {
          sessionId,
          hasReferral: true
        }, baseTime.toISOString()));

        // Guest test
        if (Math.random() > 0.3) {
          events.push(generateEvent('guest_test_started', {
            sessionId
          }, baseTime.toISOString()));

          if (Math.random() > 0.2) {
            events.push(generateEvent('guest_test_completed', {
              sessionId,
              futureType: randomChoice(VYLIUM_TYPES)
            }, baseTime.toISOString()));

            // Comparison
            events.push(generateEvent('comparison_viewed', {
              sessionId,
              score: Math.floor(Math.random() * 50) + 50
            }, baseTime.toISOString()));

            // Re-share
            if (Math.random() > 0.5) {
              parentToken = generateSessionId().substring(0, 22);
              generation++;
              events.push(generateEvent('share_created', {
                sessionId,
                generation,
                parentToken
              }, baseTime.toISOString()));
            }
          }
        }
      } else {
        // Initial share
        parentToken = generateSessionId().substring(0, 22);
        events.push(generateEvent('share_created', {
          sessionId,
          generation: 0,
          futureType: randomChoice(VYLIUM_TYPES)
        }, baseTime.toISOString()));
        events.push(generateEvent('share_completed', {
          sessionId
        }, baseTime.toISOString()));
      }
    }

    return events;
  }

  // ===========================================
  // BATCH GENERATION (Historical Data)
  // ===========================================

  function generateHistoricalData(days = 7) {
    const allEvents = [];
    const personas = Object.values(PERSONAS);

    for (let d = 0; d < days; d++) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - (days - d - 1));

      // More sessions on weekends
      const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      const sessionsPerDay = isWeekend ? Math.floor(Math.random() * 15) + 10 : Math.floor(Math.random() * 10) + 5;

      for (let s = 0; s < sessionsPerDay; s++) {
        const persona = randomChoice(personas);
        const sessionTime = new Date(dayDate);
        sessionTime.setHours(Math.floor(Math.random() * 14) + 8); // 8am to 10pm
        sessionTime.setMinutes(Math.floor(Math.random() * 60));

        const sessionEvents = simulateSession(persona, sessionTime);
        allEvents.push(...sessionEvents);
      }

      // Add some viral chains
      if (Math.random() > 0.5) {
        const chainEvents = simulateViralChain(Math.floor(Math.random() * 3) + 1);
        allEvents.push(...chainEvents);
      }
    }

    return allEvents;
  }

  function injectHistoricalData(days = 7) {
    const events = generateHistoricalData(days);
    const existingEvents = JSON.parse(localStorage.getItem('jasmine_analytics') || '[]');

    // Filter out old simulated events
    const realEvents = existingEvents.filter(e => !e.simulated);

    // Combine and sort
    const combined = [...realEvents, ...events].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Keep max
    const maxEvents = 5000;
    const trimmed = combined.slice(-maxEvents);

    localStorage.setItem('jasmine_analytics', JSON.stringify(trimmed));
    console.log(`[Simulator] Injected ${events.length} historical events`);
    return events.length;
  }

  // ===========================================
  // LIVE SIMULATION
  // ===========================================

  function startLiveSimulation(interval = 5000) {
    if (isRunning) return;
    isRunning = true;

    console.log('[Simulator] Starting live simulation...');

    simulationInterval = setInterval(() => {
      // Generate a random event
      const persona = randomChoice(Object.values(PERSONAS));
      const sessionId = generateSessionId();

      // Pick random event type
      const eventTypes = [
        { type: 'page_view', weight: 3 },
        { type: 'click', weight: 4 },
        { type: 'feature_used', weight: 2 },
        { type: 'assessment_start', weight: 1 },
        { type: 'assessment_complete', weight: 1 },
        { type: 'share_created', weight: 1 }
      ];

      const chosen = weightedChoice(eventTypes);
      let event;

      switch (chosen.type) {
        case 'page_view':
          event = generateEvent('page_view', {
            sessionId,
            path: randomChoice(PAGES),
            title: 'Jasmine Scholarship Hub'
          });
          break;
        case 'click':
          const target = weightedChoice(CLICK_TARGETS);
          event = generateEvent('click', {
            sessionId,
            element: target.element,
            text: target.text
          });
          break;
        case 'feature_used':
          event = generateEvent('feature_used', {
            sessionId,
            feature: randomChoice(FEATURES)
          });
          break;
        case 'assessment_start':
          event = generateEvent('assessment_start', { sessionId });
          break;
        case 'assessment_complete':
          event = generateEvent('assessment_complete', {
            sessionId,
            futureType: randomChoice(VYLIUM_TYPES),
            topDimensions: ['Creator', 'Analyst', 'Leader']
          });
          break;
        case 'share_created':
          event = generateEvent('share_created', {
            sessionId,
            futureType: randomChoice(VYLIUM_TYPES),
            generation: Math.random() > 0.7 ? 1 : 0
          });
          break;
      }

      if (event) {
        // Add to localStorage
        const events = JSON.parse(localStorage.getItem('jasmine_analytics') || '[]');
        events.push(event);
        if (events.length > 5000) events.splice(0, events.length - 5000);
        localStorage.setItem('jasmine_analytics', JSON.stringify(events));

        console.log('[Simulator] Live event:', event.event);
      }
    }, interval);
  }

  function stopLiveSimulation() {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    isRunning = false;
    console.log('[Simulator] Live simulation stopped');
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  return {
    PERSONAS,
    VYLIUM_TYPES,
    simulateSession,
    simulateViralChain,
    generateHistoricalData,
    injectHistoricalData,
    startLiveSimulation,
    stopLiveSimulation,
    isRunning: () => isRunning
  };
})();

if (typeof window !== 'undefined') {
  window.Simulator = Simulator;
}
