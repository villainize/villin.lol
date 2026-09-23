const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2];
const source = process.argv[3];
if (!root || !source) throw new Error('Usage: node build-archives.cjs SITE DATA_SOURCE');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const output = path.join(root, 'data', 'archives');
fs.mkdirSync(output, {recursive:true});
const manifest = {};
for (const kind of ['bursts', 'leader-skills', 'missions', 'dictionary']) {
  manifest[kind] = {};
  for (const server of ['gl', 'eu', 'jp', 'kr']) {
    const dir = server === 'gl' ? source : path.join(source, server);
    let files = kind === 'bursts' ? fs.readdirSync(dir).filter(f => /^bbs(?:_\d+)?\.json$/.test(f)) : [({'leader-skills':'ls.json', missions:'missions.json', dictionary:'dictionary.json'})[kind]];
    const merged = {};
    for (const file of files) if (fs.existsSync(path.join(dir,file))) Object.assign(merged, read(path.join(dir,file)));
    const rows = Object.entries(merged).map(([id, raw]) => ({id:String(raw.id || id), key:id, name:raw.name || id, desc:raw.desc || raw.en || '', raw}));
    if (!rows.length) continue;
    const folder = path.join(output, kind, server);
    fs.mkdirSync(folder, {recursive:true});
    // Keep the searchable index small; fetch source records only when opened.
    const index = rows.map((row,i) => {
      const chunk = Math.floor(i / 250);
      if (i % 250 === 0) fs.writeFileSync(path.join(folder, chunk+'.json'), JSON.stringify(rows.slice(i,i+250)));
      return {id:row.id, key:row.key, name:row.name, desc:row.desc, chunk, area:row.raw.area || '', dungeon:row.raw.dungeon || ''};
    });
    fs.writeFileSync(path.join(folder,'index.json'), JSON.stringify(index));
    manifest[kind][server] = rows.length;
  }
}
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2));
console.log(manifest);
