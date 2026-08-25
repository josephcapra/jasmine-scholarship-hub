// Vercel Serverless Function: Send weekly progress report to parents
// POST /jasmine/api/weekly-report (called by Vercel Cron)
// Also: GET for manual trigger

export default async function handler(req, res) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const PARENT_EMAIL = 'joe@josephcapra.com';
  const FROM_EMAIL = 'joe@josephcapra.com';

  if (!SENDGRID_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    // In a real implementation, we'd fetch progress from a database
    // For now, generate a sample report

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);

    const report = {
      streak: 3,
      essaysStarted: 2,
      essaysComplete: 0,
      scholarshipsTracked: 3,
      goalsCompleted: 1,
      totalGoals: 3,
      upcomingDeadlines: [
        { name: "VFW Voice of Democracy", date: "Oct 31, 2026", daysLeft: 69 }
      ]
    };

    const htmlContent = `
      <div style="font-family: 'Nunito', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 30px; border-radius: 16px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Jasmine's Weekly Progress</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">Week of ${weekStart.toLocaleDateString()}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 20px 0;">
          <div style="background: #fef3c7; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 2rem;">🔥</div>
            <div style="font-size: 2rem; font-weight: 800; color: #92400e;">${report.streak}</div>
            <div style="font-size: 0.8rem; color: #92400e;">Day Streak</div>
          </div>
          <div style="background: #ede9fe; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 2rem;">📝</div>
            <div style="font-size: 2rem; font-weight: 800; color: #5b21b6;">${report.essaysStarted}</div>
            <div style="font-size: 0.8rem; color: #5b21b6;">Essays In Progress</div>
          </div>
          <div style="background: #d1fae5; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 2rem;">🎯</div>
            <div style="font-size: 2rem; font-weight: 800; color: #065f46;">${report.goalsCompleted}/${report.totalGoals}</div>
            <div style="font-size: 0.8rem; color: #065f46;">Goals Completed</div>
          </div>
          <div style="background: #dbeafe; padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 2rem;">🎓</div>
            <div style="font-size: 2rem; font-weight: 800; color: #1e40af;">${report.scholarshipsTracked}</div>
            <div style="font-size: 0.8rem; color: #1e40af;">Scholarships Tracked</div>
          </div>
        </div>

        ${report.upcomingDeadlines.length > 0 ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
          <div style="font-weight: 700; color: #991b1b; margin-bottom: 8px;">⏰ Upcoming Deadlines</div>
          ${report.upcomingDeadlines.map(d => `
            <div style="color: #7f1d1d; font-size: 0.9rem;">${d.name}: ${d.date} (${d.daysLeft} days)</div>
          `).join('')}
        </div>
        ` : ''}

        <div style="background: linear-gradient(135deg, #f59e0b, #fbbf24); padding: 20px; border-radius: 16px; color: #78350f; margin-bottom: 20px;">
          <p style="font-weight: 800; margin: 0 0 8px;">💜 Proud Parent Tip</p>
          <p style="margin: 0;">Consider sending Jasmine an encouraging message this week! A simple "We believe in you!" can boost her motivation.</p>
        </div>

        <div style="text-align: center;">
          <a href="https://paradiserealtyfla.app/jasmine/parents.html" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #ec4899); color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 700;">
            View Full Dashboard
          </a>
        </div>

        <p style="text-align: center; color: #6b7280; font-size: 0.75rem; margin-top: 24px;">
          Sent from Jasmine's Scholarship Hub 🌟<br>
          <a href="https://paradiserealtyfla.app/jasmine/unsubscribe" style="color: #6b7280;">Unsubscribe</a>
        </p>
      </div>
    `;

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: PARENT_EMAIL }] }],
        from: { email: FROM_EMAIL, name: "Jasmine's Scholarship Hub" },
        subject: `Jasmine's Weekly Progress Report 🌟`,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid error: ${response.status} ${errorText}`);
    }

    return res.status(200).json({ success: true, message: 'Weekly report sent!' });

  } catch (error) {
    console.error('Weekly report error:', error);
    return res.status(500).json({ error: 'Failed to send report', details: error.message });
  }
}
