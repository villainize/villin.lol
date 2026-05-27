const fs = require('fs');
const path = require('path');
const https = require('https');

const projectRoot = path.resolve(__dirname, '..');
const apiUrl = 'https://bravefrontierglobal.fandom.com/api.php';
const characterSourceUrl = 'https://bravefrontierglobal.fandom.com/wiki/Category:Character';
const detailDir = path.join(projectRoot, 'data', 'character-details');
const indexFile = path.join(projectRoot, 'data', 'characters.js');
const assetRoot = path.join(projectRoot, 'assets', 'images');
const imageDir = path.join(assetRoot, 'characters', 'portrait');
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function requestJson(params) {
  const url = new URL(apiUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'bf-db character importer/1.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error('Request failed: ' + res.statusCode + ' ' + res.statusMessage));
        res.resume();
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('Invalid JSON from API: ' + error.message));
        }
      });
    });
    req.on('error', reject);
  });
}

function chunk(list, size) {
  const chunks = [];
  for (let index = 0; index < list.length; index += size) chunks.push(list.slice(index, index + size));
  return chunks;
}

function toPosix(filePath) {
  return String(filePath || '').split(path.sep).join('/');
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).toLowerCase()))];
}

function walkFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function pushMapValue(map, key, value) {
  if (!key || !value) return;
  const next = map.get(key) || [];
  if (!next.includes(value)) next.push(value);
  map.set(key, next);
}

function normalizedStem(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\(character\)/g, '')
    .replace(/\bcharacter\b/g, '')
    .replace(/\.[a-z0-9]+$/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function familyStem(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/g, '')
    .replace(/^thum_/, '')
    .replace(/_[0-9]+$/, '');
}

function basenameFromSource(source) {
  if (!source) return '';
  const clean = decodeURIComponent(String(source).split('?')[0]);
  const matches = clean.match(/[^/]+\.(?:png|jpe?g|webp|gif)/ig);
  if (matches && matches.length) return matches[matches.length - 1].toLowerCase();
  const base = path.basename(clean).toLowerCase();
  return /\.(png|jpe?g|webp|gif)$/i.test(base) ? base : '';
}

function buildLocalAssetIndex() {
  const imagesByBase = new Map();
  const imagesByNormalized = new Map();
  const imagesByFamily = new Map();

  walkFiles(imageDir).forEach((filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (!imageExtensions.has(ext)) return;
    const relativePath = toPosix(path.relative(assetRoot, filePath));
    const base = path.basename(filePath).toLowerCase();
    pushMapValue(imagesByBase, base, relativePath);
    pushMapValue(imagesByNormalized, normalizedStem(base), relativePath);
    pushMapValue(imagesByFamily, familyStem(base), relativePath);
  });

  return { imagesByBase, imagesByNormalized, imagesByFamily };
}

function candidateBasenames(baseName) {
  if (!baseName) return [];
  const ext = path.extname(baseName).toLowerCase() || '.png';
  const stem = path.basename(baseName, ext).toLowerCase();
  const stems = [stem];
  const trimmed = stem.replace(/_[0-9]+$/, '');

  if (trimmed && trimmed !== stem) stems.push(trimmed);
  if (/^thum_/.test(stem)) stems.push(stem.replace(/^thum_/, ''));
  else stems.push('thum_' + stem);

  if (trimmed) {
    if (/^thum_/.test(trimmed)) stems.push(trimmed.replace(/^thum_/, ''));
    else stems.push('thum_' + trimmed);
  }

  return uniqueValues(stems.map((value) => value + ext));
}

function pathBaseName(filePath) {
  return String(filePath || '').split('/').pop() || '';
}

function scoreLocalPath(relativePath, preferThumb) {
  const base = pathBaseName(relativePath).toLowerCase();
  const isThumb = base.startsWith('thum_');
  const hasExpression = /_[0-9]+\./i.test(base);
  let score = 0;

  if (preferThumb) {
    if (isThumb) score += 12;
    if (hasExpression) score += 7;
    if (/_0\./i.test(base)) score += 2;
  } else {
    if (!isThumb) score += 6;
    if (!hasExpression) score += 4;
    if (/_0\./i.test(base)) score += 1;
  }

  if (relativePath.includes('/event/')) score += 2;
  return score;
}

