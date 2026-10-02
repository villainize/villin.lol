-- Run after pickplay-setup.sql. All game rules run in PostgreSQL.
-- The room table is private: browsers can only call the checked RPCs below.
begin;
create table if not exists public.pickplay_rooms (
 id uuid primary key default gen_random_uuid(),
 host_id uuid not null references auth.users(id) on delete cascade,
 state jsonb not null,
 revision integer not null default 0,
 expires_at timestamptz not null default now()+interval '1 day'
);
alter table public.pickplay_rooms enable row level security;
revoke all on public.pickplay_rooms from public, anon, authenticated;

create or replace function public.pickplay_room_view(r public.pickplay_rooms)
returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('id',r.id,'host_id',r.host_id,'revision',r.revision,'expires_at',r.expires_at,'state',r.state-'secret');
$$;

create or replace function public.pickplay_checkers_moves(s jsonb)
returns jsonb language plpgsql immutable set search_path=public as $$
declare b jsonb:=s->'board'; moves jsonb:='[]'; jumps jsonb:='[]'; i int; r int;c int;dr int;dc int;rr int;cc int;j int;k int;piece int; side int:=(s->>'turn')::int;forced int:=coalesce((s->>'forced')::int,-1);
begin
 for i in 0..63 loop
  piece:=(b->>i)::int;
  if piece=0 or (side=0 and piece<0) or (side=1 and piece>0) or (forced>=0 and forced<>i) then continue;end if;
  r:=i/8;c:=i%8;
  foreach dr in array array[-1,1] loop
   if abs(piece)=1 and ((side=0 and dr=1) or (side=1 and dr=-1)) then continue;end if;
   foreach dc in array array[-1,1] loop
    rr:=r+dr;cc:=c+dc;if rr<0 or rr>7 or cc<0 or cc>7 then continue;end if;j:=rr*8+cc;
    if (b->>j)::int=0 and forced<0 then moves:=moves||jsonb_build_array(jsonb_build_object('from',i,'to',j));
    elsif (b->>j)::int*piece<0 then
     rr:=rr+dr;cc:=cc+dc;
     if rr>=0 and rr<8 and cc>=0 and cc<8 then k:=rr*8+cc;
      if (b->>k)::int=0 then jumps:=jumps||jsonb_build_array(jsonb_build_object('from',i,'to',k,'capture',j));end if;
     end if;
    end if;
   end loop;
  end loop;
 end loop;
 return case when jsonb_array_length(jumps)>0 then jumps else moves end;
end $$;

create or replace function public.pickplay_next_match(s jsonb, replay boolean default false)
returns jsonb language plpgsql immutable set search_path=public as $$
declare q jsonb:=s->'queue'; b jsonb:='[]'; i int;r int;
begin
 if not replay then
  if jsonb_array_length(q)=1 then return s||jsonb_build_object('phase','choose','winner',q->>0,'secret','{}'::jsonb,'submitted','[]'::jsonb);end if;
  s:=s||jsonb_build_object('pair',jsonb_build_array(q->0,q->1),'queue',q-0-0);
 end if;
 s:=s||jsonb_build_object('phase','playing','turn',0,'secret','{}'::jsonb,'submitted','[]'::jsonb,'forced',-1,'quiet',0,'positions','{}'::jsonb);
 if s->>'mode'='tictactoe' then s:=s||jsonb_build_object('board',jsonb_build_array(0,0,0,0,0,0,0,0,0));
 elsif s->>'mode'='checkers' then
  for i in 0..63 loop r:=i/8;b:=b||to_jsonb(case when (r+i%8)%2=0 then 0 when r<3 then -1 when r>4 then 1 else 0 end);end loop;
  s:=s||jsonb_build_object('board',b);s:=s||jsonb_build_object('legal',public.pickplay_checkers_moves(s));
 end if;
 return s;
end $$;

