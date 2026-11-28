-- Manual da marca (design_projects kind='marca') ligado a um perfil: quem tem acesso ao perfil
-- (ig_can) pode ler, só leitura. Editar e apagar continuam só com o dono.
drop policy if exists design_marca_perfil_select on public.design_projects;
create policy design_marca_perfil_select on public.design_projects for select to authenticated
  using (
    kind = 'marca' and archived_at is null
    and (data->>'perfil_id') ~ '^[0-9a-fA-F-]{36}$'
    and public.ig_can((data->>'perfil_id')::uuid)
  );
