const { app, BrowserWindow, ipcMain } = require('electron');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// ——————————————————————————————————————————————————————————
//  UI (control.html)
// ——————————————————————————————————————————————————————————
const controlHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Div Screenshot Tool Pro</title>
  <style>
    * {margin:0;padding:0;box-sizing:border-box}
    body {
      font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
      background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
      color:#fff; padding:18px; min-height:100vh; overflow:auto;
    }
    .container {max-width:100%; display:flex; flex-direction:column; gap:14px; max-height:calc(100vh - 36px); overflow-y:auto}
    h1 {text-align:center; font-size:18px; font-weight:800; letter-spacing:.2px}
    .section {
      background: rgba(255,255,255,.15);
      border:1px solid rgba(255,255,255,.12);
      border-radius:14px; padding:14px; backdrop-filter: blur(12px);
    }
    .section h3 {font-size:14px; margin-bottom:10px; display:flex; align-items:center; gap:8px}
    .topbar {display:flex; align-items:center; justify-content:space-between; gap:10px}
    .active-mode {
      font-size:12px; background:rgba(0,0,0,.35); padding:6px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.1)
    }
    input[type="url"] {
      width:100%; padding:12px; border:none; border-radius:10px;
      background: rgba(255,255,255,.92); color:#222; font-size:14px; outline:none;
    }
    button {
      width:100%; border:none; cursor:pointer; font-weight:700; color:#fff;
      padding:12px 16px; border-radius:12px; transition: transform .15s ease, box-shadow .2s ease;
      box-shadow: 0 6px 18px rgba(0,0,0,.22);
    }
    button:hover {transform: translateY(-1px)}
    button:disabled {opacity:.55; cursor:not-allowed; transform:none}
    .primary {background: linear-gradient(135deg,#2196F3,#1976d2)}
    .success {background: linear-gradient(135deg,#4CAF50,#2e7d32)}
    .warning {background: linear-gradient(135deg,#FF9800,#ef6c00)}
    .danger  {background: linear-gradient(135deg,#f44336,#d32f2f)}
    .muted   {background: linear-gradient(135deg,#7c8aa6,#62718c)}
    .row {display:grid; grid-template-columns: 1fr 1fr; gap:10px}
    .row-3 {display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px}

    .mode-grid {display:grid; grid-template-columns: 1fr; gap:10px; margin-top:6px;}
    .mode-option {display:flex; align-items:flex-start; gap:12px; padding:14px; border-radius:14px;
      background: rgba(0,0,0,.28); border:2px solid transparent; cursor:pointer;
      transition: transform .12s ease, border-color .15s ease, background .15s ease;}
    .mode-option:hover {transform: translateY(-1px); border-color: rgba(255,255,255,.25)}
    .mode-option.selected {border-color:#00ff88; background: rgba(0,255,136,.18)}
    .mode-icon {font-size:22px; line-height:1}
    .mode-text {display:flex; flex-direction:column; gap:4px}
    .mode-title {font-size:14px; font-weight:800}
    .mode-desc  {font-size:12px; opacity:.9}
    .kbd {font-family: ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; font-size:11px; background: rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.22); padding:2px 6px; border-radius:6px;}

    .status {margin-top:10px; font-size:12px; padding:10px; border-radius:10px; background: rgba(0,0,0,.3); border:1px solid rgba(255,255,255,.12); min-height:20px; white-space:pre-wrap;}
    .status.success {background: rgba(76,175,80,.28); border-color:#4caf50}
    .status.error   {background: rgba(244,67,54,.28); border-color:#f44336}
    label.opt {display:flex; align-items:center; gap:8px}
  </style>
</head>
<body>
  <div class="container">
    <div class="topbar">
      <h1>🎯 Div Screenshot Tool Pro</h1>
      <div id="activeMode" class="active-mode">Mode: <strong>Isolation intelligente</strong> &nbsp;(<span class="kbd">1</span>/<span class="kbd">2</span>/<span class="kbd">3</span>)</div>
    </div>

    <div class="section" id="modesSection">
      <h3>⚙️ Mode de capture</h3>
      <div class="mode-grid" id="modeGrid">
        <div class="mode-option selected" data-mode="smart-isolation">
          <div class="mode-icon">🎯</div>
          <div class="mode-text">
            <div class="mode-title">Isolation intelligente <span class="kbd">1</span></div>
            <div class="mode-desc">Garde l’élément + ses enfants, masque tout le reste</div>
          </div>
        </div>
        <div class="mode-option" data-mode="background-only">
          <div class="mode-icon">🎨</div>
          <div class="mode-text">
            <div class="mode-title">Arrière-plans transparents <span class="kbd">2</span></div>
            <div class="mode-desc">Supprime les fonds, conserve tout le contenu</div>
          </div>
        </div>
        <div class="mode-option" data-mode="siblings-removal">
          <div class="mode-icon">👥</div>
          <div class="mode-text">
            <div class="mode-title">Masquer les frères <span class="kbd">3</span></div>
            <div class="mode-desc">Garde l’élément, masque ses éléments frères</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h3>🌐 Navigation</h3>
      <input type="url" id="urlInput" placeholder="https://exemple.com" />
      <div class="row">
        <button id="navigateBtn" class="muted">📍 Naviguer vers la page</button>
        <button id="toggleSelectionBtn" class="success" disabled>▶️ Activer la sélection</button>
      </div>
      <div id="navigationStatus" class="status">En attente d'une URL…</div>
      <div id="selectionStatus" class="status" style="margin-top:8px">Naviguer vers une page d’abord</div>
    </div>

    <div class="section">
      <h3>🧭 Navigation DOM</h3>
      <div class="row">
        <button id="domParentBtn" class="muted">⬆️ Parent</button>
        <button id="domChildBtn" class="muted">⬇️ Enfant</button>
      </div>
      <div class="row" style="margin-top:8px">
        <button id="domPrevBtn" class="muted">⬅️ Précédent</button>
        <button id="domNextBtn" class="muted">➡️ Suivant</button>
      </div>
      <div class="status" style="margin-top:10px">
        Raccourcis : ↑ parent, ↓ enfant, ← précédent, → suivant, + parent, - enfant
      </div>
    </div>

    <div class="section">
      <h3>🎬 Actions</h3>
      <div class="row">
        <button id="previewBtn" class="warning" disabled>👁️ Aperçu (3s)</button>
        <button id="captureBtn" class="primary" disabled>📸 Capturer HD</button>
      </div>
      <div class="row-3" style="margin-top:10px">
        <label class="opt"><input type="checkbox" id="removeSelfBg"> Fond de l’élément → transparent</label>
        <label class="opt"><input type="checkbox" id="removeOutsideImages" checked> Masquer images autour</label>
        <label class="opt"><input type="checkbox" id="removeInsideImages"> Masquer images dans l’élément</label>
      </div>
      <button id="resetBtn" class="danger" style="margin-top:10px" disabled>🔄 Réinitialiser</button>
      <div id="actionStatus" class="status">Sélectionner un élément d’abord</div>
    </div>

    <!-- 🧪 Qualité & Export -->
    <div class="section">
      <h3>🧪 Qualité & Export</h3>
      <div class="row" style="align-items:center">
        <div>
          <label class="opt" style="gap:12px">
            <span>Netteté (DPR)&nbsp;:</span>
            <input type="range" id="dprSlider" min="1" max="6" step="1" value="2" style="width:180px">
            <strong id="dprValue">2×</strong>
          </label>
        </div>
        <label class="opt" title="Génère un SVG via foreignObject (peut ne pas refléter tous les styles)">
          <input type="checkbox" id="exportSvg">
          Exporter en SVG (expérimental)
        </label>
      </div>
      <div class="status" style="margin-top:10px">
        Astuce : un DPR plus élevé = image plus nette mais fichier plus lourd.
      </div>
    </div>
  </div>
<style>
  .swatch { width: 26px; height: 26px; border-radius: 8px; border:1px solid rgba(255,255,255,.25); cursor:pointer }
  .swatch-grid { display:flex; gap:8px; align-items:center; flex-wrap:wrap }
  .input-color { width: 120px; height: 34px; border:none; border-radius:8px; padding:0 6px }
  .label-mini { font-size:12px; opacity:.85 }
  .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;z-index:9998}
  .modal{position:fixed;inset:0;display:none;place-items:center;z-index:9999}
  .modal.active,.modal-backdrop.active{display:grid}
  .modal-card{width:min(860px,95vw);max-height:min(85vh,900px);overflow:hidden;border-radius:16px;background:#0f172a;color:#fff;border:1px solid rgba(255,255,255,.15);box-shadow:0 20px 60px rgba(0,0,0,.5)}
  .modal-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.1)}
  .modal-title{font-weight:800}
.modal-body {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 12px;
  padding: 14px 16px;
  height: 100%; /* important */
}
  .toolbar{display:flex;gap:8px;flex-wrap:wrap}
  .toolbar input{flex:1;padding:10px;border-radius:10px;border:none}
  .chips{display:flex;gap:8px;flex-wrap:wrap}
  .chip{padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);cursor:pointer}
.grid {
  overflow: auto;
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 12px;
  max-height: 50vh; /* ou plus petit selon la taille écran */
}
  .modal-card {
  width: min(860px, 95vw);
  max-height: min(85vh, 900px);
  overflow-y: auto; /* <-- AJOUT ICI */
  border-radius: 16px;
  background: #0f172a;
  color: #fff;
  border: 1px solid rgba(255,255,255,.15);
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
}
  .row-style{display:grid;grid-template-columns: 220px 1fr auto;gap:8px;align-items:center;padding:8px 10px;border-bottom:1px dashed rgba(255,255,255,.07)}
  .row-style:last-child{border-bottom:none}
  .row-style input[type="checkbox"]{transform:translateY(1px)}
  .modal-footer{display:flex;justify-content:flex-end;gap:8px}
</style>

<div id="styleModalBackdrop" class="modal-backdrop"></div>
<div id="styleModal" class="modal" role="dialog" aria-modal="true" aria-label="Mode Capture Personnalisé">
  <div class="modal-card">
    <div class="modal-header">
      <div class="modal-title">🧰 Mode de capture personnalisé</div>
      <button id="styleModalClose" class="danger" style="width:auto;padding:8px 12px">Fermer</button>
    </div>
    <div class="modal-body">
      <div class="toolbar">
        <input id="styleSearch" type="search" placeholder="Rechercher un style (ex: background, box-shadow, transform)…" />
        <div class="chips">
          <button id="btnCheckAll"   class="muted chip">Tout cocher</button>
          <button id="btnUncheckAll" class="muted chip">Tout décocher</button>
          <button id="btnEssentials" class="chip success">Essentiels</button>
        </div>
      </div>
      <div class="chips" style="align-items:center; justify-content:space-between">
  <div class="label-mini">Fond de prévisualisation :</div>
  <div class="swatch-grid">
    <button class="chip" id="bgTransparent">Transparent</button>
    <div id="bgLight"  class="swatch" title="#ffffff" style="background:#ffffff"></div>
    <div id="bgDark"   class="swatch" title="#000000" style="background:#000000"></div>
    <div id="bgGrid"   class="swatch" title="Damier" style="background:
      conic-gradient(#ddd 25%, #fff 0 50%, #ddd 0 75%, #fff 0) 0/16px 16px;"></div>
    <input id="bgPicker" class="input-color" type="color" value="#0f172a" />
  </div>
</div>
      <div id="styleList" class="grid" style="min-height:260px"></div>
      <div class="modal-footer">
        <button id="styleModalCancel" class="muted">Annuler</button>
        <button id="styleModalConfirm" class="primary">📸 Capturer avec ces styles</button>
      </div>
    </div>
  </div>
</div>

  <script>
    const { ipcRenderer } = require('electron');
    const urlInput = document.getElementById('urlInput');
    const navigateBtn = document.getElementById('navigateBtn');
    const toggleSelectionBtn = document.getElementById('toggleSelectionBtn');
    const previewBtn = document.getElementById('previewBtn');
    const captureBtn = document.getElementById('captureBtn');
    const resetBtn = document.getElementById('resetBtn');
    const navigationStatus = document.getElementById('navigationStatus');
    const selectionStatus = document.getElementById('selectionStatus');
    const actionStatus = document.getElementById('actionStatus');
    const activeModeLabel = document.getElementById('activeMode');
    const domParentBtn = document.getElementById('domParentBtn');
    const domChildBtn  = document.getElementById('domChildBtn');
    const domPrevBtn   = document.getElementById('domPrevBtn');
    const domNextBtn   = document.getElementById('domNextBtn');

    const removeSelfBg = document.getElementById('removeSelfBg');
    const removeOutsideImages = document.getElementById('removeOutsideImages');
    const removeInsideImages = document.getElementById('removeInsideImages');

    // Nouveaux contrôles
    const dprSlider = document.getElementById('dprSlider');
    const dprValue  = document.getElementById('dprValue');
    const btnEss = document.getElementById('btnEssentials');
const ESSENTIALS = [
  'background','background-image','background-color','backdrop-filter',
  'box-shadow','border','border-radius','outline',
  'opacity','mix-blend-mode','filter','transform','transform-origin',
  'color','font','font-size','font-weight','text-shadow','line-height',
  'width','height','padding','margin','display','position','z-index',
  'overflow','overflow-x','overflow-y'
];
// utilitaires modal (place-les avant les addEventListener)
const modal      = document.getElementById('styleModal');
const backdrop   = document.getElementById('styleModalBackdrop');
const styleList  = document.getElementById('styleList');
const styleSearch= document.getElementById('styleSearch');
const btnAll     = document.getElementById('btnCheckAll');
const btnNone    = document.getElementById('btnUncheckAll');
const btnClose   = document.getElementById('styleModalClose');
const btnCancel  = document.getElementById('styleModalCancel');
const btnConfirm = document.getElementById('styleModalConfirm');
// --- Contrôles fond preview ---
const bgTransparentBtn = document.getElementById('bgTransparent');
const bgLightSwatch    = document.getElementById('bgLight');
const bgDarkSwatch     = document.getElementById('bgDark');
const bgGridSwatch     = document.getElementById('bgGrid');
const bgPicker         = document.getElementById('bgPicker');

// Helper pour appliquer le fond côté page
async function setPreviewBg(cssBackground) {
  await ipcRenderer.invoke('set-preview-bg', { background: cssBackground || 'transparent' });
}

// Presets
bgTransparentBtn?.addEventListener('click', (e)=>{ e.preventDefault(); setPreviewBg('transparent'); });
bgLightSwatch?.addEventListener('click',   ()=> setPreviewBg('#ffffff'));
bgDarkSwatch?.addEventListener('click',    ()=> setPreviewBg('#000000'));
bgGridSwatch?.addEventListener('click',    ()=> setPreviewBg('conic-gradient(#ddd 25%, #fff 0 50%, #ddd 0 75%, #fff 0) 0/16px 16px'));

// Color picker
bgPicker?.addEventListener('input', ()=> setPreviewBg(bgPicker.value));


btnCancel.onclick = async () => {
  await ipcRenderer.invoke('live-reset-styles');
  await ipcRenderer.invoke('remove-isolation');
  await setPreviewBg('transparent'); // remet le fond par défaut
  closeModal();
  updateStatus(actionStatus, 'Prévisualisation annulée, tout est restauré.', 'success');
};
btnConfirm.addEventListener('click', async () => {
const selected = Array.from(selectionState.entries())
  .filter(([, keep]) => keep)
  .map(([prop]) => prop);
  closeModal();
  updateStatus(actionStatus, 'Capture haute définition en cours… 📸', '');

  // ✅ On réinitialise le live preview
  await ipcRenderer.invoke('live-reset-styles');

  // ✅ On retire le masque d'isolement et le fond de prévisualisation
  await ipcRenderer.invoke('remove-isolation');
  await setPreviewBg('transparent');

  // 📸 On lance la capture finale
  const res = await ipcRenderer.invoke('capture-element', {
    removeSelfBg: !!removeSelfBg.checked,
    removeOutsideImages: !!removeOutsideImages.checked,
    removeInsideImages: !!removeInsideImages.checked,
    dpr: Math.max(1, Math.min(6, parseInt(dprSlider.value, 10) || 2)),
    selectedStyles: selected
  });

  if (res && res.success) {
    const files = Array.isArray(res.filenames) ? res.filenames.join(', ') : res.filename;
    updateStatus(actionStatus, "✅ Fichier(s) : " + files, "success");
  } else {
    updateStatus(actionStatus, '❌ Erreur: ' + (res?.error || 'inconnue'), 'error');
  }
});

btnEss?.addEventListener('click', (e)=>{
  e.preventDefault();
  styleList.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.checked = ESSENTIALS.includes(cb.dataset.prop);
  });
});

    let isSelectionActive = false;
    let hasSelectedElement = false;

    const modeTitles = {
      'smart-isolation': 'Isolation intelligente',
      'background-only': 'Arrière-plans transparents',
      'siblings-removal': 'Masquer les frères'
    };
    function updateActiveModeLabel(mode) {
      activeModeLabel.innerHTML = 'Mode: <strong>' + (modeTitles[mode] || '—') + '</strong> &nbsp;(<span class="kbd">1</span>/<span class="kbd">2</span>/<span class="kbd">3</span>)';
    }
    function selectModeByIndex(idx) {
      const options = Array.from(document.querySelectorAll('.mode-option'));
      if (!options[idx]) return;
      options.forEach(o => o.classList.remove('selected'));
      options[idx].classList.add('selected');
      options[idx].scrollIntoView({block:'nearest', behavior:'smooth'});
      const mode = options[idx].getAttribute('data-mode');
      updateActiveModeLabel(mode);
    }
    document.querySelectorAll('.mode-option').forEach((opt, idx) => {
      opt.addEventListener('click', () => selectModeByIndex(idx));
    });
    document.addEventListener('keydown', (e) => {
      if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === '1') selectModeByIndex(0);
      if (e.key === '2') selectModeByIndex(1);
      if (e.key === '3') selectModeByIndex(2);
    });
    updateActiveModeLabel('smart-isolation');
    function getSelectedMode() {
      const el = document.querySelector('.mode-option.selected');
      return el ? el.getAttribute('data-mode') : 'smart-isolation';
    }
    function updateStatus(el, msg, type) { el.textContent = msg; el.className = 'status' + (type ? ' ' + type : ''); }

    // Binding DPR label
    dprSlider.addEventListener('input', () => {
      dprValue.textContent = dprSlider.value + '×';
    });

    navigateBtn.addEventListener('click', async () => {
      const url = urlInput.value.trim();
      if (!url) { updateStatus(navigationStatus, 'Veuillez entrer une URL', 'error'); return; }
      navigateBtn.disabled = true;
      updateStatus(navigationStatus, 'Navigation en cours…', '');
      const res = await ipcRenderer.invoke('navigate-to-url', url);
      if (res && res.success) {
        updateStatus(navigationStatus, 'Page chargée avec succès ! 🚀', 'success');
        toggleSelectionBtn.disabled = false;
        updateStatus(selectionStatus, 'Prêt à sélectionner des éléments', 'success');
      } else {
        updateStatus(navigationStatus, 'Erreur: ' + (res && res.error ? res.error : 'inconnue'), 'error');
      }
      navigateBtn.disabled = false;
    });
    urlInput.addEventListener('keypress', (e)=>{ if(e.key==='Enter') navigateBtn.click(); });

    toggleSelectionBtn.addEventListener('click', async () => {
      isSelectionActive = !isSelectionActive;
      await ipcRenderer.invoke('toggle-selection', isSelectionActive);
      toggleSelectionBtn.textContent = isSelectionActive ? '⏹️ Désactiver' : '▶️ Activer la sélection';
      toggleSelectionBtn.className = isSelectionActive ? 'danger' : 'success';
      updateStatus(selectionStatus, isSelectionActive ? 'Mode sélection activé — cliquez un élément' : 'Mode sélection désactivé', isSelectionActive ? '' : 'success');

      if (isSelectionActive) {
        const timer = setInterval(async () => {
          const el = await ipcRenderer.invoke('get-selected-element');
          if (el && !hasSelectedElement) {
            hasSelectedElement = true;
            const cornerInfo = el.hasRoundedCorners ? ' 🔄 Coins arrondis détectés' : '';
            updateStatus(selectionStatus, \`Élément sélectionné: \${el.tagName}\${el.id ? '#' + el.id : ''} (\${el.width}x\${el.height})\${cornerInfo}\`, 'success');
            previewBtn.disabled = false; captureBtn.disabled = false; resetBtn.disabled = false;
            updateStatus(actionStatus, 'Prêt pour la capture haute qualité ! ✨', 'success');
            clearInterval(timer);
          }
        }, 800);
        setTimeout(()=>clearInterval(timer), 60000);
      } else {
        hasSelectedElement = false;
        previewBtn.disabled = true; captureBtn.disabled = true; resetBtn.disabled = true;
        updateStatus(actionStatus, 'Sélectionner un élément d’abord', '');
      }
    });

    previewBtn.addEventListener('click', async () => {
      const options = { mode: getSelectedMode(), isPreview: true };
      updateStatus(actionStatus, 'Application de l’aperçu…', '');
      await ipcRenderer.invoke('apply-background-changes', options);
      updateStatus(actionStatus, 'Aperçu appliqué pour 3 secondes ⏱️', 'success');
    });


function openModal(){ modal.classList.add('active'); backdrop.classList.add('active'); }
function closeModal(){ modal.classList.remove('active'); backdrop.classList.remove('active'); }
btnClose.onclick = btnCancel.onclick; // ferme + restaure comme "Annuler"

// NEW: rendu de la liste (tout coché par défaut)
// — Etat global de sélection des styles
let lastStyles = [];                 // [{prop, value}]
let selectionState = new Map();      // prop -> boolean (true = garder)
let currentRenderedProps = [];       // props actuellement affichées (filtrées)
function renderStyles(filterText='') {
  const frag = document.createDocumentFragment();
  const q = filterText.trim().toLowerCase();
  const list = q
    ? lastStyles.filter(s => s.prop.toLowerCase().includes(q) || s.value.toLowerCase().includes(q))
    : lastStyles;

  currentRenderedProps = list.map(s => s.prop);

  list.forEach(({prop, value}) => {
    const row = document.createElement('div');
    row.className='row-style';

    const left = document.createElement('div');
    left.textContent = prop;

    const mid  = document.createElement('div'); 
    mid.style.opacity=.9; 
    mid.style.fontFamily='ui-monospace,monospace'; 
    mid.textContent = value;

    const right= document.createElement('div');
    const cb = document.createElement('input'); 
    cb.type='checkbox'; 
    cb.dataset.prop=prop;
    cb.checked = selectionState.get(prop) ?? true; // use global state
    right.appendChild(cb);

    row.append(left, mid, right);
    frag.appendChild(row);
  });

  styleList.innerHTML='';
  styleList.appendChild(frag);
}


styleSearch.addEventListener('input', ()=>renderStyles(styleSearch.value));
// helper: coche/décoche + déclenche la préview live
function setCheckedAndPreview(cb, val) {
  if (cb.checked !== val) {
    cb.checked = val;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

btnAll.addEventListener('click', (e) => {
  e.preventDefault();
  for (const prop of currentRenderedProps) {
    selectionState.set(prop, true);
  }
  styleList.querySelectorAll('input[type=checkbox]').forEach(cb => setCheckedAndPreview(cb, true));
});

btnNone.addEventListener('click', (e) => {
  e.preventDefault();
  for (const prop of currentRenderedProps) {
    selectionState.set(prop, false);
  }
  styleList.querySelectorAll('input[type=checkbox]').forEach(cb => setCheckedAndPreview(cb, false));
});

btnEss?.addEventListener('click', (e) => {
  e.preventDefault();
  styleList.querySelectorAll('input[type=checkbox]').forEach(cb => {
    const keep = ESSENTIALS.includes(cb.dataset.prop);
    selectionState.set(cb.dataset.prop, keep);
    setCheckedAndPreview(cb, keep);
  });
});



// CHANGED: au clic, on ouvre la pop-up et on charge les styles
captureBtn.addEventListener('click', async () => {
  if (!hasSelectedElement) { updateStatus(actionStatus, 'Sélectionner un élément d’abord', 'error'); return; }

  // 1) Isoler visuellement tout de suite
  await ipcRenderer.invoke('apply-background-changes', { isPreview: false });

  // 2) Charger les styles et ouvrir le modal
  updateStatus(actionStatus, 'Récupération des styles de l’élément…', '');
  const res = await ipcRenderer.invoke('get-computed-styles');
  if (!res || !res.success) {
    updateStatus(actionStatus, '❌ Impossible de lire les styles: ' + (res?.error||'inconnue'), 'error');
    // si erreur, on retire l’isolement
    await ipcRenderer.invoke('remove-isolation');
    return;
  }
lastStyles = res.styles.sort((a,b)=>a.prop.localeCompare(b.prop));

if (selectionState.size === 0) {
  for (const {prop} of lastStyles) selectionState.set(prop, true);
}

renderStyles();
openModal();
  await setPreviewBg('conic-gradient(#ddd 25%, #fff 0 50%, #ddd 0 75%, #fff 0) 0/16px 16px');
});
  // 🎯 Gère le clic sur les cases à cocher pour prévisualiser en direct
styleList.addEventListener('change', async (e) => {
  const cb = e.target;
  if (cb && cb.matches('input[type="checkbox"][data-prop]')) {
    const prop = cb.dataset.prop;
    const keep = cb.checked;
    selectionState.set(prop, keep); // update global state
    await ipcRenderer.invoke('live-toggle-style', { prop, keep });
  }
});


    async function nudge(dir) {
      const res = await ipcRenderer.invoke('nudge-selection', dir);
      if (res && res.success) {
        updateStatus(selectionStatus, \`Élément: \${res.tagName}\${res.id ? '#'+res.id : ''} (\${res.width}x\${res.height})\`, 'success');
        previewBtn.disabled = false; captureBtn.disabled = false; resetBtn.disabled = false;
        updateStatus(actionStatus, 'Prêt pour la capture haute qualité ! ✨', 'success');
      } else if (res && res.reason === 'no-target') {
        updateStatus(selectionStatus, 'Aucun élément dans cette direction.', 'error');
      }
    }
    domParentBtn.addEventListener('click', () => nudge('parent'));
    domChildBtn.addEventListener('click',  () => nudge('child'));
    domPrevBtn.addEventListener('click',   () => nudge('prev'));
    domNextBtn.addEventListener('click',   () => nudge('next'));
    document.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowUp')    { e.preventDefault(); nudge('parent'); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); nudge('child'); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); nudge('prev'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nudge('next'); }
      if (e.key === '+')          { e.preventDefault(); nudge('parent'); }
      if (e.key === '-')          { e.preventDefault(); nudge('child'); }
    });

    resetBtn.addEventListener('click', async () => {
      await ipcRenderer.invoke('reset-selection');
      isSelectionActive = false; hasSelectedElement = false;
      toggleSelectionBtn.textContent = '▶️ Activer la sélection';
      toggleSelectionBtn.className = 'success';
      previewBtn.disabled = true; captureBtn.disabled = true; resetBtn.disabled = true;
      updateStatus(selectionStatus, 'Prêt à sélectionner des éléments', 'success');
      updateStatus(actionStatus, 'Sélectionner un élément d’abord', '');
    });
  </script>
</body>
</html>`;

// ——————————————————————————————————————————————————————————
//  App
// ——————————————————————————————————————————————————————————
class ElectronDivScreenshotTool {
  constructor() {
    this.browser = null;
    this.page = null;
    this.controlWindow = null;
    this.isReady = false;
  }

  async setupElectron() {
    await app.whenReady();

    this.controlWindow = new BrowserWindow({
      width: 540,
      height: 860,
      minWidth: 420,
      minHeight: 600,
      resizable: true,
      maximizable: true,
      fullscreenable: true,
      autoHideMenuBar: true,
      useContentSize: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      },
      title: '🎯 Div Screenshot Tool Pro'
    });

    fs.writeFileSync(path.join(__dirname, 'control.html'), controlHTML);
    await this.controlWindow.loadFile(path.join(__dirname, 'control.html'));
    this.controlWindow.center();

    this.setupIPC();
    console.log('✅ Interface Electron prête');
  }

  setupIPC() {
    ipcMain.handle('navigate-to-url', async (event, url) => {
      try {
        console.log(`📍 Navigation vers ${url}...`);
        await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
        await this.page.evaluate(() => new Promise(r => setTimeout(r, 800)));
        await this.setupDivSelector();
        console.log('✅ Page chargée et sélecteur initialisé');
        return { success: true };
      } catch (e) {
        console.error('❌ Erreur navigate:', e.message);
        return { success: false, error: e.message };
      }
    });


    ipcMain.handle('set-preview-bg', async (event, { background }) => {
      try {
        await this.page.evaluate((bg) => {
          const layer = document.querySelector('.__capture_bg_layer');
          if (layer) {
            layer.style.background = bg || 'transparent';
          } else {
            // Fallback: style sur html/body si la couche n’existe pas
            const ID = '__capture_bg_style';
            let tag = document.getElementById(ID);
            if (!tag) { tag = document.createElement('style'); tag.id = ID; document.head.appendChild(tag); }
            tag.textContent = `html, body { background: ${bg || 'transparent'} !important; }`;
          }
        }, background);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });




    ipcMain.handle('live-reset-styles', async () => {
      try {
        await this.page.evaluate(() => {
          const sel = window.__divSelector?.selectedElement;
          const saved = window.__live_preview_saved || {};
          if (sel) {
            for (const [k, v] of Object.entries(saved)) {
              sel.style.setProperty(k, v || '');
            }
          }
          window.__live_preview_saved = {};
        });
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });

    ipcMain.handle('toggle-selection', async (event, isActive) => {
      await this.page.evaluate((active) => {
        if (window.__divSelector) {
          window.__divSelector.isActive = active;
          document.body.style.cursor = active ? 'crosshair' : 'default';
          if (!active) {
            document.querySelectorAll('.div-selector-highlight,.div-selector-hover').forEach(el => {
              el.classList.remove('div-selector-highlight', 'div-selector-hover');
            });
          }
        }
      }, isActive);
      return { success: true };
    });

    ipcMain.handle('get-selected-element', async () => {
      const elementInfo = await this.page.evaluate(() => {
        if (window.__divSelector && window.__divSelector.selectedElement) {
          const selected = window.__divSelector.selectedElement;
          const rect = selected.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(selected);
          return {
            tagName: selected.tagName,
            className: selected.className,
            id: selected.id,
            x: Math.round(rect.left),
            y: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            borderRadius: computedStyle.borderRadius,
            hasRoundedCorners: computedStyle.borderRadius !== '0px' && computedStyle.borderRadius !== 'none'
          };
        }
        return null;
      });
      return elementInfo;
    });

    ipcMain.handle('apply-background-changes', async (event, { isPreview }) => {
      await this.page.evaluate((preview) => {
        const S_ID = '__capture_mask_styles';
        const BG_ID = '__capture_bg_layer';

        function addMask() {
          if (!window.__divSelector || !window.__divSelector.selectedElement) return false;
          const sel = window.__divSelector.selectedElement;

          sel.classList.add('__capture_target');

          // Marque les ancêtres
          let a = sel.parentElement;
          const ancestors = [];
          while (a) {
            a.setAttribute('data-capture-ancestor', '1');
            ancestors.push(a);
            if (a === document.documentElement) break;
            a = a.parentElement;
          }

          // CSS masque + autoriser la couche fond
          let css = `
        * { visibility: hidden !important; }
        html, body { background: transparent !important; visibility: visible !important; }
        [data-capture-ancestor="1"] {
          visibility: visible !important;
          background: transparent !important;
          background-image: none !important;
        }
        .__capture_target, .__capture_target * {
          visibility: visible !important;
          mix-blend-mode: normal !important;
          backdrop-filter: none !important;
          opacity: 1 !important;
        }
        .__capture_bg_layer { visibility: visible !important; }
        .div-selector-highlight, .div-selector-hover { outline: none !important; box-shadow: none !important; }
        .div-selector-highlight::before { display: none !important; }
      `;
          let style = document.getElementById(S_ID);
          if (!style) {
            style = document.createElement('style');
            style.id = S_ID;
            document.head.appendChild(style);
          }
          style.textContent = css;

          // Couche de fond sous la cible (pour la couleur de preview)
          let bg = document.getElementById(BG_ID);
          if (!bg) {
            bg = document.createElement('div');
            bg.id = BG_ID;
            bg.className = '__capture_bg_layer';
            Object.assign(bg.style, {
              position: 'fixed',
              inset: '0',
              pointerEvents: 'none',
              background: 'transparent', // sera modifié via set-preview-bg
              zIndex: '2147483646' // juste sous la cible
            });
            document.body.appendChild(bg);
          }

          // s'assurer que la cible est au-dessus
          sel.style.position ||= 'relative';
          sel.style.zIndex = '2147483647';

          window.__capture_mask = { ancestors, S_ID, BG_ID };
          sel.scrollIntoView({ block: 'center', inline: 'center' });
          return true;
        }

        function removeMask() {
          const m = window.__capture_mask;

          // retire le marquage ancêtres
          if (m && m.ancestors) m.ancestors.forEach(el => el.removeAttribute('data-capture-ancestor'));

          // supprime le style masque
          const style = document.getElementById(m?.S_ID || '__capture_mask_styles');
          if (style) style.remove();

          // supprime la couche de fond
          const bg = document.getElementById(m?.BG_ID || '__capture_bg_layer');
          if (bg) bg.remove();

          // retire la classe cible
          const sel = window.__divSelector?.selectedElement;
          sel?.classList.remove('__capture_target');

          // fallback: retire aussi le style fallback de fond s'il existe
          const bgStyle = document.getElementById('__capture_bg_style');
          if (bgStyle) bgStyle.remove();

          delete window.__capture_mask;
        }

        if (window.__capture_mask) removeMask();
        const ok = addMask(); if (!ok) return;
        if (preview) setTimeout(removeMask, 3000);
      }, isPreview);

      return { success: true };
    });

    // NEW: renvoie toutes les propriétés & valeurs calculées de l’élément sélectionné
    ipcMain.handle('get-computed-styles', async () => {
      try {
        const data = await this.page.evaluate(() => {
          const sel = window.__divSelector?.selectedElement;
          if (!sel) return null;
          const cs = getComputedStyle(sel);
          const props = Array.from(cs); // liste de propriétés
          // Fabrique objets {prop, value}; filtre valeurs vides juste pour alléger un peu
          const styles = props.map(p => ({ prop: p, value: cs.getPropertyValue(p) || '' }))
            .filter(s => s.value !== '');
          return { tag: sel.tagName, styles };
        });
        if (!data) return { success: false, error: 'Aucune sélection' };
        return { success: true, styles: data.styles };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });


    ipcMain.handle('nudge-selection', async (event, direction) => {
      const info = await this.page.evaluate((dir) => {
        if (!window.__divSelector || !window.__divSelector.selectedElement) {
          return { success: false, reason: 'no-selection' };
        }
        const clearOld = (el) => { el.classList.remove('div-selector-highlight', 'div-selector-hover'); };
        const applyNew = (el) => { window.__divSelector.selectedElement = el; el.classList.add('div-selector-highlight'); };
        let sel = window.__divSelector.selectedElement;
        let target = null;
        switch (dir) {
          case 'parent': target = sel.parentElement || null; break;
          case 'child': target = Array.from(sel.children).find(Boolean) || null; break;
          case 'prev': target = sel.previousElementSibling || null; break;
          case 'next': target = sel.nextElementSibling || null; break;
          default: return { success: false, reason: 'bad-direction' };
        }
        if (!target) return { success: false, reason: 'no-target' };
        clearOld(sel); applyNew(target);
        const rect = target.getBoundingClientRect();
        return { success: true, tagName: target.tagName, id: target.id || '', className: target.className || '', width: Math.round(rect.width), height: Math.round(rect.height) };
      }, direction);
      return info;
    });

    ipcMain.handle('remove-isolation', async () => {
      await this.page.evaluate(() => {
        const m = window.__capture_mask;
        if (m && m.ancestors) m.ancestors.forEach(el => el.removeAttribute('data-capture-ancestor'));
        const style = document.getElementById(m?.S_ID || '__capture_mask_styles'); if (style) style.remove();
        const sel = window.__divSelector?.selectedElement; sel?.classList.remove('__capture_target');
        delete window.__capture_mask;

        // ✅ retire aussi le style de fond de preview
        const bg = document.getElementById('__capture_bg_style'); if (bg) bg.remove();
        const bgLayer = document.querySelector('.__capture_bg_layer'); if (bgLayer) bgLayer.remove();
        const bgStyle = document.getElementById('__capture_bg_style'); if (bgStyle) bgStyle.remove();
      });
      return { success: true };
    });


    // === ICI tu ajoutes le handler live toggle ===
    ipcMain.handle('live-toggle-style', async (event, { prop, keep }) => {
      try {
        await this.page.evaluate(({ prop, keep }) => {
          const sel = window.__divSelector?.selectedElement;
          if (!sel || !prop) return;

          window.__live_preview_saved = window.__live_preview_saved || {};

          if (keep) {
            if (Object.prototype.hasOwnProperty.call(window.__live_preview_saved, prop)) {
              sel.style.setProperty(prop, window.__live_preview_saved[prop] || '');
              delete window.__live_preview_saved[prop];
            } else {
              sel.style.removeProperty(prop);
            }
          } else {
            if (!Object.prototype.hasOwnProperty.call(window.__live_preview_saved, prop)) {
              window.__live_preview_saved[prop] = sel.style.getPropertyValue(prop) || '';
            }
            sel.style.setProperty(prop, 'initial', 'important');
          }
        }, { prop, keep });
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    // —— Capture précise avec options images/fonds —— //
    ipcMain.handle('capture-element', async (event, options) => {
      const PADDING = 24;
      const DPR_CAPTURE = Math.max(1, Math.min(6, Number(options?.dpr) || 2));
      const REMOVE_SELF_BG = !!(options && options.removeSelfBg);
      const REMOVE_OUTSIDE_IMAGES = !!(options && options.removeOutsideImages);
      const REMOVE_INSIDE_IMAGES = !!(options && options.removeInsideImages);
      const SELECTED_STYLES = Array.isArray(options?.selectedStyles) ? options.selectedStyles : null;

      // 1) Prépare masque + wrapper + neutralisation voile + gestion images
      await this.page.evaluate(({ PADDING, REMOVE_SELF_BG, REMOVE_OUTSIDE_IMAGES, REMOVE_INSIDE_IMAGES, SELECTED_STYLES }) => {
        const S_ID = '__capture_mask_styles';

        function addMask() {
          if (!window.__divSelector || !window.__divSelector.selectedElement) return false;
          const sel = window.__divSelector.selectedElement;
          sel.classList.remove('div-selector-highlight', 'div-selector-hover');
          sel.classList.add('__capture_target');

          // Marquer ancêtres
          let a = sel.parentElement;
          const ancestors = [];
          while (a) {
            a.setAttribute('data-capture-ancestor', '1');
            ancestors.push(a);
            if (a === document.documentElement) break;
            a = a.parentElement;
          }

          // Map de sauvegarde
          const saved = new Map();
          function saveInline(el, props) {
            const obj = {}; props.forEach(p => obj[p] = el.style[p] || ''); saved.set(el, obj);
          }

          // Ancêtres : overflow/clip + fond transparent + anti-voile
          ancestors.forEach(el => {
            saveInline(el, ['overflow', 'overflowX', 'overflowY', 'clipPath', 'background', 'backgroundImage', 'mixBlendMode', 'backdropFilter', 'opacity']);
            el.style.overflow = 'visible';
            el.style.overflowX = 'visible';
            el.style.overflowY = 'visible';
            el.style.clipPath = 'none';
            el.style.background = 'transparent';
            el.style.backgroundImage = 'none';
            el.style.mixBlendMode = 'normal';
            el.style.backdropFilter = 'none';
            el.style.opacity = '1';
          });

          // Option : retirer le fond de la cible
          if (REMOVE_SELF_BG) {
            saveInline(sel, ['background', 'backgroundImage', 'border', 'boxShadow', 'mixBlendMode', 'backdropFilter', 'opacity']);
            sel.style.setProperty('background', 'transparent', 'important');
            sel.style.setProperty('background-image', 'none', 'important');
            sel.style.setProperty('box-shadow', 'none', 'important');
            sel.style.mixBlendMode = 'normal';
            sel.style.backdropFilter = 'none';
            sel.style.opacity = '1';
          } else {
            saveInline(sel, ['mixBlendMode', 'backdropFilter', 'opacity']);
            sel.style.mixBlendMode = 'normal';
            sel.style.backdropFilter = 'none';
            sel.style.opacity = '1';
          }
          // NEW: Neutraliser tous les styles non sélectionnés
          if (Array.isArray(SELECTED_STYLES)) {
            try {
              const cs = getComputedStyle(sel);
              const allProps = Array.from(cs); // toutes les propriétés CSS
              const toNeutralize = allProps.filter(p => !SELECTED_STYLES.includes(p)); // celles à enlever

              // on sauvegarde leurs valeurs originales
              const prev = {};
              toNeutralize.forEach(p => prev[p] = sel.style.getPropertyValue(p) || '');
              // merge avec d'éventuels styles déjà sauvegardés pour 'sel'
              window.__capture_saved_for_sel = Object.assign(window.__capture_saved_for_sel || {}, prev);

              // applique "initial !important" pour neutraliser
              toNeutralize.forEach(p => sel.style.setProperty(p, 'initial', 'important'));
            } catch { }
          }
          // Wrapper avec padding
          const wrapper = document.createElement('div');
          wrapper.className = '__capture_wrapper';
          Object.assign(wrapper.style, {
            position: 'relative',
            display: 'inline-block',
            padding: PADDING + 'px',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            isolation: 'isolate'
          });
          const parent = sel.parentElement;
          parent.insertBefore(wrapper, sel);
          wrapper.appendChild(sel);

          // CSS global masque + anti-voile
          let css = `
            * { visibility: hidden !important; }
            html, body { background: transparent !important; visibility: visible !important; }
            [data-capture-ancestor="1"] {
              visibility: visible !important;
              background: transparent !important;
              background-image: none !important;
            }
            .__capture_wrapper, .__capture_wrapper * {
              visibility: visible !important;
              mix-blend-mode: normal !important;
              backdrop-filter: none !important;
              opacity: 1 !important;
            }
            .div-selector-highlight, .div-selector-hover { outline: none !important; box-shadow: none !important; }
            .div-selector-highlight::before { display: none !important; }
          `;
          let style = document.getElementById(S_ID);
          if (!style) { style = document.createElement('style'); style.id = S_ID; document.head.appendChild(style); }
          style.textContent = css;

          // ——— Gestion IMAGES ———

          // A) Masquer images/illustrations EN DEHORS du wrapper (sans toucher aux ancêtres du wrapper)
          // A) Masquer images/illustrations EN DEHORS du wrapper (sans toucher aux ancêtres du wrapper)
          if (REMOVE_OUTSIDE_IMAGES) {
            const isOutsideButNotAncestor = (el) => {
              if (!el || el === document.documentElement || el === document.body) return false;
              if (wrapper.contains(el)) return false;                 // inside wrapper -> no
              if (el.contains(wrapper)) return false;                 // ancestor of wrapper -> no
              if (el.closest('[data-capture-ancestor="1"]')) return false; // marked ancestors -> no
              return true;                                            // everything else is “outside”
            };

            // props qu’on sauvegarde pour restaurer
            const HIDE_PROPS = [
              'display', 'visibility', 'opacity',
              'background', 'backgroundImage', 'backgroundColor', 'backgroundBlendMode',
              'mask', 'maskImage', '-webkit-mask', '-webkit-mask-image',
              'filter'
            ];

            const hideBgMaskFilter = (el) => {
              saveInline(el, HIDE_PROPS);

              // cache totalement l’élément visuellement
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('opacity', '0', 'important');

              // neutralise toute image/fond/masque/filtre
              el.style.setProperty('background', 'transparent', 'important');
              el.style.setProperty('background-color', 'transparent', 'important');
              el.style.setProperty('background-image', 'none', 'important');
              el.style.setProperty('background-blend-mode', 'normal', 'important');

              el.style.setProperty('mask', 'none', 'important');
              el.style.setProperty('mask-image', 'none', 'important');
              el.style.setProperty('-webkit-mask', 'none', 'important');
              el.style.setProperty('-webkit-mask-image', 'none', 'important');

              el.style.setProperty('filter', 'none', 'important');

              // tag pour les pseudo-éléments
              el.setAttribute('data-cap-outside', '1');
            };

            // 1) médias “classiques”
            document.querySelectorAll('img, picture, svg, canvas, video, [role="img"]').forEach(el => {
              if (isOutsideButNotAncestor(el)) {
                saveInline(el, ['display', 'visibility', 'opacity']);
                el.style.setProperty('display', 'none', 'important');
                el.style.setProperty('visibility', 'hidden', 'important');
                el.style.setProperty('opacity', '0', 'important');
                el.setAttribute('data-cap-outside', '1');
              }
            });

            // 2) éléments qui portent juste un bg/mask/filter
            document.querySelectorAll('*').forEach(el => {
              if (!isOutsideButNotAncestor(el)) return;
              const cs = getComputedStyle(el);
              const hasBg = cs.backgroundImage && cs.backgroundImage !== 'none';
              const hasMask = (cs.maskImage && cs.maskImage !== 'none') ||
                (cs.webkitMaskImage && cs.webkitMaskImage !== 'none');
              const hasUrlF = cs.filter && cs.filter.includes('url(');
              if (hasBg || hasMask || hasUrlF) hideBgMaskFilter(el);
            });

            // 3) neutralise aussi les ::before/::after
            const PE_ID = '__capture_pseudo_hide';
            if (!document.getElementById(PE_ID)) {
              const pe = document.createElement('style');
              pe.id = PE_ID;
              pe.textContent = `
[data-cap-outside]::before,
[data-cap-outside]::after {
  background: transparent !important;
  background-image: none !important;
  mask: none !important;
  mask-image: none !important;
  -webkit-mask: none !important;
  -webkit-mask-image: none !important;
  filter: none !important;
  content: none !important;
}`;
              document.head.appendChild(pe);
            }
          }



          // B) Masquer images/illustrations A L'INTERIEUR du wrapper
          // B) Masquer images/illustrations À L’INTÉRIEUR du wrapper
          if (REMOVE_INSIDE_IMAGES) {
            const HIDE_MEDIA_PROPS = ['display', 'visibility', 'opacity'];
            const HIDE_BG_PROPS = [
              'background', 'backgroundImage', 'backgroundColor', 'backgroundBlendMode',
              'mask', 'maskImage', '-webkit-mask', '-webkit-mask-image',
              'filter'
            ];

            // 1) Médias "classiques" à l'intérieur du wrapper
            const insideMedia = wrapper.querySelectorAll('img, picture, svg, canvas, video');
            insideMedia.forEach(el => {
              saveInline(el, HIDE_MEDIA_PROPS);
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('opacity', '0', 'important');
              el.setAttribute('data-cap-inside', '1'); // pour la règle pseudo
            });

            // 2) Éléments avec images de fond / masques / filtres "url()" à l'intérieur
            const insideAll = wrapper.querySelectorAll('*');
            insideAll.forEach(el => {
              const cs = getComputedStyle(el);
              const hasBg = cs.backgroundImage && cs.backgroundImage !== 'none';
              const hasMask = (cs.maskImage && cs.maskImage !== 'none') ||
                (cs.webkitMaskImage && cs.webkitMaskImage !== 'none');
              const hasUrlF = cs.filter && cs.filter.includes('url(');

              if (hasBg || hasMask || hasUrlF) {
                saveInline(el, HIDE_BG_PROPS);

                el.style.setProperty('background', 'transparent', 'important');
                el.style.setProperty('background-color', 'transparent', 'important');
                el.style.setProperty('background-image', 'none', 'important');
                el.style.setProperty('background-blend-mode', 'normal', 'important');

                el.style.setProperty('mask', 'none', 'important');
                el.style.setProperty('mask-image', 'none', 'important');
                el.style.setProperty('-webkit-mask', 'none', 'important');
                el.style.setProperty('-webkit-mask-image', 'none', 'important');

                el.style.setProperty('filter', 'none', 'important');

                el.setAttribute('data-cap-inside', '1'); // pour la règle pseudo
              }
            });

            // 3) Neutraliser aussi les ::before/::after à l’intérieur
            const PE_ID = '__capture_pseudo_hide_inside';
            if (!document.getElementById(PE_ID)) {
              const pe = document.createElement('style');
              pe.id = PE_ID;
              pe.textContent = `
[data-cap-inside]::before,
[data-cap-inside]::after {
  background: transparent !important;
  background-image: none !important;
  mask: none !important;
  mask-image: none !important;
  -webkit-mask: none !important;
  -webkit-mask-image: none !important;
  filter: none !important;
  content: none !important;
}`;
              document.head.appendChild(pe);
            }
          }



          window.__capture_ctx = { ancestors, saved, wrapper, originalParent: parent };
          wrapper.scrollIntoView({ block: 'center', inline: 'center' });
          return true;
        }

        // Cleanup précédent si existant
        if (window.__capture_ctx) {
          const { ancestors, saved, wrapper, originalParent } = window.__capture_ctx || {};
          if (wrapper && wrapper.firstChild) originalParent?.insertBefore(wrapper.firstChild, wrapper);
          wrapper?.remove();
          if (saved) saved.forEach((st, el) => Object.keys(st).forEach(k => { el.style[k] = st[k]; }));
          const style = document.getElementById(S_ID); style?.remove();
          const sel = window.__divSelector?.selectedElement;
          sel?.classList.remove('__capture_target');
          ancestors?.forEach(el => el.removeAttribute('data-capture-ancestor'));
          window.__capture_ctx = null;
        }

        addMask();
      }, { PADDING, REMOVE_SELF_BG, REMOVE_OUTSIDE_IMAGES, REMOVE_INSIDE_IMAGES, SELECTED_STYLES });

      // 2) DPR élevé selon slider
      const vp = this.page.viewport();
      try {
        await this.page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: DPR_CAPTURE });
      } catch { }

      // 3) Handle wrapper
      const handle = await this.page.evaluateHandle(() => document.querySelector('.__capture_wrapper') || null);
      const wrapperEl = handle.asElement();
      if (!wrapperEl) {
        await this.page.evaluate(() => {
          const style = document.getElementById('__capture_mask_styles'); style?.remove();

          const ctx = window.__capture_ctx;
          if (ctx) {
            const { ancestors, saved, wrapper, originalParent } = ctx;
            if (wrapper && wrapper.firstChild) originalParent?.insertBefore(wrapper.firstChild, wrapper);
            wrapper?.remove();
            if (saved) saved.forEach((st, el) => Object.keys(st).forEach(k => { el.style[k] = st[k]; }));
            const sel = window.__divSelector?.selectedElement;
            sel?.classList.remove('__capture_target');
            ancestors?.forEach(el => el.removeAttribute('data-capture-ancestor'));
            window.__capture_ctx = null;
          }

          // NEW: restaurer les styles mis à "initial !important"
          const sel2 = window.__divSelector?.selectedElement;
          if (sel2 && window.__capture_saved_for_sel) {
            for (const [k, v] of Object.entries(window.__capture_saved_for_sel)) {
              sel2.style.setProperty(k, v || '');
            }
          }
          window.__capture_saved_for_sel = null;
        });

        try { await this.page.setViewport(vp); } catch { }
        try { await handle.dispose(); } catch { }
        return { success: false, error: 'Wrapper introuvable' };
      }


      // 4) Attendre polices + images (Next.js safe) avec timeout
      try {
        await Promise.race([
          this.page.evaluate(async () => {
            const WRAP = document.querySelector('.__capture_wrapper');
            if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch { } }
            const imgs = Array.from(document.images || []);
            const wrapImgs = Array.from(WRAP ? WRAP.querySelectorAll('img') : []);
            const toLoad = new Set([...imgs, ...wrapImgs]);
            await Promise.all(Array.from(toLoad).map(img => new Promise(res => {
              try {
                img.loading = 'eager';
                img.decoding = 'sync';
                if (img.decode) { img.decode().then(() => res()).catch(() => res()); }
                if (!img.complete) { img.onload = res; img.onerror = res; } else { res(); }
              } catch { res(); }
            })));
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout chargement ressources')), 6000))
        ]);
      } catch { /* on ignore, on capture quand même */ }

      // 5) Screenshot + SVG optionnel
      try {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const base = `div-isolated-${ts}`;
        const filenames = [];

        // --- PNG ---
        const pngName = `${base}.png`;
        await wrapperEl.screenshot({ path: pngName, type: 'png', omitBackground: true });
        filenames.push(pngName);

        return { success: true, filenames };
      } catch (e) {
        return { success: false, error: e.message };
      } finally {
        // 6) Restore DOM + DPR + styles neutralisés
        await this.page.evaluate(() => {
          const style = document.getElementById('__capture_mask_styles'); style?.remove();
          const ctx = window.__capture_ctx;
          if (ctx) {
            const { ancestors, saved, wrapper, originalParent } = ctx;
            if (wrapper && wrapper.firstChild) originalParent?.insertBefore(wrapper.firstChild, wrapper);
            wrapper?.remove();
            if (saved) saved.forEach((st, el) => Object.keys(st).forEach(k => { el.style[k] = st[k]; }));
            const sel = window.__divSelector?.selectedElement;
            if (sel) {
              sel.classList.remove('__capture_target');
              sel.classList.add('div-selector-highlight');
            }
            ancestors?.forEach(el => el.removeAttribute('data-capture-ancestor'));
            window.__capture_ctx = null;
          }

          // RESTORE styles neutralisés (ceux mis à "initial !important")
          const sel2 = window.__divSelector?.selectedElement;
          if (sel2 && window.__capture_saved_for_sel) {
            for (const [k, v] of Object.entries(window.__capture_saved_for_sel)) {
              sel2.style.setProperty(k, v || '');
            }
          }
          window.__capture_saved_for_sel = null;

          // 👇👇 AJOUTER ICI : nettoyage des attributs/tag <style> pour les pseudo-règles
          document.querySelectorAll('[data-cap-outside]').forEach(el => el.removeAttribute('data-cap-outside'));
          document.querySelectorAll('[data-cap-inside]').forEach(el => el.removeAttribute('data-cap-inside'));
          const pe1 = document.getElementById('__capture_pseudo_hide'); if (pe1) pe1.remove();
          const pe2 = document.getElementById('__capture_pseudo_hide_inside'); if (pe2) pe2.remove();
          // ☝️ fin de l’ajout
        });
        try { await this.page.setViewport(vp); } catch { }
        await handle.dispose();
      }

    });

    ipcMain.handle('reset-selection', async () => {
      await this.page.evaluate(() => {
        if (window.__divSelector) {
          window.__divSelector.selectedElement = null;
          window.__divSelector.isActive = false;

          // ✅ Nettoie surbrillances
          document.querySelectorAll('.div-selector-highlight,.div-selector-hover')
            .forEach(el => el.classList.remove('div-selector-highlight', 'div-selector-hover'));

          // ✅ Si un wrapper d'isolement est resté, on remet l'élément à sa place
          const wrap = document.querySelector('.__capture_wrapper');
          if (wrap && wrap.firstChild) {
            const parent = wrap.parentElement;
            try { parent && parent.insertBefore(wrap.firstChild, wrap); } catch { }
            wrap.remove();
          }

          // ✅ Retire le masque d’isolement
          const m = window.__capture_mask;
          if (m && m.ancestors) m.ancestors.forEach(el => el.removeAttribute('data-capture-ancestor'));
          const style = document.getElementById(m?.S_ID || '__capture_mask_styles'); if (style) style.remove();
          delete window.__capture_mask;

          // ✅ Retire le style de fond de prévisualisation
          const bg = document.getElementById('__capture_bg_style'); if (bg) bg.remove();
          const bgLayer = document.querySelector('.__capture_bg_layer'); if (bgLayer) bgLayer.remove();
          const bgStyle = document.getElementById('__capture_bg_style'); if (bgStyle) bgStyle.remove();


          // états internes
          window.__capture_saved_for_sel = null;
          window.__live_preview_saved = {};
          document.body.style.cursor = 'default';
        }
      });
      return { success: true };
    });

  }

  async setupBrowser() {
    console.log('🚀 Lancement du navigateur...');
    this.browser = await puppeteer.launch({
      headless: false,
      devtools: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1280,800',
        '--disable-extensions',
        '--disable-plugins',
        '--enable-font-antialiasing',
        '--force-color-profile=srgb'
      ]
    });
    this.page = await this.browser.newPage();

    await this.page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    await this.page.evaluateOnNewDocument(() => {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
          scroll-behavior: auto !important;
        }
      `;
      document.documentElement.appendChild(style);
    });

    console.log('✅ Navigateur prêt');
  }

  async setupDivSelector() {
    await this.page.addScriptTag({
      content: `
        (function() {
          window.__divSelector = { selectedElement: null, isActive: false };
          if (!document.getElementById('div-selector-styles')) {
            const style = document.createElement('style'); style.id = 'div-selector-styles';
            style.textContent =
              '.div-selector-highlight { outline: 4px solid #00ff88 !important; outline-offset: 3px !important; box-shadow: 0 0 20px rgba(0,255,136,0.8), inset 0 0 20px rgba(0,255,136,0.2) !important; position: relative !important; }' +
              '.div-selector-highlight::before { content: "📍 SÉLECTIONNÉ"; position: absolute; top: -28px; left: -4px; background: linear-gradient(135deg, #00ff88, #00cc70); color: black; padding: 4px 8px; font-size: 11px; font-weight: bold; border-radius: 6px; z-index: 2147483647; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }' +
              '.div-selector-hover { outline: 3px dashed #ff9800 !important; outline-offset: 2px !important; background: rgba(255,152,0,0.08) !important; }';
            document.head.appendChild(style);
          }
          document.addEventListener('click', function(e) {
            if (!window.__divSelector.isActive) return;
            e.preventDefault(); e.stopPropagation();
            document.querySelectorAll('.div-selector-highlight,.div-selector-hover').forEach(el=>{
              el.classList.remove('div-selector-highlight','div-selector-hover');
            });
            window.__divSelector.selectedElement = e.target;
            e.target.classList.add('div-selector-highlight');
          }, true);
          document.addEventListener('mouseover', function(e) {
            if (!window.__divSelector.isActive) return;
            if (window.__divSelector.selectedElement === e.target) return;
            e.target.classList.add('div-selector-hover');
          });
          document.addEventListener('mouseout', function(e) {
            if (!window.__divSelector.isActive) return;
            if (window.__divSelector.selectedElement === e.target) return;
            e.target.classList.remove('div-selector-hover');
          });
          console.log('🎯 Sélecteur de DIV initialisé');
        })();
      `
    });
  }

  async run() {
    try {
      console.log('🎬 Outil de Capture Interactive de DIV - Version Pro\n');
      if (!process.versions || !process.versions.electron) {
        console.error('❌ Ce script doit être lancé avec Electron (npm start), pas avec node.');
        process.exit(1);
      }
      await this.setupElectron();
      await this.setupBrowser();
      this.isReady = true;

      app.on('window-all-closed', async () => {
        await this.cleanup();
        app.quit();
      });
    } catch (e) {
      console.error('💥 Erreur critique:', e.message);
      await this.cleanup();
    }
  }

  async cleanup() {
    console.log('\n🧹 Nettoyage...');
    if (this.browser) { await this.browser.close(); }
    console.log('👋 Au revoir!');
  }
}

const tool = new ElectronDivScreenshotTool();
process.on('SIGINT', async () => {
  console.log('\n⏹️ Arrêt demandé...');
  await tool.cleanup();
  process.exit(0);
});
tool.run().catch(console.error);
