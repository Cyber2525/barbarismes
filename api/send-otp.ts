import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email invalid' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();

  const { error: dbError } = await supabase.from('otp_sessions').insert({
    email,
    code,
    expires_at: expiresAt,
    verified: false
  });

  if (dbError) {
    return res.status(500).json({ error: dbError.message });
  }

  // Send email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Barbarismes <noreply@resend.dev>',
          to: email,
          subject: `El teu codi: ${code}`,
          html: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #b91c1c; margin-bottom: 20px;">Codi de verificacio</h2>
              <p style="color: #374151; margin-bottom: 16px;">El teu codi de 6 digits es:</p>
              <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 12px; padding: 20px; text-align: center;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #b91c1c;">${code}</span>
              </div>
              <p style="color: #6b7280; font-size: 14px; margin-top: 16px;">Aquest codi expira en 10 minuts.</p>
            </div>
          `
        })
      });
    } catch (e) {
      console.error('Email send error:', e);
    }
  }

  return res.status(200).json({ success: true });
}
