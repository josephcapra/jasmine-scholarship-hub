// Vercel Serverless Function: AI-powered resume generation
// POST /api/generate-resume { profile, format, targetScholarship }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { profile, format = 'standard', targetScholarship = null } = body;

    if (!profile || !profile.firstName) {
      return res.status(400).json({ error: 'Profile with at least firstName is required' });
    }

    const systemPrompt = `You are an expert resume writer specializing in high school student resumes for scholarship applications.

Your task is to create a professional, compelling resume that:
- Highlights achievements and potential
- Uses action verbs and quantifiable results where possible
- Is appropriate for a high school student (not overly corporate)
- Is honest and authentic - don't exaggerate
- Follows a clean, ATS-friendly format
- Is tailored for scholarship applications

Output the resume in clean HTML format with inline CSS for styling. Use a professional but modern design with:
- Clear section headers
- Consistent formatting
- Good use of whitespace
- Print-friendly styling (avoid dark backgrounds)

The HTML should be self-contained and ready to render or print.`;

    const profileSummary = buildProfileSummary(profile);

    let userPrompt = `Create a professional resume for this student:\n\n${profileSummary}`;

    if (targetScholarship) {
      userPrompt += `\n\nTailor this resume for the following scholarship: ${targetScholarship}`;
    }

    userPrompt += `\n\nFormat preference: ${format}`;
    userPrompt += `\n\nReturn ONLY the HTML resume content, no markdown code blocks or explanations.`;

    let resumeHtml = '';

    // Try Claude first
    if (ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        resumeHtml = data.content[0].text;
      }
    }

    // Fallback to OpenAI
    if (!resumeHtml && OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 4096,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        resumeHtml = data.choices[0].message.content;
      }
    }

    if (!resumeHtml) {
      return res.status(500).json({ error: 'Failed to generate resume' });
    }

    // Clean up any markdown code blocks if present
    resumeHtml = resumeHtml.replace(/```html\n?/gi, '').replace(/```\n?/gi, '').trim();

    return res.status(200).json({
      success: true,
      resume: resumeHtml,
      format,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Resume generation error:', error);
    return res.status(500).json({ error: 'Resume generation failed', details: error.message });
  }
}

function buildProfileSummary(profile) {
  const sections = [];

  // Basic Info
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ');
  sections.push(`NAME: ${name}`);

  if (profile.email) sections.push(`EMAIL: ${profile.email}`);
  if (profile.phone) sections.push(`PHONE: ${profile.phone}`);

  const location = [profile.city, profile.state].filter(Boolean).join(', ');
  if (location) sections.push(`LOCATION: ${location}`);

  // Education
  sections.push('\nEDUCATION:');
  if (profile.school) sections.push(`School: ${profile.school}`);
  if (profile.graduationYear) sections.push(`Expected Graduation: ${profile.graduationYear}`);
  if (profile.gpa) sections.push(`GPA: ${profile.gpa}${profile.gpaWeighted ? ' (weighted)' : ''}`);
  if (profile.classRank) sections.push(`Class Rank: ${profile.classRank}`);
  if (profile.academicProgram) sections.push(`Program: ${profile.academicProgram}`);
  if (profile.satScore) sections.push(`SAT: ${profile.satScore}`);
  if (profile.actScore) sections.push(`ACT: ${profile.actScore}`);

  // Honors & Coursework
  if (profile.honors?.length > 0) {
    sections.push(`Honors: ${profile.honors.join(', ')}`);
  }
  if (profile.coursework?.length > 0) {
    sections.push(`Notable Coursework: ${profile.coursework.join(', ')}`);
  }

  // Goals
  if (profile.intendedMajor || profile.careerGoal) {
    sections.push('\nGOALS:');
    if (profile.intendedMajor) sections.push(`Intended Major: ${profile.intendedMajor}`);
    if (profile.careerGoal) sections.push(`Career Goal: ${profile.careerGoal}`);
    if (profile.targetColleges) sections.push(`Target Colleges: ${profile.targetColleges}`);
  }

  // Achievements
  if (profile.achievements?.length > 0) {
    sections.push('\nACHIEVEMENTS & AWARDS:');
    profile.achievements.forEach(a => {
      const achievement = typeof a === 'string' ? a : (a.title || a.name || a.description);
      if (achievement) sections.push(`- ${achievement}`);
    });
  }

  // Activities
  if (profile.activities?.length > 0) {
    sections.push('\nACTIVITIES & EXTRACURRICULARS:');
    profile.activities.forEach(a => {
      const activity = typeof a === 'string' ? a : (a.title || a.name || a.description);
      if (activity) sections.push(`- ${activity}`);
    });
  }

  // Work Experience
  if (profile.workExperience?.length > 0) {
    sections.push('\nWORK EXPERIENCE:');
    profile.workExperience.forEach(w => {
      if (typeof w === 'string') {
        sections.push(`- ${w}`);
      } else {
        const job = [w.title, w.company, w.dates].filter(Boolean).join(' | ');
        sections.push(`- ${job}`);
        if (w.description) sections.push(`  ${w.description}`);
      }
    });
  }

  // Business/Entrepreneurship
  if (profile.businessName) {
    sections.push('\nENTREPRENEURSHIP:');
    sections.push(`Business: ${profile.businessName}`);
  }

  // Community Service
  if (profile.communityService?.length > 0) {
    sections.push('\nCOMMUNITY SERVICE:');
    profile.communityService.forEach(s => {
      const service = typeof s === 'string' ? s : (s.title || s.organization || s.description);
      if (service) sections.push(`- ${service}`);
    });
  }

  // Skills & Certifications
  if (profile.skills?.length > 0) {
    sections.push('\nSKILLS:');
    sections.push(profile.skills.join(', '));
  }
  if (profile.certifications?.length > 0) {
    sections.push('\nCERTIFICATIONS:');
    profile.certifications.forEach(c => {
      const cert = typeof c === 'string' ? c : (c.name || c.title);
      if (cert) sections.push(`- ${cert}`);
    });
  }

  // Interests
  const allInterests = [...(profile.interests || []), ...(profile.customInterests || [])];
  if (allInterests.length > 0) {
    sections.push('\nINTERESTS:');
    sections.push(allInterests.join(', '));
  }

  // Special circumstances (for scholarship context)
  const special = [];
  if (profile.militaryFamily) special.push('Military Family');
  if (profile.firstGeneration) special.push('First-Generation College Student');
  if (profile.financialNeed) special.push('Demonstrates Financial Need');
  if (special.length > 0) {
    sections.push('\nSPECIAL CIRCUMSTANCES:');
    sections.push(special.join(', '));
  }

  return sections.join('\n');
}
