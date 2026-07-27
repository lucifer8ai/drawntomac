-- Add Noida, Visakhapatnam, North Goa, South Goa to India cities
INSERT INTO public.locations (country, city) VALUES
  ('India', 'Noida'),
  ('India', 'Visakhapatnam'),
  ('India', 'North Goa'),
  ('India', 'South Goa')
ON CONFLICT DO NOTHING;
