/**
 * Vylium Personality Test
 * "Light on your path."
 *
 * Based on Holland RIASEC + overlay traits
 * Non-clinical, education and career discovery assessment
 *
 * Version: v3_30q_six_core - August 27, 2026
 * 30-question assessment with independent 0-100 scoring
 */

const VyliumProfile = (function() {
  'use strict';

  const STORAGE_KEY = 'jasmine_vylium_profile';
  const GUEST_ID_KEY = 'jasmine_vylium_guest_id';
  const SUPABASE_URL = 'https://ntmsclblmncklbxlttlw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXNjbGJsbW5ja2xieGx0dGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDUyNzUsImV4cCI6MjEwMzI4MTI3NX0.BVm-mcQsxJQAKHBgLEhnNRTL0Yazrys9uXaSifFucQU';

  let supabaseProfileId = null;
  let syncPending = false;

  // SIX CORE DIMENSIONS (RIASEC-based)
  const DIMENSIONS = {
    R: { code: 'R', name: 'Realistic', label: 'Builder', color: '#ef4444', description: 'Hands-on, practical, physical work', keywords: ['Making', 'Fixing', 'Tools', 'Tangible'] },
    I: { code: 'I', name: 'Investigative', label: 'Analyst', color: '#3b82f6', description: 'Research, analysis, problem-solving', keywords: ['Curious', 'Investigative', 'Logical'] },
    A: { code: 'A', name: 'Artistic', label: 'Creator', color: '#ec4899', description: 'Creative, expressive, original', keywords: ['Original', 'Expressive', 'Imaginative'] },
    S: { code: 'S', name: 'Social', label: 'Connector', color: '#10b981', description: 'Helping, teaching, connecting', keywords: ['Empathy', 'Collaboration', 'Community'] },
    E: { code: 'E', name: 'Enterprising', label: 'Leader', color: '#f59e0b', description: 'Leading, persuading, managing', keywords: ['Initiative', 'Ownership', 'Influence'] },
    C: { code: 'C', name: 'Conventional', label: 'Organizer', color: '#6366f1', description: 'Organizing, detail-oriented, systematic', keywords: ['Planning', 'Structure', 'Reliability'] }
  };

  // OVERLAY TRAITS
  const OVERLAY_TRAITS = {
    Explorer: { key: 'X', description: 'Novelty seeking' },
    Team: { key: 'T', description: 'Team orientation' },
    Independence: { key: 'D', description: 'Independent worker' },
    Practicality: { key: 'P', description: 'Practical focus' },
    Verbal: { key: 'V', description: 'Verbal/social expression' },
    Numerical: { key: 'N', description: 'Numerical/analytical confidence' },
    HandsOn: { key: 'H', description: 'Hands-on preference' },
    Structure: { key: 'K', description: 'Structure preference' },
    Flexibility: { key: 'F', description: 'Flexibility preference' },
    Leadership: { key: 'L', description: 'Leadership energy' },
    Mission: { key: 'M', description: 'Mission/service orientation' },
    Growth: { key: 'G', description: 'Growth/learning orientation' },
    Risk: { key: 'RISK', description: 'Risk tolerance' },
    Indoor: { key: 'INDOOR', description: 'Indoor work' },
    Outdoor: { key: 'OUTDOOR', description: 'Outdoor work' },
    SmallTeam: { key: 'SMALL', description: 'Small team preference' },
    LargeOrg: { key: 'LARGE', description: 'Large organization fit' }
  };

  // VYLIUM TYPES (Top 2 dimensions → Type)
  const TYPES = {
    'RI': { name: 'The Engineer', emoji: '⚙️', tagline: 'Hands-on thinker + problem solver', description: 'You combine practical skills with analytical thinking. You love understanding how things work and making them better.' },
    'IR': { name: 'The Engineer', emoji: '⚙️', tagline: 'Analytical builder + practical thinker', description: 'You blend research with hands-on application. You turn ideas into working solutions.' },
    'RA': { name: 'The Maker', emoji: '🛠️', tagline: 'Creator who builds', description: 'You blend practical skills with creative vision. You build things that are both functional and beautiful.' },
    'AR': { name: 'The Maker', emoji: '🛠️', tagline: 'Creative builder', description: 'You combine creativity with craftsmanship. You create beautiful things with your hands.' },
    'RS': { name: 'The Coach', emoji: '🏆', tagline: 'Practical helper + hands-on guide', description: 'You combine physical skills with people skills. You excel at training others and hands-on leadership.' },
    'SR': { name: 'The Coach', emoji: '🏆', tagline: 'Helper who does', description: 'You blend helping with practical action. You teach through doing.' },
    'RE': { name: 'The Builder-Leader', emoji: '🏗️', tagline: 'Action-oriented leader', description: 'You lead with action. You prefer managing projects where you can see tangible results.' },
    'ER': { name: 'The Entrepreneur', emoji: '💼', tagline: 'Leader who builds', description: 'You combine leadership with action. You build businesses and lead by doing.' },
    'RC': { name: 'The Operator', emoji: '🔧', tagline: 'Technical + precise', description: 'You combine technical skills with precision. You excel at systematic, hands-on work.' },
    'CR': { name: 'The Technician', emoji: '🔬', tagline: 'Precise + practical', description: 'You blend precision with practical skills. You excel at technical, detailed work.' },
    'IA': { name: 'The Innovator', emoji: '💡', tagline: 'Creative thinker + curious problem solver', description: 'You combine deep thinking with creativity. You generate original ideas backed by research.' },
    'AI': { name: 'The Innovator', emoji: '💡', tagline: 'Curious creator + analytical mind', description: 'You combine artistic vision with analytical thinking. You create groundbreaking ideas.' },
    'IS': { name: 'The Problem Solver', emoji: '🧩', tagline: 'Analytical helper', description: 'You use analysis to help people. You find solutions to complex human challenges.' },
    'SI': { name: 'The Problem Solver', emoji: '🧩', tagline: 'Thoughtful connector', description: 'You blend empathy with understanding. You help people solve problems thoughtfully.' },
    'IE': { name: 'The Strategist', emoji: '♟️', tagline: 'Data-driven leader', description: 'You combine research with business sense. You develop winning strategies based on data.' },
    'EI': { name: 'The Strategist', emoji: '♟️', tagline: 'Strategic thinker + leader', description: 'You blend leadership with analysis. You make strategic decisions based on data.' },
    'IC': { name: 'The Systems Thinker', emoji: '📊', tagline: 'Analytical + organized', description: 'You love data and precision. You excel at detailed research and systematic analysis.' },
    'CI': { name: 'The Systems Thinker', emoji: '📊', tagline: 'Organized analyst', description: 'You combine organization with analysis. You conduct thorough, systematic research.' },
    'AS': { name: 'The Storyteller', emoji: '📖', tagline: 'Creative connector', description: 'You use creativity to connect with people. You excel at communication and expression.' },
    'SA': { name: 'The Storyteller', emoji: '📖', tagline: 'Empathetic creator', description: 'You combine social energy with creativity. You entertain and inspire others.' },
    'AE': { name: 'The Visionary', emoji: '🌟', tagline: 'Creative leader + big ideas', description: 'You combine creative vision with leadership. You inspire others with big ideas.' },
    'EA': { name: 'The Visionary', emoji: '🌟', tagline: 'Leader with vision', description: 'You combine leadership with creativity. You bring creative projects to life.' },
    'AC': { name: 'The Designer', emoji: '✏️', tagline: 'Creative + precise', description: 'You blend creativity with precision. You create beautiful, well-organized work.' },
    'CA': { name: 'The Designer', emoji: '✏️', tagline: 'Organized creative', description: 'You blend precision with creativity. You perfect and polish creative work.' },
    'SE': { name: 'The Catalyst', emoji: '📣', tagline: 'Connector + influencer', description: 'You blend people skills with leadership. You motivate and guide others.' },
    'ES': { name: 'The Catalyst', emoji: '📣', tagline: 'Leader who connects', description: 'You combine leadership with people skills. You inspire and manage teams.' },
    'SC': { name: 'The Guide', emoji: '📋', tagline: 'Helpful organizer', description: 'You combine helping with organization. You keep teams running smoothly.' },
    'CS': { name: 'The Guide', emoji: '📋', tagline: 'Organized helper', description: 'You combine organization with people focus. You keep organizations running smoothly.' },
    'EC': { name: 'The Executor', emoji: '📈', tagline: 'Leader + organizer', description: 'You combine leadership with organization. You run efficient, successful operations.' },
    'CE': { name: 'The Executor', emoji: '📈', tagline: 'Organized leader', description: 'You blend organization with business sense. You plan and execute efficiently.' }
  };

  // 30 ASSESSMENT QUESTIONS - v3_30q_six_core
  // Dimensions: R=Builder, I=Analyst, A=Creator, S=Connector, E=Leader, C=Organizer
  const ASSESSMENT_QUESTIONS = [
    // PART 1 - CORE FORCED CHOICE (Q1-Q18)
    { id: 1, text: 'Which sounds more satisfying?', a: 'Fixing or building something with your hands', b: 'Figuring out why something works', score: { a: { R: 2, HandsOn: 1 }, b: { I: 2 } } },
    { id: 2, text: 'Which project sounds better?', a: 'Design a poster, video, photo, brand, or other original creation', b: 'Organize an event and get people excited about it', score: { a: { A: 2 }, b: { E: 1, S: 1 } } },
    { id: 3, text: 'When something important needs to get done:', a: 'I like a clear plan and knowing the steps', b: 'I like freedom to figure out my own approach', score: { a: { C: 2, Structure: 1 }, b: { A: 1, Explorer: 1, Flexibility: 1 } } },
    { id: 4, text: 'Which sounds more interesting?', a: 'Working with tools, equipment, materials, or physical objects', b: 'Working with ideas, information, data, or theories', score: { a: { R: 2, HandsOn: 1 }, b: { I: 2 } } },
    { id: 5, text: 'Which would you rather be known for?', a: 'Being dependable and prepared', b: 'Being original and imaginative', score: { a: { C: 2 }, b: { A: 2 } } },
    { id: 6, text: 'Which sounds more energizing?', a: 'Helping someone solve a problem', b: 'Convincing people to support an idea', score: { a: { S: 2, Mission: 1 }, b: { E: 2, Leadership: 1 } } },
    { id: 7, text: 'If you had several free hours:', a: 'Make, repair, cook, build, or create something tangible', b: 'Research something you suddenly became curious about', score: { a: { R: 2, HandsOn: 1 }, b: { I: 2, Explorer: 1 } } },
    { id: 8, text: 'Which assignment would you rather receive?', a: 'Create something original', b: 'Analyze information and explain what it means', score: { a: { A: 2 }, b: { I: 2 } } },
    { id: 9, text: 'During a group project:', a: 'I naturally start organizing people and decisions', b: 'I would rather own one important part and do it well', score: { a: { E: 2, Leadership: 1 }, b: { Independence: 2 } } },
    { id: 10, text: 'Which environment sounds better?', a: 'A predictable schedule with clear expectations', b: 'Variety, change, and new challenges', score: { a: { C: 2, Structure: 1 }, b: { Explorer: 2, Flexibility: 1 } } },
    { id: 11, text: 'Which sounds more rewarding?', a: 'Teaching or helping someone improve', b: 'Making a tool or solution that helps solve the problem', score: { a: { S: 2 }, b: { R: 1, I: 1 } } },
    { id: 12, text: 'Which sounds more exciting?', a: 'Starting or running something of your own', b: 'Becoming highly skilled at something difficult', score: { a: { E: 2, Risk: 1 }, b: { I: 1, R: 1, Independence: 1 } } },
    { id: 13, text: 'Which would you rather understand?', a: 'Why people think and behave the way they do', b: 'How a complicated system works', score: { a: { S: 1, I: 1 }, b: { I: 2, R: 1 } } },
    { id: 14, text: 'Which task would you choose?', a: 'Create the presentation and make it memorable', b: 'Check the facts, numbers, and logic', score: { a: { A: 2 }, b: { I: 2 } } },
    { id: 15, text: 'At a new place where you do not know many people:', a: 'I usually start talking to people fairly quickly', b: 'I usually observe and get comfortable first', score: { a: { S: 1, E: 1 }, b: { I: 1, Independence: 1 } } },
    { id: 16, text: 'Which would bother you more?', a: 'Rules that do not seem to have a purpose', b: 'A plan that keeps changing at the last minute', score: { a: { A: 1, Explorer: 1 }, b: { C: 2, Structure: 1 } } },
    { id: 17, text: 'Which feels more meaningful?', a: 'Making something useful that people can actually use', b: 'Directly helping someone improve their situation', score: { a: { R: 2 }, b: { S: 2, Mission: 1 } } },
    { id: 18, text: 'Which challenge sounds better?', a: 'Lead a team in a competition or project', b: 'Solve a difficult puzzle or problem', score: { a: { E: 2 }, b: { I: 2 } } },
    // PART 2 - WOULD YOU RATHER (Q19-Q24)
    { id: 19, text: 'Would you rather:', a: 'Build or restore something real', b: 'Design what the finished version should look like', score: { a: { R: 2 }, b: { A: 2 } } },
    { id: 20, text: 'Would you rather:', a: 'Coach someone who is struggling', b: 'Compete against someone really good', score: { a: { S: 2 }, b: { E: 2 } } },
    { id: 21, text: 'Would you rather:', a: 'Plan the entire trip', b: 'Find out where you are going when you get there', score: { a: { C: 2, Structure: 1 }, b: { Explorer: 2, Flexibility: 1 } } },
    { id: 22, text: 'Would you rather:', a: 'Interview someone with an interesting story', b: 'Analyze a large set of information to discover a pattern', score: { a: { S: 1, A: 1 }, b: { I: 2 } } },
    { id: 23, text: 'Would you rather:', a: 'Turn a messy situation into an organized plan', b: 'Turn a blank page into something nobody has seen before', score: { a: { C: 2 }, b: { A: 2 } } },
    { id: 24, text: 'Would you rather:', a: 'Fix a difficult technical problem', b: 'Resolve a difficult disagreement between people', score: { a: { I: 1, R: 1 }, b: { S: 2, E: 1 } } },
    // PART 3 - VALIDATION RATINGS (Q25-Q30) - "How much does this sound like you?"
    { id: 25, type: 'rating', text: 'I enjoy making, fixing, or working with things I can see and touch.', dimension: 'R', label: 'Builder' },
    { id: 26, type: 'rating', text: 'I enjoy figuring out how things work and solving difficult problems.', dimension: 'I', label: 'Analyst' },
    { id: 27, type: 'rating', text: 'I like creating original ideas, designs, stories, images, or other things that express my imagination.', dimension: 'A', label: 'Creator' },
    { id: 28, type: 'rating', text: 'I enjoy helping, teaching, encouraging, or connecting with other people.', dimension: 'S', label: 'Connector' },
    { id: 29, type: 'rating', text: 'I like taking initiative, influencing decisions, or leading when something needs to happen.', dimension: 'E', label: 'Leader' },
    { id: 30, type: 'rating', text: 'I like organizing information, planning ahead, and knowing important details are handled.', dimension: 'C', label: 'Organizer' }
  ];

  // Rating weights for validation questions
  const RATING_WEIGHTS = { 1: 0, 2: 0.5, 3: 1, 4: 1.5, 5: 2 };

  // HIDDEN STRENGTHS by type combination
  const HIDDEN_STRENGTHS = {
    'RI': 'You can see both the big picture and the small details that make systems work.',
    'IR': 'You can see both the big picture and the small details that make systems work.',
    'RA': 'You bring ideas to life in tangible, beautiful ways that others can experience.',
    'AR': 'You bring ideas to life in tangible, beautiful ways that others can experience.',
    'RS': 'You help people by doing, not just talking. Your actions speak louder than words.',
    'SR': 'You help people by doing, not just talking. Your actions speak louder than words.',
    'RE': 'You lead by example and build things that create real-world impact.',
    'ER': 'You lead by example and build things that create real-world impact.',
    'RC': 'You bring reliability and precision to practical work that others can depend on.',
    'CR': 'You bring reliability and precision to practical work that others can depend on.',
    'IA': 'You often connect ideas that other people do not immediately see.',
    'AI': 'You often connect ideas that other people do not immediately see.',
    'IS': 'You understand people deeply and find logical solutions to emotional problems.',
    'SI': 'You understand people deeply and find logical solutions to emotional problems.',
    'IE': 'You see opportunities others miss and know how to act on them strategically.',
    'EI': 'You see opportunities others miss and know how to act on them strategically.',
    'IC': 'You find patterns in complexity that help others make sense of the world.',
    'CI': 'You find patterns in complexity that help others make sense of the world.',
    'AS': 'You express ideas in ways that make people feel understood and inspired.',
    'SA': 'You express ideas in ways that make people feel understood and inspired.',
    'AE': 'You inspire people with a vision they did not know they needed.',
    'EA': 'You inspire people with a vision they did not know they needed.',
    'AC': 'You create things that are both beautiful and well-organized.',
    'CA': 'You create things that are both beautiful and well-organized.',
    'SE': 'You bring people together and move them toward a shared goal.',
    'ES': 'You bring people together and move them toward a shared goal.',
    'SC': 'You keep groups running smoothly while making sure everyone feels valued.',
    'CS': 'You keep groups running smoothly while making sure everyone feels valued.',
    'EC': 'You turn ambitious plans into organized action that actually gets done.',
    'CE': 'You turn ambitious plans into organized action that actually gets done.'
  };

  // ENERGIZERS by dimension
  const ENERGIZERS = {
    R: ['Working with tools', 'Hands-on projects', 'Seeing tangible results', 'Physical activity', 'Building things'],
    I: ['Solving complex problems', 'Research and discovery', 'Understanding why', 'Learning new concepts', 'Analyzing data'],
    A: ['Creative expression', 'Original ideas', 'Aesthetic beauty', 'Freedom to experiment', 'Making something new'],
    S: ['Helping others', 'Meaningful connections', 'Making a difference', 'Working with people', 'Teaching and mentoring'],
    E: ['Leading projects', 'Persuading others', 'Taking charge', 'Competition', 'Starting new ventures'],
    C: ['Organization', 'Clear procedures', 'Accuracy and detail', 'Planning', 'Reliable systems']
  };

  // DRAINERS by dimension
  const DRAINERS = {
    R: ['Too much desk work', 'Abstract concepts without application', 'Endless meetings'],
    I: ['Repetitive tasks', 'Small talk', 'Work without learning', 'Rushing without understanding'],
    A: ['Rigid rules', 'Lack of creative freedom', 'Cookie-cutter solutions', 'Repetitive work'],
    S: ['Working in isolation', 'Conflict', 'Impersonal environments', 'Cutthroat competition'],
    E: ['Following without input', 'Lack of influence', 'Too much micromanagement', 'Bureaucracy'],
    C: ['Chaos and disorder', 'Ambiguity', 'Last-minute changes', 'Unclear expectations']
  };

  // WITH FRIENDS content by dimension
  const WITH_FRIENDS = {
    R: 'You may be the one who gets things done while others are still discussing. You solve real problems and help with practical matters.',
    I: 'You may be the person who notices patterns and gives thoughtful advice. You observe before speaking and see things others miss.',
    A: 'You may be the person who brings new ideas into the group or suggests unusual plans. You express yourself in unique ways.',
    S: 'You may be the person who notices how everyone is feeling. You help people feel included and keep the group connected.',
    E: 'You may be the one who organizes plans and gets things moving. You are comfortable making decisions for the group.',
    C: 'You may be the person who remembers details and keeps everyone on track. You make sure plans actually happen.'
  };

  // WATCH OUTS by dimension
  const WATCH_OUTS = {
    R: 'You may get impatient with too much planning and want to just start doing.',
    I: 'You may overthink decisions or get lost in research when action is needed.',
    A: 'You may get excited about the next idea before finishing the one already in front of you.',
    S: 'You may take on others\' problems as your own or avoid necessary conflict.',
    E: 'You may jump into leading before fully understanding what the group needs.',
    C: 'You may get stuck on details or resist changes that could actually be improvements.'
  };

  // CAREER SUGGESTIONS by type
  const CAREER_SUGGESTIONS = {
    'RI': ['Mechanical Engineer', 'Software Developer', 'Robotics Engineer', 'Data Scientist', 'Biomedical Engineer', 'Network Administrator', 'Automotive Technician', 'Quality Engineer'],
    'IR': ['Mechanical Engineer', 'Software Developer', 'Robotics Engineer', 'Data Scientist', 'Biomedical Engineer', 'Research Scientist', 'Technical Analyst', 'Systems Engineer'],
    'RA': ['Industrial Designer', 'Furniture Maker', 'Chef', 'Landscape Architect', 'Automotive Designer', 'Jeweler', 'Set Designer', 'Fabricator'],
    'AR': ['Industrial Designer', 'Furniture Maker', 'Chef', 'Sculptor', 'Craftsperson', 'Product Designer', 'Art Director', 'Creative Technologist'],
    'RS': ['Physical Therapist', 'Athletic Trainer', 'Occupational Therapist', 'Coach', 'Firefighter', 'EMT/Paramedic', 'Outdoor Educator', 'Rehabilitation Specialist'],
    'SR': ['Physical Therapist', 'Athletic Trainer', 'Occupational Therapist', 'Coach', 'Recreation Therapist', 'Fitness Instructor', 'Sports Medicine', 'Adventure Guide'],
    'RE': ['Construction Manager', 'Operations Manager', 'Restaurant Owner', 'General Contractor', 'Manufacturing Supervisor', 'Facilities Manager', 'Project Manager', 'Plant Manager'],
    'ER': ['Entrepreneur', 'Business Owner', 'Construction Manager', 'Operations Executive', 'Real Estate Developer', 'Franchise Owner', 'Agricultural Manager', 'Fleet Manager'],
    'RC': ['Quality Control Inspector', 'Machinist', 'Electrician', 'HVAC Technician', 'Medical Equipment Technician', 'Lab Technician', 'Precision Craftsperson', 'Technical Specialist'],
    'CR': ['Quality Control Inspector', 'Lab Technician', 'Technical Writer', 'Compliance Inspector', 'Medical Records Technician', 'Calibration Specialist', 'Safety Inspector', 'Maintenance Planner'],
    'IA': ['Product Designer', 'UX Researcher', 'Architect', 'Game Designer', 'Science Writer', 'Documentary Filmmaker', 'Medical Illustrator', 'Innovation Consultant'],
    'AI': ['Product Designer', 'UX Designer', 'Architect', 'Creative Director', 'Photographer', 'Marketing Strategist', 'Software/Product Creator', 'Industrial Designer'],
    'IS': ['Psychologist', 'School Counselor', 'Social Worker', 'Medical Doctor', 'Therapist', 'User Researcher', 'Healthcare Administrator', 'Nonprofit Director'],
    'SI': ['Counselor', 'Therapist', 'Social Worker', 'School Psychologist', 'Life Coach', 'Mediator', 'Career Counselor', 'Patient Advocate'],
    'IE': ['Management Consultant', 'Investment Analyst', 'Strategy Consultant', 'Medical Director', 'Policy Analyst', 'Tech Entrepreneur', 'Product Manager', 'Venture Capitalist'],
    'EI': ['CEO', 'Management Consultant', 'Investment Banker', 'Strategy Director', 'Medical Practice Owner', 'Tech Executive', 'Private Equity', 'Healthcare Executive'],
    'IC': ['Data Analyst', 'Research Scientist', 'Actuary', 'Statistician', 'Financial Analyst', 'Database Administrator', 'Operations Research Analyst', 'Epidemiologist'],
    'CI': ['Data Analyst', 'Accountant', 'Auditor', 'Business Analyst', 'Research Administrator', 'Compliance Analyst', 'Intelligence Analyst', 'Quality Assurance'],
    'AS': ['Teacher', 'Art Therapist', 'Writer', 'Journalist', 'Social Media Manager', 'Communications Director', 'Public Relations', 'Content Creator'],
    'SA': ['Teacher', 'Art Therapist', 'Music Therapist', 'Drama Teacher', 'Youth Worker', 'Community Organizer', 'Event Planner', 'Recreational Therapist'],
    'AE': ['Creative Director', 'Entrepreneur', 'Producer', 'Marketing Executive', 'Brand Strategist', 'Advertising Executive', 'Fashion Designer', 'Entertainment Executive'],
    'EA': ['Producer', 'Creative Director', 'Marketing VP', 'Entertainment Executive', 'Brand Founder', 'Media Executive', 'Startup Founder', 'Design Entrepreneur'],
    'AC': ['Graphic Designer', 'Web Designer', 'Interior Designer', 'Editor', 'Art Director', 'Brand Designer', 'Technical Illustrator', 'Package Designer'],
    'CA': ['Editor', 'Archivist', 'Museum Curator', 'Technical Writer', 'Art Administrator', 'Design Operations', 'Production Manager', 'Quality Controller'],
    'SE': ['Teacher', 'Sales Manager', 'Human Resources', 'Training Director', 'Community Organizer', 'Nonprofit Director', 'Healthcare Administrator', 'Political Organizer'],
    'ES': ['Sales Director', 'HR Director', 'Nonprofit CEO', 'School Principal', 'Community Leader', 'Healthcare Executive', 'Recruiter', 'Customer Success Director'],
    'SC': ['Administrative Assistant', 'Office Manager', 'Healthcare Administrator', 'Customer Service Manager', 'Event Coordinator', 'Executive Assistant', 'Case Manager', 'Program Coordinator'],
    'CS': ['Administrative Manager', 'HR Coordinator', 'Office Manager', 'Customer Service', 'Patient Services', 'Program Administrator', 'Operations Coordinator', 'Benefits Administrator'],
    'EC': ['Operations Manager', 'Project Manager', 'Business Manager', 'Financial Manager', 'Supply Chain Manager', 'Retail Manager', 'Bank Manager', 'Practice Manager'],
    'CE': ['Controller', 'Finance Manager', 'Operations Director', 'Business Manager', 'Office Director', 'Administrative Director', 'Chief of Staff', 'Practice Administrator']
  };

  // Calculate maximum possible points per dimension
  function calculateMaxPoints() {
    const maxPoints = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

    // Calculate actual max by summing best possible score per question for each dimension
    for (const dim of Object.keys(maxPoints)) {
      let total = 0;
      ASSESSMENT_QUESTIONS.forEach(q => {
        const aScore = (q.score?.a?.[dim] || 0);
        const bScore = (q.score?.b?.[dim] || 0);
        total += Math.max(aScore, bScore);
      });
      maxPoints[dim] = total;
    }

    return maxPoints;
  }

  const MAX_POINTS = calculateMaxPoints();

  let scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  let overlayScores = {};
  let answers = {};
  let profileComplete = false;

  // ===========================================
  // SUPABASE SYNC
  // ===========================================

  function getGuestSessionId() {
    let guestId = localStorage.getItem(GUEST_ID_KEY);
    if (!guestId) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      guestId = '';
      for (let i = 0; i < 22; i++) {
        guestId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      localStorage.setItem(GUEST_ID_KEY, guestId);
    }
    return guestId;
  }

  function getCurrentUserId() {
    // Check if Supabase auth is available and user is logged in
    if (typeof supabase !== 'undefined' && supabase.auth) {
      const session = supabase.auth.getSession();
      if (session?.data?.session?.user?.id) {
        return session.data.session.user.id;
      }
    }
    return null;
  }

  async function supabaseRequest(endpoint, options = {}) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
        method: options.method || 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': options.prefer || 'return=representation'
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        console.warn('Supabase request failed:', response.status);
        return null;
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (e) {
      console.warn('Supabase request error:', e);
      return null;
    }
  }

  async function loadFromSupabase() {
    const userId = getCurrentUserId();
    const guestId = getGuestSessionId();

    let query = 'vylium_profiles?select=*';
    if (userId) {
      query += `&user_id=eq.${userId}`;
    } else {
      query += `&guest_session_id=eq.${guestId}`;
    }
    query += '&limit=1';

    const data = await supabaseRequest(query);
    if (data && data.length > 0) {
      const profile = data[0];
      supabaseProfileId = profile.id;
      return {
        scores: profile.scores || { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 },
        overlayScores: profile.overlay_scores || {},
        answers: profile.answers || {},
        profileComplete: profile.profile_complete || false
      };
    }
    return null;
  }

  async function saveToSupabase() {
    if (syncPending) return;
    syncPending = true;

    try {
      const userId = getCurrentUserId();
      const guestId = getGuestSessionId();
      const profile = getProfile();

      const data = {
        scores,
        overlay_scores: overlayScores,
        answers,
        profile_complete: profileComplete,
        answered_count: Object.keys(answers).length,
        type_code: profile.type?.code || null,
        type_name: profile.type?.name || null,
        type_emoji: profile.type?.emoji || null,
        top_dimensions: profile.topDimensions,
        normalized_scores: profile.normalizedScores
      };

      if (supabaseProfileId) {
        // Update existing profile
        await supabaseRequest(`vylium_profiles?id=eq.${supabaseProfileId}`, {
          method: 'PATCH',
          body: data
        });
      } else {
        // Create new profile
        if (userId) {
          data.user_id = userId;
        } else {
          data.guest_session_id = guestId;
        }

        const result = await supabaseRequest('vylium_profiles', {
          method: 'POST',
          body: data
        });

        if (result && result[0]) {
          supabaseProfileId = result[0].id;
        }
      }
    } catch (e) {
      console.warn('Supabase save error:', e);
    } finally {
      syncPending = false;
    }
  }

  // Debounced save to avoid too many requests
  let saveTimeout = null;
  function debouncedSaveToSupabase() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveToSupabase();
    }, 1000);
  }

  async function convertGuestToUser(userId) {
    const guestId = getGuestSessionId();
    try {
      await supabaseRequest('rpc/convert_guest_to_user_profile', {
        method: 'POST',
        body: {
          p_guest_session_id: guestId,
          p_user_id: userId
        }
      });
      localStorage.removeItem(GUEST_ID_KEY);
      return true;
    } catch (e) {
      console.error('Failed to convert guest profile:', e);
      return false;
    }
  }

  // ===========================================
  // STATE MANAGEMENT
  // ===========================================

  async function init() {
    // First load from localStorage (fast)
    loadStateFromLocal();

    // Then try to load from Supabase (may have more recent data)
    try {
      const cloudData = await loadFromSupabase();
      if (cloudData) {
        // Check if cloud data is more complete
        const cloudAnswerCount = Object.keys(cloudData.answers || {}).length;
        const localAnswerCount = Object.keys(answers).length;

        if (cloudAnswerCount > localAnswerCount) {
          scores = cloudData.scores;
          overlayScores = cloudData.overlayScores;
          answers = cloudData.answers;
          profileComplete = cloudData.profileComplete;
          saveStateToLocal(); // Update local with cloud data
          console.log('[VyliumProfile] Loaded from cloud:', cloudAnswerCount, 'answers');
        }
      }
    } catch (e) {
      console.warn('Cloud load failed, using local:', e);
    }
  }

  function loadStateFromLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      scores = saved.scores || { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
      overlayScores = saved.overlayScores || {};
      answers = saved.answers || {};
      profileComplete = saved.profileComplete || false;
    } catch (e) {
      console.error('Vylium local load error:', e);
    }
  }

  function saveStateToLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scores, overlayScores, answers, profileComplete }));
  }

  function saveState() {
    saveStateToLocal();
    debouncedSaveToSupabase();
  }

  function answer(questionId, choice) {
    const question = ASSESSMENT_QUESTIONS.find(q => q.id === questionId);
    if (!question) return null;

    answers[questionId] = choice;

    // Apply scoring
    if (question.score && question.score[choice]) {
      const scoreUpdate = question.score[choice];
      for (const [dim, points] of Object.entries(scoreUpdate)) {
        if (DIMENSIONS[dim]) {
          scores[dim] = (scores[dim] || 0) + points;
        } else {
          // Overlay trait
          overlayScores[dim] = (overlayScores[dim] || 0) + points;
        }
      }
    }

    // Check if assessment is complete
    if (Object.keys(answers).length >= ASSESSMENT_QUESTIONS.length) {
      profileComplete = true;
    }

    saveState();
    return getProfile();
  }

  function getNormalizedScores() {
    // Independent 0-100 normalization for each dimension
    const normalized = {};
    for (const [dim, rawScore] of Object.entries(scores)) {
      const max = MAX_POINTS[dim] || 1;
      normalized[dim] = Math.round((rawScore / max) * 100);
      // Clamp to 0-100
      normalized[dim] = Math.max(0, Math.min(100, normalized[dim]));
    }
    return normalized;
  }

  function getTopDimensions(count = 3) {
    const normalized = getNormalizedScores();
    return Object.entries(normalized)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([code, normalizedScore]) => ({
        ...DIMENSIONS[code],
        score: normalizedScore,
        rawScore: scores[code]
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

    let type = TYPES[code];
    if (!type) {
      // Try reversed
      const reversed = code[1] + code[0];
      type = TYPES[reversed];
      if (type) {
        return { code: reversed, ...type, topDimensions: getTopDimensions(2) };
      }
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
    const normalized = getNormalizedScores();

    // Get overlay traits
    const topOverlays = Object.entries(overlayScores)
      .filter(([key]) => !DIMENSIONS[key])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, score]) => ({
        key,
        score,
        trait: OVERLAY_TRAITS[key] || { description: key }
      }));

    // Get career suggestions
    const careers = type ? (CAREER_SUGGESTIONS[type.code] || []).slice(0, 8) : [];

    return {
      scores,
      normalizedScores: normalized,
      topDimensions: top,
      type,
      overlayTraits: topOverlays,
      careerSuggestions: careers,
      hiddenStrength: type ? (HIDDEN_STRENGTHS[type.code] || '') : '',
      completionPercent: Math.round((Object.keys(answers).length / ASSESSMENT_QUESTIONS.length) * 100),
      isComplete: profileComplete,
      questionCount: ASSESSMENT_QUESTIONS.length,
      answeredCount: Object.keys(answers).length
    };
  }

  function getEnergizers() {
    const top = getTopDimensions(2);
    const energizers = [];

    top.forEach(d => {
      energizers.push(...(ENERGIZERS[d.code] || []).slice(0, 2));
    });

    return energizers.slice(0, 5);
  }

  function getDrains() {
    const normalized = getNormalizedScores();
    const bottom = Object.entries(normalized)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .map(([code]) => code);

    const drains = [];
    bottom.forEach(code => {
      drains.push(...(DRAINERS[code] || []).slice(0, 2));
    });

    return drains.slice(0, 4);
  }

  function getWithFriends() {
    const top = getTopDimensions(1);
    if (top.length === 0) return '';
    return WITH_FRIENDS[top[0].code] || '';
  }

  function getWatchOuts() {
    const top = getTopDimensions(2);
    const watchOuts = [];

    top.forEach(d => {
      if (WATCH_OUTS[d.code]) {
        watchOuts.push(WATCH_OUTS[d.code]);
      }
    });

    return watchOuts.slice(0, 2);
  }

  function reset() {
    scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    overlayScores = {};
    answers = {};
    profileComplete = false;
    supabaseProfileId = null;
    saveState();
  }

  // UI Rendering Functions
  function renderAssessment(containerId, onComplete) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let currentIndex = Object.keys(answers).length;

    function showQuestion(index) {
      if (index >= ASSESSMENT_QUESTIONS.length) {
        const profile = getProfile();
        renderResults(containerId, profile);
        if (onComplete) onComplete(profile);
        return;
      }

      const q = ASSESSMENT_QUESTIONS[index];
      const progress = ((index + 1) / ASSESSMENT_QUESTIONS.length) * 100;

      // Check if this is a rating question
      if (q.type === 'rating') {
        renderRatingQuestion(container, q, index, progress);
        return;
      }

      // Regular A/B question
      container.innerHTML = `
        <div class="vylium-assessment">
          <div class="vylium-intro-note" style="text-align: center; color: #6b7280; font-size: 13px; margin-bottom: 16px;">
            There are no right or wrong answers. Go with your first instinct.
          </div>
          <div class="vylium-progress">
            <div class="vylium-progress-bar" style="width: ${progress}%"></div>
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
          ${index > 0 ? `<button class="vylium-back-btn" style="margin-top: 16px; color: #6b7280; background: none; border: none; cursor: pointer; font-size: 14px;">← Back</button>` : ''}
        </div>
      `;

      container.querySelectorAll('.vylium-option').forEach(btn => {
        btn.addEventListener('click', () => {
          btn.classList.add('selected');
          answer(q.id, btn.dataset.choice);
          setTimeout(() => {
            currentIndex++;
            showQuestion(currentIndex);
          }, 250);
        });
      });

      setupBackButton(container, index);
    }

    function renderRatingQuestion(container, q, index, progress) {
      const isFirstRating = ASSESSMENT_QUESTIONS[index - 1]?.type !== 'rating';

      container.innerHTML = `
        <div class="vylium-assessment">
          ${isFirstRating ? `
            <div class="vylium-intro-note" style="text-align: center; color: #6b7280; font-size: 13px; margin-bottom: 16px;">
              Almost done! Rate how much each statement sounds like you.
            </div>
          ` : ''}
          <div class="vylium-progress">
            <div class="vylium-progress-bar" style="width: ${progress}%"></div>
          </div>
          <div class="vylium-question-number">${index + 1} of ${ASSESSMENT_QUESTIONS.length}</div>
          <div class="vylium-question">${q.text}</div>
          <div class="vylium-rating-options" style="display: flex; justify-content: center; gap: 8px; margin: 24px 0;">
            ${[1,2,3,4,5].map(n => `
              <button class="vylium-rating-btn" data-rating="${n}" style="
                width: 52px; height: 52px;
                border-radius: 50%;
                border: 2px solid ${n <= 2 ? '#ef4444' : n === 3 ? '#f59e0b' : '#10b981'};
                background: transparent;
                font-size: 1.2rem;
                font-weight: 700;
                color: ${n <= 2 ? '#ef4444' : n === 3 ? '#f59e0b' : '#10b981'};
                cursor: pointer;
                transition: all 0.2s;
              ">${n}</button>
            `).join('')}
          </div>
          <div class="vylium-rating-labels" style="display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; padding: 0 8px;">
            <span>Not me</span>
            <span>Very me</span>
          </div>
          ${index > 0 ? `<button class="vylium-back-btn" style="margin-top: 16px; color: #6b7280; background: none; border: none; cursor: pointer; font-size: 14px;">← Back</button>` : ''}
        </div>
      `;

      container.querySelectorAll('.vylium-rating-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const rating = parseInt(btn.dataset.rating);
          btn.style.background = btn.style.borderColor;
          btn.style.color = 'white';
          btn.style.transform = 'scale(1.1)';

          // Apply rating weight to dimension
          const weight = RATING_WEIGHTS[rating] || 0;
          if (DIMENSIONS[q.dimension]) {
            scores[q.dimension] = (scores[q.dimension] || 0) + weight;
          }
          answers[q.id] = rating;
          saveState();

          setTimeout(() => {
            currentIndex++;
            showQuestion(currentIndex);
          }, 300);
        });
      });

      setupBackButton(container, index);
    }

    function setupBackButton(container, index) {
      const backBtn = container.querySelector('.vylium-back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          const prevQ = ASSESSMENT_QUESTIONS[index - 1];
          if (prevQ && answers[prevQ.id]) {
            const prevAnswer = answers[prevQ.id];

            if (prevQ.type === 'rating') {
              const weight = RATING_WEIGHTS[prevAnswer] || 0;
              if (DIMENSIONS[prevQ.dimension]) {
                scores[prevQ.dimension] = Math.max(0, (scores[prevQ.dimension] || 0) - weight);
              }
            } else if (prevQ.score && prevQ.score[prevAnswer]) {
              for (const [dim, points] of Object.entries(prevQ.score[prevAnswer])) {
                if (DIMENSIONS[dim]) {
                  scores[dim] = Math.max(0, (scores[dim] || 0) - points);
                } else {
                  overlayScores[dim] = Math.max(0, (overlayScores[dim] || 0) - points);
                }
              }
            }
            delete answers[prevQ.id];
            saveState();
          }
          currentIndex--;
          showQuestion(currentIndex);
        });
      }
    }

    showQuestion(currentIndex);
  }

  function renderResults(containerId, profile) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const type = profile.type;
    const energizers = getEnergizers();
    const drains = getDrains();
    const withFriends = getWithFriends();
    const watchOuts = getWatchOuts();

    container.innerHTML = `
      <div class="vylium-results">
        <div class="vylium-type-reveal">
          <div class="vylium-type-badge">YOUR VYLIUM TYPE</div>
          <div class="vylium-type-emoji">${type?.emoji || '🌟'}</div>
          <div class="vylium-type-name">${type?.name || 'Your Profile'}</div>
          <div class="vylium-type-tagline">${type?.tagline || ''}</div>
          <div class="vylium-type-desc">${type?.description || ''}</div>
        </div>

        <div class="vylium-traits">
          <div class="vylium-traits-title">Your Top Three</div>
          <div class="vylium-traits-grid">
            ${profile.topDimensions.map(d => `
              <div class="vylium-trait" style="border-color: ${d.color}">
                <div class="vylium-trait-header">
                  <div class="vylium-trait-label" style="color: ${d.color}">${d.label.toUpperCase()}</div>
                  <div class="vylium-trait-score">${d.score}</div>
                </div>
                <div class="vylium-trait-keywords">${d.keywords.join(' • ')}</div>
                <div class="vylium-trait-bar">
                  <div class="vylium-trait-fill" style="width: ${d.score}%; background: ${d.color}"></div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="vylium-score-note">
            These scores reflect how strongly your answers matched each dimension (0-100).
          </div>
        </div>

        ${profile.hiddenStrength ? `
        <div class="vylium-section">
          <div class="vylium-section-title">🔮 Your Hidden Strength</div>
          <div class="vylium-section-content">"${profile.hiddenStrength}"</div>
        </div>
        ` : ''}

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

        ${withFriends ? `
        <div class="vylium-section">
          <div class="vylium-section-title">👋 With Friends</div>
          <div class="vylium-section-content">"${withFriends}"</div>
        </div>
        ` : ''}

        ${watchOuts.length > 0 ? `
        <div class="vylium-section">
          <div class="vylium-section-title">👀 Watch Out For</div>
          ${watchOuts.map(w => `<div class="vylium-section-content" style="margin-bottom: 8px;">"${w}"</div>`).join('')}
        </div>
        ` : ''}

        <div class="vylium-section">
          <div class="vylium-section-title">🎯 Careers Worth Exploring</div>
          <div class="vylium-careers-grid">
            ${profile.careerSuggestions.map(c => `<span class="vylium-career-tag">${c}</span>`).join('')}
          </div>
          <div class="vylium-careers-note">These are starting points based on your profile, not predictions.</div>
        </div>

        <div class="vylium-footer">
          <em>Your profile can change as you answer more questions and explore.</em>
        </div>

        <!-- Scholarship Journey CTA - Primary Action -->
        <div class="vylium-journey-cta">
          <div class="vylium-journey-header">
            <div class="vylium-journey-badge">YOUR MATCHES ARE READY</div>
            <div class="vylium-journey-title">We Found Scholarships for ${type?.name || 'You'}</div>
          </div>
          <div class="vylium-journey-preview">
            <div class="vylium-match-count">
              <span class="match-number">12+</span>
              <span class="match-label">scholarships matched to your profile</span>
            </div>
          </div>
          <button class="vylium-journey-btn" onclick="VyliumProfile.startScholarshipJourney()">
            <span>Get That Money 💰</span>
          </button>
          <div class="vylium-journey-footer">
            <span>⏱️ 5 min to see your matches</span>
          </div>
        </div>

        <!-- Share CTA - Secondary -->
        <div class="share-cta-section" style="padding: 16px 0;">
          <div class="share-divider">
            <span>or share your results first</span>
          </div>
          <button class="btn-share-secondary" onclick="VyliumProfile.shareResult()">
            <span class="share-icon">📤</span>
            <span class="share-text">Challenge a Friend</span>
          </button>
        </div>

        <div class="share-privacy-note" style="margin: 0 0 20px;">
          <span class="privacy-icon">🔒</span>
          <span>Only your Vylium Type and traits are shared. No personal info.</span>
        </div>

        <button class="btn btn-secondary btn-block" onclick="VyliumProfile.reset(); location.reload();">Retake Assessment</button>
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
            <div class="vylium-mini-title">Discover Your Vylium Personality Type</div>
            <div class="vylium-mini-desc">Answer ${ASSESSMENT_QUESTIONS.length} quick questions to unlock your profile</div>
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

  // Start scholarship journey - redirect to scholarship matching
  function startScholarshipJourney() {
    const profile = getProfile();
    if (!profile || !profile.type) {
      console.warn('Profile not complete');
      return;
    }
    // Close the modal if open
    const modal = document.getElementById('vylium-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    // Navigate to scholarships section or trigger search
    if (typeof ScholarshipSearch !== 'undefined' && ScholarshipSearch.openSearch) {
      ScholarshipSearch.openSearch();
    } else if (typeof ScholarshipDiscovery !== 'undefined' && ScholarshipDiscovery.showRecommended) {
      ScholarshipDiscovery.showRecommended();
    } else {
      // Fallback: scroll to scholarships section
      const scholarshipsSection = document.getElementById('scholarships-section');
      if (scholarshipsSection) {
        scholarshipsSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
    // Track engagement
    if (typeof EngagementTracker !== 'undefined') {
      EngagementTracker.track('scholarship_journey_started', { type: profile.type.name });
    }
  }

  // Share result using ViralShare service
  async function shareResult() {
    if (typeof ViralShare === 'undefined') {
      console.warn('ViralShare service not loaded');
      return false;
    }

    const profile = getProfile();
    if (!profile || !profile.type) {
      console.warn('Profile not complete');
      return false;
    }

    const share = ViralShare.createShare();
    if (share) {
      await ViralShare.shareNative(share);
      return true;
    }
    return false;
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

  // For comparison feature
  function compareProfiles(otherProfile) {
    const myProfile = getProfile();
    if (!myProfile.isComplete || !otherProfile) return null;

    const myTop = myProfile.topDimensions.map(d => d.code);
    const otherTop = otherProfile.topDimensions?.map(d => d.code) || [];

    const sharedDimensions = myTop.filter(d => otherTop.includes(d));
    const similarityScore = Math.round((sharedDimensions.length / 3) * 100);

    const myTopCode = myTop[0];
    const otherTopCode = otherTop[0];

    let biggestDiff = null;
    if (myTopCode !== otherTopCode) {
      biggestDiff = {
        you: DIMENSIONS[myTopCode]?.label || myTopCode,
        friend: DIMENSIONS[otherTopCode]?.label || otherTopCode
      };
    }

    return {
      similarityScore,
      sharedDimensions: sharedDimensions.map(c => DIMENSIONS[c]?.label || c),
      biggestDifference: biggestDiff
    };
  }

  init();

  return {
    DIMENSIONS,
    TYPES,
    ASSESSMENT_QUESTIONS,
    answer,
    getProfile,
    getPersonalityType,
    getTopDimensions,
    getNormalizedScores,
    getEnergizers,
    getDrains,
    getWithFriends,
    getWatchOuts,
    reset,
    renderAssessment,
    renderResults,
    renderMiniProfile,
    getScholarshipBoost,
    shareResult,
    compareProfiles,
    startScholarshipJourney,
    // Supabase sync
    syncNow: saveToSupabase,
    convertGuestToUser,
    getGuestSessionId
  };
})();
