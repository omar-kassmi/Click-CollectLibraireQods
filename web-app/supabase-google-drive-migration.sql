-- Migration Google Drive / Google Forms pour les commandes photo
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_drive_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_drive_file_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS upload_completed boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_orders_upload_completed ON public.orders(upload_completed);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
