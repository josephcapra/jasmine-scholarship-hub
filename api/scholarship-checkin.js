// Vercel Serverless Function: Scholarship Check-in Email
// POST /api/scholarship-checkin { studentId, studentEmail, studentName }
// GET /api/scholarship-checkin?action=update&scholarshipId=xxx&status=submitted&token=xxx

const SUPABASE_URL = 'https://ntmsclblmncklbxlttlw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bXNjbGJsbW5ja2xieGx0dGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MDUyNzUsImV4cCI6MjEwMzI4MTI3NX0.BVm-mcQsxJQAKHBgLEhnNRTL0Yazrys9uXaSifFucQU';

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.NODE_ENV === 'production' ? 'https://jasmine-scholarship-hub.vercel.app' : '*';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: Handle status update clicks from email
  if (req.method === 'GET') {
    const { action, scholarshipId, status, token, studentId } = req.query;

    if (action === 'update' && scholarshipId && status && studentId) {
      try {
        // Update scholarship status in Supabase
        const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/tracked_scholarships?id=eq.${scholarshipId}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: status,
            updated_at: new Date().toISOString()
          })
        });

        // Log activity
        await fetch(`${SUPABASE_URL}/rest/v1/activity_log`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            student_id: studentId,
            action: 'scholarship_status_updated',
            details: { scholarshipId, status, via: 'email_checkin' }
          })
        });

        // Return a nice confirmation page
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(getConfirmationPage(status));
      } catch (error) {
        console.error('Update error:', error);
        res.setHeader('Content-Type', 'text/html');
        return res.status(500).send(getErrorPage());
      }
    }

    return res.status(400).json({ error: 'Invalid request' });
  }

  // POST: Send check-in email
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'notifications@jasminescholarship.app';

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const { studentId, studentEmail, studentName } = body;

    if (!studentId || !studentEmail) {
      return res.status(400).json({ error: 'Missing studentId or studentEmail' });
    }

    // Get student's scholarships from Supabase
    const scholRes = await fetch(`${SUPABASE_URL}/rest/v1/tracked_scholarships?student_id=eq.${studentId}&select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const scholarships = await scholRes.json();

    if (!scholarships || scholarships.length === 0) {
      return res.status(200).json({ success: true, message: 'No scholarships to check in on' });
    }

    // Filter to active scholarships (not won or rejected)
    const activeScholarships = scholarships.filter(s =>
      s.status !== 'won' && s.status !== 'rejected'
    );

    if (activeScholarships.length === 0) {
      return res.status(200).json({ success: true, message: 'No active scholarships to check in on' });
    }

    // Build email HTML
    const html = buildCheckinEmail(studentName || 'Student', studentId, activeScholarships);

    if (!SENDGRID_API_KEY) {
      console.log('Check-in email (no SendGrid key):', { studentEmail, scholarshipCount: activeScholarships.length });
      return res.status(200).json({
        success: true,
        message: 'Email logged (SendGrid not configured)',
        scholarshipCount: activeScholarships.length
      });
    }

    // Send via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: studentEmail }] }],
        from: { email: FROM_EMAIL, name: 'Jasmine Scholarship Hub' },
        subject: `📋 Quick Check-in: How are your ${activeScholarships.length} scholarship applications going?`,
        content: [{ type: 'text/html', value: html }],
        tracking_settings: {
          click_tracking: { enable: false },
          open_tracking: { enable: false }
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({
      success: true,
      message: `Check-in email sent for ${activeScholarships.length} scholarships`
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return res.status(500).json({ error: 'Failed to send check-in email', details: error.message });
  }
}

function buildCheckinEmail(studentName, studentId, scholarships) {
  const baseUrl = 'https://jasmine-scholarship-hub.vercel.app/api/scholarship-checkin';

  const scholarshipRows = scholarships.map(s => {
    const id = s.id;
    const currentStatus = s.status || 'researching';
    const statusLabel = {
      'researching': '🔍 Researching',
      'in_progress': '📝 In Progress',
      'applying': '📝 Applying',
      'submitted': '✅ Submitted',
      'won': '🏆 Won',
      'rejected': '❌ Not Selected'
    }[currentStatus] || currentStatus;

    // Generate quick-update links
    const updateLink = (newStatus, label, emoji, color) =>
      `<a href="${baseUrl}?action=update&scholarshipId=${id}&status=${newStatus}&studentId=${studentId}"
          style="display: inline-block; padding: 8px 12px; background: ${color}; color: white; text-decoration: none; border-radius: 6px; font-size: 0.8rem; font-weight: 600; margin: 2px;">
        ${emoji} ${label}
      </a>`;

    return `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 700; color: #1f2937; margin-bottom: 4px;">${s.name}</div>
          ${s.organization ? `<div style="font-size: 0.85rem; color: #6b7280;">${s.organization}</div>` : ''}
          <div style="font-size: 0.85rem; color: #7c3aed; font-weight: 600; margin-top: 4px;">
            ${typeof s.amount === 'string' ? s.amount : (s.amount ? '$' + s.amount.toLocaleString() : '')}
          </div>
          <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 4px;">Current: ${statusLabel}</div>
        </td>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; vertical-align: top;">
          <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-end;">
            ${currentStatus !== 'submitted' ? updateLink('submitted', 'Submitted', '✅', '#10b981') : ''}
            ${updateLink('won', 'Won!', '🏆', '#f59e0b')}
            ${updateLink('rejected', 'Not Selected', '❌', '#6b7280')}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">

    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
      <h1 style="color: #1f2937; margin: 0; font-size: 22px; font-weight: 700;">Quick Check-in</h1>
      <p style="color: #6b7280; margin: 8px 0 0;">Hey ${studentName}! Any updates on your scholarships?</p>
    </div>

    <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
      <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; padding: 16px 20px;">
        <strong>Your Active Applications (${scholarships.length})</strong>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        ${scholarshipRows}
      </table>
    </div>

    <div style="margin-top: 24px; padding: 16px; background: #ede9fe; border-radius: 12px; text-align: center;">
      <p style="margin: 0; font-size: 0.9rem; color: #5b21b6;">
        <strong>Just tap a button</strong> to update any scholarship status instantly!<br>
        No login required - we'll update your tracker automatically.
      </p>
    </div>

    <div style="margin-top: 24px; text-align: center;">
      <a href="https://jasmine-scholarship-hub.vercel.app"
         style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; text-decoration: none; border-radius: 10px; font-weight: 700;">
        Open Full Dashboard →
      </a>
    </div>

    <div style="margin-top: 24px; text-align: center; font-size: 0.8rem; color: #9ca3af;">
      <p style="margin: 0;">
        🔒 Your data is encrypted and never sold<br>
        Jasmine Scholarship Hub • Early Access Program
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function getConfirmationPage(status) {
  const messages = {
    'submitted': { emoji: '✅', title: 'Marked as Submitted!', msg: 'Great job completing that application!' },
    'won': { emoji: '🏆', title: 'Congratulations!', msg: 'Amazing work! You won this scholarship!' },
    'rejected': { emoji: '💪', title: 'Status Updated', msg: 'Every application is practice. Keep going!' }
  };
  const m = messages[status] || { emoji: '✓', title: 'Updated!', msg: 'Your scholarship status has been updated.' };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Status Updated</title>
</head>
<body style="margin: 0; padding: 40px 20px; background: linear-gradient(135deg, #7c3aed, #ec4899); min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, sans-serif;">
  <div style="background: white; border-radius: 20px; padding: 40px; text-align: center; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
    <div style="font-size: 4rem; margin-bottom: 16px;">${m.emoji}</div>
    <h1 style="color: #1f2937; margin: 0 0 12px;">${m.title}</h1>
    <p style="color: #6b7280; margin: 0 0 24px;">${m.msg}</p>
    <a href="https://jasmine-scholarship-hub.vercel.app"
       style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">
      Back to Dashboard →
    </a>
  </div>
</body>
</html>
  `;
}

function getErrorPage() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
</head>
<body style="margin: 0; padding: 40px 20px; background: #fef2f2; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: -apple-system, sans-serif;">
  <div style="background: white; border-radius: 20px; padding: 40px; text-align: center; max-width: 400px;">
    <div style="font-size: 3rem; margin-bottom: 16px;">😕</div>
    <h1 style="color: #1f2937; margin: 0 0 12px;">Something went wrong</h1>
    <p style="color: #6b7280; margin: 0 0 24px;">We couldn't update your scholarship status. Please try again from the app.</p>
    <a href="https://jasmine-scholarship-hub.vercel.app"
       style="display: inline-block; padding: 14px 28px; background: #7c3aed; color: white; text-decoration: none; border-radius: 12px; font-weight: 700;">
      Open Dashboard →
    </a>
  </div>
</body>
</html>
  `;
}
