/* =========================================================
   Sprint 3.6 - Modal de cumplimiento optimizado
   Usa ranking_cumplimiento enviado por Apps Script en modo=inicio.
   No consulta tienda por tienda.
   ========================================================= */

function injectStoreGoalModalStyles() {
  if (document.getElementById('storeGoalModalStyles')) return;
  const style = document.createElement('style');
  style.id = 'storeGoalModalStyles';
  style.textContent = `
    #kpiMetaCard { cursor: pointer; position: relative; }
    #kpiMetaCard::after { content:'Tocar para ver tiendas'; display:block; margin-top:8px; font-size:.72rem; font-weight:800; color:rgba(15,23,42,.58); letter-spacing:-.01em; }
    .store-goal-modal-backdrop { position:fixed; inset:0; z-index:9999; display:flex; align-items:flex-end; justify-content:center; padding:18px; background:rgba(15,23,42,.55); backdrop-filter:blur(8px); }
    .store-goal-modal { width:min(820px,100%); max-height:min(82vh,760px); overflow:hidden; border-radius:28px; background:#f8fafc; box-shadow:0 24px 70px rgba(15,23,42,.32); border:1px solid rgba(148,163,184,.35); display:flex; flex-direction:column; }
    .store-goal-modal__header { padding:20px 20px 14px; display:flex; align-items:flex-start; justify-content:space-between; gap:14px; background:linear-gradient(135deg,#fff 0%,#eef2ff 100%); border-bottom:1px solid rgba(148,163,184,.25); }
    .store-goal-modal__title { margin:0; font-size:1.05rem; font-weight:950; color:#0f172a; letter-spacing:-.03em; }
    .store-goal-modal__subtitle { margin:5px 0 0; font-size:.84rem; color:#64748b; font-weight:750; }
    .store-goal-modal__close { width:38px; height:38px; border:0; border-radius:999px; background:rgba(15,23,42,.08); color:#0f172a; font-size:1.35rem; font-weight:900; line-height:1; cursor:pointer; }
    .store-goal-modal__body { padding:14px; overflow:auto; }
    .store-goal-table { width:100%; border-collapse:separate; border-spacing:0 10px; }
    .store-goal-table th { padding:0 10px 2px; text-align:left; font-size:.72rem; color:#64748b; text-transform:uppercase; letter-spacing:.04em; font-weight:950; white-space:nowrap; }
    .store-goal-table td { padding:13px 10px; background:#fff; border-top:1px solid rgba(226,232,240,.95); border-bottom:1px solid rgba(226,232,240,.95); vertical-align:middle; }
    .store-goal-table td:first-child { border-left:1px solid rgba(226,232,240,.95); border-radius:16px 0 0 16px; }
    .store-goal-table td:last-child { border-right:1px solid rgba(226,232,240,.95); border-radius:0 16px 16px 0; }
    .store-goal-row--selected td { background:#fff7ed; border-top-color:#fb923c; border-bottom-color:#fb923c; box-shadow:0 8px 22px rgba(249,115,22,.13); }
    .store-goal-row--selected td:first-child { border-left-color:#fb923c; }
    .store-goal-row--selected td:last-child { border-right-color:#fb923c; }
    .store-goal-position { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:999px; background:#e2e8f0; color:#0f172a; font-weight:950; font-size:.78rem; }
    .store-goal-row--selected .store-goal-position { background:#f97316; color:#fff; }
    .store-goal-store { display:block; max-width:310px; color:#0f172a; font-size:.86rem; font-weight:950; line-height:1.15; }
    .store-goal-selected-label { display:block; margin-top:4px; color:#ea580c; font-size:.69rem; font-weight:950; text-transform:uppercase; }
    .store-goal-percent { display:inline-flex; align-items:center; gap:5px; font-size:.98rem; font-weight:950; white-space:nowrap; }
    .store-goal-percent--up { color:#15803d; }
    .store-goal-percent--down { color:#dc2626; }
    .store-goal-expected { color:#0f172a; font-size:.98rem; font-weight:950; white-space:nowrap; }
    .store-goal-status { display:inline-flex; align-items:center; justify-content:center; min-width:76px; border-radius:999px; padding:7px 10px; font-size:.72rem; font-weight:950; white-space:nowrap; }
    .store-goal-status--up { background:#dcfce7; color:#166534; }
    .store-goal-status--down { background:#fee2e2; color:#991b1b; }
    .store-goal-empty { padding:32px 14px; text-align:center; color:#64748b; font-weight:850; }
    @media (min-width:720px){ .store-goal-modal-backdrop{align-items:center;} }
    @media (max-width:560px){ .store-goal-modal-backdrop{padding:10px;} .store-goal-modal{border-radius:24px 24px 18px 18px;max-height:86vh;} .store-goal-table th:nth-child(5),.store-goal-table td:nth-child(5){display:none;} .store-goal-store{max-width:135px;font-size:.79rem;} .store-goal-percent,.store-goal-expected{font-size:.9rem;} .store-goal-position{width:28px;height:28px;} }
  `;
  document.head.appendChild(style);
}

