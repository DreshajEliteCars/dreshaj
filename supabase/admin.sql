-- Aktivizo extension për UUID nëse nuk ekziston
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Krijimi i tabelës admins (nëse nuk ekziston)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    emri VARCHAR(100) NOT NULL,
    mbiemri VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shto një llogari testuese për Admin (për ta provuar login-in)
-- Mund të kyçesh me: admin@dreshaj.com / Admin123!
INSERT INTO admins (email, emri, mbiemri, password)
VALUES ('admin@dreshaj.com', 'Admin', 'Dreshaj', 'Admin123!')
ON CONFLICT (email) DO NOTHING;

-- 2. Krijimi i Storage Bucket për fotot e makinave të shitura ("sold_cars")
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sold_cars', 'sold_cars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Siguria dhe të Drejtat (RLS Policies) për Bucket-in "sold_cars"

-- Fshi politikat e vjetra nëse ekzistojnë (për të mos pasur errore gjatë ri-ekzekutimit)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;

-- Lejo që çdokush t'i shohë fotot (Publike, të nevojshme për t'u shfaqur në faqe)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'sold_cars');

-- Lejo ngarkimin e fotove në bucket ("sold_cars")
CREATE POLICY "Allow Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'sold_cars');

-- Lejo fshirjen e fotove nga bucket
CREATE POLICY "Allow Deletes" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'sold_cars');

-- Lejo zëvendësimin/përditësimin e fotove
CREATE POLICY "Allow Updates" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'sold_cars');





INSERT INTO admins (email, emri, mbiemri, password)
VALUES (
  'elton.mustafaj@universitetiaab.com',
  'Elton',
  'Mustafaj',
  '123456'
);