-- Create table for guest post submissions
CREATE TABLE public.guest_post_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.guest_post_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit a guest post (public form)
CREATE POLICY "Anyone can submit a guest post"
ON public.guest_post_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view submissions
CREATE POLICY "Only admins can view guest post submissions"
ON public.guest_post_submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update submissions
CREATE POLICY "Only admins can update guest post submissions"
ON public.guest_post_submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete submissions
CREATE POLICY "Only admins can delete guest post submissions"
ON public.guest_post_submissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_guest_post_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_guest_post_submissions_updated_at
BEFORE UPDATE ON public.guest_post_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_guest_post_submissions_updated_at();

-- Add index on email for potential lookups
CREATE INDEX idx_guest_post_submissions_email ON public.guest_post_submissions(email);

-- Add index on status for admin filtering
CREATE INDEX idx_guest_post_submissions_status ON public.guest_post_submissions(status);

-- Add index on created_at for sorting
CREATE INDEX idx_guest_post_submissions_created_at ON public.guest_post_submissions(created_at DESC);