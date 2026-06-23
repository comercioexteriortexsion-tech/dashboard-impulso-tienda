/* =========================================================
   Sprint 3.5 - Tabla emergente de cumplimiento por tienda
   Al tocar la tarjeta de cumplimiento general muestra:
   - Tienda
   - Cómo va
   - Cómo debería ir
   Orden: mayor cumplimiento a menor cumplimiento
   ========================================================= */

let storeGoalRowsCache = null;
let storeGoalLoading = false;

function injectStoreGoalModalStyles() {
  if (document.getElementById('storeGoalModalStyles')) return;

  const style = document.createElement('style');
  style.id = 'storeGoalModalStyles';
  style.textContent = `
    #kpiMetaCard {
      cursor: pointer;
      position: relative;
    }

    #kpiMetaCard::after {
      content: 'Tocar para ver tiendas';
      display: block;
      margin-top: 8px;
      font-size: 0.72rem;
      font-weight: 800;
      color: rgba(15, 23, 42, 0.58);
      letter-spacing: -0.01em;
    }

    .store-goal-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding: 18px;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(8px);
    }

    .store-goal-modal {
      width: min(760px, 100%);
      max-height: min(82vh, 760px);
      overflow: hidden;
      border-radius: 28px;
      background: #f8fafc;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.32);
      border: 1px solid rgba(148, 163, 184, 0.35);
      display: flex;
      flex-direction: column;
    }

    .store-goal-modal__header {
      padding: 20px 20px 14px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      background: linear-gradient(135deg, #ffffff 0%, #eef2ff 100%);
      border-bottom: 1px solid rgba(148, 163, 184, 0.25);
    }

    .store-goal-modal__title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 950;
      color: #0f172a;
      letter-spacing: -0.03em;
    }

    .store-goal-modal__subtitle {
      margin: 5px 0 0;
      font-size: 0.84rem;
      color: #64748b;
      font-weight: 750;
    }

    .store-goal-modal__close {
      width: 38px;
      height: 38px;
      border: 0;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.08);
      color: #0f172a;
      font-size: 1.35rem;
      font-weight: 900;
      line-height: 1;
      cursor: pointer;
    }

    .store-goal-modal__body {
      padding: 14px;
      overflow: auto;
    }

    .store-goal-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 10px;
    }

    .store-goal-table th {
      padding: 0 10px 2px;
      text-align: left;
      font-size: 0.72rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 950;
      white-space: nowrap;
    }

    .store-goal-table td {
      padding: 13px 10px;
      background: #ffffff;
      border-top: 1px solid rgba(226, 232, 240, 0.95);
      border-bottom: 1px solid rgba(226, 232, 240, 0.95);
      vertical-align: middle;
    }

    .store-goal-table td:first-child {
      border-left: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 16px 0 0 16px;
    }

    .store-goal-table td:last-child {
      border-right: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 0 16px 16px 0;
    }

    .store-goal-store {
      display: block;
      max-width: 310px;
      color: #0f172a;
      font-size: 0.86rem;
      font-weight: 950;
      line-height: 1.15;
    }

    .store-goal-percent {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.98rem;
      font-weight: 950;
      white-space: nowrap;
    }

    .store-goal-percent--up { color: #15803d; }
    .store-goal-percent--down { color: #dc2626; }

    .store-goal-expected {
      color: #0f172a;
      font-size: 0.98rem;
      font-weight: 950;
      white-space: nowrap;
    }

    .store-goal-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 76px;
      border-radius: 999px;
      padding: 7px 10px;
      font-size: 0.72rem;
      font-weight: 950;
      white-space: nowrap;
    }

    .store-goal-status--up {
      background: #dcfce7;
      color: #166534;
    }

    .store-goal-status--down {
      background: #fee2e2;
      color: #991b1b;
    }

    .store-goal-loading,
    .store-goal-empty {
      padding: 32px 14px;
      text-align: center;
      color: #64748b;
      font-weight: 850;
    }

    @media (min-width: 720px) {
      .store-goal-modal-backdrop { align-items: center; }
    }

    @media (max-width: 560px) {
      .store-goal-modal-backdrop { padding: 10px; }
      .store-goal-modal {
        border-radius: 24px 24px 18px 18px;
        max-height: 86vh;
      }
      .store-goal-table th:nth-child(4),
      .store-goal-table td:nth-child(4) { display: none; }
      .store-goal-store {
        max-width: 150px;
        font-size: 0.79rem;
      }
      .store-goal-percent,
      .store-goal-expected { font-size: 0.9rem; }
    }
  `;
  document.head.appendChild(style);
}

