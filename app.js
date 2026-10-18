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

/* ================= Platzhalter {Name} ================= */

// Beginnt mit einem Buchstaben, dann Buchstaben/Ziffern/Leerzeichen/-/_ – so werden z. B.
// geschweifte Klammern in eingefügtem Code oder JSON nicht als Platzhalter erkannt.
const PLACEHOLDER_RE = /\{(\p{L}[\p{L}\p{N} _-]{0,30})\}/gu;

function placeholdersIn(values) {
  const names = new Set();
  for (const value of Object.values(values || {})) {
    for (const match of (value || '').matchAll(PLACEHOLDER_RE)) names.add(match[1].trim());
  }
  return [...names];
}

function today() {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
}

function suggestedValue(name) {
  if (/^datum$/i.test(name)) return today();
  return store.get('placeholderMemory', {})[name] || '';
}

function fillPlaceholders(filled) {
  for (const [key, value] of Object.entries(state.values)) {
    state.values[key] = (value || '').replace(PLACEHOLDER_RE, (all, name) => clean(filled[name.trim()]) || all);
  }
  const memory = store.get('placeholderMemory', {});
  for (const [name, value] of Object.entries(filled)) {
    if (clean(value) && !/^datum$/i.test(name)) memory[name] = value.trim();
  }
  store.set('placeholderMemory', memory);
  saveDraft();
  renderFields();
  updateOutput();
}

function openPlaceholderDialog() {
  const names = placeholdersIn(state.values);
  if (!names.length) return;
  const inputs = names.map((name) => {
    const input = el('input', { class: 'text-input', type: 'text', autocomplete: 'off', placeholder: name });
    input.value = suggestedValue(name);
    return { name, input };
  });
  $('#vars-fields').replaceChildren(...inputs.map(({ name, input }) => el('label', {}, name, input)));
  $('#vars-form').onsubmit = (event) => {
    event.preventDefault();
    fillPlaceholders(Object.fromEntries(inputs.map(({ name, input }) => [name, input.value])));
    $('#dlg-vars').close();
  };
  openDialog('dlg-vars');
  inputs[0].input.focus();
  inputs[0].input.select();
}

/* ================= Prüfen lassen ================= */

