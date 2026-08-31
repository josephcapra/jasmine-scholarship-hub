// Vercel Serverless Function: AI Essay Feedback and Scoring
// POST /api/essay-feedback { essay, prompt, wordLimit }
// Hybrid coaching system combining Khan Academy, CollegeVine, IvyStrides, and Common App rubrics

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

    const { essay, prompt, wordLimit, scholarshipName } = body;

    if (!essay || essay.trim().length < 50) {
      return res.status(400).json({ error: 'Essay must be at least 50 characters' });
    }

    const wordCount = essay.trim().split(/\s+/).length;
    const sentences = essay.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstSentence = sentences[0]?.trim() || '';

    const systemPrompt = `You are an expert scholarship essay coach combining methodologies from Khan Academy Writing Coach, CollegeVine, IvyStrides, and Common App reviewers. Your feedback is encouraging but actionable.

SCORING RUBRIC (1-100 each):
1. CLARITY - Clear thesis, logical flow, reader never confused about the point
2. AUTHENTICITY - Genuine voice, specific personal details, not generic or cliché
3. IMPACT - Memorable, emotionally engaging, creates connection with reader
4. RELEVANCE - Directly addresses the prompt and scholarship's values/mission
5. CRAFT - Grammar, spelling, sentence variety, word choice

ANALYSIS FRAMEWORK:
- HOOK: Is the opening sentence compelling? Does it create curiosity or emotion?
- SHOW vs TELL: Find sentences that "tell" (generic claims) vs "show" (specific evidence)
- SENSORY DETAILS: Are there specific moments with vivid details (sights, sounds, feelings)?
- STORY ARC: Is there a clear beginning (challenge/moment), middle (action/growth), end (lesson/future)?
- THEME: What single takeaway does the reader learn about the writer?

Return ONLY valid JSON with this structure:
{
  "overallScore": 75,
  "tier": "Good",
  "scores": {
    "clarity": { "score": 80, "emoji": "✨", "label": "Clear & Focused" },
    "authenticity": { "score": 85, "emoji": "💜", "label": "Your Voice Shines" },
    "impact": { "score": 70, "emoji": "🎯", "label": "Memorable Moments" },
    "relevance": { "score": 75, "emoji": "🎓", "label": "Prompt Fit" },
    "craft": { "score": 90, "emoji": "✍️", "label": "Writing Quality" }
  },
  "hookAnalysis": {
    "strength": "weak|okay|strong|excellent",
    "currentHook": "The first sentence quoted",
    "feedback": "Why it works or doesn't",
    "suggestion": "A stronger alternative opening if needed"
  },
  "showVsTell": {
    "tellExamples": ["I am hardworking", "I learned a lot"],
    "showExamples": ["When I stayed until midnight debugging..."],
    "tip": "How to convert one tell into a show"
  },
  "sensoryCheck": {
    "hasDetails": true,
    "strongMoment": "Quote a vivid moment from the essay if exists",
    "suggestion": "Add a specific detail about what you saw/heard/felt when..."
  },
  "storyStructure": {
    "hasBeginning": true,
    "hasMiddle": true,
    "hasEnd": true,
    "missingElement": "What's missing or weak in the narrative arc"
  },
  "theme": "The single takeaway/lesson the reader learns about this person",
  "strengths": ["Specific strength 1 with quote", "Specific strength 2 with quote"],
  "oneThingToFix": {
    "issue": "The single most impactful change",
    "why": "Why this matters for scholarship readers",
    "how": "Specific action to fix it",
    "example": "Show what the improved version could look like"
  },
  "encouragement": "A warm, personalized closing message acknowledging their unique story",
  "nextSteps": ["Action 1", "Action 2", "Action 3"]
}

TIER DEFINITIONS:
- "Needs Work" (0-59): Missing key elements, generic, or unclear
- "Good Start" (60-74): Solid foundation, needs polish and specificity
- "Strong" (75-84): Compelling with minor improvements possible
- "Excellent" (85-94): Ready to submit, very competitive
- "Outstanding" (95-100): Exceptional, memorable, scholarship-winning`;

    const userPrompt = `Analyze this scholarship essay with your full coaching framework:

${scholarshipName ? `SCHOLARSHIP: ${scholarshipName}` : ''}
${prompt ? `PROMPT: ${prompt}` : ''}
WORD LIMIT: ${wordLimit || 'Not specified'}
WORD COUNT: ${wordCount}
FIRST SENTENCE: "${firstSentence}"

ESSAY:
---
${essay}
---

Remember: Be encouraging but specific. Quote directly from their essay when giving feedback. Focus on helping them tell THEIR unique story more effectively.`;

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
        max_tokens: 1500,
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
      goalWords: wordLimit || 500,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ error: 'Failed to analyze essay', details: error.message });
  }
}
