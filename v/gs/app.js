const REPO = "https://github.com/Reymdusk/GSReact";
const RAW_BASE = "https://raw.githubusercontent.com/Reymdusk/GSReact/main/src/shared";
const RAW_PUBLIC_BASE = "https://raw.githubusercontent.com/Reymdusk/GSReact/main/public";
const API_BASE = "https://api.github.com/repos/Reymdusk/GSReact";
const ASSET_BASE = "https://www.grandsummoners.info";
const CACHE_KEY = "gs-library-cache-v1";
const GUIDE_KEY = "gs-library-guides-v1";
const SOURCE_FILES = {
  unit: "https://github.com/Reymdusk/GSReact/blob/main/src/shared/unitInfo.js",
  equipment: "https://github.com/Reymdusk/GSReact/blob/main/src/shared/equipInfo.js",
  guide: "local-guide",
};

const state = {
  items: [],
  query: "",
  type: "unit",
  sort: "old-new",
  pageSize: 50,
  page: 1,
  detailMode: "minimal",
  filters: {
    element: "",
    race: "",
    slot: "",
  },
  guides: [],
  editingGuideId: null,
  selected: null,
};

const synonymGroups = [
  ["heal", "healer", "healing", "recover", "recovery", "hp"],
  ["burn", "burning", "fire"],
  ["freeze", "ice", "water"],
  ["paralyze", "paralysis", "shock"],
  ["poison", "venom"],
  ["blind", "accuracy"],
  ["arts", "art", "true arts", "super arts", "skill"],
  ["demon", "daemon"],
  ["equip", "equipment", "weapon", "armor", "item"],
  ["physical", "phys"],
  ["magic", "magical"],
  ["critical", "crit"],
  ["damage", "dmg", "attack", "atk"],
  ["defense", "def", "barrier", "shield"],
];

const quickSearches = [
  "true weapon",
  "healer",
  "arts gauge",
  "critical",
  "barrier",
  "damage",
  "break",
  "accuracy",
  "evasion",
  "status",
  "cleanse",
  "revive",
  "lifesteal",
  "burn",
  "freeze",
  "poison",
  "paralyze",
  "blind",
  "faint",
  "fire",
  "water",
  "earth",
  "light",
  "dark",
  "human",
  "god",
  "demon",
  "dragon",
  "machine",
  "beast",
  "physical",
  "magic",
  "defense",
  "support",
  "healing",
];

const dom = {
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  closeSettingsButton: document.querySelector("#closeSettingsButton"),
  listView: document.querySelector("#listView"),
  detailView: document.querySelector("#detailView"),
  backToResultsButton: document.querySelector("#backToResultsButton"),
  updateButton: document.querySelector("#updateButton"),
  syncStatus: document.querySelector("#syncStatus"),
  lastUpdated: document.querySelector("#lastUpdated"),
  sectionTitle: document.querySelector("#sectionTitle"),
  searchInput: document.querySelector("#searchInput"),
  clearSearchButton: document.querySelector("#clearSearchButton"),
  sortSelect: document.querySelector("#sortSelect"),
  unitFilters: document.querySelector("#unitFilters"),
  equipmentFilters: document.querySelector("#equipmentFilters"),
  elementFilter: document.querySelector("#elementFilter"),
  raceFilter: document.querySelector("#raceFilter"),
  slotFilter: document.querySelector("#slotFilter"),
  pageSizeInputs: [...document.querySelectorAll('input[name="pageSize"]')],
  detailModeInputs: [...document.querySelectorAll('input[name="detailMode"]')],
  segments: [...document.querySelectorAll(".segment")],
  quickChips: document.querySelector("#quickChips"),
  unitCount: document.querySelector("#unitCount"),
  equipmentCount: document.querySelector("#equipmentCount"),
  guideCount: document.querySelector("#guideCount"),
  settingsUnitCount: document.querySelector("#settingsUnitCount"),
  settingsEquipmentCount: document.querySelector("#settingsEquipmentCount"),
  settingsTotalCount: document.querySelector("#settingsTotalCount"),
  resultCount: document.querySelector("#resultCount"),
  activeQuery: document.querySelector("#activeQuery"),
  results: document.querySelector("#results"),
  paginationTop: document.querySelector("#paginationTop"),
  paginationBottom: document.querySelector("#paginationBottom"),
  detailPanel: document.querySelector("#detailPanel"),
  addGuideButton: document.querySelector("#addGuideButton"),
  guideDialog: document.querySelector("#guideDialog"),
  guideForm: document.querySelector("#guideForm"),
  guideDialogTitle: document.querySelector("#guideDialogTitle"),
  closeGuideButton: document.querySelector("#closeGuideButton"),
  deleteGuideButton: document.querySelector("#deleteGuideButton"),
  guideTitleInput: document.querySelector("#guideTitleInput"),
  guideCategoryInput: document.querySelector("#guideCategoryInput"),
  guideLinkInput: document.querySelector("#guideLinkInput"),
  guideSummaryInput: document.querySelector("#guideSummaryInput"),
  guideContentInput: document.querySelector("#guideContentInput"),
};

init();

function init() {
  state.guides = loadGuides();
  renderChips();
  bindEvents();
  const cached = loadCache();
  if (cached) {
    applyData(cached, "Loaded saved data.");
  } else if (window.GS_LIBRARY_DATA) {
    applyData(window.GS_LIBRARY_DATA, "Loaded included data. Press Update from GitHub for the newest version.");
  } else {
    updateFromGitHub();
  }
}

function bindEvents() {
  dom.updateButton.addEventListener("click", updateFromGitHub);
  dom.settingsButton.addEventListener("click", () => dom.settingsDialog.showModal());
  dom.closeSettingsButton.addEventListener("click", () => dom.settingsDialog.close());
  dom.settingsDialog.addEventListener("click", (event) => {
    if (event.target === dom.settingsDialog) dom.settingsDialog.close();
  });
  dom.backToResultsButton.addEventListener("click", closeDetailPage);
  if (dom.addGuideButton) dom.addGuideButton.addEventListener("click", () => openGuideEditor());
  if (dom.closeGuideButton) dom.closeGuideButton.addEventListener("click", () => dom.guideDialog.close());
  if (dom.deleteGuideButton) dom.deleteGuideButton.addEventListener("click", deleteCurrentGuide);
  if (dom.guideForm) dom.guideForm.addEventListener("submit", saveGuideFromForm);
  if (dom.guideDialog) {
    dom.guideDialog.addEventListener("click", (event) => {
      if (event.target === dom.guideDialog) dom.guideDialog.close();
    });
  }
  dom.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    state.page = 1;
    state.selected = null;
    closeDetailPage(false);
    render();
  });
  dom.clearSearchButton.addEventListener("click", () => {
    dom.searchInput.value = "";
    state.query = "";
    state.page = 1;
    state.selected = null;
    closeDetailPage(false);
    render();
  });
  dom.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    state.page = 1;
    render();
  });
  [
    [dom.elementFilter, "element"],
    [dom.raceFilter, "race"],
    [dom.slotFilter, "slot"],
  ].forEach(([select, key]) => {
    select.addEventListener("change", () => {
      state.filters[key] = select.value;
      state.page = 1;
      state.selected = null;
      closeDetailPage(false);
      render();
    });
  });
  dom.pageSizeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      state.pageSize = input.value === "all" ? "all" : Number(input.value);
      state.page = 1;
      state.selected = null;
      closeDetailPage(false);
      render();
    });
  });
  dom.detailModeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      state.detailMode = input.value;
      if (state.selected) renderDetail();
    });
  });
  dom.segments.forEach((button) => {
    button.addEventListener("click", () => {
      state.type = button.dataset.type;
      state.page = 1;
      state.selected = null;
      dom.segments.forEach((segment) => segment.classList.toggle("is-active", segment === button));
      render();
    });
  });
}

