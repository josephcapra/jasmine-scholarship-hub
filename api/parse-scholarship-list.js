// Vercel Serverless Function: Parse scholarship list using AI
// POST /api/jasmine/parse-scholarship-list { content, source }

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

    const { content, source } = body;
    if (!content) {
      return res.status(400).json({ error: 'No content provided' });
    }

    const systemPrompt = `You are a scholarship list parser. Given raw text content (from a CSV, spreadsheet, or pasted list), extract individual scholarships and return them as structured JSON.

Return ONLY valid JSON with this structure:
{
  "scholarships": [
    {
      "name": "Scholarship name",
      "sponsor": "Organization",
      "amount": "$X,XXX",
      "deadline": "Month Day, Year",
      "url": "https://...",
      "description": "Brief description",
      "essayRequired": true/false,
      "notes": "Any additional notes"
    }
  ]
}

Rules:
- Extract as many scholarships as you can find
- If a field is missing, use null
- Standardize amounts to "$X,XXX" format
- Standardize dates to "Month Day, Year" format
- If the content looks like CSV, parse the columns
- If it's a pasted list, extract scholarships from the text`;

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
          { role: 'user', content: `Parse this scholarship list from ${source}:\n\n${content.substring(0, 15000)}` }
        ],
        max_tokens: 4000,
        temperature: 0.3,
        store: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`AI parsing failed: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content || '{}';

    let result = { scholarships: [] };
    try {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
    }

    return res.status(200).json({
      success: true,
      scholarships: result.scholarships || [],
      count: (result.scholarships || []).length,
      source
    });

  } catch (error) {
    console.error('Parse error:', error);
    return res.status(500).json({ error: 'Failed to parse scholarship list', details: error.message });
  }
}