function normalizeStoreNameForCompare(value) { return String(value || '').trim().toUpperCase(); }

function setupStoreGoalModal() {
  injectStoreGoalModalStyles();
  const metaCard = document.getElementById('kpiMetaCard');
  if (!metaCard || metaCard.dataset.goalModalReady === 'true') return;
  metaCard.dataset.goalModalReady = 'true';
  metaCard.setAttribute('title', 'Tocar para ver cumplimiento por tienda');
  metaCard.addEventListener('click', openStoreGoalModal);
}

function closeStoreGoalModal() { const modal = document.getElementById('storeGoalModalBackdrop'); if (modal) modal.remove(); }

function openStoreGoalModal() {
  closeStoreGoalModal();
  const backdrop = document.createElement('div');
  backdrop.id = 'storeGoalModalBackdrop';
  backdrop.className = 'store-goal-modal-backdrop';
  backdrop.innerHTML = `
    <section class="store-goal-modal" role="dialog" aria-modal="true" aria-labelledby="storeGoalModalTitle">
      <div class="store-goal-modal__header"><div><h3 class="store-goal-modal__title" id="storeGoalModalTitle">Cumplimiento por tienda</h3><p class="store-goal-modal__subtitle">Ordenado de mayor a menor cumplimiento.</p></div><button class="store-goal-modal__close" type="button" aria-label="Cerrar" onclick="closeStoreGoalModal()">×</button></div>
      <div class="store-goal-modal__body" id="storeGoalModalBody"></div>
    </section>`;
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeStoreGoalModal(); });
  document.body.appendChild(backdrop);
  renderStoreGoalRows(rankingCumplimientoTiendas || []);
}

function renderStoreGoalRows(rows) {
  const body = document.getElementById('storeGoalModalBody');
  if (!body) return;
  if (!rows.length) { body.innerHTML = '<div class="store-goal-empty">No hay tiendas para mostrar. Actualiza Apps Script y vuelve a cargar el dashboard.</div>'; return; }
  const selectedStore = normalizeStoreNameForCompare(currentStoreName);
  body.innerHTML = `<table class="store-goal-table"><thead><tr><th>Pos.</th><th>Tienda</th><th>Cómo va</th><th>Debería ir</th><th>Estado</th></tr></thead><tbody>${rows.map((row, index) => {
    const isSelected = selectedStore && normalizeStoreNameForCompare(row.tienda) === selectedStore;
    const vaBien = String(row.estado || '').toLowerCase().includes('bien') || toNumber(row.cumplimiento) >= toNumber(row.esperado);
    const arrow = vaBien ? '▲' : '▼';
    const percentClass = vaBien ? 'store-goal-percent--up' : 'store-goal-percent--down';
    const statusClass = vaBien ? 'store-goal-status--up' : 'store-goal-status--down';
    const statusLabel = vaBien ? 'Bien' : 'Abajo';
    return `<tr class="${isSelected ? 'store-goal-row--selected' : ''}"><td><span class="store-goal-position">${row.posicion || index + 1}</span></td><td><span class="store-goal-store">${escapeHtml(row.tienda)}</span>${isSelected ? '<span class="store-goal-selected-label">Tienda seleccionada</span>' : ''}</td><td><span class="store-goal-percent ${percentClass}">${formatPercent(row.cumplimiento)} ${arrow}</span></td><td><span class="store-goal-expected">${row.esperado ? formatPercent(row.esperado) : '-'}</span></td><td><span class="store-goal-status ${statusClass}">${statusLabel}</span></td></tr>`;
  }).join('')}</tbody></table>`;
}

(function initStoreGoalModalWhenReady() { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupStoreGoalModal); else setupStoreGoalModal(); })();
