-- Migration: Add broadcast/streaming fields to matches table
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS youtube_stream_key text,
  ADD COLUMN IF NOT EXISTS youtube_rtmp_url text DEFAULT 'rtmp://a.rtmp.youtube.com/live2',
  ADD COLUMN IF NOT EXISTS is_broadcasting boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS broadcast_room_id text,
  ADD COLUMN IF NOT EXISTS broadcast_started_at timestamptz;

-- Add RLS policy for broadcast fields (owner can update their own broadcast settings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'owner can update broadcast settings'
  ) THEN
    CREATE POLICY "owner can update broadcast settings" ON public.matches
      FOR UPDATE USING (
        user_id IN (
          SELECT id FROM public.users WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;
