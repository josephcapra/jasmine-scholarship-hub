// Vercel Serverless Function: AI-powered scholarship search using OpenAI with web search
// POST /api/jasmine/scholarship-search

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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
      TARGET_SCHOLARSHIP_COUNT
    } = body;

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

Search the web for real scholarships this student qualifies for. Prioritize:
1. Local scholarships in ${COUNTY}, ${STATE} (less competition)
2. Photography/arts scholarships (student has National Gold Medal)
3. Military family scholarships (parents are veterans)
4. Florida state programs (Bright Futures, etc.)
5. Entrepreneurship scholarships (student runs photography business)
6. Community service scholarships
7. Academic merit scholarships

Return ONLY the JSON array, no other text.`;

    // Use OpenAI's Responses API with web search
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        tools: [{ type: 'web_search_preview' }],
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      // Fallback to chat completions if responses API fails
      const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

      if (!fallbackResponse.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      const content = fallbackData.choices?.[0]?.message?.content || '[]';

      let scholarships = [];
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          scholarships = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
      }

      return res.status(200).json({
        success: true,
        scholarships,
        searchDate: new Date().toISOString(),
        searchType: 'fallback',
        profile: { city: CITY, state: STATE, gradeLevel: GRADE_LEVEL }
      });
    }

    const data = await response.json();

    // Extract text from responses API output
    let content = '';
    if (data.output) {
      for (const item of data.output) {
        if (item.type === 'message' && item.content) {
          for (const block of item.content) {
            if (block.type === 'output_text') {
              content += block.text;
            }
          }
        }
      }
    }

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
      searchType: 'web_search',
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
