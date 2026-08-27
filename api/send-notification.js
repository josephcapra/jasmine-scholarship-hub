// Vercel Serverless Function: Send Parent Notifications via SendGrid
// POST /api/send-notification { parentEmail, studentName, type, subject, body }

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://jasmine-scholarship-hub.vercel.app' : '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'notifications@jasminescholarship.app';

  // If no SendGrid key, just log and return success (for testing)
  if (!SENDGRID_API_KEY) {
    console.log('Email notification (no SENDGRID_API_KEY):', req.body);
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

    // Send via SendGrid (click tracking disabled - SSL not configured for tracking domain)
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: parentEmail }]
        }],
        from: {
          email: FROM_EMAIL,
          name: 'Jasmine Scholarship Hub'
        },
        subject: subject,
        content: [{
          type: 'text/html',
          value: html
        }],
        tracking_settings: {
          click_tracking: { enable: false },
          open_tracking: { enable: false }
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    // SendGrid returns 202 with no body on success
    const messageId = response.headers.get('x-message-id');

    return res.status(200).json({
      success: true,
      messageId: messageId || 'sent'
    });

  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
}

function buildEmailHtml(type, studentName, body) {
  const studentDisplay = studentName || 'Your student';

  const templates = {
    milestone: {
      emoji: '🎉',
      color: '#7c3aed',
      title: 'Progress Update'
    },
    weekly: {
      emoji: '📊',
      color: '#14b8a6',
      title: 'Weekly Summary'
    },
    encouragement: {
      emoji: '💜',
      color: '#ec4899',
      title: 'Message Sent'
    },
    deadline: {
      emoji: '⏰',
      color: '#f59e0b',
      title: 'Upcoming Deadline'
    },
    welcome: {
      emoji: '👋',
      color: '#7c3aed',
      title: 'Welcome to Early Access'
    },
    linked: {
      emoji: '🔗',
      color: '#10b981',
      title: 'Account Connected'
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
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 32px; margin-bottom: 8px;">${template.emoji}</div>
      <h1 style="color: #1f2937; margin: 0; font-size: 20px; font-weight: 700;">${template.title}</h1>
    </div>

    <!-- Body -->
    <div style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb;">
      <p style="font-size: 15px; line-height: 1.6; color: #374151; margin: 0 0 20px 0;">
        ${body || 'You have an update from Jasmine Scholarship Hub.'}
      </p>

      <a href="https://jasmine-scholarship-hub.vercel.app/parents.html"
         style="display: inline-block; background: ${template.color}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        View Dashboard
      </a>
    </div>

    <!-- Privacy Notice -->
    <div style="margin-top: 24px; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
      <p style="font-size: 13px; color: #166534; margin: 0; line-height: 1.5;">
        <strong>Our promise to you:</strong> We never sell student data. Your student controls what they share. Essays remain their own work. You can delete your account anytime.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px 0; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        You're receiving this because you're connected to ${studentDisplay}'s account.
      </p>
      <p style="margin: 0;">
        <a href="https://jasmine-scholarship-hub.vercel.app/parents.html" style="color: #6b7280;">Manage preferences</a>
        &nbsp;·&nbsp;
        <a href="https://jasmine-scholarship-hub.vercel.app/privacy.html" style="color: #6b7280;">Privacy Policy</a>
      </p>
      <p style="margin: 12px 0 0 0; color: #d1d5db;">
        Jasmine Scholarship Hub · Early Access Program
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
