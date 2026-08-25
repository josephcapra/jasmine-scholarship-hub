// Vercel Serverless Function: AI-powered essay builder for Jasmine
// Uses interview mode to gather facts, then generates essay drafts
// POST /api/jasmine/essay-builder { action, essayType, answers, content }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured - OPENAI_API_KEY missing' });
  }

  const JASMINE_CONTEXT = `You are helping Jasmine, a 16-year-old junior at Martin County High School, write scholarship essays.

KEY FACTS ABOUT JASMINE:
- Full name: Sueanna "Jasmine" Doris-Capra
- Email: jasminecapra848@gmail.com
- School: Martin County High School, Stuart, Florida
- Grade: Junior, Class of 2028
- GPA: 4.0167 weighted cumulative
- Track: Cambridge AICE Diploma candidate

NATIONAL RECOGNITION:
- 2026 Scholastic Art & Writing Awards National Gold Medal for "Warm Embrace"
- American Visions Award (highest national honor for teen artists)
- Honored at Carnegie Hall as National Medalist (335,000+ submissions)
- 1st Place Photography, 40th Annual Marvin S. Cone High School Juried Art Show

PHOTOGRAPHY & BUSINESS:
- Founder of jazz.ysphotos photography business
- Professional real estate photographer for Paradise Realty FLA
- Student photographer for Martin County High School
- Serves portrait, senior photo, baby shower, special event clients
- Adobe Photoshop Certified
- Florida Ready to Work - Digital Skills & Soft Skills credentials

MILITARY FAMILY:
- Daughter of TWO U.S. military combat veterans
- Mother: Immigrated from Guyana, deployed to Iraq, became U.S. citizen in Baghdad in 2005
- Mother was born July 4, 1983
- "Warm Embrace" was inspired by her mother

LEADERSHIP & SERVICE:
- Assistant Director, Event Planning & Development for SERA
- M.I.S.S. Inc. Butterfly Gardens volunteer (housing program for women/families)
- Ascent Church nursery volunteer since January 2024
- Vacation Bible School Crew Leader (Summers 2023-Present)
- Former AFJROTC cadet (August 2024-May 2025)

WORK EXPERIENCE:
- Boys & Girls Clubs Fork in the Road bakery team member (2024-Present)
- Independent baker (February 2025-Present)
- Babysitter for children ages 3-7 (May 2023-Present)

ESSAY WRITING RULES:
1. Keep Jasmine's authentic teenage voice - confident but genuine
2. Start with a specific memory or moment, NOT generic statements
3. Show, don't tell - use concrete details
4. Never manufacture hardship or exaggerate
5. Connect achievements to lessons learned
6. Avoid clichés like "Ever since I was young..." or "In today's world..."
7. Use the structure: Something happened → It affected me → I did something → I learned → It affects my future`;

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { action, essayType, answers, content, wordLimit } = body;
    let systemPrompt = JASMINE_CONTEXT;
    let userPrompt = '';

    if (action === 'interview-questions') {
      // Generate interview questions based on essay type
      const questionSets = {
        veteran: [
          "What's a specific memory of your mom that shows her military service affected your family?",
          "When did you first understand that her becoming a citizen in Baghdad was special?",
          "What's one thing your mom taught you that you wouldn't have learned otherwise?",
          "How has being a military kid shaped how you see responsibility or service?",
          "What's one value from your parents' service that you've made your own?"
        ],
        career: [
          "Describe the exact moment photography stopped being just a hobby for you.",
          "Tell me about your first paying client - what happened?",
          "What's the hardest business lesson you've learned running jazz.ysphotos?",
          "What do you want to study in college, and how does it connect to your photography?",
          "Where do you see yourself professionally in 10 years?"
        ],
        community: [
          "Which service experience has meant the most to you personally? Why?",
          "Describe one specific person you helped - what was happening?",
          "What does leadership mean to you based on what you've actually done?",
          "When did service become more than just checking a box for you?",
          "How do you plan to continue serving in college?"
        ],
        arts: [
          "Walk me through creating 'Warm Embrace' - where were you, what did you notice?",
          "What were you trying to capture about your mom in that photo?",
          "What did you feel when you learned you won at the national level?",
          "What do you notice through a camera that you miss otherwise?",
          "How is creating art for yourself different from client work?"
        ],
        challenge: [
          "Name ONE real challenge you've faced - not a lesson, the actual situation.",
          "What happened? Describe the specific circumstances.",
          "What did you try first that didn't work?",
          "What did you change? What did you do differently?",
          "What do you do differently now because of that experience?"
        ],
        financial: [
          "What college costs concern you most?",
          "What are you personally doing to help pay for college?",
          "How much have you earned through photography so far?",
          "What would you want to avoid financially (loans, burden on family)?",
          "What specific expense would a scholarship help cover?"
        ]
      };

      return res.status(200).json({
        success: true,
        questions: questionSets[essayType] || questionSets.career,
        essayType
      });

    } else if (action === 'generate-draft') {
      // Generate essay draft from interview answers
      const target = wordLimit || 500;

      userPrompt = `Based on Jasmine's interview answers below, write a ${target}-word scholarship essay draft.

ESSAY TYPE: ${essayType}
WORD LIMIT: ${target} words

JASMINE'S ANSWERS:
${answers.map((a, i) => `Q${i+1}: ${a.question}\nA: ${a.answer}`).join('\n\n')}

INSTRUCTIONS:
1. Start with a specific moment or memory from her answers - NOT a generic opening
2. Use her exact words and details where they're strong
3. Keep her authentic teenage voice
4. Follow the structure: Story → Impact → Action → Growth → Future
5. Make it personal, not a résumé recitation
6. Stay within ${target} words
7. End with a forward-looking statement

Write the complete essay draft now:`;

    } else if (action === 'improve') {
      userPrompt = `Improve this scholarship essay while keeping Jasmine's voice.

ESSAY TYPE: ${essayType}
CURRENT DRAFT:
${content}

Give specific suggestions to make it stronger:
1. Is the opening specific enough? If not, suggest a better hook.
2. Are there clichés to remove?
3. Where could she add more specific details?
4. Is the ending compelling?
5. Any word choice improvements?

Be encouraging but honest. Format as numbered suggestions.`;

    } else if (action === 'expand') {
      userPrompt = `Expand these notes into flowing essay paragraphs for a ${essayType} scholarship.

JASMINE'S NOTES:
${content}

Expand into approximately ${wordLimit || 500} words while:
1. Keeping her voice
2. Adding transitions between ideas
3. Including specific details where she provided them
4. Marking [ADD DETAIL] where she should fill in specifics
5. Following essay structure: Story → Impact → Action → Growth → Future`;

    } else if (action === 'check') {
      userPrompt = `Review this scholarship essay for:
1. Grammar and spelling errors
2. Word count (is it appropriate?)
3. Does it sound authentic (not AI-written)?
4. Does it answer the ${essayType} prompt effectively?
5. Are there any red flags or things to fix?

ESSAY:
${content}

Give brief, specific feedback with any corrections needed.`;

    } else if (action === 'enhance') {
      // AI enhance/draft from rough notes
      userPrompt = `Take these rough notes/draft from Jasmine and transform them into a polished scholarship essay.

CURRENT DRAFT/NOTES:
${content}

INSTRUCTIONS:
1. Keep Jasmine's authentic voice and ideas - this is HER story
2. Fix grammar, spelling, and punctuation
3. Improve sentence flow and transitions
4. Expand brief points into fuller paragraphs where needed
5. Keep the same general structure but make it more compelling
6. Target approximately 500 words (or match the original length)
7. Make it sound natural, NOT overly polished or AI-written
8. Start with a specific moment, not a generic statement

Write the enhanced essay now:`;

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

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
        max_tokens: 2048,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({
      success: true,
      response: responseText,
      enhanced: responseText,
      action
    });

  } catch (error) {
    console.error('Essay builder error:', error);
    return res.status(500).json({ error: 'Essay builder failed', details: error.message });
  }
}
