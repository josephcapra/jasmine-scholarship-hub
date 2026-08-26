// Vercel Serverless Function: Send Parent Notifications
// POST /api/send-notification { parentEmail, studentName, type, subject, body }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  // If no Resend key, just log and return success (for testing)
  if (!RESEND_API_KEY) {
    console.log('Email notification (no RESEND_API_KEY):', req.body);
    return res.status(200).json({
      success: true,
      message: 'Notification logged (email not configured)',
      queued: true
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { parentEmail, studentName, type, subject, body: emailBody } = body;

    if (!parentEmail || !subject) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build email HTML
    const html = buildEmailHtml(type, studentName, emailBody);

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Jasmine Scholarship Hub <notifications@jasminescholarship.app>',
        to: parentEmail,
        subject: subject,
        html: html
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    const result = await response.json();

    return res.status(200).json({
      success: true,
      messageId: result.id
    });

  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
}

function buildEmailHtml(type, studentName, body) {
  const studentDisplay = studentName || 'Your child';

  const templates = {
    milestone: {
      emoji: '🎉',
      color: '#7c3aed',
      title: 'Milestone Reached!'
    },
    weekly: {
      emoji: '📊',
      color: '#14b8a6',
      title: 'Weekly Progress Update'
    },
    encouragement: {
      emoji: '💜',
      color: '#ec4899',
      title: 'Encouragement Sent!'
    },
    deadline: {
      emoji: '⏰',
      color: '#f59e0b',
      title: 'Deadline Alert'
    },
    default: {
      emoji: '📧',
      color: '#7c3aed',
      title: 'Update'
    }
  };

  const template = templates[type] || templates.default;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #faf5ff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${template.color}, #ec4899); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">${template.emoji}</div>
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800;">${template.title}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${studentDisplay}'s Scholarship Journey</p>
    </div>

    <!-- Body -->
    <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 20px 0;">
        ${body || 'You have a new update from Jasmine Scholarship Hub.'}
      </p>

      <a href="https://jasmine-scholarship-hub.vercel.app/parents.html"
         style="display: inline-block; background: ${template.color}; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px;">
        View Full Dashboard →
      </a>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

      <p style="font-size: 13px; color: #9ca3af; margin: 0;">
        You're receiving this because you're connected to ${studentDisplay}'s scholarship account.
        <br><br>
        <a href="https://jasmine-scholarship-hub.vercel.app/parents.html" style="color: #7c3aed;">Manage notification preferences</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">
        🔒 Your data is encrypted and never sold
        <br>
        Jasmine Scholarship Hub
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
