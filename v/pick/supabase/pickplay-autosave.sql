-- Run after pickplay-setup.sql. Only Pick & Play lists are affected.
begin;
create or replace function public.pickplay_list_save(p_id uuid,p_name text,p_items jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.';end if;
 if p_id is null or p_name is null or length(p_name) not between 1 and 32 then raise exception 'Invalid list name.';end if;
 if jsonb_typeof(p_items) is distinct from 'array' or octet_length(p_items::text)>1000000 then raise exception 'Invalid or oversized list.';end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x)<>'string' or length(x#>>'{}') not between 1 and 48) then raise exception 'Invalid list item.';end if;
 insert into public.pickplay_members(user_id) values(auth.uid()) on conflict do nothing;
 insert into public.pickplay_lists(id,owner_id,name,items) values(p_id,auth.uid(),p_name,p_items)
 on conflict(id) do update set name=excluded.name,items=excluded.items where pickplay_lists.owner_id=auth.uid();
 if not found then raise exception 'This list belongs to another account.';end if;
end $$;
revoke all on function public.pickplay_list_save(uuid,text,jsonb) from public,anon;
grant execute on function public.pickplay_list_save(uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