function renderChips() {
  dom.quickChips.innerHTML = quickSearches
    .map((chip) => `<button class="chip" type="button" data-search="${escapeAttr(chip)}">${escapeHtml(chip)}</button>`)
    .join("");
  dom.quickChips.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const selectedKeyword = button.dataset.search;
      const shouldClear = state.query.toLowerCase() === selectedKeyword.toLowerCase();
      state.query = shouldClear ? "" : selectedKeyword;
      if (!shouldClear && isTrueWeaponQuery(selectedKeyword)) {
        state.type = "equipment";
        dom.segments.forEach((segment) => segment.classList.toggle("is-active", segment.dataset.type === "equipment"));
      }
      dom.searchInput.value = state.query;
      state.page = 1;
      state.selected = null;
      closeDetailPage(false);
      render();
    });
  });
}

async function updateFromGitHub() {
  setLoading(true, "Checking GitHub for the newest units and equipment...");
  try {
    const [unitsFile, equipmentFile, repoInfo] = await Promise.all([
      fetchGitHubSource("src/shared/unitInfo.js"),
      fetchGitHubSource("src/shared/equipInfo.js"),
      fetchJson(`${API_BASE}/commits/main`).catch(() => null),
    ]);

    const units = normalizeCollection(parseExportedData(unitsFile.source), "unit", unitsFile);
    const equipment = normalizeCollection(parseExportedData(equipmentFile.source), "equipment", equipmentFile);
    const payload = {
      items: [...units, ...equipment],
      fetchedAt: new Date().toISOString(),
      repoUpdatedAt: repoInfo?.commit?.committer?.date || null,
      repoSha: repoInfo?.sha || null,
      repoUrl: REPO,
      sourceFiles: {
        unit: unitsFile,
        equipment: equipmentFile,
      },
    };

    const saved = saveCache(payload);
    const itemCounts = `${units.length.toLocaleString()} units and ${equipment.length.toLocaleString()} equipment`;
    applyData(payload, saved ? `Updated from GitHub: ${itemCounts}.` : `Updated from GitHub: ${itemCounts}. Browser storage was full, so this refresh may not persist after reload.`);
  } catch (error) {
    const cached = loadCache();
    if (cached) {
      applyData(cached, "Could not reach GitHub. Showing saved data.");
      dom.syncStatus.classList.add("error");
    } else if (window.GS_LIBRARY_DATA) {
      applyData(window.GS_LIBRARY_DATA, "Could not reach GitHub. Showing included data.");
      dom.syncStatus.classList.add("error");
    } else {
      dom.syncStatus.textContent = "Could not load the GitHub data yet.";
      dom.syncStatus.classList.add("error");
      dom.results.innerHTML = `<div class="empty">GitHub did not return the data files. Open the page through a local server or check your connection, then press Update from GitHub.</div>`;
    }
    console.error(error);
  } finally {
    setLoading(false);
  }
}

function applyData(payload, message) {
  const orderByKind = { unit: 0, equipment: 0 };
  state.items = payload.items.map((item) => {
    const kind = item.kind === "equipment" ? "equipment" : "unit";
    const metadata = ensureItemMetadata(item);
    return {
      ...metadata,
      sourceOrder: Number.isFinite(metadata.sourceOrder) ? metadata.sourceOrder : orderByKind[kind]++,
    };
  });
  state.selected = null;
  dom.syncStatus.textContent = message;
  dom.syncStatus.classList.remove("error");
  const date = payload.repoUpdatedAt || payload.fetchedAt;
  dom.lastUpdated.textContent = date ? `Latest check: ${formatDate(date)}` : "";
  populateFilterOptions();
  render();
}

async function fetchText(url) {
  const response = await fetch(`${url}?cb=${Date.now()}`);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function fetchGitHubSource(path) {
  const fileInfo = await fetchJson(`${API_BASE}/contents/${path}`);
  const source = await fetchText(fileInfo.download_url || `${RAW_BASE}/${path.split("/").pop()}`);
  return {
    path,
    source,
    sha: fileInfo.sha || null,
    htmlUrl: fileInfo.html_url || `${REPO}/blob/main/${path}`,
    downloadUrl: fileInfo.download_url || null,
  };
}

async function fetchJson(url) {
  const response = await fetch(`${url}?cb=${Date.now()}`);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

function parseExportedData(source) {
  const cleaned = source
    .replace(/^\s*import[\s\S]*?;[\r\n]+/gm, "")
    .replace(/export\s+function\s+/g, "function ")
    .replace(/export\s+default\s+/g, "const __defaultExport = ")
    .replace(/export\s+(const|let|var)\s+/g, "$1 ");
  const exportedName = cleaned.match(/const\s+__defaultExport\s*=/)?.[0]
    ? "__defaultExport"
    : cleaned.match(/(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*\[/)?.[1];
  if (!exportedName) throw new Error("No exported data array was found.");
  return Function(`${cleaned}; return ${exportedName};`)();
}

function normalizeCollection(collection, kind, sourceInfo = null) {
  const list = Array.isArray(collection) ? collection : Object.values(collection || {});
  return list.map((entry, index) => {
    const flat = flattenObject(entry);
    const name = pickFirst(flat, ["name", "unitName", "equipName", "title"]) || `${kind} ${index + 1}`;
    const subtype = pickFirst(flat, ["type", "role", "element", "equipType", "rarity", "race"]) || kind;
    const image = pickImage(flat, kind);
    const haystack = Object.values(flat).join(" ");
    const cleanName = cleanText(name);
    const cleanSubtype = cleanText(subtype);
    return {
      id: `${kind}-${slug(name)}-${index}`,
      kind,
      name: cleanName,
      subtype: cleanSubtype,
      image,
      element: cleanText(flat.attribute || ""),
      race: cleanText(flat.type || flat.race || ""),
      slot: kind === "equipment" ? getEquipmentSlotLabel(flat.type || "") : "",
      flat,
      haystack: cleanText(haystack).toLowerCase(),
      searchText: buildSearchCorpus(flat, kind, cleanName, cleanSubtype),
      abilitySearchText: buildAbilitySearchCorpus(flat),
      original: entry,
      sourceFile: sourceInfo?.htmlUrl || SOURCE_FILES[kind],
      sourceSha: sourceInfo?.sha || "",
      sourceOrder: index,
    };
  });
}

function flattenObject(value, prefix = "", output = {}) {
  if (value == null) return output;
  if (Array.isArray(value)) {
    output[prefix || "items"] = value.map((item) => cleanText(stringifyValue(item))).join(" ");
    value.forEach((item, index) => flattenObject(item, `${prefix} ${index + 1}`.trim(), output));
    return output;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([key, nested]) => flattenObject(nested, `${prefix} ${humanize(key)}`.trim(), output));
    return output;
  }
  output[prefix || "value"] = cleanText(String(value));
  return output;
}

function stringifyValue(value) {
  if (value == null) return "";
  if (typeof value === "object") return Object.values(flattenObject(value)).join(" ");
  return String(value);
}

function buildSearchCorpus(flat, kind, name, subtype) {
  const allowedKeys = /^(name|translate|attribute|type|role|skillset|passive|trueweapon name|trueweapon skill|trueweapon passive ability)/i;
  const values = Object.entries(flat)
    .filter(([key, value]) => allowedKeys.test(key) && cleanText(value))
    .map(([, value]) => cleanText(value));
  return getSearchableText([name, subtype, ...values].join(" "));
}

function buildAbilitySearchCorpus(flat) {
  const values = Object.entries(flat)
    .filter(([key, value]) => /^(skillset|passive|trueweapon skill|trueweapon passive ability)/i.test(key) && cleanText(value))
    .map(([, value]) => cleanText(value));
  return getSearchableText(values.join(" "));
}

function render() {
  const effectiveType = isTrueWeaponQuery(state.query) && state.type !== "guide" ? "equipment" : state.type;
  const units = state.items.filter((item) => item.kind === "unit").length;
  const equipment = state.items.filter((item) => item.kind === "equipment").length;
  const guides = state.guides.length;
  dom.unitCount.textContent = units.toLocaleString();
  dom.equipmentCount.textContent = equipment.toLocaleString();
  dom.guideCount.textContent = guides.toLocaleString();
  dom.settingsUnitCount.textContent = units.toLocaleString();
  dom.settingsEquipmentCount.textContent = equipment.toLocaleString();
  dom.settingsTotalCount.textContent = (units + equipment).toLocaleString();
  dom.sectionTitle.textContent =
    effectiveType === "equipment" ? (isTrueWeaponQuery(state.query) ? "True Weapons" : "Equipment") : effectiveType === "guide" ? "Guides" : "Units";
  dom.unitFilters.hidden = effectiveType !== "unit";
  dom.equipmentFilters.hidden = effectiveType !== "equipment";
  dom.searchInput.placeholder = state.type === "guide" ? "Try beginner, crest, nuking, farming..." : "Try burn, healer, demon, arts...";
  dom.sortSelect.hidden = state.type === "guide";
  dom.sortSelect.previousElementSibling.hidden = state.type === "guide";
  dom.addGuideButton.hidden = state.type !== "guide";

  const results = getResults();
  const pageInfo = getPageInfo(results.length);
  const visibleResults = getVisibleResults(results, pageInfo);
  const sectionLabel = effectiveType === "equipment" ? (isTrueWeaponQuery(state.query) ? "true weapon" : "equipment") : effectiveType === "guide" ? "guide" : "unit";
  dom.resultCount.textContent = getResultSummary(results.length, pageInfo, sectionLabel);
  dom.activeQuery.textContent = state.query ? `for "${state.query}"` : "";
  updateKeywordButtons();
  dom.clearSearchButton.hidden = !state.query;
  renderPagination(pageInfo, results.length);

  if (!results.length) {
    dom.results.innerHTML = `<div class="empty">${state.type === "guide" ? "No guides yet. Press Add guide to create your first guide." : "No matches yet. Try a broader keyword like heal, fire, arts, demon, sword, or barrier."}</div>`;
  } else {
    dom.results.innerHTML = visibleResults.map((item) => item.kind === "guide" ? renderGuideCard(item) : renderCard(item)).join("");
    dom.results.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () => {
        openDetailPage(visibleResults.find((item) => item.id === card.dataset.id));
      });
    });
    dom.results.querySelectorAll("[data-edit-guide]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openGuideEditor(state.guides.find((guide) => guide.id === button.dataset.editGuide));
      });
    });
  }
}

