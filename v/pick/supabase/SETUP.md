# Pick & Play cloud setup

Project: https://dtzzacrpqnintdcznnqn.supabase.co

1. Open this project's Supabase SQL Editor. Run all of `pickplay-setup.sql`.
2. Keep the project's existing letters Auth settings and email templates unchanged. Email/password sign-in must be enabled. If email confirmation is enabled, users confirm their email and then return to Pick & Play to sign in manually.
3. Refresh Pick & Play. Open **Account & cloud lists**, sign in, then click **Enable Pick & Play cloud lists**.
4. Save the current list as a cloud copy. On another device, sign in, enable cloud lists, and import a copy. This is explicit backup/import, not automatic sync or live multiplayer.

Only `pickplay_members` and `pickplay_lists` are created. No letters tables, functions, policies, Auth triggers, or global Auth settings are changed. Each user can read only their own Pick & Play rows. Membership is an explicit, self-service opt-in, not an administrator approval gate.

The browser uses its own `pickplay-auth-v1` session key and local-scope logout. Underlying Supabase identities, passwords, email confirmation settings and Auth triggers are shared project-wide. Existing Auth triggers might run when a Pick & Play user registers. This setup cannot guarantee isolation from existing letters policies: a shared authenticated identity has whatever access those policies already grant. Full identity isolation needs another project, or a separately authorized review of both apps' access policies.

The publishable key is intended for browser use; protection comes from row-level security. It cannot create tables. Never add a service-role or secret key to frontend files.

Local lists remain on the device after sign-out, including imported copies. Cloud lists are cleared from the panel on account changes. No local lists are automatically uploaded to another account.

Before production, verify with two real test accounts: A saves a cloud copy; B cannot read or delete A's rows via the API; anonymous access fails. These live tests require the SQL to be applied first.

References: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/auth/passwords
