'use strict';

/* ================= Speicher ================= */

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('promter.' + key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem('promter.' + key, JSON.stringify(value)); } catch { /* Speicher nicht verfügbar */ }
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const uuid = () => (crypto.randomUUID
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }));

const HISTORY_LIMIT = 50;
const LARGE_FIELDS = new Set(['material', 'beispiele', 'kontext']);

const state = {
  categories: store.get('categories', clone(DEFAULT_CATEGORIES)),
  templates: store.get('templates', clone(DEFAULT_TEMPLATES)),
  history: store.get('history', []),
  values: store.get('values', {}),
  ask: store.get('ask', false),
  format: store.get('format', 'headings'),
  showOutput: store.get('showOutput', true),
};

const saveCategories = () => store.set('categories', state.categories);
const saveTemplates = () => store.set('templates', state.templates);
const saveHistory = () => store.set('history', state.history);
const saveDraft = () => { store.set('values', state.values); store.set('ask', state.ask); };

/* ================= Prompt bauen (wie PromptBuilder.swift) ================= */

const QUESTIONS_TEXT = 'Falls dir Informationen fehlen, stelle mir zuerst Rückfragen, bevor du antwortest.';
const clean = (s) => (s || '').trim();

function xmlTag(title) {
  let s = title.toLowerCase();
  for (const [from, to] of [['ä', 'ae'], ['ö', 'oe'], ['ü', 'ue'], ['ß', 'ss'], ['&', ' und ']]) {
    s = s.split(from).join(to);
  }
  const tag = s.split(/[^\p{L}\p{N}]+/u).filter(Boolean).join('_');
  if (!tag) return 'abschnitt';
  return /^\p{N}/u.test(tag) ? 'abschnitt_' + tag : tag;
}

function buildPrompt() {
  const sections = state.categories
    .map((c) => [c.title, clean(state.values[c.id])])
    .filter(([, text]) => text);
  if (state.ask && sections.length) sections.push(['Rückfragen', QUESTIONS_TEXT]);

  return sections.map(([title, text]) => {
    if (state.format === 'xml') {
      const tag = xmlTag(title);
      return `<${tag}>\n${text}\n</${tag}>`;
    }
    return `## ${title}\n${text}`;
  }).join('\n\n');
}

function warnings() {
  const has = (id) => state.categories.some((c) => c.id === id);
  const text = (id) => clean(state.values[id]);
  const result = [];

  if (has('aufgabe')) {
    const task = text('aufgabe');
    if (!task) result.push('Die Aufgabe fehlt – ohne sie weiß die KI nicht, was sie tun soll.');
    else if ([...task].length < 25) result.push('Die Aufgabe ist sehr knapp. Je genauer, desto besser das Ergebnis.');
  }
  const placeholders = state.categories.filter((c) => text(c.id).includes('…')).map((c) => c.title);
  if (placeholders.length) result.push(`Platzhalter „…“ noch ergänzen in: ${placeholders.join(', ')}.`);
  if (has('kontext') && !text('kontext')) result.push('Kein Kontext – Hintergrundinfos verbessern das Ergebnis meist deutlich.');
  if (has('rolle') && !text('rolle')) result.push('Tipp: Eine Rolle hilft der KI, den passenden Blickwinkel einzunehmen.');
  return result;
}

/* ================= Vorschläge ================= */

const presetsOf = (c) => (c.presets || []).map((p) => p.trim()).filter(Boolean);
const containsPreset = (preset, id) => (state.values[id] || '').includes(preset);

function appendPreset(preset, id) {
  const current = clean(state.values[id]);
  if (!current) {
    state.values[id] = preset;
  } else {
    const separator = current.endsWith('.') || preset.endsWith('.') ? ' ' : ', ';
    state.values[id] = current + separator + preset;
  }
}

