-- Create invitations table for team member invitations
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'member',
    token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending', -- pending, accepted, expired
    expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON public.invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view invitations for their organization
CREATE POLICY "Users can view their org invitations"
ON public.invitations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = invitations.org_id 
        AND profiles.id = auth.uid()
    )
);

-- Users can insert invitations for their organization
CREATE POLICY "Users can create invitations for their org"
ON public.invitations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = invitations.org_id 
        AND profiles.id = auth.uid()
    )
);

-- Users can update invitations for their organization
CREATE POLICY "Users can update their org invitations"
ON public.invitations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = invitations.org_id 
        AND profiles.id = auth.uid()
    )
);

-- Users can delete invitations for their organization
CREATE POLICY "Users can delete their org invitations"
ON public.invitations FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = invitations.org_id 
        AND profiles.id = auth.uid()
    )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_invitations_updated_at
    BEFORE UPDATE ON public.invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
