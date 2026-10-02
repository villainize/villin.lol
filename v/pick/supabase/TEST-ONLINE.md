# Test Pick & Play with friends

## One-time database setup

In the existing Supabase project's **SQL Editor**, run `pickplay-setup.sql` if you have not already, then run **all of `pickplay-rooms.sql`**. Both scripts are repeatable. Neither modifies letters tables or policies.

The rooms script adds one private `pickplay_rooms` table and `pickplay_*` functions. Browser clients cannot read the underlying table. The functions check membership, host authority, turns, legal moves, room capacity, and revisions. Hidden guesses and hands stay in the database until reveal. No Realtime dashboard toggle is needed: rooms poll for updates about every two seconds.

## Test on this computer first

1. Open http://127.0.0.1:4173/ in your normal browser. Open it again in an incognito/private window or another browser profile.
2. Use **Account & cloud lists** to sign in with a different account in each window. Confirm new accounts by email if required by the existing project's Auth settings. Tabs in the same profile share the login, so use separate profiles.
3. In the first window, click **Invite friends · Online room**. Your current list can be empty.
4. Enter a room title and your display name, then click **Create room**. Click **Copy invite**.
5. Open that link in the second window. Enter a name, sign in, and click **Join room**. Both players should appear in both windows.
6. Either player can add, edit, or delete ideas in the lobby. Add at least one item before playing. The host picks a main game card and clicks **Start online game**. When connected to a room, the main play area is shared; it cannot start a separate local match. Other members wait for the host to start, then make moves from their own devices.
7. Try tic-tac-toe: only the player whose turn it is should be able to move. The winner selects an item. Both windows should display the same result.
8. Test dice (two dice each), hidden guesses, rock-paper-scissors, checkers, jar, wheel, and coin. Coin is two players only, with heads assigned to player 1 and tails to player 2. Other games support up to four; paired games use tournaments.
9. Refresh the friend's window and sign in if needed, then rejoin using the same invite. The match should resume from the database. The host does not need to keep the page open for moves already underway.
10. The host can return everyone to the lobby or close the room. Guests can leave in the lobby. Disconnect keeps your seat so you can rejoin. Rooms expire after 24 hours.

Use **Save shared list locally** to keep the group's ideas as a new saved list. Online results do not replace local game history. Rooms use snapshots; local list edits do not automatically change an ongoing room.

## Invite someone on another device

`127.0.0.1` and `localhost` mean the device opening the link. They cannot be used for a remote friend. Publish these files together to the same GitHub Pages folder:

- `index.html`
- `styles.css`, `games.css`, `theme.css`, `cloud.css`, `rooms.css`, `multiplayer-fix.css`
- `app.js`, `lists.js`, `games.js`, `theme.js`, `cloud.js`, `autosave.js`, `rooms.js`

Open the published HTTPS website, sign in, then create/copy the invite there. Use a new room for your first test. Supabase is already configured in `cloud.js`; the publishable key is safe to expose with the SQL permissions applied. Do not publish service-role keys or change the letters website's Auth settings.

## Verification performed by the development tests

`verify-rooms.cjs` executes the actual SQL using a disposable local PostgreSQL instance (PGlite). It checks all eight games, outsider rejection, mandatory turns, hidden moves, four-player limits, tournament advancement, and stale requests. It also drives two isolated Edge browser contexts through invite/join, alternating board moves, winner selection and reload/rejoin. The local test bridge replaces Supabase transport, so it does **not** prove that the migration is installed or working on the live project. Complete the manual two-account test above after applying the SQL.

The scripts `verify-games.cjs`, `verify-cloud.cjs`, and `verify-rooms.cjs` require Node, Edge, and the development-only dependencies `playwright` and `@electric-sql/pglite` installed under `%TEMP%\pick-play-browser-tests`. Run the local web server first. These dependencies are not needed by the published website.