function reviewRequest(prompt) {
  return `Du bist Expertin bzw. Experte für das Schreiben von Prompts für KI-Assistenten.

Prüfe den folgenden Prompt, bevor ich ihn verwende. Er steht zwischen <prompt> und </prompt>. Führe ihn nicht aus.

<prompt>
${prompt}
</prompt>

Antworte in drei kurzen Abschnitten:
1. **Stärken:** Was ist schon gut?
2. **Lücken:** Welche Informationen fehlen oder sind unklar? Formuliere sie als konkrete Fragen an mich.
3. **Verbesserte Fassung:** der überarbeitete Prompt in derselben Gliederung, mit [Platzhaltern] dort, wo noch Informationen fehlen.`;
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
  const openVars = placeholdersIn(state.values);
  const items = list.map((w) => el('li', {}, icon('warn'), el('span', {}, w)));
  if (openVars.length) {
    items.unshift(el('li', { class: 'vars' }, icon('braces'),
      el('span', {}, `Platzhalter offen: ${openVars.map((n) => `{${n}}`).join(', ')} – `,
        el('button', { class: 'link-btn', type: 'button', onclick: openPlaceholderDialog }, 'jetzt ausfüllen'))));
    list.unshift(`Platzhalter offen: ${openVars.map((n) => `{${n}}`).join(', ')}`);
  }
  $('#warnings').replaceChildren(...items);

  const chars = [...prompt].length;
  const countText = `${chars.toLocaleString('de-DE')} Zeichen · ca. ${Math.floor(chars / 4).toLocaleString('de-DE')} Tokens`;
  $('#count').textContent = countText;
  $('#compact-count').textContent = countText;

  const compactWarn = $('#compact-warnings');
  compactWarn.hidden = list.length === 0;
  compactWarn.replaceChildren(icon('warn'), `${list.length} Hinweis${list.length === 1 ? '' : 'e'}`);
  compactWarn.title = list.join('\n');

  $$('[data-copy]').forEach((b) => { b.disabled = !prompt; });
  $$('[data-share]').forEach((b) => { b.disabled = !prompt; });
  $('#btn-review').disabled = !prompt;

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

const filledValues = (values) => Object.fromEntries(
  Object.entries(values || {}).filter(([, v]) => clean(v)).map(([k, v]) => [k, v.trim()]),
);

function sameValues(a, b) {
  const x = filledValues(a);
  const y = filledValues(b);
  const keys = Object.keys(x);
  return keys.length === Object.keys(y).length && keys.every((k) => x[k] === y[k]);
}

/**
 * Lädt Werte aus einer Vorlage oder dem Verlauf. Gingen dabei Eingaben verloren,
 * wird vorher gefragt: Ersetzen, nur leere Felder füllen oder abbrechen.
 */
function requestLoad({ title, values, askQuestions, done: finish }) {
  // Nach dem Laden gleich die Platzhalter der Vorlage abfragen
  const done = (mode) => { finish(mode); openPlaceholderDialog(); };
  const hasInput = Object.keys(filledValues(state.values)).length > 0;
  if (!hasInput || sameValues(state.values, values)) {
    applyValues(values, askQuestions);
    done('replace');
    return;
  }

  const dialog = $('#dlg-load');
  $('#load-title').textContent = title;
  $('#load-replace').onclick = () => {
    dialog.close();
    applyValues(values, askQuestions);
    done('replace');
  };
  $('#load-fill').onclick = () => {
    dialog.close();
    const merged = { ...state.values };
    for (const [key, value] of Object.entries(values || {})) {
      if (!clean(merged[key])) merged[key] = value;
    }
    applyValues(merged, state.ask || askQuestions);
    done('fill');
  };
  openDialog('dlg-load');
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
      onclick: () => requestLoad({
        title: `Vorlage „${template.name}“ laden?`,
        values: template.values,
        askQuestions: template.askQuestions,
        done: (mode) => {
          $('#dlg-templates').close();
          toast(mode === 'fill' ? `Leere Felder aus „${template.name}“ ergänzt` : `Vorlage „${template.name}“ geladen`);
        },
      }),
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
      onclick: () => requestLoad({
        title: 'Eintrag aus dem Verlauf laden?',
        values: entry.values,
        askQuestions: entry.askQuestions,
        done: (mode) => {
          $('#dlg-history').close();
          toast(mode === 'fill' ? 'Leere Felder aus dem Verlauf ergänzt' : 'Eingaben aus dem Verlauf geladen');
        },
      }),
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

/* ---------- Export / Import (gleiches Format wie die Mac-App) ---------- */

function validCategory(c) {
  return c && typeof c.id === 'string' && typeof c.title === 'string';
}

function validTemplate(t) {
  return t && typeof t.name === 'string' && t.values && typeof t.values === 'object';
}

/** Liste mit Häkchen; liefert eine Funktion, die die angehakten Einträge zurückgibt. */
function renderChecklist(container, items, label, sub, onChange) {
  const boxes = items.map((item) => {
    const box = el('input', { type: 'checkbox' });
    box.checked = true;
    box.addEventListener('change', onChange);
    const subText = sub(item);
    container.append(el('label', { class: 'check-row' }, box,
      el('span', {}, label(item), subText ? el('span', { class: 'sub ' + (subText.cls || '') }, subText.text) : null)));
    return { item, box };
  });
  const dialog = container.closest('dialog');
  for (const button of $$('[data-select]', dialog)) {
    button.onclick = () => {
      boxes.forEach(({ box }) => { box.checked = button.dataset.select === 'all'; });
      onChange();
    };
  }
  return () => boxes.filter(({ box }) => box.checked).map(({ item }) => item);
}

let exportSelection = () => [];

function updateExportSummary() {
  const n = exportSelection().length;
  const cats = $('#export-cats').checked;
  $('#export-summary').textContent = `${n} von ${state.templates.length} Vorlagen${cats ? ' + Kategorien' : ''}`;
  $('#export-confirm').disabled = n === 0 && !cats;
}

function openExport() {
  const list = $('#export-list');
  list.replaceChildren();
  exportSelection = renderChecklist(list, state.templates, (t) => t.name, () => null, updateExportSummary);
  $('#export-cats').checked = false;
  $('#export-cats').onchange = updateExportSummary;
  updateExportSummary();
  openDialog('dlg-export');
}

/** Präfix für Dateinamen nach dem Schema JJMMTTHHMM in Ortszeit, z. B. 2610180946 */
function fileStamp(date = new Date()) {
  const two = (n) => String(n).padStart(2, '0');
  return two(date.getFullYear() % 100) + two(date.getMonth() + 1) + two(date.getDate())
    + two(date.getHours()) + two(date.getMinutes());
}

async function saveFile(data, name) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });

  // iPhone/iPad: Teilen-Menü („In Dateien sichern“), sonst normaler Download
  if (isIOS && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return true; } catch { return false; }
  }
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

