/* =========================================================
   Sprint 3.6 - Modal de alertas optimizado
   Usa ranking_alertas enviado por Apps Script en modo=inicio.
   No consulta tienda por tienda.
   ========================================================= */

function injectStoreAlertsModalStyles() {
  if (document.getElementById('storeAlertsModalStyles')) return;
  const style = document.createElement('style');
  style.id = 'storeAlertsModalStyles';
  style.textContent = `
    #kpiAlertasCard { cursor:pointer; position:relative; }
    #kpiAlertasCard::after { content:'Tocar para ver tiendas'; display:block; margin-top:8px; font-size:.72rem; font-weight:800; color:rgba(15,23,42,.58); letter-spacing:-.01em; }
    .store-alerts-modal-backdrop { position:fixed; inset:0; z-index:9999; display:flex; align-items:flex-end; justify-content:center; padding:18px; background:rgba(15,23,42,.55); backdrop-filter:blur(8px); }
    .store-alerts-modal { width:min(860px,100%); max-height:min(82vh,760px); overflow:hidden; border-radius:28px; background:#f8fafc; box-shadow:0 24px 70px rgba(15,23,42,.32); border:1px solid rgba(148,163,184,.35); display:flex; flex-direction:column; }
    .store-alerts-modal__header { padding:20px 20px 14px; display:flex; align-items:flex-start; justify-content:space-between; gap:14px; background:linear-gradient(135deg,#fff 0%,#fff7ed 100%); border-bottom:1px solid rgba(148,163,184,.25); }
    .store-alerts-modal__title { margin:0; font-size:1.05rem; font-weight:950; color:#0f172a; letter-spacing:-.03em; }
    .store-alerts-modal__subtitle { margin:5px 0 0; font-size:.84rem; color:#64748b; font-weight:750; }
    .store-alerts-modal__close { width:38px; height:38px; border:0; border-radius:999px; background:rgba(15,23,42,.08); color:#0f172a; font-size:1.35rem; font-weight:900; line-height:1; cursor:pointer; }
    .store-alerts-modal__body { padding:14px; overflow:auto; }
    .store-alerts-table { width:100%; border-collapse:separate; border-spacing:0 10px; }
    .store-alerts-table th { padding:0 10px 2px; text-align:left; font-size:.72rem; color:#64748b; text-transform:uppercase; letter-spacing:.04em; font-weight:950; white-space:nowrap; }
    .store-alerts-table td { padding:13px 10px; background:#fff; border-top:1px solid rgba(226,232,240,.95); border-bottom:1px solid rgba(226,232,240,.95); vertical-align:middle; }
    .store-alerts-table td:first-child { border-left:1px solid rgba(226,232,240,.95); border-radius:16px 0 0 16px; }
    .store-alerts-table td:last-child { border-right:1px solid rgba(226,232,240,.95); border-radius:0 16px 16px 0; }
    .store-alerts-row--selected td { background:#fff7ed; border-top-color:#fb923c; border-bottom-color:#fb923c; box-shadow:0 8px 22px rgba(249,115,22,.13); }
    .store-alerts-row--selected td:first-child { border-left-color:#fb923c; }
    .store-alerts-row--selected td:last-child { border-right-color:#fb923c; }
    .store-alerts-position { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:999px; background:#e2e8f0; color:#0f172a; font-weight:950; font-size:.78rem; }
    .store-alerts-row--selected .store-alerts-position { background:#f97316; color:#fff; }
    .store-alerts-store { display:block; max-width:310px; color:#0f172a; font-size:.86rem; font-weight:950; line-height:1.15; }
    .store-alerts-selected-label { display:block; margin-top:4px; color:#ea580c; font-size:.69rem; font-weight:950; text-transform:uppercase; }
    .store-alerts-total { display:inline-flex; align-items:center; justify-content:center; min-width:44px; border-radius:999px; padding:8px 10px; background:#fee2e2; color:#991b1b; font-size:.94rem; font-weight:950; white-space:nowrap; }
    .store-alerts-total--zero { background:#dcfce7; color:#166534; }
    .store-alerts-number { color:#0f172a; font-size:.95rem; font-weight:950; white-space:nowrap; }
    .store-alerts-empty { padding:32px 14px; text-align:center; color:#64748b; font-weight:850; }
    @media (min-width:720px){ .store-alerts-modal-backdrop{align-items:center;} }
    @media (max-width:560px){ .store-alerts-modal-backdrop{padding:10px;} .store-alerts-modal{border-radius:24px 24px 18px 18px;max-height:86vh;} .store-alerts-table th:nth-child(5),.store-alerts-table td:nth-child(5),.store-alerts-table th:nth-child(6),.store-alerts-table td:nth-child(6){display:none;} .store-alerts-store{max-width:135px;font-size:.79rem;} .store-alerts-number{font-size:.88rem;} .store-alerts-position{width:28px;height:28px;} }
  `;
  document.head.appendChild(style);
}