function updateKeywordButtons() {
  const query = state.query.toLowerCase();
  dom.quickChips.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-active", Boolean(query) && button.dataset.search.toLowerCase() === query);
  });
}

function getPageInfo(totalResults) {
  if (state.pageSize === "all") {
    return { page: 1, pageSize: "all", totalPages: 1, start: 0, end: totalResults };
  }
  const totalPages = Math.max(1, Math.ceil(totalResults / state.pageSize));
  const page = Math.min(Math.max(1, state.page), totalPages);
  if (page !== state.page) state.page = page;
  const start = (page - 1) * state.pageSize;
  return { page, pageSize: state.pageSize, totalPages, start, end: Math.min(start + state.pageSize, totalResults) };
}

function getVisibleResults(results, pageInfo) {
  if (pageInfo.pageSize === "all") return results;
  return results.slice(pageInfo.start, pageInfo.end);
}

function getResultSummary(totalResults, pageInfo, sectionLabel) {
  const noun = totalResults === 1 ? sectionLabel : `${sectionLabel}s`;
  if (!totalResults) return `0 ${noun}`;
  if (pageInfo.pageSize === "all") return `${totalResults.toLocaleString()} ${noun}`;
  return `${(pageInfo.start + 1).toLocaleString()}-${pageInfo.end.toLocaleString()} of ${totalResults.toLocaleString()} ${noun}`;
}

function renderPagination(pageInfo, totalResults) {
  const markup = getPaginationMarkup(pageInfo, totalResults);
  dom.paginationTop.innerHTML = markup;
  dom.paginationBottom.innerHTML = markup;
  [dom.paginationTop, dom.paginationBottom].forEach((container) => {
    container.querySelectorAll("button[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        state.page = Number(button.dataset.page);
        state.selected = null;
        render();
        dom.results.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  });
}

function getPaginationMarkup(pageInfo, totalResults) {
  if (pageInfo.pageSize === "all" || totalResults <= pageInfo.pageSize) return "";
  const previousDisabled = pageInfo.page <= 1 ? "disabled" : "";
  const nextDisabled = pageInfo.page >= pageInfo.totalPages ? "disabled" : "";
  return `
    <button type="button" data-page="${pageInfo.page - 1}" ${previousDisabled}>Previous</button>
    <span>Page ${pageInfo.page.toLocaleString()} of ${pageInfo.totalPages.toLocaleString()}</span>
    <button type="button" data-page="${pageInfo.page + 1}" ${nextDisabled}>Next</button>
  `;
}

function getResults() {
  if (state.type === "guide") return getGuideResults();
  const search = buildSearch(state.query);
  let results = state.items
    .filter((item) => state.type === "all" || item.kind === (search.isTrueWeapon ? "equipment" : state.type))
    .filter(matchesDropdownFilters)
    .filter((item) => matchesItemSearch(item, search))
    .map((item) => ({ ...item, score: scoreItem(item, search), terms: search.expandedTerms }))
    .filter((item) => !search.primaryTerms.length || item.score > 0);

  if (state.sort === "name") results.sort((a, b) => a.name.localeCompare(b.name));
  if (state.sort === "type") results.sort((a, b) => `${a.kind} ${a.subtype}`.localeCompare(`${b.kind} ${b.subtype}`));
  if (state.sort === "relevance") results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  if (state.sort === "old-new") results.sort((a, b) => a.sourceOrder - b.sourceOrder || a.name.localeCompare(b.name));
  if (state.sort === "new-old") results.sort((a, b) => b.sourceOrder - a.sourceOrder || a.name.localeCompare(b.name));
  return results;
}

function getGuideResults() {
  const search = buildSearch(state.query);
  let results = state.guides
    .filter((guide) => matchesGuideSearch(guide, search))
    .map((guide) => ({ ...guide, terms: search.expandedTerms, score: scoreGuide(guide, search) }))
    .filter((guide) => !search.primaryTerms.length || guide.score > 0);
  results.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "") || a.name.localeCompare(b.name));
  return results;
}

function scoreGuide(guide, search) {
  if (!search.primaryTerms.length) return 1;
  let score = 0;
  const haystack = getSearchableText(`${guide.name} ${guide.category} ${guide.summary} ${guide.content}`);
  search.expandedTerms.forEach((term) => {
    if (matchesSearchTerm(getSearchableText(guide.name), term)) score += 12;
    if (matchesSearchTerm(getSearchableText(guide.category || ""), term)) score += 6;
    if (matchesSearchTerm(haystack, term)) score += 2;
  });
  return score;
}

function matchesGuideSearch(guide, search) {
  if (!search.primaryTerms.length) return true;
  const haystack = getSearchableText(`${guide.name} ${guide.category} ${guide.summary} ${guide.content}`);
  if (search.requiresPhraseMatch) return matchesPhraseVariant(haystack, search.phraseVariants);
  return search.primaryTerms.every((term) => matchesSearchTerm(haystack, term));
}