function pickBestPath(paths, preferThumb) {
  if (!paths.length) return '';
  return [...new Set(paths)].sort((left, right) => {
    const scoreDiff = scoreLocalPath(right, preferThumb) - scoreLocalPath(left, preferThumb);
    if (scoreDiff) return scoreDiff;
    const lengthDiff = left.length - right.length;
    if (lengthDiff) return lengthDiff;
    return left.localeCompare(right);
  })[0];
}

function findFromBasenames(baseNames, assetIndex, preferThumb) {
  const matches = [];
  baseNames.forEach((baseName) => {
    const found = assetIndex.imagesByBase.get(String(baseName || '').toLowerCase()) || [];
    found.forEach((relativePath) => matches.push(relativePath));
  });
  return pickBestPath(matches, preferThumb);
}

function findFromNormalized(keys, assetIndex, preferThumb) {
  const matches = [];
  keys.forEach((key) => {
    const found = assetIndex.imagesByNormalized.get(key) || [];
    found.forEach((relativePath) => matches.push(relativePath));
  });
  return pickBestPath(matches, preferThumb);
}

function findFromFamily(keys, assetIndex, preferThumb) {
  const matches = [];
  keys.forEach((key) => {
    const found = assetIndex.imagesByFamily.get(String(key || '').toLowerCase()) || [];
    found.forEach((relativePath) => matches.push(relativePath));
  });
  return pickBestPath(matches, preferThumb);
}

function findLocalPortraits(primaryImage, thumbnailImage, title, name, assetIndex) {
  const primaryBase = basenameFromSource(primaryImage);
  const thumbBase = basenameFromSource(thumbnailImage);
  const familyKeys = uniqueValues([
    familyStem(primaryBase),
    familyStem(thumbBase),
    familyStem(title),
    familyStem(name)
  ]);

  let image = findFromBasenames(candidateBasenames(primaryBase), assetIndex, false);
  let thumb = findFromFamily(familyKeys, assetIndex, true)
    || findFromBasenames(candidateBasenames(thumbBase), assetIndex, true);

  if (!image) {
    image = findFromFamily(familyKeys, assetIndex, false)
      || findFromNormalized(uniqueValues([
        normalizedStem(primaryBase),
        normalizedStem(thumbBase),
        normalizedStem(title),
        normalizedStem(name)
      ]), assetIndex, false);
  }

  if (!thumb) {
    thumb = findFromNormalized(uniqueValues([
      normalizedStem(thumbBase),
      normalizedStem(primaryBase),
      normalizedStem(title),
      normalizedStem(name)
    ]), assetIndex, true);
  }

  if (!image && thumb) image = findFromFamily([familyStem(pathBaseName(thumb))], assetIndex, false) || findFromBasenames(candidateBasenames(pathBaseName(thumb)), assetIndex, false) || thumb;
  if (!thumb && image) thumb = findFromFamily([familyStem(pathBaseName(image))], assetIndex, true) || findFromBasenames(candidateBasenames(pathBaseName(image)), assetIndex, true) || image;

  return { image, thumb };
}