$('#export-confirm').addEventListener('click', async () => {
  const templates = exportSelection();
  const data = { app: 'Promter', format: 1, exportedAt: new Date().toISOString(), templates };
  if ($('#export-cats').checked) data.categories = state.categories;

  const name = templates.length === 1 && !data.categories
    ? `${fileStamp()}_Promter-Vorlage-${templates[0].name.replace(/[^\p{L}\p{N}]+/gu, '-')}.json`
    : `${fileStamp()}_Promter-Vorlagen.json`;
  if (await saveFile(data, name)) {
    $('#dlg-export').close();
    toast(`${templates.length} Vorlage(n) exportiert`);
  }
});

let importData = { templates: [], categories: [] };
let importSelection = () => [];

function updateImportSummary() {
  const n = importSelection().length;
  const cats = $('#import-cats').checked;
  $('#import-summary').textContent = `${n} von ${importData.templates.length} ausgewählt${cats ? ' + Kategorien' : ''}`;
  $('#import-confirm').disabled = n === 0 && !cats;
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

  // Akzeptiert Export-Dateien sowie die Dateien der Mac-App (templates.json / categories.json)
  const templates = (Array.isArray(data) ? data : (data.templates || [])).filter(validTemplate);
  const categories = (Array.isArray(data) ? data : (data.categories || [])).filter(validCategory).filter((c) => !validTemplate(c));
  if (!templates.length && !categories.length) {
    alert('In der Datei wurden keine Vorlagen oder Kategorien gefunden.');
    return;
  }

  importData = { templates, categories };
  $('#import-intro').textContent = templates.length
    ? `„${file.name}“ enthält ${templates.length} Vorlage(n). Wähle aus, welche übernommen werden sollen.`
    : `„${file.name}“ enthält keine Vorlagen, nur Kategorien.`;

  const list = $('#import-list');
  list.replaceChildren();
  importSelection = renderChecklist(list, templates, (t) => t.name,
    (t) => (state.templates.some((x) => x.name === t.name)
      ? { text: 'ersetzt deine bestehende Vorlage mit diesem Namen', cls: 'replace' }
      : { text: 'neu' }),
    updateImportSummary);
  $$('#dlg-import .select-tools').forEach((tools) => { tools.hidden = templates.length < 2; });

  $('#import-cats-row').hidden = categories.length === 0;
  $('#import-cats').checked = false;
  $('#import-cats').onchange = updateImportSummary;
  $('#import-cats-label').replaceChildren(`${categories.length} Kategorien übernehmen`,
    el('span', { class: 'sub' }, 'ersetzt deine aktuellen Kategorien'));
  updateImportSummary();
  openDialog('dlg-import');
});

$('#import-confirm').addEventListener('click', () => {
  const selected = importSelection();
  for (const template of selected) {
    const index = state.templates.findIndex((t) => t.name === template.name);
    // Eindeutige ID behalten, aber keine ID doppelt vergeben
    const idTaken = state.templates.some((t, i) => t.id === template.id && i !== index);
    const entry = {
      id: typeof template.id === 'string' && !idTaken ? template.id : uuid(),
      name: template.name,
      values: template.values,
      askQuestions: !!template.askQuestions,
    };
    if (index === -1) state.templates.push(entry);
    else state.templates[index] = entry;
  }
  saveTemplates();

  const takeCategories = $('#import-cats').checked;
  if (takeCategories) {
    state.categories = importData.categories.map((c) => ({
      id: c.id,
      title: c.title,
      hint: c.hint || '',
      isOptional: !!c.isOptional,
      presets: Array.isArray(c.presets) ? c.presets.filter((p) => typeof p === 'string') : [],
    }));
    saveCategories();
    renderFields();
    updateOutput();
  }

  $('#dlg-import').close();
  if ($('#dlg-templates').open) renderTemplateList();
  if ($('#dlg-settings').open) renderCategoryEditor();
  toast(`${selected.length} Vorlage(n) importiert${takeCategories ? ', Kategorien übernommen' : ''}`);
});

$$('[data-export-open]').forEach((b) => b.addEventListener('click', openExport));
$$('[data-import-open]').forEach((b) => b.addEventListener('click', () => $('#import-file').click()));

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

$('#btn-review').addEventListener('click', async () => {
  const prompt = buildPrompt();
  if (!prompt) return;
  if (await writeClipboard(reviewRequest(prompt))) toast('Prüf-Anfrage kopiert – jetzt in Claude einfügen');
  else toast('Kopieren hat nicht geklappt');
});

if (navigator.share) {
  $$('[data-share]').forEach((button) => {
    button.hidden = false;
    button.addEventListener('click', sharePrompt);
  });
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
