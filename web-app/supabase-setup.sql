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

commit;

-- Doit retourner zero ligne.
select id, numero_commande, status
from public.orders
where status not in ('new','preparing','ready','collected','cancelled','expired','draft_google_form');