function setupStoreGoalModal() {
  injectStoreGoalModalStyles();

  const metaCard = document.getElementById('kpiMetaCard');
  if (!metaCard || metaCard.dataset.goalModalReady === 'true') return;

  metaCard.dataset.goalModalReady = 'true';
  metaCard.setAttribute('title', 'Tocar para ver cumplimiento por tienda');
  metaCard.addEventListener('click', openStoreGoalModal);
}

function closeStoreGoalModal() {
  const modal = document.getElementById('storeGoalModalBackdrop');
  if (modal) modal.remove();
}

function renderStoreGoalModalShell() {
  closeStoreGoalModal();

  const backdrop = document.createElement('div');
  backdrop.id = 'storeGoalModalBackdrop';
  backdrop.className = 'store-goal-modal-backdrop';
  backdrop.innerHTML = `
    <section class="store-goal-modal" role="dialog" aria-modal="true" aria-labelledby="storeGoalModalTitle">
      <div class="store-goal-modal__header">
        <div>
          <h3 class="store-goal-modal__title" id="storeGoalModalTitle">Cumplimiento por tienda</h3>
          <p class="store-goal-modal__subtitle">Ordenado de mayor a menor cumplimiento.</p>
        </div>
        <button class="store-goal-modal__close" type="button" aria-label="Cerrar" onclick="closeStoreGoalModal()">×</button>
      </div>
      <div class="store-goal-modal__body" id="storeGoalModalBody">
        <div class="store-goal-loading">Cargando tiendas...</div>
      </div>
    </section>
  `;

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) closeStoreGoalModal();
  });

  document.body.appendChild(backdrop);
}

async function openStoreGoalModal() {
  renderStoreGoalModalShell();

  try {
    const rows = await getStoreGoalRows();
    renderStoreGoalRows(rows);
  } catch (error) {
    console.error('Error cargando cumplimiento por tienda:', error);
    const body = document.getElementById('storeGoalModalBody');
    if (body) body.innerHTML = '<div class="store-goal-empty">No fue posible cargar el listado de tiendas.</div>';
  }
}

async function getStoreGoalRows() {
  if (storeGoalRowsCache) return storeGoalRowsCache;
  if (storeGoalLoading) return [];

  storeGoalLoading = true;

  try {
    const stores = Array.isArray(storesList) ? storesList.filter(Boolean) : [];
    const rows = await Promise.all(stores.map(async storeName => {
      try {
        const dashboard = storeDashboards[storeName] || await loadStoreDashboard(storeName);
        const resumen = dashboard && dashboard.resumen ? dashboard.resumen : {};
        const cumplimiento = toNumber(resumen.cumplimiento_meta);
        const esperado = toNumber(resumen.avance_esperado_mes);
        const vaBien = esperado > 0 ? cumplimiento >= esperado : cumplimiento >= 1;

        return { tienda: storeName, cumplimiento, esperado, vaBien };
      } catch (error) {
        console.warn('No se pudo cargar tienda para tabla de meta:', storeName, error);
        return { tienda: storeName, cumplimiento: 0, esperado: 0, vaBien: false };
      }
    }));

    storeGoalRowsCache = rows
      .filter(row => row.tienda)
      .sort((a, b) => b.cumplimiento - a.cumplimiento);

    return storeGoalRowsCache;
  } finally {
    storeGoalLoading = false;
  }
}

function renderStoreGoalRows(rows) {
  const body = document.getElementById('storeGoalModalBody');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = '<div class="store-goal-empty">No hay tiendas para mostrar.</div>';
    return;
  }

  body.innerHTML = `
    <table class="store-goal-table">
      <thead>
        <tr>
          <th>Tienda</th>
          <th>Cómo va</th>
          <th>Debería ir</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => {
          const arrow = row.vaBien ? '▲' : '▼';
          const percentClass = row.vaBien ? 'store-goal-percent--up' : 'store-goal-percent--down';
          const statusClass = row.vaBien ? 'store-goal-status--up' : 'store-goal-status--down';
          const statusLabel = row.vaBien ? 'Bien' : 'Abajo';

          return `
            <tr>
              <td><span class="store-goal-store">${escapeHtml(row.tienda)}</span></td>
              <td><span class="store-goal-percent ${percentClass}">${formatPercent(row.cumplimiento)} ${arrow}</span></td>
              <td><span class="store-goal-expected">${row.esperado ? formatPercent(row.esperado) : '-'}</span></td>
              <td><span class="store-goal-status ${statusClass}">${statusLabel}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function resetStoreGoalRowsCache() {
  storeGoalRowsCache = null;
  storeGoalLoading = false;
}

(function initStoreGoalModalWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStoreGoalModal);
  } else {
    setupStoreGoalModal();
  }

  const originalLoadInitialData = window.loadInitialData;
  if (typeof originalLoadInitialData === 'function') {
    window.loadInitialData = async function () {
      resetStoreGoalRowsCache();
      return originalLoadInitialData.apply(this, arguments);
    };
  }
})();