function matchesDropdownFilters(item) {
  if (item.kind === "unit") {
    if (state.filters.element && item.element !== state.filters.element) return false;
    if (state.filters.race && item.race !== state.filters.race) return false;
  }
  if (item.kind === "equipment" && state.filters.slot && item.slot !== state.filters.slot) return false;
  return true;
}

function populateFilterOptions() {
  fillSelect(dom.elementFilter, "All elements", uniqueValues("unit", "element"));
  fillSelect(dom.raceFilter, "All races", uniqueValues("unit", "race"));
  fillSelect(dom.slotFilter, "All slots", uniqueValues("equipment", "slot"));
}

function uniqueValues(kind, key) {
  return [...new Set(state.items.filter((item) => item.kind === kind).map((item) => item[key]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function fillSelect(select, defaultLabel, values) {
  const current = select.value;
  select.innerHTML = `<option value="">${escapeHtml(defaultLabel)}</option>${values
    .map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`)
    .join("")}`;
  select.value = values.includes(current) ? current : "";
}

function getEquipmentSlotLabel(value) {
  const text = String(value).toLowerCase();
  const star = text.includes("6") ? " 6" : "";
  if (text.includes("phys")) return `Physical${star}`;
  if (text.includes("mag")) return `Magic${star}`;
  if (text.includes("def")) return `Defense${star}`;
  if (text.includes("supp")) return `Support${star}`;
  if (text.includes("heal")) return `Healing${star}`;
  if (text.includes("/lb")) return `Limit Break${star}`;
  return cleanText(value);
}

function tokenize(query) {
  return (query.toLowerCase().match(/[a-z0-9%+.-]+/g) || []).filter((term) => term.length > 1);
}

function expandTerms(terms) {
  const expanded = new Set(terms);
  terms.forEach((term) => {
    synonymGroups.forEach((group) => {
      if (group.includes(term)) group.forEach((word) => expanded.add(word));
    });
  });
  return [...expanded];
}

function buildSearch(query) {
  const primaryTerms = tokenize(query);
  const normalizedPhrase = cleanText(query || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return {
    raw: cleanText(query || "").toLowerCase(),
    isTrueWeapon: isTrueWeaponQuery(query),
    normalizedPhrase,
    phraseVariants: getPhraseVariants(normalizedPhrase),
    requiresPhraseMatch: normalizedPhrase.includes(" "),
    primaryTerms,
    expandedTerms: expandTerms(primaryTerms),
  };
}

function matchesItemSearch(item, search) {
  if (!search.primaryTerms.length) return true;
  if (isTrueWeaponQuery(search.raw)) return item.kind === "equipment" && isTrueWeaponItem(item);
  const haystack = item.abilitySearchText || item.searchText || getSearchableText(`${item.name} ${item.subtype} ${item.haystack}`);
  const nameHaystack = getSearchableText(item.name);
  if (search.requiresPhraseMatch) return matchesPhraseVariant(haystack, search.phraseVariants) || matchesPhraseVariant(nameHaystack, search.phraseVariants);
  return search.primaryTerms.every((term) => matchesSearchTerm(haystack, term) || matchesNameTerm(nameHaystack, term));
}

function scoreItem(item, search) {
  if (!search.primaryTerms.length) return 1;
  let score = 0;
  const haystack = item.abilitySearchText || item.searchText || getSearchableText(item.haystack);
  const nameHaystack = getSearchableText(item.name);
  if (search.requiresPhraseMatch && matchesPhraseVariant(haystack, search.phraseVariants)) score += 20;
  if (search.requiresPhraseMatch && matchesPhraseVariant(nameHaystack, search.phraseVariants)) score += 28;
  search.expandedTerms.forEach((term) => {
    if (matchesNameTerm(nameHaystack, term)) score += 10;
    if (matchesSearchTerm(haystack, term)) score += 4;
  });
  return score;
}

function getSearchableText(value) {
  return ` ${cleanText(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
}

function matchesSearchTerm(haystack, term) {
  if (!term) return false;
  if (haystack.includes(` ${term} `)) return true;
  return false;
}

function matchesNameTerm(haystack, term) {
  if (!term) return false;
  return haystack.split(/\s+/).some((word) => word.startsWith(term));
}

function getPhraseVariants(phrase) {
  if (!phrase) return [];
  const variants = new Set([phrase]);

  if (phrase.endsWith(" up")) {
    const target = phrase.slice(0, -3).trim();
    variants.add(`increase ${target}`);
    variants.add(`increase own ${target}`);
    variants.add(`increase allies ${target}`);
    variants.add(`increase all allies ${target}`);
    variants.add(`increase team ${target}`);
    variants.add(`${target} increase`);
  }

  if (phrase.endsWith(" down")) {
    const target = phrase.slice(0, -5).trim();
    variants.add(`reduce ${target}`);
    variants.add(`reduce enemies ${target}`);
    variants.add(`lower ${target}`);
    variants.add(`decrease ${target}`);
  }

  return [...variants].filter(Boolean);
}

function matchesPhraseVariant(haystack, variants) {
  return variants.some((variant) => haystack.includes(` ${variant} `));
}

function isTrueWeaponQuery(query) {
  return ["true weapon", "true weapons", "tw"].includes(cleanText(query || "").toLowerCase());
}

function isTrueWeaponItem(item) {
  const text = `${item.name} ${(item.flat || {}).translate || ""}`.toLowerCase();
  return /^true\b/.test(text) || /^真/.test(cleanText(item.name || ""));
}

function renderCard(item) {
  const badgeClass = item.kind === "equipment" ? "badge equipment-badge" : "badge";
  const snippet = makeSnippet(item, item.terms);
  const matches = item.terms.filter((term) => item.haystack.includes(term)).slice(0, 5);
  const imageUrl = getItemImage(item);
  const displayName = getDisplayName(item);
  const metaMarkup = renderCardMeta(item);
  return `
    <article class="card card-${escapeAttr(item.kind)}" data-id="${escapeAttr(item.id)}" tabindex="0">
      <div class="card-top">
        ${renderImage(imageUrl, displayName, "card-image")}
        <div class="card-title">
          <h3>${highlight(displayName, item.terms)}</h3>
          <span class="${badgeClass}">${item.kind === "equipment" ? "Equip" : "Unit"}</span>
        </div>
      </div>
      ${metaMarkup}
      <a class="source-link" href="${escapeAttr(item.sourceFile)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">GitHub data file</a>
      <p class="snippet">${snippet}</p>
      <div class="match-list">${matches.map((term) => `<span>${escapeHtml(term)}</span>`).join("")}</div>
    </article>
  `;
}

function renderGuideCard(item) {
  return `
    <article class="card guide-card" data-id="${escapeAttr(item.id)}" tabindex="0">
      <div class="guide-card-top">
        <div>
          <div class="guide-card-meta">${escapeHtml(item.category || "Guide")}</div>
          <h3>${highlight(item.name, item.terms || [])}</h3>
        </div>
        <button class="guide-edit-button" type="button" data-edit-guide="${escapeAttr(item.id)}">Edit</button>
      </div>
      <p class="snippet">${highlight(truncate(item.summary || item.content || "No summary yet.", 180), item.terms || [])}</p>
      <div class="match-list">
        ${item.link ? `<span>Link</span>` : ""}
        <span>Updated ${escapeHtml(formatShortDate(item.updatedAt))}</span>
      </div>
    </article>
  `;
}

function renderCardMeta(item) {
  if (item.kind === "equipment") {
    const flat = item.flat || {};
    const typeIcon = getEquipmentTypeIcon(flat.type || "");
    const slot = item.slot || getEquipmentSlotLabel(flat.type || "Equipment");
    const star = cleanText(flat.star || "");
    return `
      <div class="card-meta card-meta-icon">
        ${typeIcon ? `<img src="${escapeAttr(typeIcon)}" alt="" loading="lazy" />` : ""}
        <span>${escapeHtml(slot || "Equipment")}${star ? ` / ${escapeHtml(star)} star` : ""}</span>
      </div>
    `;
  }

  const element = item.element || "Unknown";
  const race = item.race || "Unit";
  return `
    <div class="card-meta card-meta-icon">
      <span class="element-dot element-${escapeAttr(slug(element) || "unknown")}" aria-hidden="true">${escapeHtml(getInitials(element).slice(0, 1))}</span>
      <span>${escapeHtml(element)} / ${escapeHtml(race)}</span>
    </div>
  `;
}

function renderDetail() {
  if (!state.selected) {
    dom.detailPanel.classList.remove("is-open");
    dom.detailPanel.innerHTML = "";
    return;
  }
  if (state.selected.kind === "guide") {
    dom.detailPanel.classList.add("is-open");
    dom.detailPanel.innerHTML = renderGuideDetail(state.selected);
    const editButton = dom.detailPanel.querySelector("[data-open-guide-editor]");
    if (editButton) {
      editButton.addEventListener("click", () => {
        openGuideEditor(state.guides.find((guide) => guide.id === editButton.dataset.openGuideEditor));
      });
    }
    return;
  }
  const fields = Object.entries(state.selected.flat)
    .filter(([key, value]) => value && !/^(name|unit name|equip name|title)$/i.test(key))
    .slice(0, 80);
  const pageMarkup = state.selected.kind === "equipment" ? renderOriginalEquipmentDetail(state.selected) : renderOriginalUnitDetail(state.selected);
  const rawMarkup = state.detailMode === "indepth" ? renderRawDetailFields(fields, state.selected.terms || []) : "";
  dom.detailPanel.classList.add("is-open");
  dom.detailPanel.innerHTML = `${pageMarkup}${rawMarkup}`;
  bindDetailActions();
}

function renderGuideDetail(guide) {
  return `
    <article class="original-detail guide-detail">
      <header class="original-hero guide-hero">
        <div class="original-heading">
          <div class="original-kicker"><span>${escapeHtml(guide.category || "Guide")}</span></div>
          <h3>${escapeHtml(guide.name)}</h3>
          <p class="original-subtitle">Updated ${escapeHtml(formatDate(guide.updatedAt || guide.createdAt || new Date().toISOString()))}</p>
          <div class="detail-pills">
            ${guide.category ? `<span>${escapeHtml(guide.category)}</span>` : ""}
            ${guide.link ? `<span>External link</span>` : ""}
          </div>
        </div>
      </header>

      ${guide.summary ? `<section class="original-section"><p class="guide-summary">${escapeHtml(guide.summary)}</p></section>` : ""}

      <section class="original-section guide-content">
        ${renderGuideContent(guide.content)}
      </section>

      <section class="detail-bottom-grid guide-detail-actions">
        <button class="update-button add-guide-button" type="button" data-open-guide-editor="${escapeAttr(guide.id)}">Edit guide</button>
        ${guide.link ? `<a class="source-link guide-link-button" href="${escapeAttr(guide.link)}" target="_blank" rel="noreferrer">Open guide link</a>` : ""}
      </section>
    </article>
  `;
}

function renderGuideContent(content) {
  const blocks = cleanText(content || "").split(/\n\s*\n/).filter(Boolean);
  if (!blocks.length) return `<p>No guide content yet.</p>`;
  return blocks.map((block) => `<p>${escapeHtml(block)}</p>`).join("");
}

function bindDetailActions() {
  dom.detailPanel.querySelectorAll("[data-detail-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.detailTab = button.dataset.detailTab;
      renderDetail();
    });
  });
}

function renderRawDetailFields(fields, terms) {
  return `
    <section class="indepth-section">
      <h3>In-depth data</h3>
      <div class="detail-grid">
        ${fields
          .map(
            ([key, value]) => `
              <div class="detail-field">
                <span class="field-label">${escapeHtml(key)}</span>
                <div class="field-value">${highlight(value, terms)}</div>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderOriginalEquipmentDetail(item) {
  const flat = item.flat || {};
  const displayName = getDisplayName(item);
  const originalName = cleanText(item.name || "");
  const imageUrl = getItemImage(item, true);
  const typeIcon = getEquipmentTypeIcon(flat.type || "");
  const stats = [
    ["HP", flat["stats hp"]],
    ["ATK", flat["stats atk"]],
    ["DEF", flat["stats def"]],
  ];
  const passives = getNumberedFields(flat, "passive ability");
  const lore = flat.lore || "Lore not listed.";

  return `
    <article class="original-detail equipment-detail">
      <header class="original-hero">
        <div class="original-art equipment-art">
          ${renderImage(imageUrl, displayName, "detail-image")}
        </div>
        <div class="original-heading">
          <div class="original-kicker">
            ${typeIcon ? `<img src="${escapeAttr(typeIcon)}" alt="" loading="lazy" />` : ""}
            <span>${escapeHtml(item.slot || "Equipment")}</span>
          </div>
          <h3>${escapeHtml(displayName)}</h3>
          ${originalName && originalName !== displayName ? `<p class="original-subtitle">${escapeHtml(originalName)}</p>` : ""}
          <div class="detail-pills">
            <span>${renderStars(flat.star)}</span>
            <span>${escapeHtml(item.slot || "Equipment")}</span>
            ${flat.id ? `<span>ID ${escapeHtml(flat.id)}</span>` : ""}
          </div>
        </div>
      </header>

      <section class="original-section stat-band" aria-label="Equipment stats">
        ${renderStatCards(stats)}
      </section>

      <section class="original-section ability-grid" aria-label="Equipment abilities">
        ${renderAbilityPanel("Skill", flat["skillset skill"], flat["skillset skillbreak"] || flat["skillset break"], "skill")}
        ${renderAbilityPanel("Passive", passives.length ? passives.join(" ") : "No passive listed.", "", "passive")}
      </section>

      ${renderLorePanel(lore)}
    </article>
  `;
}

function renderOriginalUnitDetail(item) {
  const flat = item.flat || {};
  const displayName = getDisplayName(item);
  const imageUrl = getItemImage(item, true);
  const stats = [
    ["HP", combinePlus(flat["stats hp"], flat["stats hpplus"])],
    ["ATK", combinePlus(flat["stats atk"], flat["stats atkplus"])],
    ["DEF", combinePlus(flat["stats def"], flat["stats defplus"])],
  ];
  const passives = getNumberedFields(flat, "passive ability");
  const slots = getUnitSlots(flat);
  const lore = flat["lore evoawk"] || flat["lore evo5"] || flat.lore || "Lore not listed.";

  return `
    <article class="original-detail unit-detail">
      <header class="original-hero">
        <div class="original-art unit-art">
          ${renderImage(imageUrl, displayName, "detail-image")}
        </div>
        <div class="original-heading">
          <div class="original-kicker">
            <span class="element-dot element-${escapeAttr(slug(item.element) || "unknown")}" aria-hidden="true">${escapeHtml(getInitials(item.element || "GS").slice(0, 1))}</span>
            <span>${escapeHtml(item.element || "Unknown element")}</span>
          </div>
          <h3>${escapeHtml(displayName)}</h3>
          <p class="original-subtitle">${escapeHtml(item.race || "Race not listed")}</p>
          <div class="detail-pills">
            ${item.element ? `<span>${escapeHtml(item.element)}</span>` : ""}
            ${item.race ? `<span>${escapeHtml(item.race)}</span>` : ""}
            ${flat.id ? `<span>ID ${escapeHtml(flat.id)}</span>` : ""}
          </div>
          ${slots.length ? `<div class="slot-row">${slots.map(renderSlotBadge).join("")}</div>` : ""}
        </div>
      </header>

      <section class="original-section stat-band" aria-label="Unit stats">
        ${renderStatCards(stats)}
      </section>

      <section class="original-section ability-grid" aria-label="Unit abilities">
        ${renderAbilityPanel("Skill", flat["skillset skill"], flat["skillset skillbreak"], "skill")}
        ${renderAbilityPanel("Arts", flat["skillset arts"], flat["skillset artsbreak"], "arts")}
        ${renderAbilityPanel("True Arts", flat["skillset truearts"], flat["skillset trueartsbreak"], "true-arts")}
        ${renderAbilityPanel("Super Arts", flat["skillset superarts"], flat["skillset superartsbreak"], "super-arts")}
        ${renderAbilityPanel("Passive", passives.length ? passives.join(" ") : "No passive listed.", "", "passive")}
      </section>

      <section class="detail-bottom-grid">
        ${renderTrueWeaponPanel(flat)}
        ${renderLorePanel(lore)}
      </section>

      ${renderDreamEvolutionPanel(flat)}
    </article>
  `;
}

function renderStatCards(stats) {
  return stats
    .map(([label, value]) => `<div class="stat-card stat-${escapeAttr(label.toLowerCase())}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(cleanText(value || "0"))}</strong></div>`)
    .join("");
}

function renderAbilityPanel(label, value, breakValue, variant) {
  if (!cleanText(value || "")) return "";
  const breakText = cleanText(breakValue || "");
  return `
    <div class="ability-panel ability-${escapeAttr(variant)}">
      <div class="ability-title">
        <span class="ability-icon" aria-hidden="true">${escapeHtml(label.slice(0, 1))}</span>
        <h4>${escapeHtml(label)}</h4>
        ${breakText && breakText !== "0" ? `<strong>${escapeHtml(breakText)} BRK</strong>` : ""}
      </div>
      <p>${highlight(value, state.selected ? state.selected.terms || [] : [])}</p>
    </div>
  `;
}

function renderTrueWeaponPanel(flat) {
  const weapons = getTrueWeaponGroups(flat);
  if (!weapons.length) return "";
  return `
    <details class="original-section compact-panel collapsible-panel true-weapon-panel">
      <summary>
        <span class="collapse-heading">
          ${weapons[0].icon ? `<img src="${escapeAttr(weapons[0].icon)}" alt="" loading="lazy" />` : ""}
          <span>
            <strong>True Weapon</strong>
            <small>${escapeHtml(weapons.map((weapon) => weapon.name).join(" / "))}</small>
          </span>
        </span>
        <span class="collapse-hint">Show</span>
      </summary>
      <div class="collapse-content">
        <div class="dream-path-grid">
          ${weapons.map((weapon) => renderTrueWeaponCard(weapon)).join("")}
        </div>
      </div>
    </details>
  `;
}

function getTrueWeaponGroups(flat) {
  const indexed = [];
  ["true1", "true2", "true3"].forEach((suffix) => {
    const name = cleanText(flat[`trueweapon ${suffix} name`] || "");
    if (!name) return;
    indexed.push({
      name,
      icon: getEquipmentTypeIcon(flat[`trueweapon ${suffix} slot`] || ""),
      image: getAssetUrl(flat[`trueweapon ${suffix} detail`] || ""),
      skill: cleanText(flat[`trueweapon ${suffix} skill`] || ""),
      skillBreak: cleanText(flat[`trueweapon ${suffix} skillbreak`] || ""),
      passives: getNumberedFields(flat, `trueweapon ${suffix} passive ability`),
    });
  });
  if (indexed.length) return indexed;

  const legacyName = cleanText(flat["trueweapon name"] || "");
  if (!legacyName) return [];
  return [{
    name: legacyName,
    icon: getEquipmentTypeIcon(flat["trueweapon slot"] || ""),
    image: getAssetUrl(flat["trueweapon detail"] || ""),
    skill: cleanText(flat["trueweapon skill"] || ""),
    skillBreak: cleanText(flat["trueweapon skillbreak"] || ""),
    passives: getNumberedFields(flat, "trueweapon passive ability"),
  }];
}

function renderTrueWeaponCard(weapon) {
  return `
    <div class="dream-path-card true-weapon-card">
      <div class="true-weapon-layout">
        <div class="true-weapon-media">
          ${weapon.image ? renderImage(weapon.image, weapon.name, "weapon-image") : ""}
        </div>
        <div>
          <h4>${escapeHtml(weapon.name)}</h4>
          ${renderAbilityPanel("Skill", weapon.skill, weapon.skillBreak, "skill")}
          ${renderAbilityPanel("Passive", weapon.passives.join(" "), "", "passive")}
        </div>
      </div>
    </div>
  `;
}
function renderLorePanel(value) {
  const loreText = value || "Lore not listed.";
  const preview = truncate(cleanText(loreText), 110);
  return `
    <details class="original-section lore-panel compact-panel collapsible-panel">
      <summary>
        <span class="collapse-heading">
          <span>
            <strong>Lore</strong>
            <small>${escapeHtml(preview)}</small>
          </span>
        </span>
        <span class="collapse-hint">Show</span>
      </summary>
      <div class="collapse-content">
        <p>${highlight(loreText, state.selected ? state.selected.terms || [] : [])}</p>
      </div>
    </details>
  `;
}

function getUnitSlots(flat) {
  return [1, 2, 3, 4, 5]
    .map((index) => ({
      rank: cleanText(flat[`slots slot${index}`] || ""),
      icon: getAssetUrl(flat[`slots slot${index}type`] || ""),
      icons: getSlotIcons(flat, index),
      label: getSlotLabel(flat, index),
    }))
    .filter((slot) => slot.rank || slot.icon);
}

function renderSlotBadge(slot) {
  return `
    <span class="slot-badge">
      ${slot.icons.length ? `<span class="slot-icon-stack">${slot.icons.map((icon) => `<img src="${escapeAttr(icon)}" alt="" loading="lazy" />`).join("")}</span>` : slot.icon ? `<img src="${escapeAttr(slot.icon)}" alt="" loading="lazy" />` : ""}
      <strong>${escapeHtml(slot.rank || "-")}</strong>
      <span>${escapeHtml(slot.label || "Slot")}</span>
    </span>
  `;
}

function getSlotIcons(flat, index) {
  const shared = getAssetUrl(flat[`slots slot${index}type`] || "");
  const split = [
    getAssetUrl(flat[`slots slot${index}1type`] || ""),
    getAssetUrl(flat[`slots slot${index}2type`] || ""),
  ].filter(Boolean);
  return split.length ? split : shared ? [shared] : [];
}

function getSlotLabel(flat, index) {
  const splitLabels = [
    getEquipmentSlotLabel(flat[`slots slot${index}1type`] || ""),
    getEquipmentSlotLabel(flat[`slots slot${index}2type`] || ""),
  ].filter(Boolean);
  if (splitLabels.length) return splitLabels.join(" / ");
  return getEquipmentSlotLabel(flat[`slots slot${index}type`] || "");
}

function renderDreamEvolutionPanel(flat) {
  const groups = getDreamEvolutionGroups(flat);
  if (!groups.length) return "";
  return `
    <details class="original-section dream-panel compact-panel collapsible-panel">
      <summary>
        <span class="collapse-heading">
          <span>
            <strong>Dream Evolution</strong>
            <small>${escapeHtml(groups.map((group) => toTitleCase(group.name)).join(" / "))}</small>
          </span>
        </span>
        <span class="collapse-hint">Show</span>
      </summary>
      <div class="collapse-content">
        <div class="dream-path-grid">
          ${groups.map(renderDreamPath).join("")}
        </div>
      </div>
    </details>
  `;
}

function getDreamEvolutionGroups(flat) {
  const grouped = new Map();
  Object.entries(flat).forEach(([key, value]) => {
    if (!/^dream /i.test(key)) return;
    const match = key.match(/^dream\s+(.+?)\s+(evolution|passive ability)(.*)$/i);
    if (!match) return;
    const pathName = cleanText(match[1]);
    const kind = match[2].toLowerCase();
    const rest = cleanText(match[3]);
    if (!grouped.has(pathName)) grouped.set(pathName, { name: pathName, materials: [], passives: [] });
    const group = grouped.get(pathName);

    if (kind === "evolution") {
      const matMatch = rest.match(/^mat(\d+)$/i);
      const amtMatch = rest.match(/^mat(\d+)amt$/i);
      const hoverMatch = rest.match(/^hover(\d+)$/i);
      if (matMatch && value) {
        const index = Number(matMatch[1]) - 1;
        group.materials[index] = { ...(group.materials[index] || {}), image: value };
      }
      if (amtMatch && cleanText(value)) {
        const index = Number(amtMatch[1]) - 1;
        group.materials[index] = { ...(group.materials[index] || {}), amount: cleanText(value) };
      }
      if (hoverMatch && cleanText(value)) {
        const index = Number(hoverMatch[1]) - 1;
        group.materials[index] = { ...(group.materials[index] || {}), name: cleanText(value) };
      }
    }

    if (kind === "passive ability" && cleanText(value)) {
      group.passives.push(cleanText(value));
    }
  });

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      materials: group.materials.filter((entry) => entry && entry.image),
    }))
    .filter((group) => group.materials.length || group.passives.length);
}

