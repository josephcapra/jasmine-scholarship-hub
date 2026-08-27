// Vercel Serverless Function: AI-powered scholarship search using OpenAI with web search
// POST /api/jasmine/scholarship-search

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://jasmine-scholarship-hub.vercel.app' : '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured - add OPENAI_API_KEY to Vercel env' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const {
      CURRENT_DATE,
      CITY,
      COUNTY,
      STATE,
      ZIP_CODE,
      GRADE_LEVEL,
      GRADUATION_YEAR,
      STUDENT_PROFILE,
      RESUME_TEXT,
      ADDITIONAL_BACKGROUND,
      INTENDED_MAJOR_OR_CAREER,
      FINANCIAL_INFORMATION,
      TARGET_SCHOLARSHIP_COUNT,
      PATHWAY = 'college'
    } = body;

    // Map pathway to search focus
    const pathwayFocus = {
      college: 'Focus on 4-year college and university scholarships, academic merit awards, and college-bound programs.',
      trades: 'Focus on vocational training scholarships, trade school funding, apprenticeship programs, career/technical education grants, and workforce development awards.',
      both: 'Include both traditional college scholarships AND vocational/trade school funding opportunities.'
    }[PATHWAY] || '';

    const systemPrompt = `You are a scholarship research expert with web search capabilities. Your task is to find REAL, CURRENTLY OPEN scholarships that match the student's profile.

IMPORTANT GUIDELINES:
- Only include scholarships that are verifiably real and currently accepting applications
- Prioritize scholarships where this specific student has a competitive advantage
- Include a mix of local, state, and national opportunities
- Focus on scholarships with upcoming deadlines (next 6-12 months)
- For each scholarship, explain WHY this student is a strong fit

Return your findings as a JSON array with this structure for each scholarship:
{
  "scholarship_name": "Full official name",
  "sponsor": "Organization offering it",
  "award": { "amount": "$X,XXX", "type": "one-time or renewable" },
  "deadline": "Month Day, Year or Rolling",
  "scope": "LOCAL, STATE, REGIONAL, or NATIONAL",
  "official_url": "https://...",
  "competition_level": "LOW_HANGING_FRUIT, EFFICIENT_COMPETITIVE, FUNNEL_ADVANTAGE, HIGH_FIT_NATIONAL, or ELITE_REACH",
  "why_this_student_matches": ["reason 1", "reason 2", "reason 3"],
  "match_score": 0-100,
  "winning_strategy": "Specific advice for how to win this scholarship",
  "essay_strategy": { "required": true/false, "topic_suggestion": "..." },
  "reusable_assets": ["Which application assets can be reused here"]
}`;

    const userPrompt = `Find ${TARGET_SCHOLARSHIP_COUNT || 30} scholarships for this student:

STUDENT PROFILE:
${STUDENT_PROFILE}

LOCATION: ${CITY}, ${COUNTY}, ${STATE} ${ZIP_CODE}
GRADE LEVEL: ${GRADE_LEVEL}
GRADUATION YEAR: ${GRADUATION_YEAR}

ACHIEVEMENTS/RESUME:
${RESUME_TEXT}

ADDITIONAL BACKGROUND:
${ADDITIONAL_BACKGROUND}

INTENDED MAJOR/CAREER: ${INTENDED_MAJOR_OR_CAREER}
FINANCIAL SITUATION: ${FINANCIAL_INFORMATION}

TODAY'S DATE: ${CURRENT_DATE}

PATHWAY: ${PATHWAY.toUpperCase()}
${pathwayFocus}

Search for real scholarships this student qualifies for. Prioritize:
1. Local scholarships in ${COUNTY}, ${STATE} (less competition)
2. Scholarships matching the student's interests and achievements
3. ${PATHWAY === 'trades' ? 'Trade school, vocational, and apprenticeship funding' : 'Academic merit and college-bound programs'}
4. ${ADDITIONAL_BACKGROUND.includes('Military') ? 'Military family scholarships' : 'Community service scholarships'}
5. State programs (Florida Bright Futures, etc.)

Return ONLY the JSON array, no other text.`;

    // Use OpenAI Chat Completions API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 8000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    let scholarships = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        scholarships = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      scholarships = [];
    }

    return res.status(200).json({
      success: true,
      scholarships,
      searchDate: new Date().toISOString(),
      searchType: 'ai_search',
      profile: {
        city: CITY,
        state: STATE,
        gradeLevel: GRADE_LEVEL
      }
    });

  } catch (error) {
    console.error('Scholarship search error:', error);
    return res.status(500).json({ error: 'Search failed', details: error.message });
  }
}
