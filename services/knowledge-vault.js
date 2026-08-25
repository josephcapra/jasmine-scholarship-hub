/**
 * Knowledge Vault - Central Student Data Intelligence
 * Consolidates profile, achievements, documents, and essays
 */

const KnowledgeVault = (function() {
  'use strict';

  const VAULT_KEY = 'jasmine_knowledge_vault';
  const PROFILE_KEY = 'jasmine_student_profile';

  // Knowledge categories
  const CATEGORIES = {
    VERIFIED_FACTS: 'verified_facts',
    PERSONAL_CONTEXT: 'personal_context',
    PREFERENCES: 'preferences',
    FAMILY_STRATEGY: 'family_strategy'
  };

  // Get raw vault data
  function getVault() {
    try {
      return JSON.parse(localStorage.getItem(VAULT_KEY)) || { items: [], lastUpdated: null };
    } catch (e) {
      return { items: [], lastUpdated: null };
    }
  }

  function saveVault(vault) {
    vault.lastUpdated = new Date().toISOString();
    localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  }

  // Add a knowledge item
  function addItem(item) {
    const vault = getVault();
    const newItem = {
      id: 'kv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: item.category || CATEGORIES.VERIFIED_FACTS,
      subcategory: item.subcategory || 'general',
      title: item.title,
      value: item.value,
      description: item.description || '',
      sourceType: item.sourceType || 'manual',
      sourceId: item.sourceId || null,
      addedBy: item.addedBy || 'student',
      verificationStatus: item.verificationStatus || 'verified',
      confidence: item.confidence || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      privacyLevel: item.privacyLevel || 'shared'
    };
    vault.items.push(newItem);
    saveVault(vault);
    return newItem;
  }

  // Get items by category
  function getByCategory(category) {
    const vault = getVault();
    return vault.items.filter(i => i.category === category);
  }

  // Search items
  function search(query) {
    const vault = getVault();
    const q = query.toLowerCase();
    return vault.items.filter(i =>
      i.title.toLowerCase().includes(q) ||
      (i.description && i.description.toLowerCase().includes(q)) ||
      (i.value && String(i.value).toLowerCase().includes(q))
    );
  }

  // Build unified profile from all sources
  function buildProfile() {
    const profile = {};

    // 1. Load onboarding profile (check both storage keys)
    try {
      const onboard = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      const vault = JSON.parse(localStorage.getItem('jasmine_knowledge_vault') || '{}');

      // Merge both sources, vault takes priority
      const merged = { ...onboard, ...vault };

      Object.assign(profile, {
        firstName: merged.firstName,
        lastName: merged.lastName,
        nickname: merged.nickname,
        email: merged.email,
        phone: merged.phone,
        dateOfBirth: merged.dateOfBirth,
        address: merged.address,
        city: merged.city,
        state: merged.state,
        zipCode: merged.zipCode,
        citizenship: merged.citizenship,
        school: merged.school,
        schoolLocation: merged.schoolLocation,
        graduationYear: merged.graduationYear,
        classRank: merged.classRank,
        gpa: merged.gpa,
        gpaWeighted: merged.gpaWeighted,
        satScore: merged.satScore,
        actScore: merged.actScore,
        intendedMajor: merged.intendedMajor,
        careerGoal: merged.careerGoal,
        targetColleges: merged.targetColleges,
        parent1Name: merged.parent1Name,
        parent1Education: merged.parent1Education,
        parent2Name: merged.parent2Name,
        parent2Education: merged.parent2Education,
        householdSize: merged.householdSize,
        interests: merged.interests || [],
        customInterests: merged.customInterests || [],
        militaryFamily: merged.militaryFamily || false,
        firstGeneration: merged.firstGeneration || false,
        financialNeed: merged.financialNeed || false,
        skills: merged.skills || [],
        workExperience: merged.workExperience || [],
        socialMedia: merged.socialMedia || [],
        businessName: merged.businessName,
        academicProgram: merged.academicProgram,
        honors: merged.honors || [],
        coursework: merged.coursework || [],
        certifications: merged.certifications || [],
        communityService: merged.communityService || []
      });
    } catch (e) {}

    // 2. Load achievements
    try {
      profile.achievements = JSON.parse(localStorage.getItem('jasmine_achievements') || '[]');
    } catch (e) {
      profile.achievements = [];
    }

    // 3. Load documents (check both keys)
    try {
      const docs1 = JSON.parse(localStorage.getItem('jasmine_docs') || '[]');
      const docs2 = JSON.parse(localStorage.getItem('jasmine_documents') || '[]');
      const knowledgeDocs = JSON.parse(localStorage.getItem('jasmine_knowledge_docs') || '[]');
      profile.documents = [...docs1, ...docs2, ...knowledgeDocs];
    } catch (e) {
      profile.documents = [];
    }

    // 3b. Load activities
    try {
      profile.activities = JSON.parse(localStorage.getItem('jasmine_activities') || '[]');
      // Also check achievements for activities
      const achievements = JSON.parse(localStorage.getItem('jasmine_achievements') || '[]');
      if (achievements.length > 0) profile.activities = [...(profile.activities || []), ...achievements.map(a => typeof a === 'string' ? a : a.title)];
    } catch (e) {
      profile.activities = [];
    }

    // 4. Load essays
    try {
      profile.essays = JSON.parse(localStorage.getItem('jasmine_essays') || '[]');
    } catch (e) {
      profile.essays = [];
    }

    // 5. Load scholarships (applied/saved)
    try {
      profile.scholarships = JSON.parse(localStorage.getItem('jasmine_scholarships') || '[]');
    } catch (e) {
      profile.scholarships = [];
    }

    // 6. Load vault items
    profile.vaultItems = getVault().items;

    return profile;
  }

  // Generate scholarship fit tags from profile
  function generateFitTags() {
    const profile = buildProfile();
    const tags = [];

    // From interests
    if (profile.interests) {
      profile.interests.forEach(i => {
        if (i === 'arts') tags.push('art', 'creative', 'visual-arts');
        if (i === 'music') tags.push('music', 'performing-arts');
        if (i === 'writing') tags.push('writing', 'creative-writing', 'journalism');
        if (i === 'stem') tags.push('stem', 'science', 'technology', 'engineering', 'math');
        if (i === 'business') tags.push('business', 'entrepreneurship');
        if (i === 'sports') tags.push('athletics', 'sports');
        if (i === 'service') tags.push('community-service', 'volunteer');
        if (i === 'leadership') tags.push('leadership');
      });
    }

    // From background
    if (profile.state === 'Florida') tags.push('florida', 'florida-resident');
    if (profile.militaryFamily) tags.push('military', 'veteran', 'military-family');
    if (profile.firstGeneration) tags.push('first-generation');
    if (profile.financialNeed) tags.push('need-based', 'financial-need');

    // From GPA
    if (profile.gpa) {
      if (parseFloat(profile.gpa) >= 3.5) tags.push('academic-excellence', 'high-gpa');
      if (parseFloat(profile.gpa) >= 4.0) tags.push('honor-roll');
    }

    return [...new Set(tags)];
  }

  // Calculate scholarship match score
  function calculateMatchScore(scholarship) {
    const fitTags = generateFitTags();
    const scholarshipTags = scholarship.fit || [];

    if (scholarshipTags.length === 0) return 0.5;

    let matchCount = 0;
    scholarshipTags.forEach(tag => {
      if (fitTags.includes(tag)) matchCount++;
    });

    return Math.min(1, matchCount / Math.max(scholarshipTags.length, 1) + 0.2);
  }

  // Get completion percentage of profile
  function getProfileCompletion() {
    const profile = buildProfile();
    let filled = 0;
    let total = 12;

    // Basic info (5 points)
    if (profile.firstName) filled++;
    if (profile.lastName) filled++;
    if (profile.school) filled++;
    if (profile.graduationYear) filled++;
    if (profile.gpa) filled++;

    // Location (1 point)
    if (profile.state || profile.city) filled++;

    // Interests & activities (2 points)
    if (profile.interests && profile.interests.length > 0) filled++;
    if (profile.activities && profile.activities.length > 0) filled++;

    // Documentation (2 points)
    if (profile.achievements && profile.achievements.length > 0) filled++;
    if (profile.documents && profile.documents.length > 0) filled++;

    // Financial info (1 point)
    const financials = JSON.parse(localStorage.getItem('jasmine_financials') || '{}');
    if ((financials.savings && financials.savings.length > 0) ||
        (financials.benefits && financials.benefits.length > 0) ||
        (financials.scholarshipsWon && financials.scholarshipsWon.length > 0)) filled++;

    // Vision board (1 point)
    const vision = JSON.parse(localStorage.getItem('jasmine_vision') || '{}');
    if ((vision.photos && vision.photos.length > 0) ||
        (vision.statements && vision.statements.length > 0)) filled++;

    return Math.round((filled / total) * 100);
  }

  // Get what's missing in the profile
  function getMissingItems() {
    const profile = buildProfile();
    const missing = [];

    // Basic info
    if (!profile.firstName) missing.push({ field: 'firstName', label: 'First Name', impact: 'Required for applications' });
    if (!profile.lastName) missing.push({ field: 'lastName', label: 'Last Name', impact: 'Required for applications' });
    if (!profile.school) missing.push({ field: 'school', label: 'School', impact: 'Required for applications' });
    if (!profile.graduationYear) missing.push({ field: 'graduationYear', label: 'Graduation Year', impact: 'Determines eligibility' });
    if (!profile.gpa) missing.push({ field: 'gpa', label: 'GPA', impact: 'Improves academic scholarship matches' });

    // Location
    if (!profile.state && !profile.city) {
      missing.push({ field: 'location', label: 'Location', impact: 'Unlocks local/state scholarships' });
    }

    // Interests & activities
    if (!profile.interests || profile.interests.length === 0) {
      missing.push({ field: 'interests', label: 'Interests', impact: 'Unlocks 30+ interest-based scholarships' });
    }
    if (!profile.activities || profile.activities.length === 0) {
      missing.push({ field: 'activities', label: 'Activities', impact: 'Shows well-rounded profile' });
    }

    // Documentation
    if (!profile.achievements || profile.achievements.length === 0) {
      missing.push({ field: 'achievements', label: 'Achievements', impact: 'Strengthens application credibility' });
    }
    if (!profile.documents || profile.documents.length === 0) {
      missing.push({ field: 'documents', label: 'Documents', impact: 'Ready for quick applications' });
    }

    // Financial
    const financials = JSON.parse(localStorage.getItem('jasmine_financials') || '{}');
    if ((!financials.savings || financials.savings.length === 0) &&
        (!financials.benefits || financials.benefits.length === 0) &&
        (!financials.scholarshipsWon || financials.scholarshipsWon.length === 0)) {
      missing.push({ field: 'financials', label: 'Financial Resources', impact: 'Track your college funding' });
    }

    // Vision
    const vision = JSON.parse(localStorage.getItem('jasmine_vision') || '{}');
    if ((!vision.photos || vision.photos.length === 0) &&
        (!vision.statements || vision.statements.length === 0)) {
      missing.push({ field: 'vision', label: 'Vision Board', impact: 'Define your college goals' });
    }

    return missing;
  }

  return {
    CATEGORIES,
    getVault,
    addItem,
    getByCategory,
    search,
    buildProfile,
    generateFitTags,
    calculateMatchScore,
    getProfileCompletion,
    getMissingItems
  };
})();
