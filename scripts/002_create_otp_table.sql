CREATE TABLE IF NOT EXISTS public.otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '15 minutes',
  verified BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_create_otp" ON public.otp_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "anyone_can_read_otp" ON public.otp_sessions FOR SELECT USING (true);
CREATE POLICY "anyone_can_update_otp" ON public.otp_sessions FOR UPDATE USING (true);

CREATE INDEX idx_otp_email_code ON public.otp_sessions(email, code);
CREATE INDEX idx_otp_expires ON public.otp_sessions(expires_at);
