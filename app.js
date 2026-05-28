const API_URL = 'https://script.google.com/macros/s/AKfycbwCfspSz1mtp2mrNrqm9fezzLArIMv7Wzxbg3vqYMxZ4xvUbrLtc0F6JUnyAB5eFucO/exec';

let dashboardData = [];
let currentStoreName = '';
let openSectionKey = null;

const CRITICAL_STATES = ['Sin venta', 'Crítico', 'Lento'];
const PRIORITY_INVENTORY_MIN = 15;

const storeSelect = document.getElementById('storeSelect');
const loadingOverlay = document.getElementById('loadingOverlay');
const headerStoreName = document.getElementById('headerStoreName');
const refreshButton = document.getElementById('refreshButton');
const selectorCard = document.getElementById('selectorCard');
const storeBar = document.getElementById('storeBar');
const storeBarName = document.getElementById('storeBarName');
const changeStoreButton = document.getElementById('changeStoreButton');
const appToast = document.getElementById('appToast');

document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
  injectControlledStyles();
  bindRefreshButton();
  bindChangeStoreButton();

  try {
    showLoading(true);

    const response = await fetch(API_URL, { cache: 'no-store' });
    const json = await response.json();

    if (!json.ok) {
      throw new Error(json.error || 'Error al cargar datos');
    }

    dashboardData = json.data || [];

    setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
    loadStoreSelector(dashboardData);

    storeSelect.addEventListener('change', () => {
      currentStoreName = storeSelect.value;
      openSectionKey = null;
      updateActiveStoreUI(currentStoreName);
      renderDashboard(currentStoreName);
    });

    if (storeSelect.options.length > 1) {
      storeSelect.selectedIndex = 1;
      currentStoreName = storeSelect.value;
      updateActiveStoreUI(currentStoreName);
      renderDashboard(currentStoreName);
    }
  } catch (error) {
    console.error('Error cargando dashboard:', error);
    renderErrorState();
    showToast('No se pudo cargar la información. Intenta actualizar nuevamente.');
  } finally {
    showLoading(false);
  }
}

function bindRefreshButton() {
  if (!refreshButton) return;

  refreshButton.addEventListener('click', async () => {
    refreshButton.classList.add('loading');

    try {
      if (!dashboardData.length) {
        showToast('Actualizando información...');
        showLoading(true);
        const response = await fetch(API_URL, { cache: 'no-store' });
        const json = await response.json();
        if (!json.ok) throw new Error(json.error || 'Error al actualizar datos');
        dashboardData = json.data || [];
        setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
        loadStoreSelector(dashboardData);
      }

      if (currentStoreName) {
        renderDashboard(currentStoreName);
        showToast('Información actualizada.');
      }
    } catch (error) {
      console.error('Error actualizando:', error);
      showToast('No se pudo actualizar. Revisa la conexión.');
    } finally {
      showLoading(false);
      setTimeout(() => refreshButton.classList.remove('loading'), 350);
    }
  });
}

function bindChangeStoreButton() {
  if (!changeStoreButton || !selectorCard) return;

  changeStoreButton.addEventListener('click', () => {
    selectorCard.classList.remove('selector-card--compact');
    selectorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    storeSelect.focus({ preventScroll: true });
  });
}

function updateActiveStoreUI(storeName) {
  const label = storeName || 'Sin tienda seleccionada';
  if (headerStoreName) headerStoreName.textContent = label;
  if (storeBarName) storeBarName.textContent = label;

  if (storeBar) {
    storeBar.classList.toggle('hidden', !storeName);
  }

  if (selectorCard) {
    selectorCard.classList.toggle('selector-card--compact', Boolean(storeName));
  }
}

function loadStoreSelector(data) {
  const stores = [...new Set(data.map(item => item.nombre_almacen))]
    .filter(Boolean)
    .sort();

  storeSelect.innerHTML = '<option value="">Selecciona una tienda</option>';
  stores.forEach(store => {
    const option = document.createElement('option');
    option.value = store;
    option.textContent = store;
    storeSelect.appendChild(option);
  });
}

