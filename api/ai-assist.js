// Vercel Serverless Function: AI-powered essay assistance for Jasmine
// POST /jasmine/api/ai-assist { action, essayType, content }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  const JASMINE_CONTEXT = `You are helping Jasmine, a 16-year-old junior at Martin County High School in Stuart, Florida, write scholarship essays.

ACHIEVEMENTS:
- 2026 Scholastic Art & Writing Awards National Gold Medal for "Warm Embrace"
- American Visions Award (highest national honor for teen artists)
- Honored at Carnegie Hall as National Medalist (335,000+ submissions)
- 1st Place Photography at Marvin S. Cone High School Juried Art Show
- 4.0167 weighted GPA, Cambridge AICE Diploma candidate
- Adobe Photoshop Certified

ENTREPRENEURSHIP:
- Founder of jazz.ysphotos photography business
- Real estate photographer for Paradise Realty FLA
- Student photographer for Martin County High School
- Bakery team member at Boys & Girls Clubs Fork in the Road (2+ years)

FAMILY:
- Daughter of TWO U.S. military combat veterans
- Mom immigrated from Guyana, deployed to Iraq, became U.S. citizen in Baghdad 2005
- Mom was born July 4, 1983

LEADERSHIP & SERVICE:
- Assistant Director, Event Planning for SERA
- M.I.S.S. Inc. Butterfly Gardens volunteer
- Ascent Church nursery volunteer, VBS Crew Leader
- Former AFJROTC cadet

"Warm Embrace" was inspired by her mother and themes of warmth/authenticity.

WRITING GUIDANCE:
- Keep Jasmine's authentic teenage voice
- Avoid clichés - be specific
- Show, don't tell
- Don't manufacture hardship
- Connect achievements to values learned`;

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { action, essayType, content } = body;
    let userPrompt = '';

    if (action === 'tips') {
      userPrompt = `Jasmine is starting a ${essayType} scholarship essay. Give her 3-4 specific, actionable tips for THIS essay type. Which of her unique experiences should she highlight? Keep it brief and encouraging!`;
    } else if (action === 'improve') {
      userPrompt = `Help improve this ${essayType} essay draft while keeping Jasmine's voice:\n\n${content}\n\nGive 3-4 specific suggestions to make it stronger. Be encouraging!`;
    } else if (action === 'expand') {
      userPrompt = `Jasmine wrote these notes for her ${essayType} essay:\n\n${content}\n\nHelp expand into flowing paragraphs. Mark [ADD DETAIL] where she should add specifics. Keep her authentic voice!`;
    } else if (action === 'check') {
      userPrompt = `Review this essay for issues:\n\n${content}\n\nCheck grammar, flow, authenticity (not AI-sounding), and if it answers the prompt well. Brief feedback!`;
    } else {
      userPrompt = content || 'How can I help with your scholarship essay?';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: JASMINE_CONTEXT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      response: data.content[0].text,
    });

  } catch (error) {
    console.error('AI assist error:', error);
    return res.status(500).json({ error: 'AI assistance failed', details: error.message });
  }
}
