const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'assets', 'data', 'map-pois.json');
const apiRoot = 'https://json.tarkov.dev/regular';
const mapAliases = {
  customs: 'customs', factory: 'factory', 'ground-zero': 'groundzero',
  'ground-zero-21': 'groundzero', icebreaker: 'icebreaker', interchange: 'interchange',
  'the-lab': 'lab', lighthouse: 'lighthouse', 'the-labyrinth': 'labyrinth',
  reserve: 'reserve', shoreline: 'shoreline', 'streets-of-tarkov': 'streetsoftarkov',
  terminal: 'terminal', woods: 'woods'
};
const geometryAliases = {
  customs: 'customs', factory: 'factory', groundzero: 'groundzero', icebreaker: 'icebreaker',
  interchange: 'interchange', lab: 'lab', lighthouse: 'lighthouse', labyrinth: 'labyrinth',
  reserve: 'reserve', shoreline: 'shoreline', streetsoftarkov: 'streetsoftarkov', terminal: 'terminal', woods: 'woods'
};

async function getJson(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'TarkovSideMap/1.2' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}
function translation(table, key, fallback = '') {
  if (!key) return fallback;
  return table?.[key] || fallback || String(key);
}
function pretty(value) {
  return String(value || '').replace(/^ex_[a-z0-9_-]+_/, '').replace(/_/g, ' ').replace(/\bpmc\b/gi, 'PMC').replace(/\bscav\b/gi, 'Scav').replace(/\bzb\b/gi, 'ZB').replace(/\b[a-z]/g, c => c.toUpperCase());
}
function projected(position, geometry) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.z)) return null;
  const bounds = geometry?.svg?.bounds;
  if (!bounds || bounds.length < 2) return null;
  const minX = Math.min(bounds[0][0], bounds[1][0]);
  const maxX = Math.max(bounds[0][0], bounds[1][0]);
  const minZ = Math.min(bounds[0][1], bounds[1][1]);
  const maxZ = Math.max(bounds[0][1], bounds[1][1]);
  if (maxX === minX || maxZ === minZ) return null;
  let x = (position.x - minX) / (maxX - minX);
  let y = (position.z - minZ) / (maxZ - minZ);
  switch (geometry.svg.coordinateRotation || 0) {
    case 90: [x, y] = [1 - y, 1 - x]; break;
    case 180: x = 1 - x; break;
    case 270: [x, y] = [1 - y, x]; break;
  }
  if (x < -0.08 || x > 1.08 || y < -0.08 || y > 1.08) return null;
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), game: { x: position.x, y: position.y, z: position.z } };
}
function shortId(value) { return value ? String(value).slice(-8) : ''; }
function list(value) { return Array.isArray(value) ? value : Object.values(value || {}); }
function positionsFromMap(raw) {
  const positions = [];
  for (const key of ['extracts', 'spawns', 'hazards', 'locks', 'lootContainers', 'lootLoose', 'switches', 'transits', 'btrStops', 'stationaryWeapons']) {
    for (const item of list(raw[key])) if (item?.position) positions.push(item.position);
  }
  for (const boss of raw.bosses || []) for (const location of boss.spawnLocations || []) positions.push(...(location.positions || []));
  return positions.filter(position => Number.isFinite(position.x) && Number.isFinite(position.z));
}

