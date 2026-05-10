create policy "public read pix-media"
  on storage.objects for select
  using ( bucket_id = 'pix-media' );
