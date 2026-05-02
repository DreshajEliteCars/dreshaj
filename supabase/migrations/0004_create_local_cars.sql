-- 1. Create the `local_cars` table
create table if not exists public.local_cars (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    image_url text not null,
    created_at timestamptz not null default now()
);

-- Enable RLS on the table
alter table public.local_cars enable row level security;

-- Allow public read access
create policy "local_cars are viewable by everyone"
    on public.local_cars for select
    using (true);

-- Allow authenticated users to insert
create policy "Authenticated users can insert local_cars"
    on public.local_cars for insert
    with check (auth.role() = 'authenticated');

-- Allow authenticated users to delete
create policy "Authenticated users can delete local_cars"
    on public.local_cars for delete
    using (auth.role() = 'authenticated');

-- Allow authenticated users to update
create policy "Authenticated users can update local_cars"
    on public.local_cars for update
    using (auth.role() = 'authenticated');


-- 2. Create the storage bucket for images
insert into storage.buckets (id, name, public) 
values ('local_car_images', 'local_car_images', true) 
on conflict (id) do nothing;

-- 3. Storage Policies
-- Public can read images
create policy "Public Access to local_car_images"
on storage.objects for select
using ( bucket_id = 'local_car_images' );

-- Authenticated users can insert images
create policy "Auth Insert to local_car_images"
on storage.objects for insert
with check ( bucket_id = 'local_car_images' and auth.role() = 'authenticated' );

-- Authenticated users can update images
create policy "Auth Update to local_car_images"
on storage.objects for update
with check ( bucket_id = 'local_car_images' and auth.role() = 'authenticated' );

-- Authenticated users can delete images
create policy "Auth Delete from local_car_images"
on storage.objects for delete
using ( bucket_id = 'local_car_images' and auth.role() = 'authenticated' );