async function main() {
  const [mapsDoc, mapsEnDoc, tasksDoc, tasksEnDoc, itemsEnDoc, geometry] = await Promise.all([
    getJson(`${apiRoot}/maps`), getJson(`${apiRoot}/maps_en`),
    getJson(`${apiRoot}/tasks`), getJson(`${apiRoot}/tasks_en`),
    getJson(`${apiRoot}/items_en`),
    fs.readFile(path.join(root, 'assets', 'data', 'map-geometry.json'), 'utf8').then(JSON.parse)
  ]);
  const mapNames = mapsEnDoc.data || {};
  const taskNames = tasksEnDoc.data || {};
  const itemNames = itemsEnDoc.data || {};
  const mapsBySourceId = new Map();
  const output = { updated: new Date().toISOString(), source: 'Tarkov.dev JSON API', maps: {} };
  const add = (target, category, name, description, position, extra = {}) => {
    if (!target || !name) return;
    const p = projected(position, target.geometry);
    if (!p) return;
    target.points.push({ category, name: String(name), description: String(description || ''), x: p.x, y: p.y, game: p.game, ...extra });
  };
  for (const raw of Object.values(mapsDoc.data.maps || {})) {
    const key = mapAliases[raw.normalizedName];
    if (!key || !geometryAliases[key]) continue;
    if (!output.maps[key]) output.maps[key] = { points: [], geometryKey: geometryAliases[key] };
    const target = output.maps[key];
    target.geometry ||= structuredClone(geometry[geometryAliases[key]]);
    if (key === 'terminal' && !target.points.length) {
      const positions = positionsFromMap(raw);
      const xs = positions.map(position => position.x), zs = positions.map(position => position.z);
      const marginX = (Math.max(...xs) - Math.min(...xs)) * 0.06, marginZ = (Math.max(...zs) - Math.min(...zs)) * 0.06;
      target.geometry.svg.bounds = [[Math.min(...xs) - marginX, Math.min(...zs) - marginZ], [Math.max(...xs) + marginX, Math.max(...zs) + marginZ]];
    }
    mapsBySourceId.set(raw.id, key);
    const switchNames = new Map((raw.switches || []).map(item => [item.id, translation(mapNames, item.name, pretty(item.name))]));
    for (const [i, item] of (raw.extracts || []).entries()) {
      const name = translation(mapNames, item.name, pretty(item.name));
      const faction = item.faction && item.faction !== 'shared' ? `Faction: ${pretty(item.faction)}.` : 'Faction: PMC or Scav.';
      const switchIds = [...new Set([...(Array.isArray(item.switches) ? item.switches : []), ...(typeof item.switch === 'string' ? [item.switch] : [])])];
      const requirements = [];
      if (item.transferItem?.item) requirements.push(`Requires ${item.transferItem.count || 1} ${translation(itemNames, `${item.transferItem.item} Name`, `item ${shortId(item.transferItem.item)}`)}.`);
      if (item.switch) requirements.push(`Requires switch: ${switchNames.get(item.switch) || translation(mapNames, item.switch, pretty(item.switch))}.`);
      add(target, 'extracts', name, [faction, ...requirements].join(' '), item.position, { id: `${item.id || name}:${i}`, faction: item.faction || 'shared' });
    }
    for (const [i, spawn] of (raw.spawns || []).entries()) {
      const sides = (spawn.sides || []).map(pretty).join(', ');
      const kinds = (spawn.categories || []).map(pretty).join(', ');
      const name = (spawn.sides || []).includes('pmc') ? 'PMC Spawn' : (spawn.sides || []).includes('scav') ? 'Scav Spawn' : 'Spawn Point';
      add(target, 'spawns', name, [`Zone: ${translation(mapNames, spawn.zoneName, pretty(spawn.zoneName))}.`, sides && `Sides: ${sides}.`, kinds && `Type: ${kinds}.`].filter(Boolean).join(' '), spawn.position, { id: `spawn:${i}` });
    }
    for (const [i, boss] of (raw.bosses || []).entries()) {
      const bossName = translation(mapNames, boss.mob, pretty(boss.mob));
      for (const location of boss.spawnLocations || []) for (const [j, position] of (location.positions || []).entries()) {
        const chance = location.chance != null ? ` Location chance: ${Math.round(location.chance * 100)}%.` : '';
        add(target, 'bosses', `${bossName} Spawn`, `${translation(mapNames, location.name, pretty(location.name))}.${chance}`, position, { id: `boss:${i}:${j}` });
      }
    }
    for (const [i, item] of (raw.hazards || []).entries()) {
      const name = translation(mapNames, item.name || item.hazardType, pretty(item.hazardType || item.name));
      add(target, 'hazards', name, `Hazard: ${pretty(item.hazardType || 'hazard')}.`, item.position, { id: `hazard:${item.id || i}` });
    }
    for (const [i, item] of (raw.locks || []).entries()) {
      const keyName = translation(itemNames, `${item.key} Name`, item.key ? `key ${shortId(item.key)}` : 'key not specified');
      add(target, 'keys', 'Locked Door', [`Needs ${keyName}.`, item.needsPower ? 'Requires power.' : '', item.lockType ? `Lock type: ${pretty(item.lockType)}.` : ''].filter(Boolean).join(' '), item.position, { id: `lock:${item.id || i}` });
    }
    for (const [i, item] of (raw.lootContainers || []).entries()) {
      const name = translation(itemNames, `${item.lootContainer} Name`, 'Loot Container');
      add(target, 'loot', name, 'Loot container location.', item.position, { id: `loot:${i}` });
    }
    for (const [i, item] of (raw.lootLoose || []).entries()) {
      const names = (item.items || []).slice(0, 4).map(id => translation(itemNames, `${id} Name`, '')).filter(Boolean);
      add(target, 'loot', names[0] ? `Loose Loot · ${names[0]}` : 'Loose Loot', names.length ? `Possible items: ${names.join(', ')}${(item.items || []).length > names.length ? ', and more.' : '.'}` : 'Loose loot spawn.', item.position, { id: `loose:${i}` });
    }
    for (const [i, item] of (raw.switches || []).entries()) {
      add(target, 'switches', translation(mapNames, item.name, pretty(item.name)), item.switchType ? `Switch: ${pretty(item.switchType)}.` : 'Map switch.', item.position, { id: `switch:${item.id || i}` });
    }
    for (const [i, item] of (raw.transits || []).entries()) {
      add(target, 'transits', translation(mapNames, item.description, pretty(item.description) || 'Transit'), item.conditions ? translation(mapNames, item.conditions, pretty(item.conditions)) : 'Transit route to another location.', item.position, { id: `transit:${item.id || i}` });
    }
    for (const [i, item] of (raw.btrStops || []).entries()) {
      add(target, 'support', translation(mapNames, item.name, 'BTR Stop'), 'BTR service stop.', item.position, { id: `btr:${i}` });
    }
    for (const [i, item] of list(raw.stationaryWeapons).entries()) {
      add(target, 'support', translation(mapNames, item.name, 'Stationary Weapon'), 'Stationary weapon location.', item.position, { id: `weapon:${i}` });
    }
  }
  const taskMap = tasksDoc.data.tasks || {};
  for (const task of Object.values(taskMap)) {
    const taskName = translation(taskNames, `${task.id} name`, pretty(task.id));
    const trader = translation(taskNames, `${task.trader} Name`, pretty(task.trader));
    for (const objective of task.objectives || []) {
      const objectiveName = translation(taskNames, objective.id, objective.description || pretty(objective.type));
      for (const zone of objective.zones || []) {
        const mapKey = mapsBySourceId.get(zone.map);
        const target = output.maps[mapKey];
        if (!target || !zone.position) continue;
        add(target, 'quests', taskName, `${objectiveName}${objective.optional ? ' (optional).' : '.'} Trader: ${trader}.`, zone.position, { id: `quest:${task.id}:${objective.id}:${zone.id || ''}` });
      }
    }
  }
  for (const map of Object.values(output.maps)) {
    delete map.geometry;
    const seen = new Set();
    map.points = map.points.filter(point => {
      const key = `${point.category}|${point.name}|${point.x.toFixed(3)}|${point.y.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(output));
  const summary = Object.fromEntries(Object.entries(output.maps).map(([key, map]) => [key, map.points.length]));
  console.log(`Wrote ${Object.values(summary).reduce((a, b) => a + b, 0)} map points across ${Object.keys(summary).length} maps to ${path.relative(root, outputPath)}`);
  console.log(JSON.stringify(summary));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