function renderDreamPath(path) {
  return `
    <article class="dream-path-card">
      <h5>${escapeHtml(toTitleCase(path.name))}</h5>
      ${path.materials.length ? `<div class="dream-materials">${path.materials.map(renderDreamMaterial).join("")}</div>` : ""}
      ${path.passives.length ? `<ul class="dream-passives">${path.passives.map((passive) => `<li>${escapeHtml(passive)}</li>`).join("")}</ul>` : `<p class="dream-empty">No passive listed.</p>`}
    </article>
  `;
}

function renderDreamMaterial(material) {
  const url = getAssetUrl(material.image || "");
  return `
    <span class="dream-material-chip">
      ${url ? `<img src="${escapeAttr(url)}" alt="${escapeAttr(material.name || "Dream material")}" loading="lazy" />` : ""}
      <b>${escapeHtml(material.amount || "")}</b>
      ${material.name ? `<span>${escapeHtml(material.name)}</span>` : ""}
    </span>
  `;
}

function toTitleCase(value) {
  return cleanText(value)
    .split(/\s+/)
    .map((word) => word ? `${word[0].toUpperCase()}${word.slice(1)}` : word)
    .join(" ");
}

function renderEquipmentProfile(item) {
  const flat = item.flat || {};
  const typeIcon = getEquipmentTypeIcon(flat.type || "");
  const stats = [
    ["HP", flat["stats hp"]],
    ["ATK", flat["stats atk"]],
    ["DEF", flat["stats def"]],
  ];
  const passives = getNumberedFields(flat, "passive ability");
  return `
    <section class="profile-section">
      <div class="profile-main">
        <div class="type-logo">
          ${typeIcon ? `<img src="${escapeAttr(typeIcon)}" alt="${escapeAttr(item.slot || "Equipment type")}" />` : ""}
          <span>${escapeHtml(item.slot || "Equipment")}</span>
        </div>
        <div class="rarity-block">
          <span class="field-label">Rarity</span>
          <strong>${renderStars(flat.star)}</strong>
        </div>
      </div>
      <div class="stat-row">
        ${stats.map(([label, value]) => `<div class="stat-box"><span>${label}</span><strong>${escapeHtml(value || "0")}</strong></div>`).join("")}
      </div>
      <div class="profile-grid">
        ${renderProfileField("Skill", flat["skillset skill"])}
        ${renderProfileField("Break", flat["skillset break"])}
        ${renderProfileField("Passive", passives.length ? passives.join(" ") : "No passive listed.")}
      </div>
    </section>
  `;
}

