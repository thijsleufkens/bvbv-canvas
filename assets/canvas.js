/* BVBV Canvas — JSON-driven template + in-browser edit + export */
(function () {
  'use strict';

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const html = (v) => Array.isArray(v) ? v.join('\n') : (v || '');

  // ---------- i18n ----------
  // The UI is Dutch by default; an English variant ("BVBV Canvas EN.html")
  // sets <html lang="en"> and gets the English strings. Console messages stay
  // Dutch (developer-facing only); everything the user can see is localised.
  const LANG = (document.documentElement.lang || 'nl').toLowerCase().startsWith('en') ? 'en' : 'nl';
  const I18N = {
    nl: {
      edit: 'Bewerk',
      editDone: 'Klaar met bewerken',
      hideBlock: 'Verberg blok',
      showBlock: 'Toon blok',
      hideToggleTitle: 'Verberg/toon dit blok',
      clearConfirm: 'Wis huidige inhoud en herstart met leeg canvas?',
      langUnsaved: 'Je hebt niet-opgeslagen wijzigingen. Wisselen van taal gooit ze weg. Toch doorgaan?',
      readError: 'Kon JSON niet lezen: ',
      downloads: 'Downloads',
      pickDirFailed: (m) => `Map kiezen mislukt: ${m}`,
      writeDirFailed: (m) => `Schrijven naar map mislukt: ${m} — val terug op opslag-dialoog`,
      saveFailed: (m) => `Opslaan mislukt: ${m} — val terug op download`,
      saveFallback: (reason) => `Save valt terug op Downloads — ${reason}`,
      reasonFile: 'open via http://localhost om silent save te enablen',
      reasonNoApi: 'browser ondersteunt geen File System Access API',
    },
    en: {
      edit: 'Edit',
      editDone: 'Done editing',
      hideBlock: 'Hide block',
      showBlock: 'Show block',
      hideToggleTitle: 'Hide/show this block',
      clearConfirm: 'Clear the current content and start over with an empty canvas?',
      langUnsaved: 'You have unsaved changes. Switching language will discard them. Continue anyway?',
      readError: 'Could not read JSON: ',
      downloads: 'Downloads',
      pickDirFailed: (m) => `Could not pick folder: ${m}`,
      writeDirFailed: (m) => `Writing to folder failed: ${m} — falling back to the save dialog`,
      saveFailed: (m) => `Save failed: ${m} — falling back to download`,
      saveFallback: (reason) => `Save falls back to Downloads — ${reason}`,
      reasonFile: 'open via http://localhost to enable silent save',
      reasonNoApi: 'browser does not support the File System Access API',
    },
  };
  const t = (key, ...args) => {
    const v = (I18N[LANG] || I18N.nl)[key];
    return typeof v === 'function' ? v(...args) : v;
  };

  const STORAGE_KEY = 'bvbv-canvas-draft';
  const IDB_NAME = 'bvbv-canvas';
  const IDB_STORE = 'handles';
  const IDB_KEY_DIR = 'projectsDir';
  let editMode = false;
  let dirty = false;                // unsaved edits since the last save/load
  let currentFileHandle = null;     // FileSystemFileHandle (one specific JSON file)
  let projectsDirHandle = null;     // FileSystemDirectoryHandle (the projects/ folder)
  let currentProjectFileName = null; // e.g. 'evoke.json' — preserved across save

  // ---------- IndexedDB (for persisting directory handle) ----------
  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbPut(key, value) {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
  async function idbGet(key) {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  }
  async function idbDel(key) {
    const db = await openIDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  async function ensureDirPermission(handle, mode = 'readwrite') {
    if (!handle) return false;
    try {
      let perm = await handle.queryPermission({ mode });
      if (perm === 'granted') return true;
      perm = await handle.requestPermission({ mode });
      return perm === 'granted';
    } catch (_) {
      return false;
    }
  }

  async function getProjectsDir(promptIfMissing) {
    if (projectsDirHandle && await ensureDirPermission(projectsDirHandle)) {
      return projectsDirHandle;
    }
    if (!promptIfMissing || !window.showDirectoryPicker) return null;
    try {
      // id must be alphanumeric + underscore only — hyphens make the call throw
      const handle = await window.showDirectoryPicker({
        id: 'bvbv_projects',
        mode: 'readwrite',
        startIn: 'documents',
      });
      projectsDirHandle = handle;
      try { await idbPut(IDB_KEY_DIR, handle); } catch (e) {
        console.warn('Kon dir-handle niet bewaren in IndexedDB:', e);
      }
      updateFolderHint();
      return handle;
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('showDirectoryPicker failed:', e);
        flashStatus(t('pickDirFailed', e.message), 'error');
      }
      return null;
    }
  }

  function updateFolderHint() {
    const hint = $('#folder-hint');
    if (!hint) return;
    if (projectsDirHandle && projectsDirHandle.name) {
      hint.textContent = `→ ${projectsDirHandle.name}/`;
      hint.hidden = false;
    } else {
      hint.hidden = true;
    }
  }

  // ---------- RENDER ----------
  function render(data) {
    if (!data) return;

    Object.entries(data.meta || {}).forEach(([k, v]) => {
      $$(`[data-meta="${k}"]`).forEach(el => { el.textContent = v; });
    });

    Object.entries(data.boxes || {}).forEach(([key, box]) => {
      const el = $(`[data-box="${key}"]`);
      if (el && box.html) {
        el.innerHTML = `<div class="filled">${html(box.html)}</div>`;
      }
      if (box.checks) {
        const row = $(`[data-checks="${key}"]`);
        if (row) {
          $$('[data-check]', row).forEach(label => {
            label.classList.toggle('checked', box.checks.includes(label.dataset.check));
          });
        }
      }
      if (box.tags) {
        const row = $(`[data-tags="${key}"]`);
        if (row) {
          $$('[data-tag]', row).forEach(tag => {
            tag.classList.remove('selected', 'crossed');
            const state = box.tags[tag.dataset.tag];
            if (state) tag.classList.add(state);
          });
        }
      }
      // Per-box hidden flag — apply to the wrapping .box element
      if (el) {
        const wrapper = el.closest('.box');
        if (wrapper) wrapper.classList.toggle('is-hidden', !!box.hidden);
      }
    });

    if (Array.isArray(data.qai) && data.qai.length) {
      const buildList = (key) => data.qai.map(r =>
        `<li${r.warn ? ' class="warn"' : ''}>${r[key] || ''}</li>`
      ).join('');
      ['q', 'a', 'i'].forEach(k => {
        const list = $(`[data-qai="${k}"]`);
        if (list) list.innerHTML = buildList(k);
      });
    }

    if (data.settings && data.settings.tall_sheets) {
      document.body.classList.add('tall-sheets');
    }

    const panel = $('.actions-panel');
    if (panel) {
      if (data.actions && data.actions.show !== false) {
        panel.removeAttribute('hidden');
        if (data.actions.title) {
          const titleEl = $('.actions-panel .title', panel);
          if (titleEl) titleEl.textContent = data.actions.title;
        }
        ['questions', 'materials', 'decisions'].forEach(key => {
          const list = $(`[data-actions="${key}"]`);
          if (list && data.actions[key]) {
            list.innerHTML = data.actions[key].map(i => `<li>${i}</li>`).join('');
          }
        });
      } else {
        panel.setAttribute('hidden', '');
      }
    }
  }

  // ---------- COLLECT (export) ----------
  function collect() {
    const data = { meta: {}, boxes: {}, qai: [], actions: {}, settings: {} };

    $$('[data-meta]').forEach(el => {
      const k = el.dataset.meta;
      if (data.meta[k] === undefined) data.meta[k] = el.textContent.trim();
    });

    $$('[data-box]').forEach(el => {
      const key = el.dataset.box;
      data.boxes[key] = data.boxes[key] || {};
      const filled = el.querySelector('.filled');
      if (filled) {
        const raw = filled.innerHTML.trim();
        data.boxes[key].html = raw.split(/\n+/).map(s => s.trim()).filter(Boolean);
      }
      const wrapper = el.closest('.box');
      if (wrapper && wrapper.classList.contains('is-hidden')) {
        data.boxes[key].hidden = true;
      }
    });

    $$('[data-checks]').forEach(row => {
      const key = row.dataset.checks;
      data.boxes[key] = data.boxes[key] || {};
      data.boxes[key].checks = $$('[data-check].checked', row).map(l => l.dataset.check);
    });

    $$('[data-tags]').forEach(row => {
      const key = row.dataset.tags;
      data.boxes[key] = data.boxes[key] || {};
      const tags = {};
      $$('[data-tag]', row).forEach(tag => {
        if (tag.classList.contains('selected')) tags[tag.dataset.tag] = 'selected';
        else if (tag.classList.contains('crossed')) tags[tag.dataset.tag] = 'crossed';
      });
      data.boxes[key].tags = tags;
    });

    const qLis = $$('[data-qai="q"] li');
    const aLis = $$('[data-qai="a"] li');
    const iLis = $$('[data-qai="i"] li');
    const max = Math.max(qLis.length, aLis.length, iLis.length);
    for (let n = 0; n < max; n++) {
      const warn = (qLis[n] && qLis[n].classList.contains('warn'))
        || (aLis[n] && aLis[n].classList.contains('warn'))
        || (iLis[n] && iLis[n].classList.contains('warn'));
      data.qai.push({
        q: (qLis[n] && qLis[n].innerHTML.trim()) || '',
        a: (aLis[n] && aLis[n].innerHTML.trim()) || '',
        i: (iLis[n] && iLis[n].innerHTML.trim()) || '',
        warn: !!warn
      });
    }

    const panel = $('.actions-panel');
    if (panel && !panel.hasAttribute('hidden')) {
      data.actions.show = true;
      ['questions', 'materials', 'decisions'].forEach(key => {
        data.actions[key] = $$(`[data-actions="${key}"] li`).map(li => li.innerHTML.trim());
      });
    } else {
      data.actions.show = false;
    }

    data.settings.tall_sheets = document.body.classList.contains('tall-sheets');
    return data;
  }

  // ---------- EDIT MODE ----------
  function setEdit(on) {
    editMode = on;
    document.body.classList.toggle('edit-mode', on);

    // Per-cell editables (text fields, box content)
    $$('[data-meta], [data-box] .filled').forEach(el => {
      el.contentEditable = on ? 'true' : 'false';
    });

    // Lists: make the *list* contentEditable so Enter creates new <li> natively
    $$('[data-actions], [data-qai]').forEach(list => {
      list.contentEditable = on ? 'true' : 'false';
      if (on && list.children.length === 0) {
        // Bootstrap so caret placement lands inside an <li>, not the bare list
        const li = document.createElement('li');
        li.innerHTML = '<br>';
        list.appendChild(li);
      } else if (!on) {
        // Prune trailing empty <li>s so the print/read view goes back to clean
        while (list.lastElementChild && isEmptyLi(list.lastElementChild)) {
          list.lastElementChild.remove();
        }
      }
    });

    // Per-box hide toggles
    $$('.box').forEach(box => {
      let btn = box.querySelector('.box-hide-toggle');
      if (on) {
        if (!btn) {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'box-hide-toggle screen-only';
          btn.title = t('hideToggleTitle');
          btn.addEventListener('click', onBoxHideClick);
          box.appendChild(btn);
        }
        updateHideBtnLabel(btn, box);
      } else if (btn) {
        btn.remove();
      }
    });

    const editBtn = $('#btn-edit');
    if (editBtn) editBtn.textContent = on ? t('editDone') : t('edit');
  }

  function updateHideBtnLabel(btn, box) {
    btn.textContent = box.classList.contains('is-hidden') ? t('showBlock') : t('hideBlock');
  }

  function onBoxHideClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const box = e.currentTarget.closest('.box');
    if (!box) return;
    box.classList.toggle('is-hidden');
    updateHideBtnLabel(e.currentTarget, box);
    autosave();
  }

  function onCheckClick(e) {
    if (!editMode) return;
    if (e.target.closest('[contenteditable="true"]')) return;
    e.preventDefault();
    e.currentTarget.classList.toggle('checked');
    autosave();
  }

  function onTagClick(e) {
    if (!editMode) return;
    e.preventDefault();
    const tag = e.currentTarget;
    if (tag.classList.contains('selected')) {
      tag.classList.replace('selected', 'crossed');
    } else if (tag.classList.contains('crossed')) {
      tag.classList.remove('crossed');
    } else {
      tag.classList.add('selected');
    }
    autosave();
  }

  // ---------- LIST EDITING ----------
  // For Q/A/I lists: keep the three columns row-aligned by mirroring
  // Enter (insert row) and Backspace-on-empty (remove row) across all three.
  function onQaiKeydown(e) {
    if (!editMode) return;
    const list = e.currentTarget;
    const li = (e.target.nodeType === 1 ? e.target : e.target.parentElement)?.closest('li');

    // Empty list — Enter should bootstrap a first <li>
    if (!li && e.key === 'Enter') {
      e.preventDefault();
      const fresh = document.createElement('li');
      fresh.innerHTML = '<br>';
      list.appendChild(fresh);
      ['q', 'a', 'i'].filter(k => k !== list.dataset.qai).forEach(k => {
        const other = $(`[data-qai="${k}"]`);
        if (other && other.children.length === 0) {
          const o = document.createElement('li');
          o.innerHTML = '<br>';
          other.appendChild(o);
        }
      });
      placeCaret(fresh);
      autosave();
      return;
    }

    if (!li) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const idx = Array.from(list.children).indexOf(li);
      const newLi = document.createElement('li');
      newLi.innerHTML = '<br>';
      li.after(newLi);
      ['q', 'a', 'i'].filter(k => k !== list.dataset.qai).forEach(k => {
        const other = $(`[data-qai="${k}"]`);
        if (!other) return;
        const otherLi = other.children[idx];
        const newOther = document.createElement('li');
        newOther.innerHTML = '<br>';
        if (otherLi) otherLi.after(newOther);
        else other.appendChild(newOther);
      });
      placeCaret(newLi);
      autosave();
      return;
    }

    if (e.key === 'Backspace' && isEmptyLi(li)) {
      // Only swallow if there is a previous sibling, or this is the only li
      const idx = Array.from(list.children).indexOf(li);
      const prev = li.previousElementSibling;
      e.preventDefault();
      li.remove();
      ['q', 'a', 'i'].filter(k => k !== list.dataset.qai).forEach(k => {
        const other = $(`[data-qai="${k}"]`);
        if (!other) return;
        const otherLi = other.children[idx];
        if (otherLi && isEmptyLi(otherLi)) otherLi.remove();
      });
      if (prev) placeCaret(prev, true);
      autosave();
    }
  }

  // For actions lists — let the browser handle Enter/Backspace natively
  // (works because the <ol>/<ul> itself is contentEditable). We only need
  // to bootstrap a first <li> when the list is empty.
  function onActionsKeydown(e) {
    if (!editMode) return;
    const list = e.currentTarget;
    if (e.key === 'Enter' && list.children.length === 0) {
      e.preventDefault();
      const fresh = document.createElement('li');
      fresh.innerHTML = '<br>';
      list.appendChild(fresh);
      placeCaret(fresh);
      autosave();
    }
  }

  function onListFocusIn(e) {
    if (!editMode) return;
    const list = e.currentTarget;
    if (list.children.length === 0) {
      const li = document.createElement('li');
      li.innerHTML = '<br>';
      list.appendChild(li);
      placeCaret(li);
    }
  }

  function isEmptyLi(li) {
    const txt = li.textContent.replace(/\u00a0/g, '').trim();
    return txt === '';
  }

  function placeCaret(el, atEnd = false) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(!atEnd);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    el.focus?.();
  }

  // ---------- SAVE / LOAD ----------
  function autosave() {
    if (!editMode) return;
    dirty = true;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(collect())); }
    catch (_) { /* quota — ignore */ }
  }

  function projectFileName(data) {
    // Prefer the source filename (what we loaded) so Save overwrites in place.
    // Only fall back to slugifying meta.project for fresh canvases or ⌘⇧S.
    if (currentProjectFileName) return currentProjectFileName;
    const slug = (data.meta.project || 'bvbv-canvas')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `${slug || 'bvbv-canvas'}.json`;
  }

  async function writeToHandle(handle, json) {
    const writable = await handle.createWritable();
    await writable.write(json);
    await writable.close();
  }

  async function exportJSON(opts) {
    const data = collect();
    const json = JSON.stringify(data, null, 2);
    const fileName = projectFileName(data);
    const forceDialog = opts && opts.saveAs;

    // Path 1 — persistent projects/ folder (silent overwrite by filename).
    // Only used if the user has *already* chosen the folder via "Map…".
    if (window.showDirectoryPicker && !forceDialog && projectsDirHandle) {
      const dir = await getProjectsDir(/*promptIfMissing*/ false);
      if (dir) {
        try {
          const fileHandle = await dir.getFileHandle(fileName, { create: true });
          await writeToHandle(fileHandle, json);
          currentFileHandle = fileHandle;
          flashSaved(`${dir.name}/${fileName}`);
          return;
        } catch (e) {
          console.warn('Schrijven naar projects/ map mislukt:', e);
          flashStatus(t('writeDirFailed', e.message), 'error');
          // fall through to per-file picker
        }
      }
    }

    // Path 2 — single-file picker (Save As, or no folder chosen yet)
    if (window.showSaveFilePicker) {
      try {
        const handle = (!forceDialog && currentFileHandle)
          ? currentFileHandle
          : await window.showSaveFilePicker({
              suggestedName: fileName,
              types: [{
                description: 'BVBV project JSON',
                accept: { 'application/json': ['.json'] }
              }],
            });
        currentFileHandle = handle;
        if (handle.name) currentProjectFileName = handle.name;
        await writeToHandle(handle, json);
        flashSaved(handle.name || fileName);
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.warn('showSaveFilePicker failed:', e);
        flashStatus(t('saveFailed', e.message), 'error');
      }
    }

    // Path 3 — classic download (Firefox/Safari/file:// origin)
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    flashSaved(`↓ ${fileName} (${t('downloads')})`);
  }

  async function forgetProjectsDir() {
    projectsDirHandle = null;
    try { await idbDel(IDB_KEY_DIR); } catch (_) { /* ignore */ }
    updateFolderHint();
  }

  function flashSaved(name) {
    dirty = false;
    flashStatus(`✓ ${name}`, 'ok');
  }

  function flashStatus(msg, kind = 'info') {
    const el = $('#status-pill');
    if (!el) { console.log('[bvbv]', msg); return; }
    el.textContent = msg;
    el.dataset.kind = kind;
    el.hidden = false;
    clearTimeout(flashStatus._t);
    flashStatus._t = setTimeout(() => { el.hidden = true; }, kind === 'error' ? 6000 : 2400);
  }

  async function openWithPicker() {
    if (!window.showOpenFilePicker) return false;
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'BVBV project JSON',
          accept: { 'application/json': ['.json'] }
        }],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      currentFileHandle = handle;
      currentProjectFileName = handle.name || file.name;
      clearRendered();
      render(data);
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return true; // user cancelled — handled
      console.warn('showOpenFilePicker failed:', e);
      return false;
    }
  }

  function loadFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        currentFileHandle = null; // we don't get a writable handle from <input type=file>
        currentProjectFileName = file.name;
        clearRendered();
        render(data);
      } catch (err) {
        alert(t('readError') + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function clearDraft() {
    if (!confirm(t('clearConfirm'))) return;
    localStorage.removeItem(STORAGE_KEY);
    currentFileHandle = null;
    currentProjectFileName = null;
    location.href = location.pathname;
  }

  function clearRendered() {
    $$('[data-box]').forEach(el => { el.innerHTML = '<div class="write-area"></div>'; });
    $$('.box.is-hidden').forEach(b => b.classList.remove('is-hidden'));
    $$('[data-check]').forEach(l => l.classList.remove('checked'));
    $$('[data-tag]').forEach(t => t.classList.remove('selected', 'crossed'));
    ['q', 'a', 'i'].forEach(k => {
      const list = $(`[data-qai="${k}"]`);
      if (list) list.innerHTML = '';
    });
    $$('[data-meta]').forEach(el => { el.textContent = ''; });
    $$('[data-actions]').forEach(l => { l.innerHTML = ''; });
    document.body.classList.remove('tall-sheets');
    const panel = $('.actions-panel');
    if (panel) panel.setAttribute('hidden', '');
  }

  // ---------- INIT ----------
  async function init() {
    // Diagnose origin — File System Access API needs a secure context
    // (https or http://localhost). file:// loses access to all of these APIs.
    const apiAvailable = !!window.showSaveFilePicker;
    if (!apiAvailable) {
      const reason = location.protocol === 'file:'
        ? t('reasonFile')
        : t('reasonNoApi');
      flashStatus(t('saveFallback', reason), 'info');
      console.warn('[bvbv] File System Access API niet beschikbaar:', {
        protocol: location.protocol,
        showSaveFilePicker: !!window.showSaveFilePicker,
        showDirectoryPicker: !!window.showDirectoryPicker,
      });
    }

    // Restore persisted projects/ folder handle if any (no prompt yet — must
    // wait for user gesture to verify permission)
    try {
      const stored = await idbGet(IDB_KEY_DIR);
      if (stored) projectsDirHandle = stored;
    } catch (e) {
      console.warn('Kon projects-dir handle niet uit IndexedDB halen:', e);
    }
    updateFolderHint();

    const params = new URLSearchParams(location.search);
    const projectPath = params.get('project');
    let data = null;

    if (projectPath) {
      try {
        const r = await fetch(projectPath);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        data = await r.json();
        // Preserve source filename so Save overwrites this file, not a derived slug
        const m = projectPath.match(/([^/]+\.json)$/i);
        if (m) currentProjectFileName = m[1];
      } catch (e) {
        console.warn('Kon project niet laden:', e);
      }
    } else {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { data = JSON.parse(saved); } catch (_) { /* ignore */ }
      }
    }

    if (data) render(data);

    const editBtn = $('#btn-edit');
    if (editBtn) editBtn.addEventListener('click', () => setEdit(!editMode));

    const saveBtn = $('#btn-save');
    if (saveBtn) saveBtn.addEventListener('click', () => exportJSON());

    const saveAsBtn = $('#btn-save-as');
    if (saveAsBtn) saveAsBtn.addEventListener('click', () => exportJSON({ saveAs: true }));

    const folderBtn = $('#btn-folder');
    if (folderBtn) {
      if (window.showDirectoryPicker) {
        folderBtn.addEventListener('click', async () => {
          await forgetProjectsDir();
          await getProjectsDir(true);
        });
      } else {
        folderBtn.hidden = true;
      }
    }

    const openBtn = $('#btn-open');
    const fileLabel = $('.btn-file');
    if (openBtn && window.showOpenFilePicker) {
      openBtn.addEventListener('click', openWithPicker);
      // Hide the upload-fallback when picker is available
      if (fileLabel) fileLabel.hidden = true;
    } else if (openBtn) {
      // No File System Access API — hide picker button, keep file upload
      openBtn.hidden = true;
    }

    const loadInput = $('#btn-load');
    if (loadInput) loadInput.addEventListener('change', loadFile);

    const clearBtn = $('#btn-clear');
    if (clearBtn) clearBtn.addEventListener('click', clearDraft);

    const printBtn = $('#btn-print');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    // Language toggle — jump to the other-language canvas in the same folder,
    // carrying the current ?project= file across (the JSON renders in either).
    const langBtn = $('#btn-lang');
    if (langBtn) {
      const dir = decodeURIComponent(location.pathname).replace(/[^/]*$/, '');
      const targetFile = LANG === 'en' ? 'BVBV Canvas.html' : 'BVBV Canvas EN.html';
      langBtn.addEventListener('click', () => {
        if (dirty && !confirm(t('langUnsaved'))) return;
        location.href = dir + targetFile + location.search;
      });
    }

    $$('[data-check]').forEach(l => l.addEventListener('click', onCheckClick));
    $$('[data-tag]').forEach(t => t.addEventListener('click', onTagClick));

    $$('[data-qai]').forEach(list => {
      list.addEventListener('keydown', onQaiKeydown);
      list.addEventListener('focusin', onListFocusIn);
    });
    $$('[data-actions]').forEach(list => {
      list.addEventListener('keydown', onActionsKeydown);
      list.addEventListener('focusin', onListFocusIn);
    });

    document.addEventListener('input', (e) => {
      if (!editMode) return;
      if (e.target && e.target.closest('[contenteditable="true"]')) autosave();
    });

    // Cmd/Ctrl+S → save
    document.addEventListener('keydown', (e) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === 's' && editMode) {
        e.preventDefault();
        exportJSON({ saveAs: e.shiftKey });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
