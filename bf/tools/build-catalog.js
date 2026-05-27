const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const bfMtDataDir = path.join(workspaceRoot, 'bf-mt-source', 'public', 'static', 'bf-data');
const rawDataRoot = path.join(workspaceRoot, 'bravefrontier-data-source');
const targetDataFile = path.join(workspaceRoot, 'bf-db', 'data', 'catalog.js');
const targetDetailDir = path.join(workspaceRoot, 'bf-db', 'data', 'unit-details');
const targetItemDetailDir = path.join(workspaceRoot, 'bf-db', 'data', 'item-details');
const unitImageDir = path.join(workspaceRoot, 'bf-db', 'assets', 'images', 'units', 'img');
const itemImageDir = path.join(workspaceRoot, 'bf-db', 'assets', 'images', 'items', 'item');

const useRawData = fs.existsSync(path.join(rawDataRoot, 'info.json'));
const servers = useRawData ? ['gl', 'eu', 'jp', 'kr'] : ['gl', 'eu', 'jp'];
const elementNames = {
  fire: 'Fire',
  water: 'Water',
  earth: 'Earth',
  thunder: 'Thunder',
  light: 'Light',
  dark: 'Dark',
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadSplitData(type, server) {
  const merged = {};
  fs.readdirSync(bfMtDataDir)
    .filter((file) => file.startsWith(`${type}-${server}-`) && file.endsWith('.json'))
    .sort()
    .forEach((file) => Object.assign(merged, readJson(path.join(bfMtDataDir, file))));
  return merged;
}

function rawServerDir(server) {
  return server === 'gl' ? rawDataRoot : path.join(rawDataRoot, server);
}

function loadRawData(type, server) {
  const dir = rawServerDir(server);
  if (type === 'units') {
    return readJson(path.join(dir, 'info.json'));
  }

  const itemsFile = path.join(dir, 'items.json');
  const lightItemsFile = path.join(dir, 'items_light.json');
  return readJson(fs.existsSync(itemsFile) ? itemsFile : lightItemsFile);
}

function loadRawOptional(file, server) {
  const filePath = path.join(rawServerDir(server), file);
  return fs.existsSync(filePath) ? readJson(filePath) : {};
}

function loadItemDictionary(server) {
  const filePath = path.join(bfMtDataDir, `item-dictionary-${server}.json`);
  return fs.existsSync(filePath) ? readJson(filePath) : {};
}

function loadData(type, server) {
  return useRawData ? loadRawData(type, server) : loadSplitData(type, server);
}

function listFiles(dir) {
  return fs.existsSync(dir) ? new Set(fs.readdirSync(dir)) : new Set();
}

const unitFiles = listFiles(unitImageDir);
const itemFiles = listFiles(itemImageDir);

function firstExisting(files, candidates) {
  return candidates.find((candidate) => files.has(candidate));
}

function unitImages(id) {
  const full = firstExisting(unitFiles, [
    `unit_ills_full_${id}.png`,
    `unit_ills_full_${id}.webp`,
    `unit_anime_${id}.png`,
  ]) || `unit_ills_full_${id}.png`;
  const thumb = firstExisting(unitFiles, [
    `unit_ills_thum_${id}.png`,
    `unit_ills_battle_${id}.png`,
    `unit_anime_${id}.png`,
    full,
  ]) || `unit_ills_thum_${id}.png`;
  const battle = firstExisting(unitFiles, [
    `unit_ills_battle_${id}.png`,
    `unit_anime_${id}.png`,
    thumb,
  ]) || `unit_ills_battle_${id}.png`;

  return {
    full: `units/img/${full}`,
    thumb: `units/img/${thumb}`,
    battle: `units/img/${battle}`,
  };
}

function itemImage(item) {
  const id = item.id.toString();
  const candidates = [
    item.thumbnail,
    `item_thum_${id}.png`,
    `item_sphere_${id}.png`,
    `sphere_thum_${id}.png`,
    `sphere_${id}.png`,
    `item_full_${id}.png`,
    `weapon_thum_${id}.png`,
    `item_${id}.png`,
  ].filter(Boolean);
  const file = firstExisting(itemFiles, candidates) || candidates[0] || `item_thum_${id}.png`;
  return `items/item/${file}`;
}

function statValue(stats, key) {
  const lord = stats && stats._lord;
  const base = stats && stats._base;
  return (lord && lord[key]) || (base && base[key]) || 0;
}

function normalizeUnit(unit, server) {
  const id = unit.id.toString();
  const rarity = unit.rarity ? `${unit.rarity} Star` : 'Unknown';
  const role = unit.gender ? unit.gender.charAt(0).toUpperCase() + unit.gender.slice(1) : 'Unit';
  const element = elementNames[unit.element] || unit.element || 'Unknown';
  return {
    key: `${server}:${id}`,
    server: server.toUpperCase(),
    id,
    name: unit.name || `Unit ${id}`,
    title: unit['translated_name'] || unit.name || `Unit ${id}`,
    element,
    rarity,
    role,
    cost: unit.cost || 0,
    stats: {
      hp: statValue(unit.stats, 'hp'),
      atk: statValue(unit.stats, 'atk'),
      def: statValue(unit.stats, 'def'),
      rec: statValue(unit.stats, 'rec'),
    },
    images: unitImages(id),
  };
}

function itemTypeLabel(item) {
  if (!item) return 'Unknown';
  if (item.type === 'consumable' && !item.raid) return 'Item';
  if (item.type === 'material' && !item.raid) return 'Material';
  if (item.type === 'sphere') return 'Sphere';
  if (item.type === 'evomat') return 'Evo Material';
  if (item.type === 'summoner_consumable') return 'Booster';
  if (item.raid) return 'Raid Item';
  if (item.type === 'ls_sphere') return 'LS Sphere';
  return item.type || 'Unknown';
}

function effectList(item) {
  if (!item || !item.effect) return [];
  if (item.effect.effect && item.effect.effect.length) {
    const { effect, ...extra } = item.effect;
    return [{ ...effect[0], ...extra }, ...effect.slice(1)];
  }
  return Array.isArray(item.effect) ? item.effect : [item.effect];
}

function normalizeItem(item, server, usage = []) {
  const id = item.id.toString();
  const recipeMaterials = item.recipe && Array.isArray(item.recipe.materials) ? item.recipe.materials.length : 0;
  return {
    key: `${server}:${id}`,
    server: server.toUpperCase(),
    id,
    name: item.name || `Item ${id}`,
    type: item.type || 'item',
    typeLabel: itemTypeLabel(item),
    rarity: item.rarity === undefined ? 'Unknown' : `${item.rarity}`,
    desc: item.desc || '',
    maxStack: item.max_stack ?? 0,
    sellPrice: item.sell_price ?? 0,
    sphereType: item['sphere type'] ?? null,
    sphereTypeText: item['sphere type text'] || '',
    maxEquipped: item['max equipped'] || null,
    raid: !!item.raid,
    effectCount: effectList(item).length,
    recipeCount: recipeMaterials,
    usageCount: usage.length,
    image: itemImage(item),
  };
}

function buildUsageMap(serverItems) {
  const usage = {};
  Object.values(serverItems).forEach((item) => {
    const recipe = item.recipe && Array.isArray(item.recipe.materials) ? item.recipe.materials : [];
    recipe.forEach((material) => {
      const id = String(material.id);
      if (!usage[id]) usage[id] = [];
      usage[id].push({ id: String(item.id), count: Number(material.count) || 0, name: item.name || `Item ${item.id}` });
    });
  });
  return usage;
}

const units = [];
const items = [];

fs.mkdirSync(targetDetailDir, { recursive: true });
fs.mkdirSync(targetItemDetailDir, { recursive: true });

servers.forEach((server) => {
  const serverDetailDir = path.join(targetDetailDir, server);
  const serverItemDetailDir = path.join(targetItemDetailDir, server);
  fs.mkdirSync(serverDetailDir, { recursive: true });
  fs.mkdirSync(serverItemDetailDir, { recursive: true });
  const evoData = useRawData ? loadRawOptional('evo_list.json', server) : {};
  const feSkillData = useRawData ? loadRawOptional('feskills.json', server) : {};
  const dictionary = loadItemDictionary(server);
  const serverItems = loadData('items', server);
  const usageMap = buildUsageMap(serverItems);

  Object.values(loadData('units', server))
    .sort((a, b) => Number(a.id) - Number(b.id))
    .forEach((unit) => {
      const summary = normalizeUnit(unit, server);
      units.push(summary);
      fs.writeFileSync(
        path.join(serverDetailDir, `${summary.id}.json`),
        JSON.stringify({
          summary,
          raw: unit,
          evolution: evoData[summary.id] || null,
          feskills: feSkillData[summary.id] || null,
        }, null, 2),
        'utf8'
      );
    });

  Object.values(serverItems)
    .sort((a, b) => Number(a.id) - Number(b.id))
    .forEach((item) => {
      const summary = normalizeItem(item, server, usageMap[String(item.id)] || []);
      items.push(summary);
      fs.writeFileSync(
        path.join(serverItemDetailDir, `${summary.id}.json`),
        JSON.stringify({
          summary,
          raw: item,
          effects: effectList(item),
          usage: usageMap[summary.id] || [],
          dictionary: dictionary[summary.id] || null,
        }, null, 2),
        'utf8'
      );
    });
});

const output = `window.BFDB_DATA = ${JSON.stringify({ imageRoot: 'assets/images', units, items }, null, 2)};\n`;
fs.writeFileSync(targetDataFile, output, 'utf8');

console.log(`Wrote ${units.length} units and ${items.length} items to ${path.relative(workspaceRoot, targetDataFile)}`);