function renderUnitProfile(item) {
  const flat = item.flat || {};
  const stats = [
    ["HP", combinePlus(flat["stats hp"], flat["stats hpplus"])],
    ["ATK", combinePlus(flat["stats atk"], flat["stats atkplus"])],
    ["DEF", combinePlus(flat["stats def"], flat["stats defplus"])],
  ];
  const passives = getNumberedFields(flat, "passive ability");
  return `
    <section class="profile-section">
      <div class="stat-row">
        ${stats.map(([label, value]) => `<div class="stat-box"><span>${label}</span><strong>${escapeHtml(value || "0")}</strong></div>`).join("")}
      </div>
      <div class="profile-grid">
        ${renderProfileField("Skill", flat["skillset skill"])}
        ${renderProfileField("Arts", flat["skillset arts"])}
        ${renderProfileField("True Arts", flat["skillset truearts"])}
        ${renderProfileField("Passive", passives.length ? passives.join(" ") : "No passive listed.")}
      </div>
    </section>
  `;
}

function renderProfileField(label, value) {
  return `
    <div class="profile-field">
      <span class="field-label">${escapeHtml(label)}</span>
      <p>${escapeHtml(cleanText(value || "Not listed."))}</p>
    </div>
  `;
}

function getNumberedFields(flat, prefix) {
  return Object.entries(flat)
    .filter(([key, value]) => key.startsWith(prefix) && cleanText(value))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, value]) => cleanText(value));
}