function renderDashboard(storeName) {
  const storeData = dashboardData.filter(item => item.nombre_almacen === storeName);
  renderSummary(storeData);
  renderMundoSeccion(storeData);
}

function isVisibleCriticalReference(item) {
  return CRITICAL_STATES.includes(item.estado_referencia) &&
    toNumber(item.inventario_unidades) > PRIORITY_INVENTORY_MIN;
}

function renderSummary(data) {
  const cumplimiento = getFirstNumber(data, 'cumplimiento_meta');
  const ventaMes = getFirstNumber(data, 'venta_pesos_mes');
  const metaMes = getFirstNumber(data, 'meta_venta_pesos');
  const inventarioTotal = sum(data, 'inventario_unidades');

  const alertasVisibles = data.filter(isVisibleCriticalReference);
  const alertasPrincipales = alertasVisibles.length;
  const sinVenta = alertasVisibles.filter(item => item.estado_referencia === 'Sin venta').length;
  const criticos = alertasVisibles.filter(item => item.estado_referencia === 'Crítico').length;
  const lentos = alertasVisibles.filter(item => item.estado_referencia === 'Lento').length;

  const cumplimientoValue = cumplimiento === null ? 0 : cumplimiento;
  const cumplimientoPct = Math.max(0, Math.min(cumplimientoValue * 100, 100));

  setText('cumplimientoMeta', cumplimiento === null ? '-' : formatPercent(cumplimiento));
  setText('ventaMetaTexto', `${formatCurrency(ventaMes)} / ${formatCurrency(metaMes)}`);
  setText('inventarioTotal', formatNumber(inventarioTotal));
  setText('referenciasCriticas', formatNumber(alertasPrincipales));
  setText('alertasTexto', alertasPrincipales === 0 ? 'Sin alertas activas' : 'Productos que necesitan atención');

  const metaCard = document.getElementById('kpiMetaCard');
  const inventarioCard = document.getElementById('kpiInventarioCard');
  const alertasCard = document.getElementById('kpiAlertasCard');

  if (metaCard) {
    metaCard.className = `summary-card ${cumplimientoValue >= 1 ? 'summary-card--success' : cumplimientoValue >= 0.75 ? 'summary-card--info' : 'summary-card--warning'}`;
  }

  if (inventarioCard) inventarioCard.className = 'summary-card summary-card--info';

  if (alertasCard) {
    alertasCard.className = `summary-card ${alertasPrincipales === 0 ? 'summary-card--success' : criticos > 0 || sinVenta > 0 ? 'summary-card--danger' : 'summary-card--warning'}`;
  }

  const cumplimientoBar = document.getElementById('cumplimientoMetaBar');
  const inventarioBar = document.getElementById('inventarioBar');
  if (cumplimientoBar) cumplimientoBar.style.width = `${cumplimientoPct}%`;
  if (inventarioBar) inventarioBar.style.width = `${Math.min(100, Math.max(8, inventarioTotal / 100))}%`;

  const alertBreakdown = document.getElementById('alertBreakdown');
  if (alertBreakdown) {
    alertBreakdown.innerHTML = alertasPrincipales > 0 ? `
      ${criticos ? `<span class="alert-chip alert-chip--critical">${criticos} crítico${criticos === 1 ? '' : 's'}</span>` : ''}
      ${sinVenta ? `<span class="alert-chip alert-chip--sinventa">${sinVenta} sin venta</span>` : ''}
      ${lentos ? `<span class="alert-chip alert-chip--lento">${lentos} lento${lentos === 1 ? '' : 's'}</span>` : ''}
    ` : '';
  }
}

