// Vercel Serverless Function: Extract profile info from uploaded document
// POST /api/jasmine/extract-profile { fileName, fileType, fileData }

// Use pdf-parse for PDF and mammoth for Word docs
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Fallback text parser for when AI is unavailable
function parseTextContent(text) {
  const profile = {};
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);

  // Email pattern - search entire text
  const emailMatch = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (emailMatch) profile.email = emailMatch[0];

  // Phone pattern - various formats
  const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) profile.phone = phoneMatch[0];

  // Name patterns - handle various formats including ALL CAPS and nicknames
  for (const line of lines.slice(0, 15)) {
    // Pattern: ALL CAPS NAME (possibly with nickname in quotes)
    const capsMatch = line.match(/^([A-Z]{2,}(?:\s+["'][A-Za-z]+["'])?\s+[A-Z-]+(?:\s+[A-Z-]+)?)\s*$/);
    if (capsMatch) {
      const fullName = capsMatch[1];
      // Extract first and last name, handling nicknames
      const nickMatch = fullName.match(/["']([A-Za-z]+)["']/);
      const nameParts = fullName.replace(/["'][A-Za-z]+["']\s*/, '').split(/\s+/);
      if (nameParts.length >= 2) {
        profile.firstName = nameParts[0].charAt(0) + nameParts[0].slice(1).toLowerCase();
        profile.lastName = nameParts[nameParts.length - 1].split('-').map(p => p.charAt(0) + p.slice(1).toLowerCase()).join('-');
        if (nickMatch) profile.nickname = nickMatch[1];
      }
      break;
    }
    // Pattern: Normal case name
    const nameMatch = line.match(/^([A-Z][a-z]+)\s+(?:["'][A-Za-z]+["']\s+)?(?:[A-Z]\.?\s+)?([A-Z][a-z]+(?:-[A-Z][a-z]+)?)$/);
    if (nameMatch) {
      profile.firstName = nameMatch[1];
      profile.lastName = nameMatch[2];
      break;
    }
  }

  // School patterns - look for "High School"
  const schoolMatch = text.match(/([A-Z][a-zA-Z\s]+High\s+School)/i);
  if (schoolMatch) {
    profile.school = schoolMatch[1].trim();
  }

  // GPA pattern - handle weighted GPA
  const gpaMatch = text.match(/(?:weighted\s+)?GPA[:\s]*(\d\.\d+)/i) ||
                   text.match(/(\d\.\d+)(?:\s*(?:weighted|cumulative))?.*?GPA/i);
  if (gpaMatch) profile.gpa = gpaMatch[1];

  // Graduation year - handle "Class of XXXX"
  const yearMatch = text.match(/class\s+of\s+(\d{4})/i) ||
                    text.match(/(?:graduation|expected graduation)[:\s]+(\d{4})/i) ||
                    text.match(/Expected\s+Graduation[:\s]+(\d{4})/i);
  if (yearMatch) profile.graduationYear = yearMatch[1];

  // City/State pattern - look for common formats with pipe or comma separator
  const cityStateMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+(Florida|FL|California|CA|Texas|TX|New York|NY)\s*\|/i) ||
                         text.match(/([A-Z][a-z]+),\s+(FL|CA|TX|NY|Florida|California|Texas)/i);
  if (cityStateMatch) {
    profile.city = cityStateMatch[1];
    profile.state = cityStateMatch[2];
  }

  // Look for achievements/awards
  const achievements = [];
  const awardPatterns = [
    /National\s+Gold\s+Medal/gi,
    /American\s+Visions\s+Award/gi,
    /1st\s+Place|First\s+Place/gi,
    /National\s+Honor\s+Society/gi,
    /Dean'?s?\s+List/gi,
    /President/gi,
    /Captain/gi
  ];
  awardPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) achievements.push(...matches);
  });
  if (achievements.length > 0) {
    profile.achievements = [...new Set(achievements)].slice(0, 5);
  }

  return profile;
}

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

    const { fileName, fileType, fileData } = body;
    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    // For images and PDFs, we need to use vision or extract text first
    let textContent = '';
    let useVision = false;

    if (fileType.includes('image')) {
      useVision = true;
    } else if (fileType.includes('pdf')) {
      // Extract text from PDF using pdf-parse library
      try {
        const base64Data = fileData.split(',')[1] || fileData;
        const pdfBuffer = Buffer.from(base64Data, 'base64');
        const pdfData = await pdfParse(pdfBuffer);
        textContent = pdfData.text;
        console.log('PDF text extracted, length:', textContent.length);
        console.log('PDF preview:', textContent.substring(0, 300));

        if (!textContent || textContent.length < 50) {
          return res.status(200).json({
            success: true,
            profile: {},
            fieldsExtracted: 0,
            source: fileName,
            message: 'Could not extract text from PDF.'
          });
        }
      } catch (e) {
        console.error('PDF extraction error:', e);
        return res.status(200).json({
          success: true,
          profile: {},
          fieldsExtracted: 0,
          source: fileName,
          message: 'PDF error: ' + e.message
        });
      }
    } else if (fileType.includes('word') || fileType.includes('document') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      // Extract text from Word document using mammoth
      try {
        const base64Data = fileData.split(',')[1] || fileData;
        const docBuffer = Buffer.from(base64Data, 'base64');
        const result = await mammoth.extractRawText({ buffer: docBuffer });
        textContent = result.value;
        console.log('Word doc text extracted, length:', textContent.length);

        if (!textContent || textContent.length < 50) {
          return res.status(200).json({
            success: true,
            profile: {},
            fieldsExtracted: 0,
            source: fileName,
            message: 'Could not extract text from Word document.'
          });
        }
      } catch (e) {
        console.error('Word doc extraction error:', e);
        return res.status(200).json({
          success: true,
          profile: {},
          fieldsExtracted: 0,
          source: fileName,
          message: 'Word doc error: ' + e.message
        });
      }
    } else if (fileData.includes('base64') || fileData.includes('data:')) {
      // Base64 encoded data
      try {
        const base64Data = fileData.split(',')[1] || fileData;
        textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
      } catch (e) {
        // If decoding fails, it might be a binary file - use vision
        useVision = true;
      }
    } else {
      // Plain text data
      textContent = fileData;
    }

    const systemPrompt = `You are a profile information extractor for scholarship applications. Extract personal, educational, and extracurricular information from the document content.

Return ONLY valid JSON with these fields (use null for fields you cannot find):
{
  "firstName": "Legal first name",
  "lastName": "Last name",
  "nickname": "Preferred name or nickname if different (e.g. 'Jasmine' for Sueanna)",
  "email": "Email address",
  "phone": "Phone number",
  "address": "Street address",
  "city": "City",
  "state": "State (full name preferred)",
  "zipCode": "ZIP code",
  "socialMedia": ["Instagram handle", "LinkedIn URL", "Portfolio URL", "Other social links"],
  "school": "High school name",
  "graduationYear": "Expected graduation year (4 digits)",
  "gpa": "GPA (number, unweighted if available)",
  "gpaWeighted": "Weighted GPA if mentioned",
  "academicProgram": "Special program like 'Cambridge AICE Diploma', 'IB Diploma', 'AP Scholar', etc.",
  "honors": ["Honor Roll", "Dean's List", "National Merit", etc.],
  "coursework": ["Advanced course 1", "AP/IB/AICE course 2", etc.],
  "satScore": "SAT score",
  "actScore": "ACT score",
  "intendedMajor": "Intended college major",
  "achievements": ["Award or achievement 1", "Award or achievement 2"],
  "activities": ["Club, organization, or role 1", "Activity 2"],
  "skills": ["Skill 1", "Skill 2", "Software/tool proficiency"],
  "workExperience": [{"title": "Job title", "company": "Company name", "dates": "Date range", "description": "Brief description"}],
  "certifications": [{"name": "Certification name", "issuer": "Issuing organization", "date": "Date earned"}],
  "communityService": [{"organization": "Org name", "role": "Volunteer role", "dates": "Date range", "description": "What they did"}],
  "businessName": "If student owns a business or side project"
}

Extract as much as you can find. Be accurate - don't make up information. For arrays of objects, include all relevant details found.`;

    // Helper function with retry logic for rate limits
    async function callOpenAIWithRetry(body, maxRetries = 3) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify(body)
        });

        if (response.ok) return response;

        if (response.status === 429 && attempt < maxRetries - 1) {
          // Rate limited - wait and retry with exponential backoff
          const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(r => setTimeout(r, waitTime));
          continue;
        }

        return response; // Return non-retryable error
      }
    }

    let response;

    if (useVision) {
      // Use GPT-4 Vision for images/PDFs
      response = await callOpenAIWithRetry({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Extract profile information from this ${fileName || 'document'}:` },
              { type: 'image_url', image_url: { url: fileData, detail: 'high' } }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });
    } else {
      // Use text-based extraction
      response = await callOpenAIWithRetry({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract profile information from this document (${fileName}):\n\n${textContent.substring(0, 10000)}` }
        ],
        max_tokens: 2000,
        temperature: 0.3
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      // Fallback: try basic text parsing if we have text content
      if (textContent) {
        const basicProfile = parseTextContent(textContent);
        if (Object.keys(basicProfile).length > 0) {
          return res.status(200).json({
            success: true,
            profile: basicProfile,
            fieldsExtracted: Object.keys(basicProfile).length,
            source: fileName,
            method: 'fallback'
          });
        }
      }
      throw new Error(`AI extraction failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    let profile = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        profile = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
    }

    // Clean up the profile - remove null values and clean arrays
    Object.keys(profile).forEach(key => {
      if (profile[key] === null || profile[key] === 'null' || profile[key] === '') {
        delete profile[key];
      }
      // Clean null values from arrays
      if (Array.isArray(profile[key])) {
        profile[key] = profile[key].filter(item => item !== null && item !== 'null' && item !== '');
      }
    });

    return res.status(200).json({
      success: true,
      profile,
      fieldsExtracted: Object.keys(profile).length,
      source: fileName
    });

  } catch (error) {
    console.error('Extraction error:', error);
    return res.status(500).json({ error: 'Failed to extract profile info', details: error.message });
  }
}
