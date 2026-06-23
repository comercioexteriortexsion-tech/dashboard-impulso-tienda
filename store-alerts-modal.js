/* =========================================================
   Sprint 3.5 - Tabla emergente de alertas activas por tienda
   Al tocar la tarjeta de alertas muestra:
   - Tienda
   - Número de alertas
   - Sin venta
   - Críticas
   - Lentas
   Orden: más alertas a menos alertas
   ========================================================= */

let storeAlertsRowsCache = null;
let storeAlertsLoading = false;

function injectStoreAlertsModalStyles() {
  if (document.getElementById('storeAlertsModalStyles')) return;

  const style = document.createElement('style');
  style.id = 'storeAlertsModalStyles';
  style.textContent = `
    #kpiAlertasCard {
      cursor: pointer;
      position: relative;
    }

    #kpiAlertasCard::after {
      content: 'Tocar para ver tiendas';
      display: block;
      margin-top: 8px;
      font-size: 0.72rem;
      font-weight: 800;
      color: rgba(15, 23, 42, 0.58);
      letter-spacing: -0.01em;
    }

    .store-alerts-modal-backdrop {
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

    .store-alerts-modal {
      width: min(820px, 100%);
      max-height: min(82vh, 760px);
      overflow: hidden;
      border-radius: 28px;
      background: #f8fafc;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.32);
      border: 1px solid rgba(148, 163, 184, 0.35);
      display: flex;
      flex-direction: column;
    }

    .store-alerts-modal__header {
      padding: 20px 20px 14px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      background: linear-gradient(135deg, #ffffff 0%, #fff7ed 100%);
      border-bottom: 1px solid rgba(148, 163, 184, 0.25);
    }

    .store-alerts-modal__title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 950;
      color: #0f172a;
      letter-spacing: -0.03em;
    }

    .store-alerts-modal__subtitle {
      margin: 5px 0 0;
      font-size: 0.84rem;
      color: #64748b;
      font-weight: 750;
    }

    .store-alerts-modal__close {
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

    .store-alerts-modal__body {
      padding: 14px;
      overflow: auto;
    }

    .store-alerts-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 10px;
    }

    .store-alerts-table th {
      padding: 0 10px 2px;
      text-align: left;
      font-size: 0.72rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 950;
      white-space: nowrap;
    }

    .store-alerts-table td {
      padding: 13px 10px;
      background: #ffffff;
      border-top: 1px solid rgba(226, 232, 240, 0.95);
      border-bottom: 1px solid rgba(226, 232, 240, 0.95);
      vertical-align: middle;
    }

    .store-alerts-table td:first-child {
      border-left: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 16px 0 0 16px;
    }

    .store-alerts-table td:last-child {
      border-right: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 0 16px 16px 0;
    }

    .store-alerts-store {
      display: block;
      max-width: 310px;
      color: #0f172a;
      font-size: 0.86rem;
      font-weight: 950;
      line-height: 1.15;
    }

    .store-alerts-total {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      border-radius: 999px;
      padding: 8px 10px;
      background: #fee2e2;
      color: #991b1b;
      font-size: 0.94rem;
      font-weight: 950;
      white-space: nowrap;
    }

    .store-alerts-total--zero {
      background: #dcfce7;
      color: #166534;
    }

    .store-alerts-number {
      color: #0f172a;
      font-size: 0.95rem;
      font-weight: 950;
      white-space: nowrap;
    }

    .store-alerts-loading,
    .store-alerts-empty {
      padding: 32px 14px;
      text-align: center;
      color: #64748b;
      font-weight: 850;
    }

    @media (min-width: 720px) {
      .store-alerts-modal-backdrop { align-items: center; }
    }

    @media (max-width: 560px) {
      .store-alerts-modal-backdrop { padding: 10px; }
      .store-alerts-modal {
        border-radius: 24px 24px 18px 18px;
        max-height: 86vh;
      }
      .store-alerts-table th:nth-child(4),
      .store-alerts-table td:nth-child(4),
      .store-alerts-table th:nth-child(5),
      .store-alerts-table td:nth-child(5) { display: none; }
      .store-alerts-store {
        max-width: 150px;
        font-size: 0.79rem;
      }
      .store-alerts-number { font-size: 0.88rem; }
    }
  `;
  document.head.appendChild(style);
}

function setupStoreAlertsModal() {
  injectStoreAlertsModalStyles();

  const alertCard = document.getElementById('kpiAlertasCard');
  if (!alertCard || alertCard.dataset.alertsModalReady === 'true') return;

  alertCard.dataset.alertsModalReady = 'true';
  alertCard.setAttribute('title', 'Tocar para ver alertas por tienda');
  alertCard.addEventListener('click', openStoreAlertsModal);
}