function removePreset(preset, id) {
  let text = state.values[id] || '';
  for (const pattern of [', ' + preset, preset + ', ', ' ' + preset, preset + ' ', preset]) {
    const index = text.indexOf(pattern);
    if (index !== -1) {
      text = text.slice(0, index) + text.slice(index + pattern.length);
      break;
    }
  }
  state.values[id] = text.trim();
}

/* ================= DOM-Helfer ================= */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child != null) node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'i');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#i-' + name);
  svg.append(use);
  return svg;
}

let toastTimer;
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 1800);
}

function grow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 2 + 'px';
}

const growAll = () => $$('textarea.field-input').forEach(grow);

/* ================= Eingabefelder ================= */

function fieldView(category) {
  const id = 'f-' + category.id;
  const textarea = el('textarea', {
    id,
    class: 'field-input' + (LARGE_FIELDS.has(category.id) ? ' large' : ''),
    rows: 1,
    placeholder: category.hint || '',
    'data-id': category.id,
    spellcheck: 'true',
  });
  textarea.value = state.values[category.id] || '';
  textarea.addEventListener('input', () => {
    state.values[category.id] = textarea.value;
    grow(textarea);
    changed();
  });

  const head = el('div', { class: 'field-head' }, el('label', { for: id }, category.title));
  if (presetsOf(category).length) {
    head.append(el('button', {
      class: 'presets-btn',
      type: 'button',
      'data-presets': category.id,
      onclick: () => openPresets(category),
    }, icon('presets'), el('span', { class: 'label' }, 'Vorschläge')));
  }
  return el('div', { class: 'field' }, head, textarea);
}

function renderFields() {
  const core = state.categories.filter((c) => !c.isOptional);
  const optional = state.categories.filter((c) => c.isOptional);
  $('#fields').replaceChildren(...core.map(fieldView));
  $('#optional-fields').replaceChildren(...optional.map(fieldView));
  $('#optional').hidden = optional.length === 0;
  $('#optional-paren').textContent = `(${optional.map((c) => c.title).join(', ')})`;
  $('#ask').checked = state.ask;
  requestAnimationFrame(growAll);
  updatePresetCounts();
}

function syncField(id) {
  const textarea = document.querySelector(`textarea[data-id="${CSS.escape(id)}"]`);
  if (textarea) {
    textarea.value = state.values[id] || '';
    grow(textarea);
  }
}

function updatePresetCounts() {
  for (const button of $$('[data-presets]')) {
    const category = state.categories.find((c) => c.id === button.dataset.presets);
    const n = category ? presetsOf(category).filter((p) => containsPreset(p, category.id)).length : 0;
    const label = $('.label', button);
    label.replaceChildren('Vorschläge', n ? el('span', { class: 'n' }, ` · ${n}`) : '');
  }
}

/* ================= Ausgabe ================= */

function updateOutput() {
  const prompt = buildPrompt();
  const pre = $('#prompt');
  pre.textContent = prompt || 'Hier erscheint dein Prompt, sobald du etwas einträgst.';
  pre.classList.toggle('empty', !prompt);

  const list = warnings();
  $('#warnings').replaceChildren(...list.map((w) => el('li', {}, icon('warn'), el('span', {}, w))));

  const chars = [...prompt].length;
  const countText = `${chars.toLocaleString('de-DE')} Zeichen · ca. ${Math.floor(chars / 4).toLocaleString('de-DE')} Tokens`;
  $('#count').textContent = countText;
  $('#compact-count').textContent = countText;

  const compactWarn = $('#compact-warnings');
  compactWarn.hidden = list.length === 0;
  compactWarn.replaceChildren(icon('warn'), `${list.length} Hinweis${list.length === 1 ? '' : 'e'}`);
  compactWarn.title = list.join('\n');

  $$('[data-copy]').forEach((b) => { b.disabled = !prompt; });
  $('#btn-share').disabled = !prompt;

  const optional = state.categories.filter((c) => c.isOptional);
  const filled = optional.filter((c) => clean(state.values[c.id])).length;
  const badge = $('#optional-badge');
  badge.hidden = filled === 0;
  badge.textContent = `${filled} ausgefüllt`;
  badge.title = 'Diese Angaben stehen im Prompt, obwohl der Bereich eingeklappt ist.';

  $$('#format-switch button').forEach((b) => b.classList.toggle('active', b.dataset.format === state.format));
}

