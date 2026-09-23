# BF Database

Run `node server.js`, then open http://127.0.0.1:8792. Requires Node.js; no npm install or build is needed to run the site. Runtime datasets, art, and archive details are bundled locally. Some optional character portraits retain remote fallback URLs.

## Sections

Units, items, extra skills, bursts, leader skills, missions, dictionary, squads, and compare. Characters remain optional in Settings. Interface size and preferences persist in the browser. Squads support six slots, leader assignment, saved selection and base stat totals; compare supports four units and skill details. These tools do not simulate combat or calculate combined skill bonuses.

Archives use the existing local snapshot of https://github.com/cheahjs/bravefrontier_data. GL/EU/JP/KR coverage varies by category. The dictionary snapshot contains GL translations. This is not a live data feed.

Imported totals: 66,741 bursts, 4,859 leader skills, 7,171 missions, and 104,893 dictionary entries. Original catalog: 7,070 units and 4,230 items. Artwork is not complete: 527 unit thumbnail references, 529 full-art references, and 50 item references lack matching files (counts include server variants). The UI falls back to available unit art or placeholders.

Regenerate archives with `node tools/build-archives.cjs . ../bravefrontier-data-source`. Existing catalog and character builders are retained in `tools/`.

Mission wiki enrichment is generated with `node tools/enrich-mission-wiki.cjs .`. It uses the Fandom MediaWiki API, stores the result in `data/archives/missions/wiki.json`, and displays the source link on each mission detail page. The current snapshot checked 1,913 dungeon names; 266 have structured quest tables and 62 have zone notes. Some newer or internal mission names do not have matching wiki pages and remain available from the local mission dataset without wiki enrichment.

Navigation and feature scope are inspired by https://github.com/BluuArc/bf-mt. The added implementation is original; this is not a complete port of BF-MT. Game assets and data belong to their respective owners.

## Backup

Before the redesign, the complete original folder was copied to `../bf-db-backup-20260923`. Verified 36,991 files and 1,662,327,283 bytes. To preview the original, serve that backup folder with a static HTTP server. Keep the backup separate from this working version.