function extractTemplate(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) return '';
  let depth = 0;
  for (let index = start; index < source.length - 1; index += 1) {
    const pair = source.slice(index, index + 2);
    if (pair === '{{') {
      depth += 1;
      index += 1;
      continue;
    }
    if (pair === '}}') {
      depth -= 1;
      index += 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return '';
}

function stripMarkup(text) {
  if (!text) return '';
  let value = String(text);
  value = value.replace(/<!--[^]*?-->/g, '');
  value = value.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  value = value.replace(/<br\s*\/?>/gi, '\n');
  value = value.replace(/<span[^>]*title="([^"]+)"[^>]*>([\s\S]*?)<\/span>/gi, '$2');
  value = value.replace(/<[^>]+>/g, '');
  value = value.replace(/\{\{c\|([^{}|]+)\}\}/gi, '$1');
  value = value.replace(/\{\{ill\|([^{}|]+)\|[^{}|]+\|([^{}|]+)\}\}/gi, '$2');
  value = value.replace(/\{\{nihongo\|([^{}|]+)\|([^{}|]+)(?:\|[^{}]+)*\}\}/gi, '$1 ($2)');
  for (let pass = 0; pass < 6; pass += 1) {
    value = value.replace(/\{\{([^{}|]+)(\|([^{}]*?))?\}\}/g, (_, name, _full, args) => {
      const parts = String(args || '').split('|').map((part) => part.trim()).filter(Boolean);
      if (!parts.length) return name.trim();
      return parts[parts.length - 1];
    });
  }
  value = value.replace(/\[\[(?:File|Image):[^\]]+\]\]/gi, '');
  value = value.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  value = value.replace(/\[\[([^\]]+)\]\]/g, '$1');
  value = value.replace(/\[https?:[^\s\]]+\s+([^\]]+)\]/g, '$1');
  value = value.replace(/''+/g, '');
  value = value.replace(/&nbsp;/g, ' ');
  value = value.replace(/&mdash;/g, '-');
  value = value.replace(/&ndash;/g, '-');
  value = value.replace(/&quot;/g, '"');
  value = value.replace(/&#39;/g, "'");
  value = value.replace(/&amp;/g, '&');
  value = value.replace(/\r/g, '');

  const lines = value.split('\n').map((line) => {
    let next = line.trim();
    if (!next) return '';
    next = next.replace(/^[:;]+\s*/, '');
    next = next.replace(/^#+\s*/, '');
    next = next.replace(/^\*+\s*/, '- ');
    next = next.replace(/\s{2,}/g, ' ');
    return next.trim();
  });

  return lines.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function parseInfobox(templateText) {
  if (!templateText) return {};
  const lines = templateText.split(/\r?\n/);
  const fields = {};
  let currentKey = '';
  let buffer = [];

  function commit() {
    if (!currentKey) return;
    fields[currentKey] = stripMarkup(buffer.join('\n'));
  }

  lines.slice(1, -1).forEach((line) => {
    if (/^\|[^=]+=/.test(line)) {
      commit();
      const [rawKey, ...rest] = line.slice(1).split('=');
      currentKey = rawKey.trim().toLowerCase();
      buffer = [rest.join('=').trim()];
      return;
    }
    if (currentKey) buffer.push(line);
  });
  commit();
  return fields;
}

function parseSections(source) {
  const lines = source.replace(/\r/g, '').split('\n');
  const sections = [];
  let current = { title: 'Overview', level: 1, lines: [] };

  function commit() {
    const content = stripMarkup(current.lines.join('\n'));
    if (content) sections.push({ title: current.title, level: current.level, content });
  }

  for (const line of lines) {
    const match = line.match(/^(={2,4})\s*(.*?)\s*\1\s*$/);
    if (match) {
      commit();
      current = { title: stripMarkup(match[2]) || 'Section', level: match[1].length, lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  commit();
  return sections;
}

function excerpt(text, size = 220) {
  const plain = String(text || '').replace(/\s+/g, ' ').trim();
  if (!plain) return '';
  if (plain.length <= size) return plain;
  return plain.slice(0, size).replace(/[\s,;:.!?-]+[^\s,;:.!?-]*$/, '').trim() + '...';
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/\(character\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'character';
}

function buildSummary(page, infobox, sections, assetIndex) {
  const cleanTitle = page.title.replace(/\s*\(character\)\s*$/i, '').trim();
  const overview = sections.find((section) => section.title === 'Overview');
  const quoteSection = sections.find((section) => /quote/i.test(section.title));
  const remoteImage = page.original?.source || page.thumbnail?.source || '';
  const remoteThumb = page.thumbnail?.source || remoteImage;
  const localPortraits = findLocalPortraits(remoteImage, remoteThumb, page.title, infobox.name || cleanTitle, assetIndex);
  const image = localPortraits.image || localPortraits.thumb || remoteImage;
  const thumb = localPortraits.thumb || localPortraits.image || remoteThumb || remoteImage;
  const localImage = localPortraits.image || localPortraits.thumb || '';
  const localThumb = localPortraits.thumb || localPortraits.image || '';

  return {
    key: String(page.pageid),
    pageId: page.pageid,
    slug: slugify(cleanTitle),
    title: page.title,
    name: infobox.name || cleanTitle,
    element: infobox.element || 'Unknown',
    gender: infobox.gender || 'Unknown',
    aliases: infobox.aliases || '',
    debut: infobox.gamedebut || '',
    status: infobox.currently || '',
    counterpart: infobox.counterpart || '',
    relatives: infobox.relatives || '',
    image,
    thumb,
    localImage,
    localThumb,
    remoteImage,
    remoteThumb,
    artSource: localImage || localThumb ? 'local' : 'remote',
    excerpt: excerpt(overview?.content || quoteSection?.content || ''),
    quote: excerpt(quoteSection?.content || '', 180),
    sourceUrl: 'https://bravefrontierglobal.fandom.com/wiki/' + encodeURIComponent(page.title.replace(/ /g, '_'))
  };
}

async function fetchCategoryMembers() {
  const titles = [];
  let cmcontinue = '';
  do {
    const response = await requestJson({
      action: 'query',
      format: 'json',
      list: 'categorymembers',
      cmtitle: 'Category:Character',
      cmlimit: '500',
      cmnamespace: '0',
      cmcontinue
    });
    const members = response.query?.categorymembers || [];
    members.forEach((member) => titles.push(member.title));
    cmcontinue = response.continue?.cmcontinue || '';
  } while (cmcontinue);
  return titles;
}

async function fetchPages(titles) {
  const pages = [];
  for (const group of chunk(titles, 20)) {
    const response = await requestJson({
      action: 'query',
      format: 'json',
      formatversion: '2',
      prop: 'revisions|pageimages',
      titles: group.join('|'),
      rvprop: 'content',
      rvslots: 'main',
      piprop: 'thumbnail|original',
      pithumbsize: '480'
    });
    const nextPages = response.query?.pages || [];
    nextPages.forEach((page) => {
      if (page.missing || !page.pageid) return;
      pages.push(page);
    });
    console.log('Fetched', pages.length, 'character pages...');
  }
  return pages;
}

async function main() {
  fs.mkdirSync(detailDir, { recursive: true });
  fs.mkdirSync(imageDir, { recursive: true });
  const gitkeep = path.join(imageDir, '.gitkeep');
  if (!fs.existsSync(gitkeep)) fs.writeFileSync(gitkeep, '', 'utf8');

  const assetIndex = buildLocalAssetIndex();
  const titles = await fetchCategoryMembers();
  console.log('Found', titles.length, 'character entries in Category:Character');
  const pages = await fetchPages(titles);

  const summaries = [];
  for (const page of pages.sort((a, b) => a.title.localeCompare(b.title))) {
    const raw = page.revisions?.[0]?.slots?.main?.content || page.revisions?.[0]?.content || '';
    const infoboxText = extractTemplate(raw, '{{Character');
    const infobox = parseInfobox(infoboxText);
    const body = raw.replace(infoboxText, '').trim();
    const sections = parseSections(body);
    const summary = buildSummary(page, infobox, sections, assetIndex);
    summaries.push(summary);
    const detail = {
      summary,
      infobox,
      sections,
      raw,
      source: {
        pageId: page.pageid,
        title: page.title,
        url: summary.sourceUrl,
        fetchedAt: new Date().toISOString()
      }
    };
    fs.writeFileSync(path.join(detailDir, summary.key + '.json'), JSON.stringify(detail, null, 2), 'utf8');
  }

  const localArtCount = summaries.filter((summary) => summary.artSource === 'local').length;
  const output = [
    'window.BFDB_DATA = window.BFDB_DATA || { imageRoot: "assets/images", units: [], items: [] };',
    'window.BFDB_DATA.characters = ' + JSON.stringify(summaries, null, 2) + ';',
    'window.BFDB_DATA.characterMeta = ' + JSON.stringify({ count: summaries.length, localArtCount, source: characterSourceUrl, fetchedAt: new Date().toISOString() }, null, 2) + ';',
    ''
  ].join('\n');
  fs.writeFileSync(indexFile, output, 'utf8');

  console.log('Wrote', summaries.length, 'characters to', path.relative(projectRoot, indexFile));
  console.log('Matched local portraits for', localArtCount, 'characters');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
