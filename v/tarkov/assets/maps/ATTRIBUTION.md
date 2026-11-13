# Map artwork credits

This personal, non-commercial map viewer bundles community-created map drawings. The map artwork is separate from the viewer code and is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 4.0 (CC BY-NC-SA 4.0).

- **Customs, Factory, Ground Zero, Interchange, The Lab, Lighthouse, Reserve, Shoreline, Streets of Tarkov, Terminal, Woods:** Escape from Tarkov SVG Maps Project by Shebuka and contributors, from [the-hideout/tarkov-dev-svg-maps](https://github.com/the-hideout/tarkov-dev-svg-maps). Used under CC BY-NC-SA 4.0. The SVG files are included unmodified.
- **Icebreaker:** map drawing by Re3mr, bundled through [KordMap](https://github.com/KalleLeskinen/KordMap). CC BY-NC-SA 4.0. The map SVG and raster drawing are included without modification.
- **The Labyrinth:** map drawing by Re3mr, bundled through [KordMap](https://github.com/KalleLeskinen/KordMap). CC BY-NC-SA 4.0. KordMap's reduced-layer version of the SVG and its raster drawing are included.

License text: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Source attributions and individual asset terms are also documented in `SOURCE-README.md` and the linked repositories.

Escape from Tarkov is a trademark of Battlestate Games. This is an unofficial community tool and is not endorsed by Battlestate Games.

## Map point data

Extract, spawn, boss, hazard, lock, loot, switch, transit, and quest point data is bundled from the public [Tarkov.dev JSON API](https://tarkov.dev/api) (`json.tarkov.dev`). The dataset is a local snapshot. The refresh script is `scripts/build-map-data.js` and the generated file is `assets/data/map-pois.json`.

The coordinate bounds and rotations used to place those points are based on the community [TarkovTracker map metadata](https://github.com/TarkovTracker/tarkovdata/blob/master/maps.json). The map point data can change as the game and community data are updated.
