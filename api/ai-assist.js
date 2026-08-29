// Vercel Serverless Function: AI-powered essay assistance for Jasmine
// POST /jasmine/api/ai-assist { action, essayType, content }

import { aiAssistSchema, validateRequest } from './lib/validation.js';

const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production'
  ? 'https://jasmine-scholarship-hub.vercel.app'
  : '*';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!ANTHROPIC_API_KEY && !OPENAI_API_KEY) {
    return res.status(500).json({ error: 'AI service not configured' });
  }

  // Build student context from profile passed in request, or use generic guidance
  function buildStudentContext(profile) {
    if (!profile || !profile.name) {
      return `You are helping a high school student write scholarship essays.

WRITING GUIDANCE:
- Keep the student's authentic voice
- Avoid clichés - be specific
- Show, don't tell
- Don't manufacture hardship
- Connect achievements to values learned`;
    }

    return `You are helping ${profile.name}, a high school student, write scholarship essays.

STUDENT INFO:
${profile.school ? `- School: ${profile.school}` : ''}
${profile.gpa ? `- GPA: ${profile.gpa}` : ''}
${profile.achievements ? `- Achievements: ${profile.achievements}` : ''}
${profile.activities ? `- Activities: ${profile.activities}` : ''}
${profile.interests ? `- Interests: ${profile.interests}` : ''}

WRITING GUIDANCE:
- Keep the student's authentic voice
- Avoid clichés - be specific
- Show, don't tell
- Don't manufacture hardship
- Connect achievements to values learned`;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { action, essayType, content, message, context, profile } = body;
    const studentContext = buildStudentContext(profile);

    // Handle chatbot messages (from chat widget)
    if (message) {
      const contextInfo = [];
      if (context?.firstName) contextInfo.push(`Student's name: ${context.firstName} ${context.lastName || ''}`);
      if (context?.school) contextInfo.push(`School: ${context.school}`);
      if (context?.gpa) contextInfo.push(`GPA: ${context.gpa}`);
      if (context?.graduationYear) contextInfo.push(`Graduation year: ${context.graduationYear}`);
      if (context?.vyliumType) contextInfo.push(`Vylium personality type: ${context.vyliumType}`);

      const chatSystemPrompt = `You are a helpful scholarship assistant for Vylium, a scholarship discovery platform. You help students and parents with:
- Finding scholarships that match their profile
- Essay writing tips and feedback
- Understanding their Vylium personality type and how it helps with scholarships
- Deadline tracking and organization
- College planning advice

Be encouraging, supportive, and concise. Keep responses under 150 words unless more detail is needed.

${contextInfo.length > 0 ? `\nStudent context:\n${contextInfo.join('\n')}` : ''}`;

      // Try Anthropic first, fall back to OpenAI
      if (ANTHROPIC_API_KEY) {
        const chatResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 500,
            system: chatSystemPrompt,
            messages: [{ role: 'user', content: message }],
          }),
        });

        if (chatResponse.ok) {
          const data = await chatResponse.json();
          return res.status(200).json({ response: data.content[0].text });
        }
      }

      // Fallback to OpenAI
      if (OPENAI_API_KEY) {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 500,
            messages: [
              { role: 'system', content: chatSystemPrompt },
              { role: 'user', content: message }
            ],
          }),
        });

        if (openaiResponse.ok) {
          const data = await openaiResponse.json();
          return res.status(200).json({ response: data.choices[0].message.content });
        }
      }

      return res.status(200).json({ response: "I'm here to help with your scholarship journey! Try asking about scholarships, essays, or your profile." });
    }

    // Validate input for essay actions
    const validation = validateRequest(aiAssistSchema, body);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const validatedData = validation.data;
    let userPrompt = '';

    if (validatedData.action === 'tips') {
      userPrompt = `Jasmine is starting a ${validatedData.essayType} scholarship essay. Give her 3-4 specific, actionable tips for THIS essay type. Which of her unique experiences should she highlight? Keep it brief and encouraging!`;
    } else if (validatedData.action === 'improve') {
      userPrompt = `Help improve this ${validatedData.essayType} essay draft while keeping Jasmine's voice:\n\n${validatedData.content}\n\nGive 3-4 specific suggestions to make it stronger. Be encouraging!`;
    } else if (validatedData.action === 'expand') {
      userPrompt = `Jasmine wrote these notes for her ${validatedData.essayType} essay:\n\n${validatedData.content}\n\nHelp expand into flowing paragraphs. Mark [ADD DETAIL] where she should add specifics. Keep her authentic voice!`;
    } else if (validatedData.action === 'check') {
      userPrompt = `Review this essay for issues:\n\n${validatedData.content}\n\nCheck grammar, flow, authenticity (not AI-sounding), and if it answers the prompt well. Brief feedback!`;
    } else {
      userPrompt = validatedData.content || 'How can I help with your scholarship essay?';
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
        system: studentContext,
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
