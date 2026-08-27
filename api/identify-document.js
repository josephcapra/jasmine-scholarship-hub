// Vercel Serverless Function: Identify document type from image/PDF
// POST /api/jasmine/identify-document { fileName, fileType, fileData }

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

    const { fileName, fileType, fileData } = body;
    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const systemPrompt = `You are a document classifier for a scholarship application system. Identify what type of document this is.

Return ONLY valid JSON:
{
  "documentType": "resume|reportcard|award|certificate|recommendation|transcript|other",
  "title": "Suggested title for the document",
  "organization": "Organization name if visible (school, company, award giver)",
  "date": "Date if visible (YYYY or Month YYYY)",
  "confidence": "high|medium|low"
}

Document types:
- resume: Any resume or CV
- reportcard: School report card, progress report
- transcript: Official academic transcript
- award: Award certificate, medal certificate, competition results
- certificate: Professional certification, completion certificate
- recommendation: Letter of recommendation, reference letter
- other: Anything that doesn't fit above

Be accurate. If uncertain, use "other" with low confidence.`;

    // Use vision for images
    let response;
    if (fileType.includes('image')) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: `Identify this document: ${fileName}` },
                { type: 'image_url', image_url: { url: fileData, detail: 'low' } }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.3,
        store: false
        })
      });
    } else {
      // For PDFs and other files, use filename heuristics
      const lowerName = fileName.toLowerCase();
      let guessedType = 'other';
      let guessedTitle = fileName.replace(/\.[^/.]+$/, '');

      if (lowerName.includes('resume') || lowerName.includes('cv')) {
        guessedType = 'resume';
      } else if (lowerName.includes('report') || lowerName.includes('card') || lowerName.includes('grade')) {
        guessedType = 'reportcard';
      } else if (lowerName.includes('transcript')) {
        guessedType = 'transcript';
      } else if (lowerName.includes('award') || lowerName.includes('medal') || lowerName.includes('certificate') || lowerName.includes('honor')) {
        guessedType = 'award';
      } else if (lowerName.includes('recommend') || lowerName.includes('reference') || lowerName.includes('letter')) {
        guessedType = 'recommendation';
      }

      return res.status(200).json({
        success: true,
        documentType: guessedType,
        title: guessedTitle,
        confidence: 'medium',
        method: 'filename'
      });
    }

    if (!response.ok) {
      // Fallback to filename-based identification
      const lowerName = fileName.toLowerCase();
      let guessedType = 'other';

      if (lowerName.includes('resume')) guessedType = 'resume';
      else if (lowerName.includes('award') || lowerName.includes('certificate')) guessedType = 'award';
      else if (lowerName.includes('report') || lowerName.includes('grade')) guessedType = 'reportcard';

      return res.status(200).json({
        success: true,
        documentType: guessedType,
        title: fileName.replace(/\.[^/.]+$/, ''),
        confidence: 'low',
        method: 'fallback'
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    let result = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Parse error:', e);
    }

    return res.status(200).json({
      success: true,
      documentType: result.documentType || 'other',
      title: result.title || fileName.replace(/\.[^/.]+$/, ''),
      organization: result.organization || null,
      date: result.date || null,
      confidence: result.confidence || 'medium'
    });

  } catch (error) {
    console.error('Document identification error:', error);
    return res.status(200).json({
      success: true,
      documentType: 'other',
      title: 'Document',
      confidence: 'low'
    });
  }
}
