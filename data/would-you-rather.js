/**
 * Would You Rather Question Bank
 * Categories: FUN, PROFILE, FUTURE, MONEY, SOCIAL
 * PROFILE questions contribute to RIASEC scoring
 */

const WouldYouRatherData = (function() {
  'use strict';

  // RIASEC dimension mappings for PROFILE questions
  const DIMENSIONS = {
    R: 'Realistic',    // Builder, hands-on
    I: 'Investigative', // Analyst, researcher
    A: 'Artistic',      // Creator, expressive
    S: 'Social',        // Helper, connector
    E: 'Enterprising',  // Leader, persuader
    C: 'Conventional'   // Organizer, detail-oriented
  };

  const QUESTIONS = [
    // === PURE FUN / LOW-STAKES ===
    { id: 1, category: ['FUN', 'SOCIAL'], a: "Accidentally call your teacher 'Mom'", b: "Trip walking onto the stage at graduation" },
    { id: 2, category: ['FUN'], a: "Have Wi-Fi that works perfectly but only at school", b: "Have terrible Wi-Fi everywhere else" },
    { id: 3, category: ['FUN'], a: "Wear your school mascot costume for a full day", b: "Sing the school song solo at lunch" },
    { id: 4, category: ['FUN'], a: "Have homework every Friday night", b: "Have school start one hour earlier" },
    { id: 5, category: ['FUN'], a: "Give up TikTok for a month", b: "Give up your favorite snack for a month" },
    { id: 6, category: ['FUN'], a: "Have your parents read your group chat", b: "Have your teacher read your search history" },
    { id: 7, category: ['FUN'], a: "Always be 10 minutes early", b: "Always be 10 minutes late" },
    { id: 8, category: ['FUN'], a: "Only use voice-to-text for a week", b: "Only type with one thumb for a week" },
    { id: 9, category: ['FUN'], a: "Have free food forever", b: "Have free concert tickets forever" },
    { id: 10, category: ['FUN'], a: "Be famous at school", b: "Be completely anonymous online" },
    { id: 11, category: ['FUN'], a: "Get front-row seats to your favorite artist", b: "Get courtside seats to your favorite team" },
    { id: 12, category: ['FUN'], a: "Always have a perfect hair day", b: "Never have to wake up before 9 AM" },
    { id: 13, category: ['FUN'], a: "Lose your phone for a weekend", b: "Lose streaming for a month" },
    { id: 14, category: ['FUN'], a: "Have a locker that is always organized", b: "Have a backpack that never gets heavy" },
    { id: 15, category: ['FUN'], a: "Get an extra hour of sleep every day", b: "Get an extra free period every day" },
    { id: 16, category: ['FUN'], a: "Have to wear Crocs with every outfit", b: "Wear dress shoes with every outfit" },
    { id: 17, category: ['FUN'], a: "Only listen to one artist for a year", b: "Never listen to your favorite artist for a year" },
    { id: 18, category: ['FUN'], a: "Have unlimited snacks at school", b: "Have unlimited coffee/smoothies after school" },
    { id: 19, category: ['FUN'], a: "Have a surprise day off", b: "Have a surprise school trip" },
    { id: 20, category: ['FUN'], a: "Never have group projects again", b: "Never have presentations again" },

    // === SCHOOL LIFE (PROFILE) ===
    { id: 21, category: ['PROFILE'], a: "Ace a huge test", b: "Give an amazing presentation", score: { a: { I: 1, C: 1 }, b: { E: 1, S: 1 } } },
    { id: 22, category: ['PROFILE'], a: "Work alone on a project", b: "Work with three friends", score: { a: { I: 1 }, b: { S: 1, E: 1 } } },
    { id: 23, category: ['PROFILE'], a: "Have a teacher give exact instructions", b: "Figure out your own approach", score: { a: { C: 1 }, b: { A: 1, I: 1 } } },
    { id: 24, category: ['PROFILE'], a: "Build the project", b: "Explain the project", score: { a: { R: 1 }, b: { S: 1, E: 1 } } },
    { id: 25, category: ['PROFILE'], a: "Solve 20 math problems", b: "Write a 3-page story", score: { a: { I: 1, C: 1 }, b: { A: 1 } } },
    { id: 26, category: ['PROFILE'], a: "Lead the group", b: "Be the expert everyone relies on", score: { a: { E: 1 }, b: { I: 1 } } },
    { id: 27, category: ['PROFILE'], a: "Have one huge project", b: "Have ten small assignments", score: { a: { A: 1 }, b: { C: 1 } } },
    { id: 28, category: ['PROFILE'], a: "Take an open-book test", b: "Make a presentation", score: { a: { I: 1 }, b: { E: 1, S: 1 } } },
    { id: 29, category: ['PROFILE'], a: "Learn by watching someone", b: "Learn by trying it yourself", score: { a: { S: 1 }, b: { R: 1 } } },
    { id: 30, category: ['PROFILE'], a: "Take a class because it is useful", b: "Take a class because it is interesting", score: { a: { C: 1, R: 1 }, b: { A: 1, I: 1 } } },
    { id: 31, category: ['PROFILE'], a: "Debate a topic", b: "Research it quietly", score: { a: { E: 1, S: 1 }, b: { I: 1 } } },
    { id: 32, category: ['PROFILE'], a: "Create the visuals", b: "Organize the information", score: { a: { A: 1 }, b: { C: 1 } } },
    { id: 33, category: ['PROFILE'], a: "Have a predictable teacher", b: "Have a spontaneous teacher", score: { a: { C: 1 }, b: { A: 1 } } },
    { id: 34, category: ['PROFILE'], a: "Fix a broken science experiment", b: "Explain why it failed", score: { a: { R: 1 }, b: { I: 1 } } },
    { id: 35, category: ['PROFILE'], a: "Get an A in a boring class", b: "Get a B in a class you love", score: { a: { C: 1 }, b: { A: 1 } } },
    { id: 36, category: ['PROFILE'], a: "Take shop class", b: "Take psychology", score: { a: { R: 1 }, b: { S: 1, I: 1 } } },
    { id: 37, category: ['PROFILE'], a: "Take photography", b: "Take coding", score: { a: { A: 1 }, b: { I: 1, R: 1 } } },
    { id: 38, category: ['PROFILE'], a: "Take business", b: "Take engineering", score: { a: { E: 1 }, b: { R: 1, I: 1 } } },
    { id: 39, category: ['PROFILE'], a: "Take anatomy", b: "Take graphic design", score: { a: { I: 1, S: 1 }, b: { A: 1 } } },
    { id: 40, category: ['PROFILE'], a: "Have a class with lots of discussion", b: "Have a class with lots of hands-on work", score: { a: { S: 1, E: 1 }, b: { R: 1 } } },

    // === CAREER DISCOVERY ===
    { id: 41, category: ['PROFILE', 'FUTURE'], a: "Build a house", b: "Design one", score: { a: { R: 1 }, b: { A: 1, I: 1 } } },
    { id: 42, category: ['PROFILE', 'FUTURE'], a: "Run a business", b: "Invent a product", score: { a: { E: 1 }, b: { I: 1, A: 1 } } },
    { id: 43, category: ['PROFILE', 'FUTURE'], a: "Help a patient", b: "Solve a technical problem", score: { a: { S: 1 }, b: { I: 1, R: 1 } } },
    { id: 44, category: ['PROFILE', 'FUTURE'], a: "Work with animals", b: "Work with technology", score: { a: { R: 1, S: 1 }, b: { I: 1 } } },
    { id: 45, category: ['PROFILE', 'FUTURE'], a: "Repair an airplane", b: "Fly one", score: { a: { R: 1 }, b: { R: 1, E: 1 } } },
    { id: 46, category: ['PROFILE', 'FUTURE'], a: "Design an app", b: "Market the app", score: { a: { I: 1, A: 1 }, b: { E: 1 } } },
    { id: 47, category: ['PROFILE', 'FUTURE'], a: "Create a video", b: "Analyze how well the video performed", score: { a: { A: 1 }, b: { I: 1, C: 1 } } },
    { id: 48, category: ['PROFILE', 'FUTURE'], a: "Coach a team", b: "Own the team", score: { a: { S: 1 }, b: { E: 1 } } },
    { id: 49, category: ['PROFILE', 'FUTURE'], a: "Investigate a crime", b: "Argue the case in court", score: { a: { I: 1 }, b: { E: 1, S: 1 } } },
    { id: 50, category: ['PROFILE', 'FUTURE'], a: "Work in a hospital", b: "Work in a laboratory", score: { a: { S: 1 }, b: { I: 1 } } },
    { id: 51, category: ['PROFILE', 'FUTURE'], a: "Be an architect", b: "Be a construction manager", score: { a: { A: 1, I: 1 }, b: { E: 1, R: 1 } } },
    { id: 52, category: ['PROFILE', 'FUTURE'], a: "Be a firefighter", b: "Be an engineer", score: { a: { R: 1, S: 1 }, b: { I: 1 } } },
    { id: 53, category: ['PROFILE', 'FUTURE'], a: "Be a chef", b: "Own the restaurant", score: { a: { A: 1, R: 1 }, b: { E: 1 } } },
    { id: 54, category: ['PROFILE', 'FUTURE'], a: "Be a photographer", b: "Be a creative director", score: { a: { A: 1 }, b: { E: 1, A: 1 } } },
    { id: 55, category: ['PROFILE', 'FUTURE'], a: "Build robots", b: "Sell robots", score: { a: { R: 1, I: 1 }, b: { E: 1 } } },
    { id: 56, category: ['PROFILE', 'FUTURE'], a: "Teach kids", b: "Train adults", score: { a: { S: 1 }, b: { S: 1, E: 1 } } },
    { id: 57, category: ['PROFILE', 'FUTURE'], a: "Work on cars", b: "Design cars", score: { a: { R: 1 }, b: { A: 1, I: 1 } } },
    { id: 58, category: ['PROFILE', 'FUTURE'], a: "Be a nurse", b: "Be a medical researcher", score: { a: { S: 1 }, b: { I: 1 } } },
    { id: 59, category: ['PROFILE', 'FUTURE'], a: "Work for a startup", b: "Work for a large company", score: { a: { E: 1, A: 1 }, b: { C: 1 } } },
    { id: 60, category: ['PROFILE', 'FUTURE'], a: "Have a high-paying job you like", b: "Have a lower-paying job you love", score: { a: { E: 1, C: 1 }, b: { A: 1, S: 1 } } },

    // === COLLEGE / CAMPUS ===
    { id: 61, category: ['FUTURE', 'SOCIAL'], a: "Go to a huge university", b: "Go to a small college where everyone knows everyone" },
    { id: 62, category: ['FUTURE', 'SOCIAL'], a: "Live in a dorm", b: "Have your own apartment" },
    { id: 63, category: ['FUTURE'], a: "Go to an in-state school that costs less", b: "Go to an out-of-state school that is a perfect fit" },
    { id: 64, category: ['FUTURE'], a: "Go to a party school with great academics", b: "Go to a quiet campus with great academics" },
    { id: 65, category: ['FUTURE'], a: "Attend a school in a big city", b: "Attend a school in a college town" },
    { id: 66, category: ['FUTURE'], a: "Have a roommate you pick", b: "Have a random roommate who could be your new best friend" },
    { id: 67, category: ['FUTURE'], a: "Go to a school close to home", b: "Go to a school across the country" },
    { id: 68, category: ['FUTURE', 'PROFILE'], a: "Join Greek life", b: "Stay independent", score: { a: { S: 1, E: 1 }, b: { I: 1 } } },
    { id: 69, category: ['FUTURE'], a: "Attend a prestigious school with no social life", b: "Attend a fun school with solid academics" },
    { id: 70, category: ['FUTURE'], a: "Graduate with honors but more debt", b: "Graduate debt-free with a decent GPA" },

    // === MONEY / SCHOLARSHIPS ===
    { id: 71, category: ['MONEY'], a: "Apply to 20 scholarships with shorter essays", b: "Apply to 5 scholarships with longer essays" },
    { id: 72, category: ['MONEY'], a: "Win one $10,000 scholarship", b: "Win ten $1,000 scholarships" },
    { id: 73, category: ['MONEY'], a: "Get a full-ride to your second-choice school", b: "Pay full price for your dream school" },
    { id: 74, category: ['MONEY'], a: "Work part-time during college", b: "Take out more loans and focus on classes" },
    { id: 75, category: ['MONEY'], a: "Graduate in 4 years with debt", b: "Graduate in 5 years debt-free" },
    { id: 76, category: ['MONEY'], a: "Live at home to save money", b: "Pay for the dorm experience" },
    { id: 77, category: ['MONEY'], a: "Get a scholarship that requires community service", b: "Get a scholarship with no requirements" },
    { id: 78, category: ['MONEY'], a: "Apply to one hard scholarship", b: "Apply to three easier ones" },
    { id: 79, category: ['MONEY'], a: "Get money from a local organization", b: "Get money from a national foundation" },
    { id: 80, category: ['MONEY'], a: "Use your scholarship for tuition", b: "Use it for housing and food" },

    // === LIFESTYLE / VALUES ===
    { id: 81, category: ['PROFILE', 'FUTURE'], a: "Have a 9-to-5 job with weekends off", b: "Have a flexible schedule with some weekend work", score: { a: { C: 1 }, b: { A: 1, E: 1 } } },
    { id: 82, category: ['PROFILE', 'FUTURE'], a: "Work from home forever", b: "Always work in an office with people", score: { a: { I: 1 }, b: { S: 1 } } },
    { id: 83, category: ['PROFILE', 'FUTURE'], a: "Have a job that pays well but is boring", b: "Have a job that is exciting but pays less", score: { a: { C: 1 }, b: { A: 1 } } },
    { id: 84, category: ['PROFILE', 'FUTURE'], a: "Be your own boss", b: "Work for a great company", score: { a: { E: 1 }, b: { S: 1, C: 1 } } },
    { id: 85, category: ['PROFILE', 'FUTURE'], a: "Travel for work", b: "Stay in one place", score: { a: { E: 1, A: 1 }, b: { C: 1, S: 1 } } },
    { id: 86, category: ['PROFILE', 'FUTURE'], a: "Have a job with a clear ladder", b: "Have a job where you create your own path", score: { a: { C: 1 }, b: { E: 1, A: 1 } } },
    { id: 87, category: ['PROFILE', 'FUTURE'], a: "Work with your hands", b: "Work with your mind", score: { a: { R: 1 }, b: { I: 1 } } },
    { id: 88, category: ['PROFILE', 'FUTURE'], a: "Help people directly", b: "Help people through systems", score: { a: { S: 1 }, b: { I: 1, C: 1 } } },
    { id: 89, category: ['PROFILE', 'FUTURE'], a: "Make money early", b: "Make more money later", score: { a: { R: 1, E: 1 }, b: { I: 1 } } },
    { id: 90, category: ['PROFILE', 'FUTURE'], a: "Be known for creativity", b: "Be known for reliability", score: { a: { A: 1 }, b: { C: 1 } } },

    // === BONUS FUN ===
    { id: 91, category: ['FUN', 'SOCIAL'], a: "Have your crush see your camera roll", b: "Have your parents see your TikTok drafts" },
    { id: 92, category: ['FUN', 'SOCIAL'], a: "Be the class clown", b: "Be the quiet genius" },
    { id: 93, category: ['FUN'], a: "Have your dream car but live in a tiny apartment", b: "Have a nice apartment but take the bus" },
    { id: 94, category: ['FUN'], a: "Be able to read minds but never turn it off", b: "Be invisible but only when no one is looking" },
    { id: 95, category: ['FUN'], a: "Have unlimited money but no friends", b: "Have no money but unlimited friends" },
    { id: 96, category: ['FUN', 'SOCIAL'], a: "Go viral for something embarrassing", b: "Never be famous online" },
    { id: 97, category: ['FUN'], a: "Have summer break all year", b: "Have no homework ever" },
    { id: 98, category: ['FUN'], a: "Meet your favorite celebrity", b: "Be friends with someone who becomes famous" },
    { id: 99, category: ['FUN', 'SOCIAL'], a: "Win prom king/queen", b: "Win a $5,000 scholarship" },
    { id: 100, category: ['FUN'], a: "Know the exact date of every deadline forever", b: "Never procrastinate again" }
  ];

  function getRandomQuestion(excludeIds = [], category = null) {
    let filtered = QUESTIONS.filter(q => !excludeIds.includes(q.id));
    if (category) {
      filtered = filtered.filter(q => q.category.includes(category));
    }
    if (filtered.length === 0) return null;
    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  function getDailyQuestion() {
    // Use date as seed for consistent daily question
    const today = new Date().toDateString();
    const seed = today.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const index = seed % QUESTIONS.length;
    return QUESTIONS[index];
  }

  function getQuestionById(id) {
    return QUESTIONS.find(q => q.id === id);
  }

  function getAllQuestions() {
    return QUESTIONS;
  }

  function getQuestionsByCategory(category) {
    return QUESTIONS.filter(q => q.category.includes(category));
  }

  return {
    QUESTIONS,
    DIMENSIONS,
    getRandomQuestion,
    getDailyQuestion,
    getQuestionById,
    getAllQuestions,
    getQuestionsByCategory
  };
})();