function changed() {
  saveDraft();
  updateOutput();
  updatePresetCounts();
}

/* ================= Kopieren / Teilen / Verlauf ================= */

async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const helper = el('textarea', { readonly: true, style: 'position:fixed;opacity:0;top:0' });
    helper.value = text;
    document.body.append(helper);
    helper.select();
    const ok = document.execCommand('copy');
    helper.remove();
    return ok;
  }
}

function addHistory(prompt) {
  if (state.history[0]?.prompt === prompt) return;
  state.history.unshift({
    id: uuid(),
    date: new Date().toISOString(),
    values: clone(state.values),
    askQuestions: state.ask,
    prompt,
  });
  state.history = state.history.slice(0, HISTORY_LIMIT);
  saveHistory();
}

let copiedTimer;
async function copyPrompt() {
  const prompt = buildPrompt();
  if (!prompt) return;
  if (!(await writeClipboard(prompt))) {
    toast('Kopieren hat nicht geklappt');
    return;
  }
  addHistory(prompt);
  $$('[data-copy]').forEach((button) => {
    button.replaceChildren(icon('check'), el('span', {}, 'Kopiert!'));
  });
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    $$('[data-copy]').forEach((button) => button.replaceChildren(icon('copy'), el('span', {}, 'Kopieren')));
  }, 1500);
}

async function sharePrompt() {
  const prompt = buildPrompt();
  if (!prompt || !navigator.share) return;
  try {
    await navigator.share({ text: prompt });
    addHistory(prompt);
  } catch { /* abgebrochen */ }
}

/* ================= Dialoge ================= */

function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog.open) dialog.showModal();
  return dialog;
}

for (const dialog of $$('dialog')) {
  // Klick auf den abgedunkelten Hintergrund schließt den Dialog
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]')) dialog.close();
  });
}

/* ---------- Vorschläge (Mehrfachauswahl) ---------- */

function openPresets(category) {
  $('#presets-title').textContent = category.title;
  const boxes = [];
  const refresh = () => boxes.forEach(({ box, preset }) => { box.checked = containsPreset(preset, category.id); });

  const rows = presetsOf(category).map((preset) => {
    const box = el('input', { type: 'checkbox' });
    box.addEventListener('change', () => {
      if (box.checked) appendPreset(preset, category.id);
      else removePreset(preset, category.id);
      syncField(category.id);
      refresh();
      changed();
    });
    boxes.push({ box, preset });
    return el('label', { class: 'check-row' }, box, el('span', {}, preset));
  });

  $('#presets-list').replaceChildren(...rows);
  $('#presets-clear').onclick = () => {
    presetsOf(category).forEach((p) => removePreset(p, category.id));
    syncField(category.id);
    refresh();
    changed();
  };
  refresh();
  openDialog('dlg-presets');
}

/* ---------- Vorlagen ---------- */

function applyValues(values, askQuestions) {
  state.values = clone(values || {});
  state.ask = !!askQuestions;
  saveDraft();
  renderFields();
  updateOutput();
}

function renderTemplateList() {
  const list = $('#template-list');
  if (!state.templates.length) {
    list.replaceChildren(el('li', { class: 'empty' }, 'Noch keine Vorlagen.'));
    return;
  }
  list.replaceChildren(...state.templates.map((template) => el('li', {},
    el('button', {
      class: 'item',
      type: 'button',
      onclick: () => {
        applyValues(template.values, template.askQuestions);
        $('#dlg-templates').close();
        toast(`Vorlage „${template.name}“ geladen`);
      },
    }, el('span', { class: 'title' }, template.name)),
    el('button', {
      class: 'icon-btn',
      type: 'button',
      title: 'Vorlage löschen',
      'aria-label': `Vorlage „${template.name}“ löschen`,
      onclick: () => {
        if (!confirm(`Vorlage „${template.name}“ löschen?`)) return;
        state.templates = state.templates.filter((t) => t.id !== template.id);
        saveTemplates();
        renderTemplateList();
      },
    }, icon('trash')),
  )));
}

