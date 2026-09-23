const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const missionRoot = path.join(siteRoot, 'data', 'archives', 'missions');
const outputFile = path.join(missionRoot, 'wiki.json');
const api = 'https://bravefrontierglobal.fandom.com/api.php';
const refresh = process.argv.includes('--refresh');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const wikiLinks = value => [...String(value || '').matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)].map(match => (match[2] || match[1]).trim());
const clean = value => String(value || '').replace(/<!--[^]*?-->/g, '').replace(/''+/g, '').trim();
const wikiText = value => clean(String(value || '').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1'));
const listValues = value => [...new Set(String(value || '').split(/\r?\n/).map(line => wikiText(line.replace(/^\s*[#*]+\s*/, '')).trim()).filter(Boolean))];

function parseParams(body) {
  const params = {};
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\s*\|\s*([^=]+?)\s*=\s*([\s\S]*)$/);
    if (match) params[match[1].trim().toLowerCase()] = clean(match[2]);
  }
  return params;
}

function parseWikitext(title, text) {
  const quests = [];
  for (const match of text.matchAll(/\{\{Quest\s*\n([\s\S]*?)\}\}/gi)) {
    const p = parseParams(match[1]);
    if (!p.quest) continue;
    const bosses = [];
    for (let index = 1; index <= 5; index += 1) {
      if (!p[`boss${index}`]) continue;
      bosses.push({id: p[`boss${index}`], hp: p[`boss${index}hp`] || '', name: p.bossname || ''});
    }
    quests.push({
      name: p.quest,
      energy: p.energy || '',
      battles: p.battles || '',
      exp: p.exp || '',
      expPerEnergy: p.energy && p.exp ? `${(Number(p.exp) / Number(p.energy)).toFixed(2).replace(/\.00$/, '')}${p.expbest ? ` ${p.expbest}` : ''}` : '',
      bosses,
      notes: listValues(p.notes),
      drops: listValues(p.drops),
      captures: Array.from({length: 5}, (_, i) => p[`capture${i + 1}`]).filter(Boolean).flatMap(listValues)
    });
  }
  const footer = text.match(/\{\{Zone:Footer\s*\n([\s\S]*?)\}\}/i);
  const zone = footer ? parseParams(footer[1]) : {};
  return {
    title: clean(title),
    quests,
    notes: listValues(zone.notes),
    monsters: listValues(zone.units),
    drops: listValues([zone.drops, zone.dropsrare].filter(Boolean).join(', ')),
    source: `https://bravefrontierglobal.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
  };
}

async function fetchPages(titles) {
  const params = new URLSearchParams({action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', format: 'json', formatversion: '2', titles: titles.join('|')});
  const response = await fetch(`${api}?${params}`);
  if (!response.ok) throw new Error(`Wiki request failed: ${response.status}`);
  const result = await response.json();
  return (result.query?.pages || []).map(page => ({title: page.title, text: page.revisions?.[0]?.slots?.main?.content || ''}));
}

function getDungeons() {
  const names = new Set();
  for (const server of fs.readdirSync(missionRoot)) {
    const dir = path.join(missionRoot, server);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir).filter(name => name === 'index.json')) {
      for (const row of readJson(path.join(dir, file))) if (row.dungeon) names.add(row.dungeon);
    }
  }
  return [...names];
}

async function main() {
  const titles = getDungeons();
  let previous = {};
  if (fs.existsSync(outputFile)) previous = readJson(outputFile);
  const missing = titles.filter(title => refresh || !previous[normalize(title)]);
  console.log(`Wiki zones: ${titles.length}; fetching ${missing.length}`);
  for (let index = 0; index < missing.length; index += 50) {
    const batch = missing.slice(index, index + 50);
    const pages = await fetchPages(batch);
    for (const page of pages) previous[normalize(page.title)] = parseWikitext(page.title, page.text);
    for (const title of batch) if (!previous[normalize(title)]) previous[normalize(title)] = {title, quests: [], notes: [], monsters: [], drops: [], source: `https://bravefrontierglobal.fandom.com/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`};
    fs.writeFileSync(outputFile, JSON.stringify(previous));
    console.log(`${Math.min(index + 50, missing.length)}/${missing.length}`);
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  console.log(`Saved ${Object.keys(previous).length} wiki zones to ${outputFile}`);
}

main().catch(error => { console.error(error); process.exit(1); });