create or replace function public.pickplay_room_create(p_title text,p_name text,p_items jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.pickplay_rooms;
begin
 if auth.uid() is null then raise exception 'Sign in first.';end if;
 if p_title is null or length(trim(p_title)) not between 1 and 32 then raise exception 'Use a title of 1–32 characters.';end if;
 if p_name is null or length(trim(p_name)) not between 1 and 24 then raise exception 'Use a name of 1–24 characters.';end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'A list is required.';end if;
 if jsonb_array_length(p_items) not between 0 and 100 then raise exception 'Use 0–100 items for an online room.';end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where jsonb_typeof(x)<>'string' or length(x#>>'{}') not between 1 and 48) then raise exception 'Items must be 1–48 characters.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.pickplay_rooms where host_id=auth.uid() and expires_at>now() and state->>'phase'<>'closed')>=5 then raise exception 'Close an existing room first (maximum 5 active rooms).';end if;
 insert into public.pickplay_rooms(host_id,state) values(auth.uid(),jsonb_build_object('phase','lobby','title',trim(p_title),'items',p_items,'players',jsonb_build_array(jsonb_build_object('id',auth.uid(),'name',trim(p_name))),'round',0)) returning * into r;
 return public.pickplay_room_view(r);
end $$;

create or replace function public.pickplay_room_join(p_room uuid,p_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.pickplay_rooms;
begin
 if auth.uid() is null then raise exception 'Sign in first.';end if;
 select * into r from public.pickplay_rooms where id=p_room and expires_at>now() for update;
 if not found or r.state->>'phase'='closed' then raise exception 'Room is closed, expired, or the invite is invalid.';end if;
 if exists(select 1 from jsonb_array_elements(r.state->'players') x where x->>'id'=auth.uid()::text) then return public.pickplay_room_view(r);end if;
 if p_name is null or length(trim(p_name)) not between 1 and 24 then raise exception 'Use a name of 1–24 characters.';end if;
 if r.state->>'phase'<>'lobby' then raise exception 'Wait for the host to return to the lobby.';end if;
 if jsonb_array_length(r.state->'players')>=4 then raise exception 'Room is full (4 players).';end if;
 update public.pickplay_rooms set state=jsonb_set(state,'{players}',state->'players'||jsonb_build_array(jsonb_build_object('id',auth.uid(),'name',trim(p_name)))),revision=revision+1 where id=p_room returning * into r;
 return public.pickplay_room_view(r);
end $$;

create or replace function public.pickplay_room_get(p_room uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.pickplay_rooms;
begin
 select * into r from public.pickplay_rooms where id=p_room and expires_at>now();
 if not found or auth.uid() is null or not exists(select 1 from jsonb_array_elements(r.state->'players') x where x->>'id'=auth.uid()::text) then raise exception 'Room unavailable. Sign in and join with your invite.';end if;
 return public.pickplay_room_view(r);
end $$;

create or replace function public.pickplay_room_act(p_room uuid,p_revision integer,p_action text,p_value jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.pickplay_rooms;s jsonb; me text:=auth.uid()::text;m text; phase text;group_ids jsonb;leaders jsonb; rolls jsonb; guesses jsonb; b jsonb; legal jsonb; move jsonb; q jsonb; target int; v int;a int;d int;best int; idx int;side int;piece int;cap int;quiet int; poskey text;seen int;line int[]; who text;win text; ids text[]; crowned boolean:=false;
begin
 select * into r from public.pickplay_rooms where id=p_room and expires_at>now() for update;
 if not found or me is null or not exists(select 1 from jsonb_array_elements(r.state->'players') x where x->>'id'=me) then raise exception 'Room unavailable. Sign in and join first.';end if;
 if p_revision is null or p_revision<>r.revision then raise exception 'Room changed. Try that move again.';end if;
 s:=r.state;m:=s->>'mode';phase:=s->>'phase';
 if phase='closed' then raise exception 'Room closed.';end if;
 if p_action in ('start','lobby','close') then
  if r.host_id<>auth.uid() then raise exception 'Only the host can do that.';end if;
  if p_action='close' then s:=s||jsonb_build_object('phase','closed','secret','{}'::jsonb);
  elsif p_action='lobby' then s:=jsonb_build_object('phase','lobby','title',coalesce(s->>'title','Pick & Play room'),'players',s->'players','items',s->'items','round',s->'round');
  else
   if phase<>'lobby' then raise exception 'Return to the lobby first.';end if;
   if jsonb_array_length(s->'players')<2 then raise exception 'Wait for a friend to join.';end if;
   if jsonb_array_length(s->'items')<1 then raise exception 'Add at least one item to the list first.';end if;
   m:=p_value->>'mode';if m is null or m not in ('jar','wheel','dice','coin','rps','number','tictactoe','checkers') then raise exception 'Unknown game.';end if;
   select jsonb_agg(x->'id') into group_ids from jsonb_array_elements(s->'players') x;
   s:=s||jsonb_build_object('mode',m,'phase','playing','round',coalesce((s->>'round')::int,0)+1,'group',group_ids,'submitted','[]'::jsonb,'secret','{}'::jsonb,'rolls','{}'::jsonb);
   if m in ('jar','wheel') then idx:=floor(random()*jsonb_array_length(s->'items'));s:=s||jsonb_build_object('phase','result','selected',s->'items'->idx);
   elsif m='coin' then
    if jsonb_array_length(group_ids)<>2 then raise exception 'Coin flip is Player 1 vs Player 2. Use a two-player room.';end if;
    idx:=floor(random()*2);s:=s||jsonb_build_object('phase','choose','winner',group_ids->>idx,'face',case when idx=0 then 'Heads' else 'Tails' end);
   elsif m='number' then s:=s||jsonb_build_object('secret',jsonb_build_object('target',1+floor(random()*100)::int,'guesses','{}'::jsonb));
   elsif m in ('rps','tictactoe','checkers') then s:=public.pickplay_next_match(s||jsonb_build_object('queue',group_ids));
   end if;
  end if;
 elsif p_action='leave' then
  if phase<>'lobby' then raise exception 'Ask the host to return to the lobby before leaving.';end if;
  if r.host_id=auth.uid() then s:=s||jsonb_build_object('phase','closed');
  else select coalesce(jsonb_agg(x),'[]') into group_ids from jsonb_array_elements(s->'players') x where x->>'id'<>me;s:=jsonb_set(s,'{players}',group_ids);end if;
 elsif p_action='add' then
  if phase<>'lobby' then raise exception 'Add items in the lobby.';end if;
  who:=trim(p_value->>'item');if who is null or length(who) not between 1 and 48 or jsonb_array_length(s->'items')>=100 then raise exception 'Use 1–48 characters, maximum 100 items.';end if;
 if not (s->'items' ? who) then s:=jsonb_set(s,'{items}',s->'items'||to_jsonb(who));end if;
 elsif p_action='edit' then
  if phase<>'lobby' then raise exception 'Edit items in the lobby.';end if;
  idx:=(p_value->>'index')::int;who:=trim(p_value->>'item');
  if idx is null or idx<0 or idx>=jsonb_array_length(s->'items') or who is null or length(who) not between 1 and 48 then raise exception 'Invalid item edit.';end if;
  if (s->'items' ? who) and s->'items'->>idx<>who then raise exception 'That item is already on the list.';end if;
  s:=jsonb_set(s,array['items',idx::text],to_jsonb(who));
 elsif p_action='delete' then
  if phase<>'lobby' then raise exception 'Delete items in the lobby.';end if;
  idx:=(p_value->>'index')::int;if idx is null or idx<0 or idx>=jsonb_array_length(s->'items') then raise exception 'Invalid item deletion.';end if;
  s:=jsonb_set(s,'{items}',(s->'items')-idx);
 elsif p_action='choose' then
  if phase<>'choose' or s->>'winner'<>me then raise exception 'Only the winner can choose.';end if;
  idx:=(p_value->>'index')::int;if idx is null or idx<0 or idx>=jsonb_array_length(s->'items') then raise exception 'Invalid item.';end if;
  s:=s||jsonb_build_object('phase','result','selected',s->'items'->idx);
 elsif p_action='continue' then
  if phase='match_win' then s:=public.pickplay_next_match(s||jsonb_build_object('queue',s->'queue'||to_jsonb(s->>'match_winner')));
  elsif phase='match_tie' then s:=public.pickplay_next_match(s,true);
  elsif phase='dice_tie' then s:=s||jsonb_build_object('phase','playing','rolls','{}'::jsonb,'submitted','[]'::jsonb);
  elsif phase='number_tie' then s:=s||jsonb_build_object('phase','playing','submitted','[]'::jsonb,'secret',jsonb_build_object('target',1+floor(random()*100)::int,'guesses','{}'::jsonb));
  else raise exception 'There is no next round yet.';end if;
 elsif phase='playing' and m='dice' and p_action='roll' then
  if not(s->'group' ? me) or s->'submitted' ? me then raise exception 'You already rolled or are not in this tiebreaker.';end if;
  a:=1+floor(random()*6)::int;d:=1+floor(random()*6)::int;
  rolls:=s->'rolls'||jsonb_build_object(me,jsonb_build_array(a,d));s:=s||jsonb_build_object('rolls',rolls,'submitted',s->'submitted'||to_jsonb(me));
  if jsonb_array_length(s->'submitted')=jsonb_array_length(s->'group') then
   select max((value->>0)::int+(value->>1)::int) into best from jsonb_each(rolls);
   select jsonb_agg(key) into leaders from jsonb_each(rolls) where (value->>0)::int+(value->>1)::int=best;
   s:=s||case when jsonb_array_length(leaders)=1 then jsonb_build_object('phase','choose','winner',leaders->>0) else jsonb_build_object('phase','dice_tie','group',leaders) end;
  end if;
 elsif phase='playing' and m='number' and p_action='guess' then
  if not(s->'group' ? me) or s->'submitted' ? me then raise exception 'You already guessed or are not in this tiebreaker.';end if;
  v:=(p_value->>'number')::int;if v is null or v<1 or v>100 then raise exception 'Guess 1–100.';end if;
  guesses:=s->'secret'->'guesses'||jsonb_build_object(me,v);s:=jsonb_set(s,'{secret,guesses}',guesses)||jsonb_build_object('submitted',s->'submitted'||to_jsonb(me));
  if jsonb_array_length(s->'submitted')=jsonb_array_length(s->'group') then
   target:=(s->'secret'->>'target')::int;select min(abs(value::int-target)) into best from jsonb_each_text(guesses);
   select jsonb_agg(key) into leaders from jsonb_each_text(guesses) where abs(value::int-target)=best;
   s:=s||jsonb_build_object('guesses',guesses,'target',target,'secret','{}'::jsonb)||case when jsonb_array_length(leaders)=1 then jsonb_build_object('phase','choose','winner',leaders->>0) else jsonb_build_object('phase','number_tie','group',leaders) end;
  end if;
 elsif phase='playing' and m='rps' and p_action='hand' then
  if not(s->'pair' ? me) or s->'submitted' ? me then raise exception 'Wait for your match or the reveal.';end if;
  v:=(p_value->>'hand')::int;if v is null or v not between 0 and 2 then raise exception 'Invalid hand.';end if;
  s:=jsonb_set(s,array['secret',me],to_jsonb(v))||jsonb_build_object('submitted',s->'submitted'||to_jsonb(me));
  if jsonb_array_length(s->'submitted')=2 then
   a:=(s->'secret'->>(s->'pair'->>0))::int;d:=(s->'secret'->>(s->'pair'->>1))::int;
   s:=s||jsonb_build_object('hands',s->'secret','secret','{}'::jsonb,'phase',case when a=d then 'match_tie' else 'match_win' end);
   if a<>d then s:=s||jsonb_build_object('match_winner',s->'pair'->>(case when (a-d+3)%3=1 then 0 else 1 end));end if;
  end if;
 elsif phase='playing' and m in ('tictactoe','checkers') and p_action in ('move','resign') then
  side:=(s->>'turn')::int;
  if p_action='resign' then
   if not(s->'pair' ? me) then raise exception 'You are not in this match.';end if;
   win:=s->'pair'->>(case when s->'pair'->>0=me then 1 else 0 end);
  else
   if s->'pair'->>side<>me then raise exception 'Wait for your turn.';end if;
   b:=s->'board';idx:=(p_value->>'to')::int;
   if m='tictactoe' then
    if idx is null or idx not between 0 and 8 or (b->>idx)::int<>0 then raise exception 'Choose an empty square.';end if;
    b:=jsonb_set(b,array[idx::text],to_jsonb(side+1));s:=s||jsonb_build_object('board',b,'turn',1-side);
    foreach line slice 1 in array array[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]] loop
     if (b->>line[1])::int=side+1 and (b->>line[2])::int=side+1 and (b->>line[3])::int=side+1 then win:=me;end if;
    end loop;
    if win is null and not exists(select 1 from jsonb_array_elements_text(b) x where x='0') then s:=s||jsonb_build_object('phase','match_tie');end if;
   else
    a:=(p_value->>'from')::int;legal:=public.pickplay_checkers_moves(s);
    select x into move from jsonb_array_elements(legal) x where (x->>'from')::int=a and (x->>'to')::int=idx limit 1;
    if move is null then raise exception 'Illegal move. Captures are mandatory.';end if;
    piece:=(b->>a)::int;b:=jsonb_set(b,array[a::text],'0');cap:=(move->>'capture')::int;
    if cap is not null then b:=jsonb_set(b,array[cap::text],'0');end if;
    if abs(piece)=1 and ((side=0 and idx/8=0) or (side=1 and idx/8=7)) then piece:=piece*2;crowned:=true;end if;
    b:=jsonb_set(b,array[idx::text],to_jsonb(piece));quiet:=case when cap is not null or crowned then 0 else (s->>'quiet')::int+1 end;
    s:=s||jsonb_build_object('board',b,'quiet',quiet,'forced',case when cap is not null and not crowned then idx else -1 end);
    if cap is not null and not crowned and jsonb_array_length(public.pickplay_checkers_moves(s))>0 then s:=s||jsonb_build_object('legal',public.pickplay_checkers_moves(s));
    else
     s:=s||jsonb_build_object('turn',1-side,'forced',-1);legal:=public.pickplay_checkers_moves(s);s:=s||jsonb_build_object('legal',legal);
     if jsonb_array_length(legal)=0 then win:=me;
     else
      poskey:=md5(b::text||(1-side)::text);seen:=coalesce((s->'positions'->>poskey)::int,0)+1;s:=jsonb_set(s,array['positions',poskey],to_jsonb(seen));
      if quiet>=80 or seen>=3 then s:=s||jsonb_build_object('phase','match_tie');end if;
     end if;
    end if;
   end if;
  end if;
  if win is not null then s:=s||jsonb_build_object('phase','match_win','match_winner',win);end if;
 else raise exception 'That action is not available now.';
 end if;
 update public.pickplay_rooms set state=s,revision=revision+1 where id=p_room returning * into r;
 return public.pickplay_room_view(r);
end $$;

revoke all on function public.pickplay_room_view(public.pickplay_rooms),public.pickplay_checkers_moves(jsonb),public.pickplay_next_match(jsonb,boolean) from public,anon,authenticated;
revoke all on function public.pickplay_room_create(text,text,jsonb),public.pickplay_room_join(uuid,text),public.pickplay_room_get(uuid),public.pickplay_room_act(uuid,integer,text,jsonb) from public,anon;
grant execute on function public.pickplay_room_create(text,text,jsonb),public.pickplay_room_join(uuid,text),public.pickplay_room_get(uuid),public.pickplay_room_act(uuid,integer,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
