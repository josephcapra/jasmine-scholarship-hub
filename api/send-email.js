// Vercel Serverless Function: Send emails to Jasmine via SendGrid
// POST /jasmine/api/send-email { type, content, essayTitle, resumeType }

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://jasmine-scholarship-hub.vercel.app' : '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const JASMINE_EMAIL = 'jasminecapra848@gmail.com';
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'notifications@jasminescholarship.app';
  const FEEDBACK_TO_EMAIL = 'joe@josephcapra.com';

  if (!SENDGRID_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { type, content, essayTitle, resumeType } = body;
    let subject, htmlContent;

    if (type === 'essay') {
      subject = `Your Essay Draft: ${essayTitle || 'Scholarship Essay'}`;
      htmlContent = `
        <div style="font-family: 'Nunito', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 30px; border-radius: 16px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Your Essay Draft</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">${essayTitle || 'Scholarship Essay'}</p>
          </div>
          <div style="background: #faf5ff; padding: 24px; border-radius: 16px; margin-top: 20px;">
            <p style="color: #7c3aed; font-weight: bold; margin-bottom: 16px;">Here's your essay content:</p>
            <div style="background: white; padding: 20px; border-radius: 12px; line-height: 1.8; color: #333;">
              ${content.split('\n').map(p => `<p style="margin-bottom: 16px;">${p}</p>`).join('')}
            </div>
          </div>
          <div style="background: linear-gradient(135deg, #f59e0b, #fbbf24); padding: 20px; border-radius: 16px; margin-top: 20px; color: #78350f;">
            <p style="font-weight: bold; margin: 0 0 8px;">💜 From Mom & Daddy Dog:</p>
            <p style="margin: 0;">Amazing work, Jasmine! Every word you write brings you closer to your dreams. We're SO proud of you! Keep going, superstar!</p>
          </div>
        </div>`;
    } else if (type === 'resume') {
      const resumeNames = {
        general: 'General Scholarship Resume',
        photography: 'Photography & Arts Resume',
        military: 'Military Service Resume',
        master: 'Master Achievement Resume',
      };
      subject = `Your Resume: ${resumeNames[resumeType] || 'Scholarship Resume'}`;
      htmlContent = `
        <div style="font-family: 'Nunito', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 30px; border-radius: 16px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Your Resume</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">${resumeNames[resumeType] || 'Resume'}</p>
          </div>
          <div style="background: #d1fae5; padding: 20px; border-radius: 16px; margin-top: 20px; color: #065f46;">
            <p style="font-weight: bold; margin: 0 0 8px;">📎 Resume Link:</p>
            <p style="margin: 0;"><a href="https://paradiserealtyfla.app/jasmine/resumes/">View & Download Your Resumes</a></p>
          </div>
          <div style="background: linear-gradient(135deg, #f59e0b, #fbbf24); padding: 20px; border-radius: 16px; margin-top: 20px; color: #78350f;">
            <p style="font-weight: bold; margin: 0 0 8px;">💜 From Mom & Daddy Dog:</p>
            <p style="margin: 0;">This resume shows how hard you've worked. From jazz.ysphotos to Carnegie Hall - you've earned every accomplishment. Go get those scholarships!</p>
          </div>
        </div>`;
    } else if (type === 'progress') {
      subject = `Weekly Scholarship Progress Update 🌟`;
      htmlContent = `
        <div style="font-family: 'Nunito', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 30px; border-radius: 16px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Your Weekly Progress 🌟</h1>
          </div>
          <div style="background: white; padding: 20px; border-radius: 16px; margin-top: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            ${content}
          </div>
          <div style="background: linear-gradient(135deg, #f59e0b, #fbbf24); padding: 20px; border-radius: 16px; margin-top: 20px; color: #78350f;">
            <p style="font-weight: bold; margin: 0 0 8px;">💜 From Mom & Daddy Dog:</p>
            <p style="margin: 0;">Another week of amazing progress! We see how hard you're working and we couldn't be more proud!</p>
          </div>
        </div>`;
    } else if (body.to && body.subject && body.text) {
      // Direct email format (for feedback, etc.)
      const toEmail = FEEDBACK_TO_EMAIL; // Always send feedback to Joe
      subject = body.subject;
      htmlContent = `
        <div style="font-family: 'Nunito', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 30px; border-radius: 16px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">📬 App Feedback</h1>
          </div>
          <div style="background: white; padding: 20px; border-radius: 16px; margin-top: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
            <pre style="white-space: pre-wrap; font-family: inherit; margin: 0; line-height: 1.6;">${body.text}</pre>
          </div>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; margin-top: 16px; font-size: 12px; color: #6b7280;">
            Sent from Jasmine's Scholarship Hub at ${new Date().toLocaleString()}
          </div>
        </div>`;

      // Send to Joe instead of Jasmine for feedback
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: FROM_EMAIL, name: 'Jasmine\'s Scholarship Hub' },
          subject,
          content: [{ type: 'text/html', value: htmlContent }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid error: ${response.status} ${errorText}`);
      }

      return res.status(200).json({ success: true, message: 'Feedback sent!' });
    } else {
      return res.status(400).json({ error: 'Invalid email type' });
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: JASMINE_EMAIL }] }],
        from: { email: FROM_EMAIL, name: 'Jasmine\'s Scholarship Hub' },
        subject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid error: ${response.status} ${errorText}`);
    }

    return res.status(200).json({ success: true, message: 'Email sent!' });

  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
