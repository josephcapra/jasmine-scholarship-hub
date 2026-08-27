/**
 * Career & Future Paths Data
 * Includes careers, colleges, trades, apprenticeships
 */

const CareerData = (function() {
  'use strict';

  // Career paths with RIASEC mapping
  const CAREERS = [
    // REALISTIC (R)
    { id: 'electrician', name: 'Electrician', emoji: '⚡', riasec: ['R', 'I'], salary: '$60K-$100K', outlook: 'Growing', training: 'Apprenticeship (4-5 years)', description: 'Install and maintain electrical systems in homes, businesses, and factories.', skills: ['Problem-solving', 'Math', 'Physical stamina'], lifestyle: 'Hands-on, varied locations, some travel' },
    { id: 'mechanic', name: 'Auto Mechanic', emoji: '🔧', riasec: ['R'], salary: '$45K-$75K', outlook: 'Stable', training: 'Trade school or apprenticeship', description: 'Diagnose, repair, and maintain vehicles.', skills: ['Technical knowledge', 'Diagnostics', 'Customer service'], lifestyle: 'Shop work, physical, problem-solving daily' },
    { id: 'construction_manager', name: 'Construction Manager', emoji: '🏗️', riasec: ['R', 'E'], salary: '$75K-$120K', outlook: 'Growing', training: "Bachelor's or experience", description: 'Plan and oversee construction projects from start to finish.', skills: ['Leadership', 'Planning', 'Budgeting'], lifestyle: 'Site visits, office work, deadline-driven' },
    { id: 'hvac_tech', name: 'HVAC Technician', emoji: '❄️', riasec: ['R', 'I'], salary: '$50K-$80K', outlook: 'High demand', training: 'Trade school + certification', description: 'Install and repair heating, cooling, and refrigeration systems.', skills: ['Technical', 'Customer service', 'Physical work'], lifestyle: 'Service calls, varied environments' },
    { id: 'welder', name: 'Welder', emoji: '🔥', riasec: ['R'], salary: '$45K-$70K', outlook: 'Stable', training: 'Trade school or apprenticeship', description: 'Join metal parts using heat and pressure.', skills: ['Precision', 'Blueprint reading', 'Safety'], lifestyle: 'Shop or field work, specialized skills' },

    // INVESTIGATIVE (I)
    { id: 'software_engineer', name: 'Software Engineer', emoji: '💻', riasec: ['I', 'R'], salary: '$80K-$150K+', outlook: 'Very high demand', training: "Bachelor's or bootcamp", description: 'Design and build software applications and systems.', skills: ['Coding', 'Problem-solving', 'Logic'], lifestyle: 'Office or remote, collaborative teams' },
    { id: 'data_scientist', name: 'Data Scientist', emoji: '📊', riasec: ['I', 'C'], salary: '$90K-$140K', outlook: 'Very high demand', training: "Bachelor's/Master's", description: 'Analyze complex data to help organizations make decisions.', skills: ['Statistics', 'Programming', 'Communication'], lifestyle: 'Office/remote, research-focused' },
    { id: 'nurse', name: 'Registered Nurse', emoji: '🩺', riasec: ['I', 'S'], salary: '$60K-$100K', outlook: 'Very high demand', training: "Associate's or Bachelor's", description: 'Provide patient care in hospitals, clinics, and homes.', skills: ['Compassion', 'Critical thinking', 'Stamina'], lifestyle: 'Shifts, hospital or clinic, meaningful work' },
    { id: 'pharmacist', name: 'Pharmacist', emoji: '💊', riasec: ['I', 'S'], salary: '$100K-$130K', outlook: 'Stable', training: 'PharmD (6+ years)', description: 'Dispense medications and advise patients on drug use.', skills: ['Chemistry', 'Attention to detail', 'Patient care'], lifestyle: 'Retail, hospital, or specialty pharmacy' },
    { id: 'engineer', name: 'Mechanical Engineer', emoji: '⚙️', riasec: ['I', 'R'], salary: '$70K-$110K', outlook: 'Growing', training: "Bachelor's degree", description: 'Design and develop mechanical systems and products.', skills: ['Math', 'CAD software', 'Problem-solving'], lifestyle: 'Office + lab, product development' },

    // ARTISTIC (A)
    { id: 'graphic_designer', name: 'Graphic Designer', emoji: '🎨', riasec: ['A', 'I'], salary: '$45K-$80K', outlook: 'Competitive', training: "Bachelor's or portfolio", description: 'Create visual content for brands, websites, and media.', skills: ['Creativity', 'Design software', 'Communication'], lifestyle: 'Agency, in-house, or freelance' },
    { id: 'photographer', name: 'Photographer', emoji: '📸', riasec: ['A', 'E'], salary: '$35K-$80K', outlook: 'Competitive', training: 'Self-taught or degree', description: 'Capture images for events, portraits, commercial, or art.', skills: ['Visual eye', 'Editing', 'Business skills'], lifestyle: 'Freelance, varied locations, flexible' },
    { id: 'ux_designer', name: 'UX Designer', emoji: '✨', riasec: ['A', 'I'], salary: '$70K-$120K', outlook: 'High demand', training: "Bachelor's or bootcamp", description: 'Design user-friendly digital experiences.', skills: ['Empathy', 'Prototyping', 'Research'], lifestyle: 'Tech company, remote-friendly' },
    { id: 'interior_designer', name: 'Interior Designer', emoji: '🏠', riasec: ['A', 'E'], salary: '$50K-$85K', outlook: 'Growing', training: "Bachelor's degree", description: 'Plan and design interior spaces for function and aesthetics.', skills: ['Creativity', 'Space planning', 'Client relations'], lifestyle: 'Studio + client sites, project-based' },
    { id: 'video_producer', name: 'Video Producer', emoji: '🎬', riasec: ['A', 'E'], salary: '$50K-$100K', outlook: 'Growing', training: "Bachelor's or experience", description: 'Create video content for media, marketing, or entertainment.', skills: ['Storytelling', 'Editing', 'Project management'], lifestyle: 'Studio, on-location, deadline-driven' },

    // SOCIAL (S)
    { id: 'teacher', name: 'Teacher', emoji: '📚', riasec: ['S', 'A'], salary: '$45K-$70K', outlook: 'Stable', training: "Bachelor's + certification", description: 'Educate students in K-12 or specialized subjects.', skills: ['Communication', 'Patience', 'Creativity'], lifestyle: 'School hours, summers off, meaningful' },
    { id: 'counselor', name: 'School Counselor', emoji: '🤝', riasec: ['S', 'I'], salary: '$50K-$75K', outlook: 'Growing', training: "Master's degree", description: 'Help students with academic, career, and personal challenges.', skills: ['Empathy', 'Listening', 'Problem-solving'], lifestyle: 'School setting, regular hours' },
    { id: 'social_worker', name: 'Social Worker', emoji: '💚', riasec: ['S', 'I'], salary: '$45K-$65K', outlook: 'Growing', training: "Bachelor's/Master's", description: 'Help individuals and families cope with challenges.', skills: ['Compassion', 'Advocacy', 'Case management'], lifestyle: 'Varied settings, emotionally demanding but rewarding' },
    { id: 'physical_therapist', name: 'Physical Therapist', emoji: '🏃', riasec: ['S', 'I'], salary: '$75K-$100K', outlook: 'High demand', training: 'DPT (7 years)', description: 'Help patients recover movement and manage pain.', skills: ['Anatomy knowledge', 'Patience', 'Motivation'], lifestyle: 'Clinic, hospital, or sports settings' },
    { id: 'hr_manager', name: 'HR Manager', emoji: '👥', riasec: ['S', 'E'], salary: '$65K-$110K', outlook: 'Growing', training: "Bachelor's degree", description: 'Manage employee relations, hiring, and workplace culture.', skills: ['Communication', 'Conflict resolution', 'Organization'], lifestyle: 'Office, people-focused, strategic' },

    // ENTERPRISING (E)
    { id: 'entrepreneur', name: 'Entrepreneur', emoji: '🚀', riasec: ['E', 'A'], salary: 'Variable', outlook: 'Self-made', training: 'Experience + hustle', description: 'Start and run your own business.', skills: ['Risk-taking', 'Sales', 'Adaptability'], lifestyle: 'High risk, high reward, flexible' },
    { id: 'sales_manager', name: 'Sales Manager', emoji: '📈', riasec: ['E', 'S'], salary: '$70K-$130K', outlook: 'Stable', training: "Bachelor's or experience", description: 'Lead sales teams and develop strategies to grow revenue.', skills: ['Leadership', 'Negotiation', 'Goal-setting'], lifestyle: 'Fast-paced, travel, results-driven' },
    { id: 'real_estate_agent', name: 'Real Estate Agent', emoji: '🏡', riasec: ['E', 'S'], salary: '$40K-$100K+', outlook: 'Variable', training: 'License + training', description: 'Help people buy, sell, and rent properties.', skills: ['Sales', 'Networking', 'Market knowledge'], lifestyle: 'Flexible hours, client-driven, commission' },
    { id: 'marketing_manager', name: 'Marketing Manager', emoji: '📣', riasec: ['E', 'A'], salary: '$65K-$120K', outlook: 'Growing', training: "Bachelor's degree", description: 'Develop and execute marketing strategies.', skills: ['Creativity', 'Analytics', 'Communication'], lifestyle: 'Office or agency, campaign-driven' },
    { id: 'lawyer', name: 'Lawyer', emoji: '⚖️', riasec: ['E', 'I'], salary: '$80K-$200K+', outlook: 'Competitive', training: 'JD (7 years)', description: 'Represent clients in legal matters.', skills: ['Research', 'Argumentation', 'Writing'], lifestyle: 'Long hours, high stakes, prestigious' },

    // CONVENTIONAL (C)
    { id: 'accountant', name: 'Accountant', emoji: '🧮', riasec: ['C', 'I'], salary: '$55K-$90K', outlook: 'Stable', training: "Bachelor's + CPA", description: 'Manage financial records and ensure compliance.', skills: ['Math', 'Attention to detail', 'Software'], lifestyle: 'Office, deadline seasons, steady' },
    { id: 'financial_analyst', name: 'Financial Analyst', emoji: '💹', riasec: ['C', 'I'], salary: '$65K-$110K', outlook: 'Growing', training: "Bachelor's degree", description: 'Analyze financial data to guide investment decisions.', skills: ['Analytics', 'Excel', 'Communication'], lifestyle: 'Office, market-driven, analytical' },
    { id: 'paralegal', name: 'Paralegal', emoji: '📋', riasec: ['C', 'I'], salary: '$45K-$70K', outlook: 'Growing', training: "Associate's or certificate", description: 'Support lawyers with research, documents, and case prep.', skills: ['Research', 'Organization', 'Writing'], lifestyle: 'Law firm, detail-oriented' },
    { id: 'medical_coder', name: 'Medical Coder', emoji: '🏥', riasec: ['C', 'I'], salary: '$45K-$65K', outlook: 'High demand', training: 'Certificate program', description: 'Translate medical procedures into billing codes.', skills: ['Accuracy', 'Medical terminology', 'Software'], lifestyle: 'Office or remote, healthcare' },
    { id: 'it_support', name: 'IT Support Specialist', emoji: '🖥️', riasec: ['C', 'R'], salary: '$45K-$70K', outlook: 'High demand', training: 'Certifications or degree', description: 'Help users with computer and network issues.', skills: ['Troubleshooting', 'Communication', 'Patience'], lifestyle: 'Help desk, varied issues daily' }
  ];

  // College types
  const COLLEGE_TYPES = [
    { id: 'large_university', name: 'Large University', emoji: '🏛️', size: '20,000+', vibe: 'Big campus energy, lots of options', pros: ['More majors', 'Sports culture', 'Research opportunities'], cons: ['Large classes', 'Can feel impersonal'] },
    { id: 'small_college', name: 'Small Liberal Arts', emoji: '📖', size: '1,000-5,000', vibe: 'Close-knit, professor relationships', pros: ['Small classes', 'Personal attention', 'Strong community'], cons: ['Fewer majors', 'Less anonymity'] },
    { id: 'community_college', name: 'Community College', emoji: '🎓', size: 'Varies', vibe: 'Affordable, flexible, local', pros: ['Low cost', 'Transfer path', 'Flexible schedule'], cons: ['No dorms', 'Less campus life'] },
    { id: 'trade_school', name: 'Trade/Technical School', emoji: '🔧', size: 'Small', vibe: 'Career-focused, hands-on', pros: ['Fast track', 'Job-ready skills', 'Lower cost'], cons: ['Narrow focus', 'Less general education'] },
    { id: 'online', name: 'Online University', emoji: '💻', size: 'Virtual', vibe: 'Flexible, self-paced', pros: ['Work while studying', 'Location-free', 'Often cheaper'], cons: ['Less networking', 'Self-discipline needed'] }
  ];

  // Trade & Apprenticeship paths
  const TRADES = [
    { id: 'electrical', name: 'Electrical', emoji: '⚡', duration: '4-5 years', salary_after: '$60K-$100K', demand: 'Very High', union: true, description: 'Install and maintain electrical systems' },
    { id: 'plumbing', name: 'Plumbing', emoji: '🔧', duration: '4-5 years', salary_after: '$55K-$90K', demand: 'Very High', union: true, description: 'Install and repair water and gas systems' },
    { id: 'hvac', name: 'HVAC', emoji: '❄️', duration: '3-5 years', salary_after: '$50K-$80K', demand: 'Very High', union: true, description: 'Heating, cooling, and refrigeration systems' },
    { id: 'carpentry', name: 'Carpentry', emoji: '🪚', duration: '3-4 years', salary_after: '$45K-$75K', demand: 'High', union: true, description: 'Build and repair wooden structures' },
    { id: 'welding', name: 'Welding', emoji: '🔥', duration: '6 months - 2 years', salary_after: '$45K-$70K', demand: 'High', union: false, description: 'Join metal parts using heat' },
    { id: 'auto_tech', name: 'Automotive Tech', emoji: '🚗', duration: '2 years', salary_after: '$40K-$65K', demand: 'Stable', union: false, description: 'Diagnose and repair vehicles' },
    { id: 'cosmetology', name: 'Cosmetology', emoji: '💇', duration: '9-15 months', salary_after: '$30K-$60K', demand: 'Stable', union: false, description: 'Hair, skin, and nail services' },
    { id: 'emt', name: 'EMT/Paramedic', emoji: '🚑', duration: '6 months - 2 years', salary_after: '$35K-$60K', demand: 'High', union: false, description: 'Emergency medical response' },
    { id: 'dental_hygienist', name: 'Dental Hygienist', emoji: '🦷', duration: '2-3 years', salary_after: '$60K-$85K', demand: 'High', union: false, description: 'Clean teeth and educate patients' },
    { id: 'medical_assistant', name: 'Medical Assistant', emoji: '🩺', duration: '9-12 months', salary_after: '$35K-$45K', demand: 'Very High', union: false, description: 'Support physicians in clinics' }
  ];

  function getCareersByRIASEC(codes, limit = 10) {
    return CAREERS
      .filter(c => codes.some(code => c.riasec.includes(code)))
      .slice(0, limit);
  }

  function getCareerById(id) {
    return CAREERS.find(c => c.id === id);
  }

  function getCollegeTypes() {
    return COLLEGE_TYPES;
  }

  function getTrades() {
    return TRADES;
  }

  function getTradeById(id) {
    return TRADES.find(t => t.id === id);
  }

  function getMatchingCareers(profile, limit = 5) {
    if (!profile || !profile.topDimensions) return CAREERS.slice(0, limit);
    const topCodes = profile.topDimensions.map(d => d.code);
    return getCareersByRIASEC(topCodes, limit);
  }

  return {
    CAREERS,
    COLLEGE_TYPES,
    TRADES,
    getCareersByRIASEC,
    getCareerById,
    getCollegeTypes,
    getTrades,
    getTradeById,
    getMatchingCareers
  };
})();