function normalizeAlertStoreNameForCompare(value) { return String(value || '').trim().toUpperCase(); }

function setupStoreAlertsModal() {
  injectStoreAlertsModalStyles();
  const alertCard = document.getElementById('kpiAlertasCard');
  if (!alertCard || alertCard.dataset.alertsModalReady === 'true') return;
  alertCard.dataset.alertsModalReady = 'true';
  alertCard.setAttribute('title', 'Tocar para ver alertas por tienda');
  alertCard.addEventListener('click', openStoreAlertsModal);
}

function closeStoreAlertsModal() { const modal = document.getElementById('storeAlertsModalBackdrop'); if (modal) modal.remove(); }

function openStoreAlertsModal() {
  closeStoreAlertsModal();
  const backdrop = document.createElement('div');
  backdrop.id = 'storeAlertsModalBackdrop';
  backdrop.className = 'store-alerts-modal-backdrop';
  backdrop.innerHTML = `<section class="store-alerts-modal" role="dialog" aria-modal="true" aria-labelledby="storeAlertsModalTitle"><div class="store-alerts-modal__header"><div><h3 class="store-alerts-modal__title" id="storeAlertsModalTitle">Alertas activas por tienda</h3><p class="store-alerts-modal__subtitle">Ordenado de mayor a menor número de alertas.</p></div><button class="store-alerts-modal__close" type="button" aria-label="Cerrar" onclick="closeStoreAlertsModal()">×</button></div><div class="store-alerts-modal__body" id="storeAlertsModalBody"></div></section>`;
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeStoreAlertsModal(); });
  document.body.appendChild(backdrop);
  renderStoreAlertsRows(rankingAlertasTiendas || []);
}

function renderStoreAlertsRows(rows) {
  const body = document.getElementById('storeAlertsModalBody');
  if (!body) return;
  if (!rows.length) { body.innerHTML = '<div class="store-alerts-empty">No hay tiendas para mostrar. Actualiza Apps Script y vuelve a cargar el dashboard.</div>'; return; }
  const selectedStore = normalizeAlertStoreNameForCompare(currentStoreName);
  body.innerHTML = `<table class="store-alerts-table"><thead><tr><th>Pos.</th><th>Tienda</th><th>Alertas</th><th>Sin venta</th><th>Críticas</th><th>Lentas</th></tr></thead><tbody>${rows.map((row, index) => {
    const isSelected = selectedStore && normalizeAlertStoreNameForCompare(row.tienda) === selectedStore;
    const totalClass = row.alertas > 0 ? 'store-alerts-total' : 'store-alerts-total store-alerts-total--zero';
    return `<tr class="${isSelected ? 'store-alerts-row--selected' : ''}"><td><span class="store-alerts-position">${row.posicion || index + 1}</span></td><td><span class="store-alerts-store">${escapeHtml(row.tienda)}</span>${isSelected ? '<span class="store-alerts-selected-label">Tienda seleccionada</span>' : ''}</td><td><span class="${totalClass}">${formatNumber(row.alertas)}</span></td><td><span class="store-alerts-number">${formatNumber(row.sinVenta)}</span></td><td><span class="store-alerts-number">${formatNumber(row.criticos)}</span></td><td><span class="store-alerts-number">${formatNumber(row.lentos)}</span></td></tr>`;
  }).join('')}</tbody></table>`;
}

(function initStoreAlertsModalWhenReady() { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupStoreAlertsModal); else setupStoreAlertsModal(); })();