$('#btn-templates').addEventListener('click', () => {
  renderTemplateList();
  openDialog('dlg-templates');
});

$('#templates-restore').addEventListener('click', () => {
  const existing = new Set(state.templates.map((t) => t.name));
  const missing = DEFAULT_TEMPLATES.filter((t) => !existing.has(t.name));
  state.templates.push(...clone(missing));
  saveTemplates();
  renderTemplateList();
  toast(missing.length ? `${missing.length} Vorlage(n) wiederhergestellt` : 'Alle mitgelieferten Vorlagen sind vorhanden');
});

$('#templates-save').addEventListener('click', () => {
  $('#save-name').value = '';
  $('#save-overwrite').hidden = true;
  openDialog('dlg-save');
  $('#save-name').focus();
});

$('#save-name').addEventListener('input', () => {
  const name = $('#save-name').value.trim();
  const exists = state.templates.some((t) => t.name === name);
  $('#save-overwrite').hidden = !exists;
  $('#save-overwrite').textContent = `Die bestehende Vorlage „${name}“ wird überschrieben.`;
});

$('#save-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = $('#save-name').value.trim();
  if (!name) return;
  const values = Object.fromEntries(Object.entries(state.values).filter(([, v]) => clean(v)));
  const existing = state.templates.find((t) => t.name === name);
  if (existing) {
    existing.values = values;
    existing.askQuestions = state.ask;
  } else {
    state.templates.push({ id: uuid(), name, values, askQuestions: state.ask });
  }
  saveTemplates();
  renderTemplateList();
  $('#dlg-save').close();
  toast(`Vorlage „${name}“ gespeichert`);
});

/* ---------- Verlauf ---------- */

function renderHistory() {
  const list = $('#history-list');
  if (!state.history.length) {
    list.replaceChildren(el('li', { class: 'empty' }, 'Noch nichts kopiert.'));
    return;
  }
  const format = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  list.replaceChildren(...state.history.map((entry) => {
    const task = clean(entry.values?.aufgabe);
    return el('li', {}, el('button', {
      class: 'item',
      type: 'button',
      onclick: () => {
        applyValues(entry.values, entry.askQuestions);
        $('#dlg-history').close();
        toast('Eingaben aus dem Verlauf geladen');
      },
    },
    el('span', { class: 'title' }, task || entry.prompt.slice(0, 120)),
    el('span', { class: 'sub' }, format.format(new Date(entry.date)))));
  }));
}

$('#btn-history').addEventListener('click', () => {
  renderHistory();
  openDialog('dlg-history');
});

$('#history-clear').addEventListener('click', () => {
  if (!state.history.length || !confirm('Den gesamten Verlauf löschen?')) return;
  state.history = [];
  saveHistory();
  renderHistory();
});

/* ---------- Einstellungen: Kategorien ---------- */

