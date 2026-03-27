import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Missing email or code' });

  try {
    const result = await resend.emails.send({
      from: 'noreply@barbarismes.cat',
      to: email,
      subject: 'Codi de verificació - Barbarismes',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Codi de verificació</h2>
          <p>El teu codi de verificació és:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="letter-spacing: 8px; font-size: 36px; margin: 0; color: #dc2626;">${code}</h1>
          </div>
          <p>Aquest codi expirarà en 10 minuts.</p>
          <p>Si no has sol·licitat aquest codi, ignora aquest missatge.</p>
        </body>
        </html>
      `
    });

    if (result.error) {
      return res.status(400).json({ error: result.error.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
