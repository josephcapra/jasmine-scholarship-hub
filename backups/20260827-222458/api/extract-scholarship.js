// Vercel Serverless Function: Extract scholarship info from URL using AI
// POST /api/jasmine/extract-scholarship { url }

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://jasmine-scholarship-hub.vercel.app' : '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { url } = body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Fetch the webpage content
    let pageContent = '';
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ScholarshipBot/1.0)',
          'Accept': 'text/html'
        }
      });

      if (!pageResponse.ok) {
        throw new Error(`Failed to fetch page: ${pageResponse.status}`);
      }

      const html = await pageResponse.text();

      // Extract text content (strip HTML tags, scripts, styles)
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000); // Limit content length

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      return res.status(400).json({ error: 'Could not fetch the scholarship page. The site may be blocking requests.' });
    }

    // Use OpenAI to extract scholarship information with standardized fields
    const systemPrompt = `You are a scholarship information extractor. Given the text content of a scholarship webpage, extract ALL available details and return them as JSON.

IMPORTANT: Be thorough. Extract every piece of information you can find. Standardize all data.

Return ONLY valid JSON with this structure (use null for fields you cannot find):
{
  "name": "Full official scholarship name",
  "sponsor": "Organization/company offering the scholarship",
  "amount": "$X,XXX (single number or range like $1,000 - $5,000)",
  "amountNumeric": 1000,
  "deadline": "YYYY-MM-DD format",
  "deadlineType": "rolling, annual, or one-time",
  "description": "2-3 sentence description of what the scholarship is for",

  "eligibility": [
    {"type": "gpa", "value": "3.0+", "required": true},
    {"type": "grade", "value": "High school senior", "required": true},
    {"type": "location", "value": "Florida resident", "required": false},
    {"type": "major", "value": "STEM fields", "required": false},
    {"type": "citizenship", "value": "US Citizen", "required": true}
  ],

  "requirements": {
    "essay": {"required": true, "prompt": "Essay topic/prompt if stated", "wordLimit": 500, "format": "PDF or online"},
    "recommendation": {"required": false, "count": 0, "from": "teacher, counselor, etc"},
    "transcript": {"required": true, "type": "official or unofficial"},
    "financialInfo": {"required": false, "type": "FAFSA, income docs, etc"},
    "portfolio": {"required": false, "type": "art, writing, etc"},
    "interview": {"required": false},
    "video": {"required": false, "length": "2 minutes"},
    "other": ["Any other requirements not listed above"]
  },

  "applicationUrl": "Direct application link",
  "howToApply": "Step-by-step application instructions",
  "selectionCriteria": ["Academic achievement", "Community service", "Financial need"],
  "category": "stem, arts, business, service, military, athletic, academic, need-based, or general",
  "renewable": false,
  "renewalTerms": "If renewable, terms for renewal",
  "awardCount": 10,
  "competitionLevel": "low, medium, or high (based on award count vs typical applicants)",
  "tips": ["Specific tips for winning this scholarship based on what they emphasize"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract scholarship information from this webpage content:\n\nURL: ${url}\n\nContent:\n${pageContent}` }
        ],
        max_tokens: 1000,
        temperature: 0.3,
        store: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`AI extraction failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    let scholarship = {};
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scholarship = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(500).json({ error: 'Could not parse scholarship information' });
    }

    // Add the original URL
    scholarship.url = url;

    return res.status(200).json({
      success: true,
      scholarship,
      extractedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Extraction error:', error);
    return res.status(500).json({ error: 'Failed to extract scholarship info', details: error.message });
  }
}