function renderCategoryEditor(openId) {
  const editor = $('#category-editor');
  editor.replaceChildren(...state.categories.map((category, index) => {
    const item = el('details', { class: 'cat-item', open: category.id === openId });

    const nameNode = el('span', { class: 'name' }, category.title || 'Ohne Titel');
    const tagNode = el('span', { class: 'tag' }, category.isOptional ? 'optional' : '');
    const move = (delta) => (event) => {
      event.preventDefault();
      const target = index + delta;
      [state.categories[index], state.categories[target]] = [state.categories[target], state.categories[index]];
      saveCategories();
      renderCategoryEditor(item.open ? category.id : null);
    };

    const summary = el('summary', {},
      (() => { const c = icon('chevron'); c.classList.add('chevron'); return c; })(),
      nameNode, tagNode,
      el('button', { class: 'icon-btn', type: 'button', title: 'Nach oben', disabled: index === 0, onclick: move(-1) }, icon('up')),
      el('button', { class: 'icon-btn', type: 'button', title: 'Nach unten', disabled: index === state.categories.length - 1, onclick: move(1) }, icon('down')),
    );

    const title = el('input', { class: 'text-input', type: 'text', value: category.title });
    title.addEventListener('input', () => {
      category.title = title.value;
      nameNode.textContent = title.value || 'Ohne Titel';
      saveCategories();
    });

    const hint = el('input', { class: 'text-input', type: 'text', value: category.hint || '' });
    hint.addEventListener('input', () => { category.hint = hint.value; saveCategories(); });

    const optional = el('input', { type: 'checkbox' });
    optional.checked = !!category.isOptional;
    optional.addEventListener('change', () => {
      category.isOptional = optional.checked;
      tagNode.textContent = optional.checked ? 'optional' : '';
      saveCategories();
    });

    const presets = el('textarea', { class: 'text-input' });
    presets.value = (category.presets || []).join('\n');
    presets.addEventListener('input', () => {
      category.presets = presets.value.split('\n');
      saveCategories();
    });

    const remove = el('button', {
      class: 'secondary danger',
      type: 'button',
      onclick: () => {
        if (!confirm(`Kategorie „${category.title}“ löschen?`)) return;
        state.categories = state.categories.filter((c) => c.id !== category.id);
        saveCategories();
        renderCategoryEditor();
      },
    }, 'Kategorie löschen');

    item.append(summary, el('div', { class: 'cat-form' },
      el('label', {}, 'Überschrift', title),
      el('label', {}, 'Hinweis im leeren Feld', hint),
      el('label', { class: 'inline' }, optional, 'Optional (im ausklappbaren Bereich)'),
      el('label', {}, 'Vorschläge (einer pro Zeile)', presets),
      el('div', {}, remove),
    ));
    return item;
  }));
}

$('#btn-settings').addEventListener('click', () => {
  renderCategoryEditor();
  openDialog('dlg-settings');
});

$('#dlg-settings').addEventListener('close', () => {
  renderFields();
  updateOutput();
});

$('#cat-add').addEventListener('click', () => {
  const category = { id: uuid(), title: 'Neue Kategorie', hint: '', isOptional: true, presets: [] };
  state.categories.push(category);
  saveCategories();
  renderCategoryEditor(category.id);
});

$('#cat-reset').addEventListener('click', () => {
  if (!confirm('Kategorien auf Standard zurücksetzen? Eigene Kategorien und Änderungen gehen verloren.')) return;
  state.categories = clone(DEFAULT_CATEGORIES);
  saveCategories();
  renderCategoryEditor();
});

/* ---------- Einstellungen: Export / Import ---------- */

