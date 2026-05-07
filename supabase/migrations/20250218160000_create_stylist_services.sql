-- Migration: Create stylist_services junction table
-- This table links stylists with the services they can perform

CREATE TABLE IF NOT EXISTS stylist_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(stylist_id, service_id)
);

-- Enable RLS
ALTER TABLE stylist_services ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view stylist services for their own stylists
CREATE POLICY "Users can view their own stylist services"
    ON stylist_services FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM stylists s
            WHERE s.id = stylist_services.stylist_id
            AND s.user_id = auth.uid()
        )
    );

-- Policy: Users can insert stylist services for their own stylists
CREATE POLICY "Users can create their own stylist services"
    ON stylist_services FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stylists s
            WHERE s.id = stylist_services.stylist_id
            AND s.user_id = auth.uid()
        )
    );

-- Policy: Users can delete their own stylist services
CREATE POLICY "Users can delete their own stylist services"
    ON stylist_services FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM stylists s
            WHERE s.id = stylist_services.stylist_id
            AND s.user_id = auth.uid()
        )
    );

-- Index for faster lookups
CREATE INDEX idx_stylist_services_stylist_id ON stylist_services(stylist_id);
CREATE INDEX idx_stylist_services_service_id ON stylist_services(service_id);