function combinePlus(base, plus) {
  const cleanBase = cleanText(base || "0");
  const cleanPlus = cleanText(plus || "");
  return cleanPlus && cleanPlus !== "0" ? `${cleanBase} +${cleanPlus}` : cleanBase;
}

function renderStars(value) {
  const count = Math.max(0, Math.min(6, Number(value) || 0));
  return count ? `${count} star` : "Not listed";
}

function getEquipmentTypeIcon(value) {
  return getAssetUrl(value);
}

function openDetailPage(item) {
  if (!item) return;
  state.returnScrollY = window.scrollY;
  state.selected = item;
  dom.listView.hidden = true;
  dom.detailView.hidden = false;
  renderDetail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeDetailPage(restoreScroll = true) {
  if (dom.detailView.hidden) return;
  dom.detailView.hidden = true;
  dom.listView.hidden = false;
  state.selected = null;
  dom.detailPanel.innerHTML = "";
  if (restoreScroll) window.scrollTo({ top: state.returnScrollY || 0, behavior: "smooth" });
}

function renderDetailMeta(item) {
  const pills = [];
  if (item.kind === "unit") {
    if (item.element) pills.push(item.element);
    if (item.race) pills.push(item.race);
  }
  if (item.kind === "equipment" && item.slot) pills.push(item.slot);
  return pills.length ? `<div class="detail-pills">${pills.map((pill) => `<span>${escapeHtml(pill)}</span>`).join("")}</div>` : "";
}

function makeSnippet(item, terms) {
  const search = buildSearch(state.query);
  const preferredValues = Object.entries(item.flat || {})
    .filter(([key, value]) => /^(skillset|passive|trueweapon skill|trueweapon passive ability)/i.test(key) && cleanText(value))
    .map(([, value]) => cleanText(value));
  const values = preferredValues.length ? preferredValues : Object.values(item.flat || {}).filter(Boolean).map((value) => cleanText(value));
  const found = values.find((value) => {
    const haystack = getSearchableText(value);
    if (search.requiresPhraseMatch) return matchesPhraseVariant(haystack, search.phraseVariants);
    return terms.some((term) => matchesSearchTerm(haystack, term));
  }) || values[0] || "";
  return highlight(truncate(found, 170), terms);
}

function ensureItemMetadata(item) {
  const kind = item.kind === "equipment" ? "equipment" : "unit";
  const name = cleanText(item.name || pickFirst(item.flat || {}, ["name", "unitName", "equipName", "title"]) || `${kind} item`);
  const flat = item.flat || {};
  return {
    ...item,
    kind,
    name,
    subtype: cleanText(item.subtype || pickFirst(flat, ["type", "role", "element", "equipType", "rarity", "race"]) || kind),
    image: item.image || pickImage(flat, kind),
    element: cleanText(item.element || flat.attribute || ""),
    race: cleanText(item.race || flat.type || flat.race || ""),
    slot: cleanText(item.slot || (kind === "equipment" ? getEquipmentSlotLabel(flat.type || "") : "")),
    haystack: item.haystack || cleanText(Object.values(flat).join(" ")).toLowerCase(),
    searchText: item.searchText || buildSearchCorpus(flat, kind, name, cleanText(item.subtype || pickFirst(flat, ["type", "role", "element", "equipType", "rarity", "race"]) || kind)),
    abilitySearchText: item.abilitySearchText || buildAbilitySearchCorpus(flat),
    sourceFile: item.sourceFile || SOURCE_FILES[kind],
    sourceOrder: item.sourceOrder,
  };
}

function pickFirst(flat, keys) {
  const entries = Object.entries(flat);
  for (const wanted of keys) {
    const match = entries.find(([key]) => key.toLowerCase().replace(/\s+/g, "") === wanted.toLowerCase());
    if (match) return match[1];
  }
  return "";
}

function pickImage(flat, kind, preferDetail = false) {
  const entries = Object.entries(flat).filter(([, value]) => isImagePath(value));
  const preferredKeys =
    kind === "equipment"
      ? preferDetail
        ? ["image detailmax", "image detail", "image thumbmax", "image thumb"]
        : ["image thumbmax", "image thumb", "image detailmax", "image detail"]
      : preferDetail
        ? ["image detailawk", "image detailsuper", "image detail5", "image detail"]
        : ["image thumbawk", "image thumbsuper", "image thumb5", "image thumb"];

  for (const preferred of preferredKeys) {
    const match = entries.find(([key]) => key.toLowerCase() === preferred);
    if (match) return match[1];
  }

  const thumbnail = entries.find(([key]) => key.toLowerCase().includes("thumb"));
  const detail = entries.find(([key]) => key.toLowerCase().includes("detail"));
  return (preferDetail ? detail?.[1] || thumbnail?.[1] : thumbnail?.[1] || detail?.[1]) || "";
}

function getItemImage(item, preferDetail = false) {
  const image = item.image && isImagePath(item.image) ? item.image : pickImage(item.flat || {}, item.kind, preferDetail);
  return getAssetUrl(image);
}

function openGuideEditor(guide = null) {
  state.editingGuideId = guide?.id || null;
  dom.guideDialogTitle.textContent = guide ? "Edit guide" : "Add guide";
  dom.deleteGuideButton.hidden = !guide;
  dom.guideTitleInput.value = guide?.name || "";
  dom.guideCategoryInput.value = guide?.category || "";
  dom.guideLinkInput.value = guide?.link || "";
  dom.guideSummaryInput.value = guide?.summary || "";
  dom.guideContentInput.value = guide?.content || "";
  dom.guideDialog.showModal();
}

function saveGuideFromForm(event) {
  event.preventDefault();
  const now = new Date().toISOString();
  const guide = {
    id: state.editingGuideId || `guide-${slug(dom.guideTitleInput.value || now)}-${Date.now()}`,
    kind: "guide",
    name: cleanText(dom.guideTitleInput.value),
    category: cleanText(dom.guideCategoryInput.value),
    summary: cleanText(dom.guideSummaryInput.value),
    content: dom.guideContentInput.value.trim(),
    link: cleanText(dom.guideLinkInput.value),
    createdAt: state.guides.find((entry) => entry.id === state.editingGuideId)?.createdAt || now,
    updatedAt: now,
    sourceFile: SOURCE_FILES.guide,
  };
  if (!guide.name) return;
  const existingIndex = state.guides.findIndex((entry) => entry.id === guide.id);
  if (existingIndex >= 0) state.guides.splice(existingIndex, 1, guide);
  else state.guides.unshift(guide);
  persistGuides();
  dom.guideDialog.close();
  state.type = "guide";
  state.page = 1;
  state.selected = null;
  dom.segments.forEach((segment) => segment.classList.toggle("is-active", segment.dataset.type === "guide"));
  render();
}

function deleteCurrentGuide() {
  if (!state.editingGuideId) return;
  state.guides = state.guides.filter((guide) => guide.id !== state.editingGuideId);
  persistGuides();
  dom.guideDialog.close();
  if (state.selected?.id === state.editingGuideId) closeDetailPage(false);
  render();
}

function loadGuides() {
  try {
    const guides = JSON.parse(localStorage.getItem(GUIDE_KEY));
    return Array.isArray(guides) ? guides.map((guide) => ({ kind: "guide", sourceFile: SOURCE_FILES.guide, ...guide })) : [];
  } catch {
    return [];
  }
}

function persistGuides() {
  localStorage.setItem(GUIDE_KEY, JSON.stringify(state.guides));
}

function getAssetUrl(value) {
  if (!isImagePath(value)) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/db/") || value.startsWith("db/")) {
    return `${RAW_PUBLIC_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
  }
  return `${ASSET_BASE}${value.startsWith("/") ? "" : "/"}${value}`;
}

function getDisplayName(item) {
  const translated = cleanText((item.flat || {}).translate || "");
  return translated || item.name;
}

function isImagePath(value) {
  return typeof value === "string" && /\.(png|webp|jpg|jpeg|gif)$/i.test(value);
}

function renderImage(url, name, className) {
  if (!url) {
    return `<div class="${className} image-fallback" aria-hidden="true">${escapeHtml(getInitials(name))}</div>`;
  }
  return `<img class="${className}" src="${escapeAttr(url)}" alt="${escapeAttr(name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'), { className: '${className} image-fallback', textContent: '${escapeAttr(getInitials(name))}' }))" />`;
}

function getInitials(name) {
  return cleanText(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "GS";
}

function cleanText(value) {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function highlight(value, terms) {
  let safe = escapeHtml(cleanText(value));
  const uniqueTerms = [...new Set(terms)].filter((term) => term.length > 1).slice(0, 10);
  uniqueTerms.forEach((term) => {
    safe = safe.replace(new RegExp(`(${escapeRegExp(term)})`, "ig"), "<mark>$1</mark>");
  });
  return safe;
}

function truncate(value, max) {
  const text = cleanText(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function humanize(value) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").toLowerCase();
}

function slug(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value) {
  if (!value) return "today";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY));
  } catch {
    return null;
  }
}

function saveCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(compactPayloadForStorage(payload)));
    return true;
  } catch (error) {
    console.warn("Could not save GitHub data cache.", error);
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.setItem(CACHE_KEY, JSON.stringify(compactPayloadForStorage(payload, true)));
      return true;
    } catch (retryError) {
      console.warn("Could not save compact GitHub data cache.", retryError);
      return false;
    }
  }
}

function compactPayloadForStorage(payload, smallest = false) {
  return {
    ...payload,
    items: payload.items.map((item) => {
      const compact = {
        id: item.id,
        kind: item.kind,
        name: item.name,
        subtype: item.subtype,
        image: item.image,
        element: item.element,
        race: item.race,
        slot: item.slot,
        flat: item.flat,
        sourceFile: item.sourceFile,
        sourceSha: item.sourceSha,
        sourceOrder: item.sourceOrder,
      };
      return smallest ? {
        kind: compact.kind,
        flat: compact.flat,
        sourceFile: compact.sourceFile,
        sourceSha: compact.sourceSha,
        sourceOrder: compact.sourceOrder,
      } : compact;
    }),
  };
}

function setLoading(isLoading, message = "") {
  dom.updateButton.disabled = isLoading;
  if (message) dom.syncStatus.textContent = message;
}
