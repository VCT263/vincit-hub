-- Agendar publicações: só no perfil que a pessoa pode administrar (dona ou membro admin).
-- Antes a política olhava só owner_id, e o tique publicava com o token de qualquer account_id informado.
drop policy if exists scheduled_posts_owner on public.scheduled_posts;
create policy scheduled_posts_owner on public.scheduled_posts for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and public.ig_can_admin(account_id));
