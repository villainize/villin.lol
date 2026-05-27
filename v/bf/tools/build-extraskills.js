const fs = require('fs');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..', '..');
const rawDataRoot = path.join(workspaceRoot, 'bravefrontier-data-source');
const bfMtDataDir = path.join(workspaceRoot, 'bf-mt-source', 'public', 'static', 'bf-data');
const outputFile = path.join(workspaceRoot, 'bf-db', 'data', 'extraskills.js');
const outputDetailDir = path.join(workspaceRoot, 'bf-db', 'data', 'extraskill-details');
const useRawData = fs.existsSync(path.join(rawDataRoot, 'info.json'));
const servers = useRawData ? ['gl', 'eu', 'jp', 'kr'] : ['gl', 'eu', 'jp'];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function rawServerDir(server) {
  return server === 'gl' ? rawDataRoot : path.join(rawDataRoot, server);
}

function loadRawOptional(file, server) {
  const filePath = path.join(rawServerDir(server), file);
  return fs.existsSync(filePath) ? readJson(filePath) : {};
}

function loadSplitData(prefix, server) {
  const merged = {};
  fs.readdirSync(bfMtDataDir)
    .filter((file) => file.startsWith(prefix + '-' + server) && file.endsWith('.json'))
    .sort()
    .forEach((file) => Object.assign(merged, readJson(path.join(bfMtDataDir, file))));
  return merged;
}

function loadUnits(server) {
  if (useRawData) return loadRawOptional('info.json', server);
  return loadSplitData('info', server);
}

function loadItems(server) {
  if (useRawData) {
    const dir = rawServerDir(server);
    const itemPath = fs.existsSync(path.join(dir, 'items.json')) ? path.join(dir, 'items.json') : path.join(dir, 'items_light.json');
    return fs.existsSync(itemPath) ? readJson(itemPath) : {};
  }
  return loadSplitData('items', server);
}

function loadExtraSkills(server) {
  if (useRawData) return loadRawOptional('es.json', server);
  const filePath = path.join(bfMtDataDir, 'es-' + server + '.json');
  return fs.existsSync(filePath) ? readJson(filePath) : {};
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function summarizeCondition(condition, lookup) {
  if (!condition || typeof condition !== 'object') return 'No conditions';
  const bits = [];
  if (condition['item required']) {
    const values = [].concat(condition['item required']).map((id) => lookup.item[String(id)] || 'Item ' + id);
    bits.push('Needs item: ' + values.join(', '));
  }
  if (condition['unit required']) {
    const values = [].concat(condition['unit required']).map((id) => lookup.unit[String(id)] || 'Unit ' + id);
    bits.push('Needs unit: ' + values.join(', '));
  }
  if (condition['sphere category required']) bits.push('Sphere category: ' + condition['sphere category required']);
  if (condition['unknown']) bits.push('Unknown condition: ' + condition['unknown']);
  if (condition['gender required']) bits.push('Gender: ' + condition['gender required']);
  if (!bits.length) {
    Object.entries(condition).forEach(([key, value]) => bits.push(key + ': ' + JSON.stringify(value)));
  }
  return bits.join(' / ');
}

function effectSummary(effect) {
  if (!effect || typeof effect !== 'object') return 'No effect data';
  return Object.entries(effect)
    .filter(([key]) => key !== 'conditions')
    .slice(0, 8)
    .map(([key, value]) => key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : String(value)))
    .join(' / ');
}

function rarityLabel(value) {
  const rarity = Number(value);
  if (Number.isNaN(rarity)) return 'Unknown';
  return 'Tier ' + rarity;
}

function summarizeSkill(skill, server, lookup) {
  const id = String(skill.id);
  const effects = Array.isArray(skill.effects) ? skill.effects : [];
  const conditions = effects.flatMap((effect) => Array.isArray(effect.conditions) ? effect.conditions : []).filter(Boolean);
  return {
    key: server + ':' + id,
    server: server.toUpperCase(),
    id,
    name: normalizeText(skill.name) || 'Extra Skill ' + id,
    desc: normalizeText(skill.desc) || 'No description available.',
    rarity: String(skill.rarity ?? '0'),
    rarityLabel: rarityLabel(skill.rarity),
    target: normalizeText(skill.target) || 'Unknown',
    effectCount: effects.length,
    conditionCount: conditions.length,
    conditionSummary: conditions.length ? summarizeCondition(conditions[0], lookup) : 'No conditions',
    searchText: normalizeText([skill.name, skill.desc, skill.target, id].join(' '))
  };
}

const summaries = [];
fs.mkdirSync(outputDetailDir, { recursive: true });

servers.forEach((server) => {
  const unitLookup = {};
  const itemLookup = {};
  Object.values(loadUnits(server)).forEach((unit) => { unitLookup[String(unit.id)] = unit.name || ('Unit ' + unit.id); });
  Object.values(loadItems(server)).forEach((item) => { itemLookup[String(item.id)] = item.name || ('Item ' + item.id); });
  const lookup = { unit: unitLookup, item: itemLookup };
  const detailDir = path.join(outputDetailDir, server);
  fs.mkdirSync(detailDir, { recursive: true });

  Object.values(loadExtraSkills(server))
    .sort((a, b) => Number(a.id) - Number(b.id))
    .forEach((skill) => {
      const summary = summarizeSkill(skill, server, lookup);
      const effects = Array.isArray(skill.effects) ? skill.effects : [];
      const resolvedConditions = effects.flatMap((effect, index) => {
        const conditions = Array.isArray(effect.conditions) ? effect.conditions : [];
        return conditions.map((condition, conditionIndex) => ({
          effectIndex: index + 1,
          conditionIndex: conditionIndex + 1,
          summary: summarizeCondition(condition, lookup),
          raw: condition
        }));
      });

      const effectSummaries = effects.map((effect, index) => ({
        index: index + 1,
        summary: effectSummary(effect),
        raw: effect
      }));

      summaries.push(summary);
      fs.writeFileSync(path.join(detailDir, summary.id + '.json'), JSON.stringify({
        summary,
        raw: skill,
        effects: effectSummaries,
        conditions: resolvedConditions
      }, null, 2), 'utf8');
    });
});

const output = [
  'window.BFDB_DATA = window.BFDB_DATA || { imageRoot: "assets/images", units: [], items: [] };',
  'window.BFDB_DATA.extraSkills = ' + JSON.stringify(summaries, null, 2) + ';',
  ''
].join('\n');
fs.writeFileSync(outputFile, output, 'utf8');
console.log('Wrote ' + summaries.length + ' extra skills to ' + path.relative(workspaceRoot, outputFile));
