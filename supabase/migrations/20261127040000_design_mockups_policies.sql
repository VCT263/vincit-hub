-- Auditoria de segurança (27/11): qualquer usuário logado podia editar todos os mockups e trocar os arquivos do bucket.
-- Ler continua liberado (é um catálogo compartilhado); editar fica com quem criou ou com o superadmin.
alter policy "design_mockups_update" on public.design_mockups
  using (created_by = auth.uid() or (select public.is_superadmin()))
  with check (created_by = auth.uid() or (select public.is_superadmin()));
alter policy "design_mockups_obj_update" on storage.objects
  using (bucket_id = 'design-mockups' and (owner = auth.uid() or (select public.is_superadmin())));