function closeStoreAlertsModal() {
  const modal = document.getElementById('storeAlertsModalBackdrop');
  if (modal) modal.remove();
}

function renderStoreAlertsModalShell() {
  closeStoreAlertsModal();

  const backdrop = document.createElement('div');
  backdrop.id = 'storeAlertsModalBackdrop';
  backdrop.className = 'store-alerts-modal-backdrop';
  backdrop.innerHTML = `
    <section class="store-alerts-modal" role="dialog" aria-modal="true" aria-labelledby="storeAlertsModalTitle">
      <div class="store-alerts-modal__header">
        <div>
          <h3 class="store-alerts-modal__title" id="storeAlertsModalTitle">Alertas activas por tienda</h3>
          <p class="store-alerts-modal__subtitle">Ordenado de mayor a menor número de alertas.</p>
        </div>
        <button class="store-alerts-modal__close" type="button" aria-label="Cerrar" onclick="closeStoreAlertsModal()">×</button>
      </div>
      <div class="store-alerts-modal__body" id="storeAlertsModalBody">
        <div class="store-alerts-loading">Cargando tiendas...</div>
      </div>
    </section>
  `;

  backdrop.addEventListener('click', event => {
    if (event.target === backdrop) closeStoreAlertsModal();
  });

  document.body.appendChild(backdrop);
}

async function openStoreAlertsModal() {
  renderStoreAlertsModalShell();

  try {
    const rows = await getStoreAlertsRows();
    renderStoreAlertsRows(rows);
  } catch (error) {
    console.error('Error cargando alertas por tienda:', error);
    const body = document.getElementById('storeAlertsModalBody');
    if (body) body.innerHTML = '<div class="store-alerts-empty">No fue posible cargar el listado de alertas.</div>';
  }
}

async function getStoreAlertsRows() {
  if (storeAlertsRowsCache) return storeAlertsRowsCache;
  if (storeAlertsLoading) return [];

  storeAlertsLoading = true;

  try {
    const stores = Array.isArray(storesList) ? storesList.filter(Boolean) : [];
    const rows = await Promise.all(stores.map(async storeName => {
      try {
        const dashboard = storeDashboards[storeName] || await loadStoreDashboard(storeName);
        const resumen = dashboard && dashboard.resumen ? dashboard.resumen : {};
        return {
          tienda: storeName,
          alertas: toNumber(resumen.alertas_total),
          sinVenta: toNumber(resumen.sin_venta),
          criticos: toNumber(resumen.criticos),
          lentos: toNumber(resumen.lentos)
        };
      } catch (error) {
        console.warn('No se pudo cargar tienda para tabla de alertas:', storeName, error);
        return { tienda: storeName, alertas: 0, sinVenta: 0, criticos: 0, lentos: 0 };
      }
    }));

    storeAlertsRowsCache = rows
      .filter(row => row.tienda)
      .sort((a, b) => b.alertas - a.alertas || b.sinVenta - a.sinVenta || b.criticos - a.criticos);

    return storeAlertsRowsCache;
  } finally {
    storeAlertsLoading = false;
  }
}

function renderStoreAlertsRows(rows) {
  const body = document.getElementById('storeAlertsModalBody');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = '<div class="store-alerts-empty">No hay tiendas para mostrar.</div>';
    return;
  }

  body.innerHTML = `
    <table class="store-alerts-table">
      <thead>
        <tr>
          <th>Tienda</th>
          <th>Alertas</th>
          <th>Sin venta</th>
          <th>Críticas</th>
          <th>Lentas</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(row => {
          const totalClass = row.alertas > 0 ? 'store-alerts-total' : 'store-alerts-total store-alerts-total--zero';
          return `
            <tr>
              <td><span class="store-alerts-store">${escapeHtml(row.tienda)}</span></td>
              <td><span class="${totalClass}">${formatNumber(row.alertas)}</span></td>
              <td><span class="store-alerts-number">${formatNumber(row.sinVenta)}</span></td>
              <td><span class="store-alerts-number">${formatNumber(row.criticos)}</span></td>
              <td><span class="store-alerts-number">${formatNumber(row.lentos)}</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function resetStoreAlertsRowsCache() {
  storeAlertsRowsCache = null;
  storeAlertsLoading = false;
}

(function initStoreAlertsModalWhenReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupStoreAlertsModal);
  } else {
    setupStoreAlertsModal();
  }

  const originalLoadInitialDataForAlerts = window.loadInitialData;
  if (typeof originalLoadInitialDataForAlerts === 'function') {
    window.loadInitialData = async function () {
      resetStoreAlertsRowsCache();
      return originalLoadInitialDataForAlerts.apply(this, arguments);
    };
  }
})();
