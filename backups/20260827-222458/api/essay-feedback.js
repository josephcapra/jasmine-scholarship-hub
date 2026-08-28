// Vercel Serverless Function: AI Essay Feedback and Scoring
// POST /api/essay-feedback { essay, prompt, wordLimit }

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

    const { essay, prompt, wordLimit, scholarshipName } = body;

    if (!essay || essay.trim().length < 50) {
      return res.status(400).json({ error: 'Essay must be at least 50 characters' });
    }

    const wordCount = essay.trim().split(/\s+/).length;

    const systemPrompt = `You are an expert scholarship essay reviewer. Analyze the essay and provide constructive, encouraging feedback.

Score the essay on a scale of 1-100 across these dimensions:
- Clarity (clear message, easy to follow)
- Authenticity (genuine voice, personal stories)
- Impact (memorable, emotionally engaging)
- Relevance (addresses the prompt/scholarship goals)
- Grammar (spelling, punctuation, sentence structure)

Return ONLY valid JSON with this structure:
{
  "overallScore": 75,
  "scores": {
    "clarity": 80,
    "authenticity": 85,
    "impact": 70,
    "relevance": 75,
    "grammar": 90
  },
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["specific improvement suggestion 1", "specific improvement suggestion 2"],
  "hookSuggestion": "A stronger opening line suggestion if needed",
  "closingSuggestion": "A stronger closing suggestion if needed",
  "wordCountFeedback": "Comment on word count if too short/long",
  "oneThingToFix": "The single most impactful change to make"
}`;

    const userPrompt = `Review this scholarship essay:

${scholarshipName ? `Scholarship: ${scholarshipName}` : ''}
${prompt ? `Prompt: ${prompt}` : ''}
Word Limit: ${wordLimit || 'Not specified'}
Word Count: ${wordCount}

Essay:
${essay}

Provide encouraging but honest feedback. Focus on what makes this essay stand out and one key area to improve.`;

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
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.7,
        store: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`AI feedback failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    let feedback = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        feedback = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(500).json({ error: 'Could not parse feedback' });
    }

    return res.status(200).json({
      success: true,
      feedback,
      wordCount,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ error: 'Failed to analyze essay', details: error.message });
  }
}