function renderMundoSeccion(data) {
  const container = document.getElementById('mundoSeccionContainer');
  if (!container) return;

  if (!data.length) {
    openSectionKey = null;
    container.innerHTML = renderEmptyState('Selecciona una tienda', 'Elige una tienda para ver zonas, alertas y referencias a revisar.');
    return;
  }

  const grouped = {};
  data.forEach(item => {
    const key = `${item.mundo || 'SIN MUNDO'}|${item.seccion || 'SIN SECCIÓN'}`;
    if (!grouped[key]) {
      grouped[key] = {
        key,
        mundo: item.mundo || 'SIN MUNDO',
        seccion: item.seccion || 'SIN SECCIÓN',
        inventario: 0,
        ventaUnidades: 0,
        totalReferencias: 0,
        alertas: 0,
        productosCriticos: []
      };
    }

    grouped[key].inventario += toNumber(item.inventario_unidades);
    grouped[key].ventaUnidades += toNumber(item.venta_unidades);
    grouped[key].totalReferencias += 1;

    if (isVisibleCriticalReference(item)) {
      grouped[key].alertas += 1;
      grouped[key].productosCriticos.push(item);
    }
  });

  const rows = Object.values(grouped)
    .map(group => {
      const porcentajeAlertas = group.totalReferencias === 0 ? 0 : group.alertas / group.totalReferencias;
      return {
        ...group,
        porcentajeAlertas,
        estadoGrupo: getEstadoGrupo(porcentajeAlertas),
        productosCriticos: group.productosCriticos.sort(compareCriticalReferences)
      };
    })
    .filter(row => row.alertas > 0)
    .sort(compareSections);

  if (!rows.length) {
    openSectionKey = null;
    container.innerHTML = renderEmptyState('Sin zonas críticas', 'Esta tienda no tiene alertas mayores a 15 unidades para revisar en este momento.');
    return;
  }

  const note = `
    <div class="info-note">
      <strong>Solo se muestran alertas relevantes.</strong>
      <span>Referencias en estado Sin venta, Crítico o Lento con más de ${PRIORITY_INVENTORY_MIN} unidades en inventario.</span>
    </div>
  `;

  container.innerHTML = rows.map((row, index) => renderSectionRow(row, index)).join('') + note;
}

function renderSectionRow(row, index) {
  const isOpen = openSectionKey === row.key;
  const statusClass = getEstadoGrupoClass(row.estadoGrupo);
  const accentClass = getSectionAccentClass(row.estadoGrupo, index);

  return `
    <article class="category-card ${isOpen ? 'open' : ''} ${accentClass}">
      <button class="category-card-header" type="button" onclick="toggleSection('${escapeAttribute(row.key)}')" aria-expanded="${isOpen}">
        <div class="rank-badge">${index + 1}</div>
        <div class="category-main">
          <strong>${escapeHtml(row.mundo)} / ${escapeHtml(row.seccion)}</strong>
          <span>${formatNumber(row.totalReferencias)} referencias totales</span>
        </div>
        <div class="category-metric"><span>Inv.</span><strong>${formatNumber(row.inventario)}</strong></div>
        <div class="category-metric"><span>Venta</span><strong>${formatNumber(row.ventaUnidades)}</strong></div>
        <div class="category-metric alert-metric"><span>Alertas</span><strong>${formatNumber(row.alertas)}</strong></div>
        <div class="category-metric percent-metric"><span>% alertas</span><strong>${formatPercent(row.porcentajeAlertas)}</strong></div>
        <span class="status-pill ${statusClass}">${row.estadoGrupo}</span>
        <span class="expand-indicator">${isOpen ? '⌃' : '⌄'}</span>
      </button>
      <div class="section-references ${isOpen ? '' : 'hidden'}">
        ${isOpen ? renderSectionReferences(row.productosCriticos) : ''}
      </div>
    </article>
  `;
}