$('#data-export').addEventListener('click', async () => {
  const data = {
    app: 'Promter',
    format: 1,
    exportedAt: new Date().toISOString(),
    categories: state.categories,
    templates: state.templates,
  };
  const date = new Date().toISOString().slice(0, 10);
  const name = `Promter-Vorlagen-${date}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });

  // iPhone/iPad: Teilen-Menü („In Dateien sichern“), sonst normaler Download
  if (isIOS && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch { return; }
  }
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Export gespeichert');
});

$('#data-import').addEventListener('click', () => $('#import-file').click());

function validCategory(c) {
  return c && typeof c.id === 'string' && typeof c.title === 'string';
}

function validTemplate(t) {
  return t && typeof t.name === 'string' && t.values && typeof t.values === 'object';
}

$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;

  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    alert('Die Datei konnte nicht gelesen werden. Ist es ein Promter-Export?');
    return;
  }

  // Akzeptiert den Export-Bundle sowie einzelne Dateien der Mac-App (templates.json / categories.json)
  const templates = Array.isArray(data) ? data.filter(validTemplate) : (data.templates || []).filter(validTemplate);
  const categories = Array.isArray(data) ? data.filter(validCategory).filter((c) => !validTemplate(c)) : (data.categories || []).filter(validCategory);

  if (!templates.length && !categories.length) {
    alert('In der Datei wurden keine Vorlagen oder Kategorien gefunden.');
    return;
  }

  for (const template of templates) {
    const entry = {
      id: typeof template.id === 'string' ? template.id : uuid(),
      name: template.name,
      values: template.values,
      askQuestions: !!template.askQuestions,
    };
    const index = state.templates.findIndex((t) => t.name === entry.name);
    if (index === -1) state.templates.push(entry);
    else state.templates[index] = entry;
  }
  saveTemplates();

  let categoriesTaken = false;
  if (categories.length && confirm(`${categories.length} Kategorien gefunden. Sollen sie deine aktuellen Kategorien ersetzen?`)) {
    state.categories = categories.map((c) => ({
      id: c.id,
      title: c.title,
      hint: c.hint || '',
      isOptional: !!c.isOptional,
      presets: Array.isArray(c.presets) ? c.presets.filter((p) => typeof p === 'string') : [],
    }));
    saveCategories();
    renderCategoryEditor();
    categoriesTaken = true;
  }

  toast(`${templates.length} Vorlage(n) importiert${categoriesTaken ? ', Kategorien übernommen' : ''}`);
});

/* ---------- Hilfe ---------- */

$('#btn-help').addEventListener('click', () => {
  $('#help-categories').replaceChildren(...state.categories.flatMap((c) => [
    el('dt', {}, c.title, c.isOptional ? el('span', { class: 'tag' }, 'optional') : null),
    el('dd', {}, c.hint || ''),
  ]));
  openDialog('dlg-help');
});

/* ================= Toolbar & Bedienung ================= */

$('#btn-clear').addEventListener('click', () => {
  if (!confirm('Alle Eingaben leeren?')) return;
  applyValues({}, false);
});

function applyOutputVisibility() {
  document.body.classList.toggle('output-hidden', !state.showOutput);
  $('#btn-toggle-output').classList.toggle('active', !state.showOutput);
  requestAnimationFrame(growAll);
}

$('#btn-toggle-output').addEventListener('click', () => {
  state.showOutput = !state.showOutput;
  store.set('showOutput', state.showOutput);
  applyOutputVisibility();
});

for (const button of $$('.tabs [data-tab]')) {
  button.addEventListener('click', () => {
    document.body.dataset.tab = button.dataset.tab;
    $$('.tabs [data-tab]').forEach((b) => b.classList.toggle('active', b === button));
    if (button.dataset.tab === 'input') requestAnimationFrame(growAll);
  });
}

$$('#format-switch button').forEach((button) => button.addEventListener('click', () => {
  state.format = button.dataset.format;
  store.set('format', state.format);
  updateOutput();
}));

$('#ask').addEventListener('change', () => {
  state.ask = $('#ask').checked;
  changed();
});

$$('[data-copy]').forEach((button) => button.addEventListener('click', copyPrompt));

if (navigator.share) {
  $('#btn-share').hidden = false;
  $('#btn-share').addEventListener('click', sharePrompt);
}

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    copyPrompt();
  }
});

// Felder neu ausmessen, wenn sich die Breite ändert (Fenstergröße, iPad-Drehung)
new ResizeObserver(() => growAll()).observe($('.input-pane'));
$('#optional').addEventListener('toggle', () => requestAnimationFrame(growAll));

/* ---------- Hinweis „Zum Home-Bildschirm“ (nur iPhone/iPad im Browser) ---------- */

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
if (isIOS && !isStandalone && !store.get('installHintClosed', false)) {
  $('#install-hint').hidden = false;
}
$('#install-hint-close').addEventListener('click', () => {
  $('#install-hint').hidden = true;
  store.set('installHintClosed', true);
});

/* ---------- Offline-Fähigkeit ---------- */

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Offline-Modus weiter */ });
}

/* ---------- Start ---------- */

renderFields();
applyOutputVisibility();
updateOutput();
