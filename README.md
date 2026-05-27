# villin.lol

Static GitHub Pages app for Supabase-backed user profiles.

## Routes

- `/` landing page
- `/login` login page
- `/register` register page
- `/studio` profile editor
- `/{username}` public profile route like `villin.lol/mercy`

Existing project folders under `/v/` stay intact.

## Supabase setup

1. Open [`supabase-setup.sql`](./supabase-setup.sql) and run it in the Supabase SQL editor.
2. Copy your public anon key from the Supabase project settings.
3. Paste it into [`app-config.js`](./app-config.js) as `SUPABASE_ANON_KEY`.
4. Deploy the repo to GitHub Pages.

## Reserved usernames

- `yugioh`
- `gs`
- `bf`
- `bf_stories`
- `d.o.t.t`
- `v`
- `login`
- `register`
- `studio`
- `auth`

## Notes

- This version stores avatar and background uploads as data URLs directly in the profile row for simplicity.
- A future improvement would be moving media uploads into Supabase Storage.
