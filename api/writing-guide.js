// Vercel Serverless Function: AI Writing Guide
// POST /api/jasmine/writing-guide { action, essayType, prompt, content, profile }

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

    const { action, essayType, prompt, content, profile, scholarship } = body;

    let systemPrompt = '';
    let userPrompt = '';

    // Profile context
    const profileContext = profile ? `
Student Profile:
- Name: ${profile.firstName || 'Student'} ${profile.lastName || ''}
- School: ${profile.school || 'Not specified'}
- GPA: ${profile.gpa || 'Not specified'}
- Graduation: ${profile.graduationYear || 'Not specified'}
- Achievements: ${(profile.achievements || []).slice(0, 5).map(a => typeof a === 'string' ? a : a.title || a).join(', ') || 'None listed'}
- Activities: ${(profile.activities || []).slice(0, 5).map(a => typeof a === 'string' ? a : a.title || a).join(', ') || 'None listed'}
- Skills: ${(profile.skills || []).slice(0, 8).join(', ') || 'None listed'}
- Community Service: ${(profile.communityService || []).slice(0, 3).map(s => typeof s === 'string' ? s : s.organization || s).join(', ') || 'None listed'}
- Interests: ${(profile.interests || []).join(', ') || 'Not specified'}
- Military Family: ${profile.militaryFamily ? 'Yes' : 'No'}
` : '';

    switch (action) {
      case 'understand':
        // Explain what judges look for in this essay prompt
        systemPrompt = `You are a scholarship writing coach. Explain what judges are looking for in clear, encouraging language for a high school student. Be specific and actionable. Keep response under 200 words.`;
        userPrompt = `Essay Prompt: "${prompt || 'General scholarship essay'}"

Explain to this student:
1. What the judges really want to learn about them
2. What makes an essay stand out for this type of prompt
3. Common mistakes to avoid
4. The emotional/character qualities that should come through

Be encouraging but honest. Use "you" language.`;
        break;

      case 'findStory':
        // Generate guided questions based on profile and prompt
        systemPrompt = `You are a scholarship writing coach helping a student brainstorm. Based on their profile, suggest specific experiences they might write about. Ask questions that help them reflect deeply. Keep questions conversational and specific to THEIR experiences.`;
        userPrompt = `${profileContext}

Essay Prompt: "${prompt || 'Tell us about yourself'}"

Generate 5-7 thoughtful questions to help this student find their story. Base questions on their ACTUAL experiences, achievements, and activities listed above. Questions should:
1. Reference specific things from their profile
2. Ask about emotions, challenges, and growth
3. Help them find the deeper meaning
4. Be conversational, not formal

Format as a numbered list of questions.`;
        break;

      case 'structure':
        // Provide essay structure guidance
        systemPrompt = `You are a scholarship writing coach. Provide a clear essay structure with specific guidance for each section. Be practical and give examples of what to include.`;
        userPrompt = `${profileContext}

Essay Prompt: "${prompt || 'General essay'}"

Provide a recommended essay structure with:
1. Opening Hook - How to grab attention (with a specific suggestion based on their profile)
2. Context - What background to include
3. Challenge/Turning Point - The heart of the story
4. Action & Growth - What they did and learned
5. Future Connection - How it shapes their goals
6. Closing - How to end memorably

For each section, give 1-2 sentences of guidance specific to THIS student based on their profile.`;
        break;

      case 'review':
        // Review their writing and give feedback
        systemPrompt = `You are a scholarship essay coach. Review the student's draft and provide constructive feedback. Be encouraging but honest. Focus on what will make their essay stronger. DO NOT rewrite the essay - give feedback the student can act on.`;
        userPrompt = `${profileContext}

Essay Prompt: "${prompt || 'Essay'}"

Student's Draft:
"""
${content || 'No content provided'}
"""

Provide feedback in these categories:
1. STRENGTHS - What's working well (2-3 specific things)
2. AUTHENTICITY - Does it sound like this student? Any parts that feel generic?
3. SPECIFICITY - Are there enough concrete details and examples?
4. EMOTIONAL IMPACT - Does the reader feel connected to the story?
5. PROMPT ALIGNMENT - Does it answer what was asked?
6. SUGGESTIONS - 2-3 specific things to improve (tell them what to do, not how to rewrite)

Keep feedback actionable and encouraging. Under 300 words.`;
        break;

      case 'score':
        // Calculate essay strength score
        systemPrompt = `You are an essay evaluator. Score the essay on specific criteria. Be fair but rigorous. Return ONLY valid JSON.`;
        userPrompt = `${profileContext}

Essay Prompt: "${prompt || 'Essay'}"

Student's Draft:
"""
${content || 'No content provided'}
"""

Score this essay on a 0-100 scale for each criterion. Return ONLY this JSON format:
{
  "overall": 75,
  "breakdown": {
    "promptAlignment": { "score": 85, "note": "Brief note" },
    "authenticity": { "score": 78, "note": "Brief note" },
    "storytelling": { "score": 70, "note": "Brief note" },
    "specificExamples": { "score": 72, "note": "Brief note" },
    "personalGrowth": { "score": 80, "note": "Brief note" },
    "clarity": { "score": 85, "note": "Brief note" },
    "memorability": { "score": 65, "note": "Brief note" },
    "grammar": { "score": 90, "note": "Brief note" }
  },
  "level": "Strong|Developing|Needs Work",
  "topOpportunity": "The biggest thing that would improve this essay",
  "readyToSubmit": true/false
}`;
        break;

      case 'voiceCheck':
        // Check if writing sounds authentic
        systemPrompt = `You are checking if an essay sounds like a genuine high school student wrote it. Flag anything that sounds too formal, generic, or AI-generated. Be helpful, not accusatory.`;
        userPrompt = `${profileContext}

Review this essay for voice authenticity:
"""
${content || 'No content provided'}
"""

Check for:
1. Overly formal language that doesn't sound like a teenager
2. Generic motivational phrases or clichés
3. Sudden changes in writing style
4. Claims that aren't supported by their profile
5. Language that sounds copied or AI-generated

If issues found, suggest how to make it sound more like THEM.
If it sounds authentic, say so encouragingly.
Keep response under 150 words.`;
        break;

      case 'readinessCheck':
        // Final submission readiness check
        systemPrompt = `You are doing a final essay submission check. Be thorough but concise.`;
        userPrompt = `${profileContext}

Essay Prompt: "${prompt || 'Essay'}"
Word Limit: ${body.wordLimit || 500}

Student's Essay:
"""
${content || 'No content provided'}
"""

Perform a submission readiness check:
1. ✓ or ✗ Prompt answered
2. ✓ or ✗ Word count compliant (current: ${(content || '').split(/\s+/).filter(Boolean).length} words)
3. ✓ or ✗ Student-specific examples included
4. ✓ or ✗ Clear opening
5. ✓ or ✗ Evidence of growth/reflection
6. ✓ or ✗ Grammar reviewed
7. ✓ or ✗ Voice sounds authentic

Then: READY TO SUBMIT or NEEDS REVISION

If needs revision, list top 2 things to fix.
End with: "Read your essay aloud before submitting to make sure every sentence sounds like you."`;
        break;

      default:
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
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';

    // For score action, parse as JSON
    if (action === 'score') {
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const scoreData = JSON.parse(jsonMatch[0]);
          return res.status(200).json({ success: true, action, score: scoreData });
        }
      } catch (e) {
        console.error('Score parse error:', e);
      }
    }

    return res.status(200).json({
      success: true,
      action,
      response: result
    });

  } catch (error) {
    console.error('Writing guide error:', error);
    return res.status(500).json({ error: 'Failed to get writing guidance', details: error.message });
  }
}