function renderSectionReferences(items) {
  if (!items.length) return renderEmptyState('Sin productos', 'No hay productos críticos en esta sección.');

  return `
    <div class="compact-table-wrap">
      <table class="compact-reference-table">
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Estado</th>
            <th>Inventario</th>
            <th>Cobertura</th>
            <th>Últ. despacho</th>
            <th>Acción sugerida</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const colorClass = getColorClass(item.color_estado);
            return `
              <tr>
                <td class="ref-main"><strong>${escapeHtml(item.referencia)}</strong><span>${escapeHtml(item.descripcion)}</span></td>
                <td class="ref-status"><span class="dot-status ${colorClass}"></span>${escapeHtml(item.estado_referencia)}</td>
                <td>${formatNumber(item.inventario_unidades)}</td>
                <td>${formatCoverage(item.cobertura_dias)}</td>
                <td>${formatDate(item.ultimo_despacho)}</td>
                <td class="action-cell">${escapeHtml(item.accion_sugerida)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function toggleSection(sectionKey) {
  openSectionKey = openSectionKey === sectionKey ? null : sectionKey;
  renderDashboard(currentStoreName);
}

function renderErrorState() {
  const container = document.getElementById('mundoSeccionContainer');
  if (container) {
    container.innerHTML = renderEmptyState('No fue posible cargar la información', 'Revisa la conexión o intenta actualizar de nuevo.');
  }
}

function renderEmptyState(title, description) {
  return `
    <div class="empty-state" role="status">
      <p class="empty-state__title">${escapeHtml(title)}</p>
      <p class="empty-state__desc">${escapeHtml(description)}</p>
    </div>
  `;
}

function compareSections(a, b) {
  const rank = { Prioritario: 1, Revisión: 2, Controlado: 3 };
  const rankA = rank[a.estadoGrupo] || 99;
  const rankB = rank[b.estadoGrupo] || 99;
  if (rankA !== rankB) return rankA - rankB;
  if (b.alertas !== a.alertas) return b.alertas - a.alertas;
  if (b.porcentajeAlertas !== a.porcentajeAlertas) return b.porcentajeAlertas - a.porcentajeAlertas;
  return b.inventario - a.inventario;
}

function compareCriticalReferences(a, b) {
  const priority = { 'Sin venta': 1, Crítico: 2, Lento: 3 };
  const priorityA = priority[a.estado_referencia] || 99;
  const priorityB = priority[b.estado_referencia] || 99;
  if (priorityA !== priorityB) return priorityA - priorityB;
  const invDiff = toNumber(b.inventario_unidades) - toNumber(a.inventario_unidades);
  if (invDiff !== 0) return invDiff;
  return toNumber(b.cobertura_dias) - toNumber(a.cobertura_dias);
}

function getEstadoGrupo(porcentaje) {
  if (porcentaje > 0.35) return 'Prioritario';
  if (porcentaje > 0.15) return 'Revisión';
  return 'Controlado';
}

function getEstadoGrupoClass(estado) {
  if (estado === 'Controlado') return 'status-controlado';
  if (estado === 'Revisión') return 'status-revision';
  return 'status-prioritario';
}

function getSectionAccentClass(estado, index) {
  if (estado === 'Prioritario') return 'accent-prioritario';
  if (estado === 'Revisión') return 'accent-revision';
  if (index < 3) return 'accent-blue-soft';
  return 'accent-controlado';
}

function getColorClass(color) {
  const normalized = String(color || '').toLowerCase();
  if (normalized.includes('rojo')) return 'rojo';
  if (normalized.includes('amarillo')) return 'amarillo';
  if (normalized.includes('azul')) return 'azul';
  if (normalized.includes('verde')) return 'verde';
  return '';
}

function injectControlledStyles() {
  if (document.getElementById('controlledStyles')) return;
  const style = document.createElement('style');
  style.id = 'controlledStyles';
  style.textContent = `.app-main{width:min(100%,980px);margin:0 auto;padding:16px;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}.app-header__left,.app-header__right{display:flex;align-items:center}.app-header__left{gap:12px}.app-header__right{gap:8px}.app-header__icon{color:#1a56db}.app-header__title{display:block;font-size:13px;font-weight:700}.app-header__store{display:block;font-size:11px;opacity:.75}.app-header__refresh{width:44px;height:44px;border:0;border-radius:10px;background:transparent;color:inherit}.app-header__refresh.loading svg{animation:spin .8s linear infinite}.store-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px auto 0;width:calc(100% - 24px);max-width:980px;padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;color:#111827}.store-bar.hidden{display:none!important}.store-bar__info{min-width:0}.store-bar__label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-weight:800}.store-bar__info strong{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.store-bar__change{height:36px;padding:0 12px;border:0;border-radius:999px;background:#1a56db;color:#fff;font-size:12px;font-weight:700}.selector-card--compact{padding:10px 14px!important}.selector-card--compact label{display:none!important}.selector-card--compact select{height:42px!important}.summary-card__header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.summary-card__label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#6b7280}.summary-card__icon{width:28px;height:28px;display:grid;place-items:center;border-radius:6px;background:rgba(255,255,255,.7);color:#1a56db}.summary-card__icon--alert{color:#e02424}.summary-card--success{background:#f0fdf4!important;border-color:#a7f3d0!important}.summary-card--info{background:#eff6ff!important;border-color:#bfdbfe!important}.summary-card--warning{background:#fffbeb!important;border-color:#fde68a!important}.summary-card--danger{background:#fef2f2!important;border-color:#fecaca!important}.progress-track{height:4px;background:rgba(0,0,0,.08);border-radius:2px;overflow:hidden}.progress-fill{height:100%;width:0;background:#1a56db;transition:width .5s ease}.summary-card--success .progress-fill{background:#0e9f6e}.summary-card--warning .progress-fill{background:#d97706}.summary-card--danger .progress-fill{background:#e02424}.alert-breakdown{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.alert-chip{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px}.alert-chip--critical{background:#fef2f2;color:#e02424;border:1px solid #fecaca}.alert-chip--sinventa{background:#fffbeb;color:#d97706;border:1px solid #fde68a}.alert-chip--lento{background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe}.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:190px;padding:24px 16px;color:#6b7280}.empty-state__title{margin:0 0 8px;font-size:15px;font-weight:800;color:#111827}.empty-state__desc{margin:0;font-size:13px}.app-toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%) translateY(20px);max-width:320px;width:calc(100% - 32px);padding:11px 14px;border-radius:12px;background:#0f172a;color:#fff;font-size:13px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.22);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease;z-index:999}.app-toast.visible{opacity:1;transform:translateX(-50%) translateY(0)}button,.category-card-header,.store-bar__change,.app-header__refresh{min-height:44px}@media(max-width:760px){.app-main{padding:12px;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}.summary-grid{grid-template-columns:1fr!important}}`;
  document.head.appendChild(style);
}

function showToast(message) {
  if (!appToast) return;
  appToast.textContent = message;
  appToast.classList.add('visible');
  clearTimeout(appToast._timer);
  appToast._timer = setTimeout(() => appToast.classList.remove('visible'), 3200);
}

function getFirstNumber(data, field) {
  for (const item of data) {
    const value = toNumberOrNull(item[field]);
    if (value !== null) return value;
  }
  return null;
}

function sum(data, field) {
  return data.reduce((acc, item) => acc + toNumber(item[field]), 0);
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  return toNumber(value).toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function formatCurrency(value) {
  return toNumber(value).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });
}

function formatPercent(value) {
  return toNumber(value).toLocaleString('es-CO', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-CO');
}

function formatCoverage(value) {
  if (typeof value === 'string') return escapeHtml(value);
  const number = toNumber(value);
  if (!number) return '-';
  return `${number.toLocaleString('es-CO', { maximumFractionDigits: 0 })} días`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll("'", '&#039;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function showLoading(show) {
  if (loadingOverlay) loadingOverlay.classList.toggle('hidden', !show);
}
