-- Statuts metier : new, preparing, ready, collected, cancelled, expired
-- Statut technique interne : draft_google_form
begin;

alter table public.orders drop constraint if exists orders_status_check;

update public.orders
set status = case
    when status is null or btrim(status) = '' then 'new'
    when lower(btrim(status)) in ('new','nouveau','en_attente') then 'new'
    when lower(btrim(status)) in ('preparing','preparation','préparation') then 'preparing'
    when lower(btrim(status)) in ('ready','pret','prêt','prete','prête','notified','notifie','notifié') then 'ready'
    when lower(btrim(status)) in ('collected','recupere','récupéré') then 'collected'
    when lower(btrim(status)) in ('cancelled','annule','annulé') then 'cancelled'
    when lower(btrim(status)) in ('expired','expire','expiré') then 'expired'
    when lower(btrim(status)) = 'draft_google_form' then 'draft_google_form'
    else 'new'
end;

alter table public.orders alter column status set default 'new';
alter table public.orders alter column status set not null;

alter table public.orders
add constraint orders_status_check
check (status in ('new','preparing','ready','collected','cancelled','expired','draft_google_form'));

do $$
begin
    if to_regclass('public.order_history') is not null then
        update public.order_history
        set status = case
            when status is null or btrim(status) = '' then 'new'
            when lower(btrim(status)) in ('new','nouveau','en_attente') then 'new'
            when lower(btrim(status)) in ('preparing','preparation','préparation') then 'preparing'
            when lower(btrim(status)) in ('ready','pret','prêt','prete','prête','notified','notifie','notifié') then 'ready'
            when lower(btrim(status)) in ('collected','recupere','récupéré') then 'collected'
            when lower(btrim(status)) in ('cancelled','annule','annulé') then 'cancelled'
            when lower(btrim(status)) in ('expired','expire','expiré') then 'expired'
            else 'new'
        end;
    end if;
end $$;

-- Noms bilingues des écoles et niveaux
alter table public.schools add column if not exists name_ar text;
alter table public.school_levels add column if not exists name_ar text;
alter table public.school_levels add column if not exists cycle text;
alter table public.school_levels drop constraint if exists school_levels_cycle_check;
alter table public.school_levels add constraint school_levels_cycle_check
check (cycle is null or cycle in ('prescolaire','primaire','college','lycee','autre'));
alter table public.school_lists add column if not exists school_name_ar text;
alter table public.school_lists add column if not exists level_ar text;

update public.school_lists sl
set school_name_ar = s.name_ar
from public.schools s
where sl.school_name = s.name and s.name_ar is not null
  and (sl.school_name_ar is null or btrim(sl.school_name_ar) = '');

update public.school_lists sl
set level_ar = l.name_ar
from public.school_levels l
where sl.level = l.name and l.name_ar is not null
  and (sl.level_ar is null or btrim(sl.level_ar) = '');

commit;

-- Doit retourner zero ligne.
select id, numero_commande, status
from public.orders
where status not in ('new','preparing','ready','collected','cancelled','expired','draft_google_form');

-- Adresse arabe configurable depuis l'administration.
-- La valeur vide est créée uniquement si la clé n'existe pas déjà.
insert into public.site_settings (key, value)
values ('contact_address_ar', '')
on conflict (key) do nothing;
