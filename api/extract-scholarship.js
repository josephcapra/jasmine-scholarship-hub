// Vercel Serverless Function: Extract scholarship info from URL using AI
// POST /api/jasmine/extract-scholarship { url }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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

    // Use OpenAI to extract scholarship information
    const systemPrompt = `You are a scholarship information extractor. Given the text content of a scholarship webpage, extract the key details and return them as JSON.

Return ONLY valid JSON with this structure (use null for fields you cannot find):
{
  "name": "Full scholarship name",
  "sponsor": "Organization offering the scholarship",
  "amount": "$X,XXX or range like $1,000 - $5,000",
  "deadline": "Month Day, Year format (e.g., October 31, 2026)",
  "description": "Brief 1-2 sentence description of the scholarship",
  "requirements": ["requirement 1", "requirement 2"],
  "eligibility": ["eligibility criteria 1", "criteria 2"],
  "essayRequired": true or false,
  "essayTopic": "Essay prompt or topic if mentioned",
  "applicationUrl": "Direct application link if different from main URL",
  "category": "arts, military, academic, service, business, stem, or general"
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
        temperature: 0.3
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
