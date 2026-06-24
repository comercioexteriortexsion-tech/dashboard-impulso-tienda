const API_URL = 'https://script.google.com/macros/s/AKfycbwCfspSz1mtp2mrNrqm9fezzLArIMv7Wzxbg3vqYMxZ4xvUbrLtc0F6JUnyAB5eFucO/exec';

let storeDashboards = {};
let storesList = [];
let generalSummary = null;
let rankingCumplimientoTiendas = [];
let rankingAlertasTiendas = [];
let currentStoreName = '';
let openSectionKey = null;

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
    await loadInitialData();

    if (storeSelect) {
      storeSelect.addEventListener('change', async () => {
        await handleStoreChange(storeSelect.value);
      });
    }

    renderGeneralDashboard();
  } catch (error) {
    console.error('Error cargando dashboard:', error);
    renderErrorState();
    showToast('No se pudo cargar la información. Actualiza Apps Script y vuelve a intentar.');
  } finally {
    showLoading(false);
  }
}

async function loadInitialData() {
  const json = await fetchJson(buildApiUrl({ modo: 'inicio' }));

  if (!json.ok || !json.resumen_general || !Array.isArray(json.tiendas)) {
    throw new Error(json.error || 'La API de inicio no devolvió la estructura esperada.');
  }

  storeDashboards = {};
  storesList = json.tiendas || [];
  generalSummary = normalizeSummary(json.resumen_general || {});
  rankingCumplimientoTiendas = normalizeRankingCumplimiento(json.ranking_cumplimiento || []);
  rankingAlertasTiendas = normalizeRankingAlertas(json.ranking_alertas || []);

  setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
  loadStoreSelector(storesList);
}

async function handleStoreChange(storeName) {
  currentStoreName = storeName;
  openSectionKey = null;

  if (!currentStoreName) {
    renderGeneralDashboard();
    return;
  }

  updateActiveStoreUI(currentStoreName, false);

  try {
    showLoading(true);
    await loadStoreDashboard(currentStoreName);
    renderDashboard(currentStoreName);
  } catch (error) {
    console.error('Error cargando tienda:', error);
    showToast('No se pudo cargar esta tienda. Intenta actualizar.');
    renderErrorState();
  } finally {
    showLoading(false);
  }
}

async function loadStoreDashboard(storeName, forceRefresh = false) {
  if (!forceRefresh && storeDashboards[storeName]) return storeDashboards[storeName];

  const json = await fetchJson(buildApiUrl({ modo: 'tienda', nombre: storeName }));

  if (!json.ok) {
    throw new Error(json.error || 'Error al cargar tienda.');
  }

  const dashboard = normalizeOptimizedDashboard(json);
  storeDashboards[storeName] = dashboard;

  if (json.ultima_actualizacion) {
    setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
  }

  return dashboard;
}

function normalizeSummary(resumen) {
  return {
    total_tiendas: toNumber(resumen.total_tiendas),
    cumplimiento_meta: toNumber(resumen.cumplimiento_meta),
    avance_esperado_mes: toNumber(resumen.avance_esperado_mes),
    venta_pesos_mes: toNumber(resumen.venta_pesos_mes),
    meta_venta_pesos: toNumber(resumen.meta_venta_pesos),
    inventario_total: toNumber(resumen.inventario_total),
    alertas_total: toNumber(resumen.alertas_total),
    sin_venta: toNumber(resumen.sin_venta),
    criticos: toNumber(resumen.criticos),
    lentos: toNumber(resumen.lentos),
    fecha_corte_datos: resumen.fecha_corte_datos || ''
  };
}

function normalizeRankingCumplimiento(rows) {
  return (rows || []).map(row => {
    const cumplimiento = toNumber(row.cumplimiento_meta);
    const esperado = toNumber(row.avance_esperado_mes);
    return {
      posicion: toNumber(row.posicion),
      tienda: row.nombre_almacen || row.tienda || '',
      cumplimiento,
      esperado,
      estado: row.estado || (esperado > 0 ? (cumplimiento >= esperado ? 'Bien' : 'Abajo') : (cumplimiento >= 1 ? 'Bien' : 'Abajo')),
      ventaMes: toNumber(row.venta_pesos_mes),
      metaMes: toNumber(row.meta_venta_pesos)
    };
  }).filter(row => row.tienda).sort((a, b) => a.posicion - b.posicion);
}

function normalizeRankingAlertas(rows) {
  return (rows || []).map(row => ({
    posicion: toNumber(row.posicion),
    tienda: row.nombre_almacen || row.tienda || '',
    alertas: toNumber(row.alertas_total),
    sinVenta: toNumber(row.sin_venta),
    criticos: toNumber(row.criticos),
    lentos: toNumber(row.lentos)
  })).filter(row => row.tienda).sort((a, b) => a.posicion - b.posicion);
}

function normalizeOptimizedDashboard(json) {
  const resumen = json.resumen || {};
  const zonas = Array.isArray(json.zonas) ? json.zonas : [];

  return {
    resumen: normalizeSummary(resumen),
    zonas: zonas.map(zona => {
      const key = zona.key || zona.key_zona || `${zona.mundo || 'SIN MUNDO'}|${zona.seccion || 'SIN SECCIÓN'}`;
      return {
        key,
        mundo: zona.mundo || 'SIN MUNDO',
        seccion: zona.seccion || 'SIN SECCIÓN',
        inventario: toNumber(zona.inventario),
        ventaUnidades: toNumber(zona.venta_unidades),
        totalReferencias: toNumber(zona.total_referencias),
        alertas: toNumber(zona.alertas),
        porcentajeAlertas: toNumber(zona.porcentaje_alertas),
        estadoGrupo: zona.estado_grupo || 'Controlado',
        productosCriticos: Array.isArray(zona.referencias) ? zona.referencias : []
      };
    })
  };
}

function buildApiUrl(params) {
  const query = new URLSearchParams(params).toString();
  const separator = API_URL.includes('?') ? '&' : '?';
  return `${API_URL}${separator}${query}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  return response.json();
}

function bindRefreshButton() {
  if (!refreshButton) return;

  refreshButton.addEventListener('click', async () => {
    refreshButton.classList.add('loading');

    try {
      showToast('Actualizando información...');
      showLoading(true);
      await loadInitialData();

      if (currentStoreName) {
        await loadStoreDashboard(currentStoreName, true);
        updateActiveStoreUI(currentStoreName, false);
        renderDashboard(currentStoreName);
      } else {
        renderGeneralDashboard();
      }

      showToast('Información actualizada.');
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
  changeStoreButton.addEventListener('click', showStoreSelector);
}

function showStoreSelector() {
  if (!selectorCard) return;
  selectorCard.classList.remove('selector-card--hidden');
  selectorCard.classList.add('selector-card--visible');
  selectorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => storeSelect && storeSelect.focus({ preventScroll: true }), 250);
}

function updateActiveStoreUI(storeName, showSelector = false) {
  const label = storeName || 'Vista general / Todas las tiendas';
  if (headerStoreName) headerStoreName.textContent = label;
  if (storeBarName) storeBarName.textContent = storeName || 'Todas las tiendas';
  if (storeBar) storeBar.classList.toggle('hidden', !storeName);
  if (selectorCard) {
    selectorCard.classList.toggle('selector-card--hidden', !showSelector);
    selectorCard.classList.toggle('selector-card--visible', showSelector);
  }
}

function loadStoreSelector(stores) {
  if (!storeSelect) return;
  const sortedStores = (stores || []).filter(Boolean).sort();
  storeSelect.innerHTML = '<option value="">Selecciona una tienda</option>';
  sortedStores.forEach(store => {
    const option = document.createElement('option');
    option.value = store;
    option.textContent = store;
    storeSelect.appendChild(option);
  });
}

function renderGeneralDashboard() {
  currentStoreName = '';
  openSectionKey = null;
  if (storeSelect) storeSelect.value = '';
  updateActiveStoreUI('', false);
  renderSummaryCalculated(generalSummary || {});

  const container = document.getElementById('mundoSeccionContainer');
  if (!container) return;

  const totalTiendas = toNumber(generalSummary && generalSummary.total_tiendas);
  container.innerHTML = `
    <div class="empty-state general-action-card" role="status">
      <p class="empty-state__title">Vista general de tiendas</p>
      <p class="empty-state__desc">
        Estás viendo el cumplimiento consolidado${totalTiendas ? ` de ${formatNumber(totalTiendas)} tiendas` : ''}.
        Selecciona una tienda para revisar zonas, secciones y referencias críticas.
      </p>
      <button class="store-bar__change general-select-button" type="button" onclick="showStoreSelector()">Seleccionar una tienda</button>
    </div>
  `;
}

function renderDashboard(storeName) {
  const dashboard = storeDashboards[storeName];
  if (!storeName || !dashboard) {
    renderGeneralDashboard();
    return;
  }
  renderSummaryCalculated(dashboard.resumen);
  renderMundoSeccionCalculated(dashboard.zonas);
}

function renderSummaryCalculated(resumen) {
  const cumplimiento = toNumberOrNull(resumen.cumplimiento_meta);
  const avanceEsperadoMes = toNumberOrNull(resumen.avance_esperado_mes);
  const ventaMes = toNumber(resumen.venta_pesos_mes);
  const metaMes = toNumber(resumen.meta_venta_pesos);
  const inventarioTotal = toNumber(resumen.inventario_total);
  const alertasPrincipales = toNumber(resumen.alertas_total);
  const sinVenta = toNumber(resumen.sin_venta);
  const criticos = toNumber(resumen.criticos);
  const lentos = toNumber(resumen.lentos);

  pintarSummary({ cumplimiento, avanceEsperadoMes, ventaMes, metaMes, inventarioTotal, alertasPrincipales, sinVenta, criticos, lentos });
}

function pintarSummary({ cumplimiento, avanceEsperadoMes, ventaMes, metaMes, inventarioTotal, alertasPrincipales, sinVenta, criticos, lentos }) {
  const cumplimientoValue = cumplimiento === null ? 0 : cumplimiento;
  const cumplimientoPct = Math.max(0, Math.min(cumplimientoValue * 100, 100));
  setText('cumplimientoMeta', cumplimiento === null ? '-' : formatPercent(cumplimiento));
  setText('ventaMetaTexto', avanceEsperadoMes ? `Debería ir: ${formatPercent(avanceEsperadoMes)}` : '-');
  setText('inventarioTotal', formatNumber(inventarioTotal));
  setText('referenciasCriticas', formatNumber(alertasPrincipales));
  setText('alertasTexto', alertasPrincipales === 0 ? 'Sin alertas activas' : 'Productos que necesitan atención');

  const metaCard = document.getElementById('kpiMetaCard');
  const inventarioCard = document.getElementById('kpiInventarioCard');
  const alertasCard = document.getElementById('kpiAlertasCard');
  if (metaCard) metaCard.className = `summary-card ${cumplimientoValue >= 1 ? 'summary-card--success' : cumplimientoValue >= 0.75 ? 'summary-card--info' : 'summary-card--warning'}`;
  if (inventarioCard) inventarioCard.className = 'summary-card summary-card--info';
  if (alertasCard) alertasCard.className = `summary-card ${alertasPrincipales === 0 ? 'summary-card--success' : criticos > 0 || sinVenta > 0 ? 'summary-card--danger' : 'summary-card--warning'}`;

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

function renderMundoSeccionCalculated(rows) {
  const container = document.getElementById('mundoSeccionContainer');
  if (!container) return;
  if (!currentStoreName) {
    renderGeneralDashboard();
    return;
  }
  if (!rows.length) {
    openSectionKey = null;
    container.innerHTML = renderEmptyState('Sin zonas críticas', 'Esta tienda no tiene referencias que cumplan los criterios definidos para revisión.');
    return;
  }
  const note = `
    <div class="info-note">
      <strong>Solo se muestran productos que necesitan gestión.</strong>
      <span>Se priorizan referencias con inventario y poca o ninguna venta reciente.</span>
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
        <div class="category-main"><strong>${escapeHtml(row.mundo)} / ${escapeHtml(row.seccion)}</strong><span>${formatNumber(row.totalReferencias)} referencias totales</span></div>
        <div class="category-metric"><span>Hay</span><strong>${formatNumber(row.inventario)}</strong></div>
        <div class="category-metric"><span>Vendió</span><strong>${formatNumber(row.ventaUnidades)}</strong></div>
        <div class="category-metric alert-metric"><span>Revisar</span><strong>${formatNumber(row.alertas)}</strong></div>
        <div class="category-metric percent-metric"><span>% revisar</span><strong>${formatPercent(row.porcentajeAlertas)}</strong></div>
        <span class="status-pill ${statusClass}">${row.estadoGrupo}</span>
        <span class="expand-indicator">${isOpen ? '⌃' : '⌄'}</span>
      </button>
      <div class="section-references ${isOpen ? '' : 'hidden'}">${isOpen ? renderSectionReferences(row.productosCriticos) : ''}</div>
    </article>
  `;
}

function renderSectionReferences(items) {
  if (!items.length) return renderEmptyState('Sin referencias para revisar', 'No hay referencias que cumplan los criterios definidos.');
  return '';
}

function toggleSection(sectionKey) {
  openSectionKey = openSectionKey === sectionKey ? null : sectionKey;
  renderDashboard(currentStoreName);
}

function renderErrorState() {
  const container = document.getElementById('mundoSeccionContainer');
  if (container) container.innerHTML = renderEmptyState('No fue posible cargar la información', 'Revisa la conexión o intenta actualizar de nuevo.');
}

function renderEmptyState(title, description) {
  return `<div class="empty-state" role="status"><p class="empty-state__title">${escapeHtml(title)}</p><p class="empty-state__desc">${escapeHtml(description)}</p></div>`;
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

function injectControlledStyles() {
  if (document.getElementById('controlledStyles')) return;
  const style = document.createElement('style');
  style.id = 'controlledStyles';
  style.textContent = `
    .app-main{width:min(100%,980px);margin:0 auto;padding:16px;padding-bottom:calc(24px + env(safe-area-inset-bottom));}
    .selector-card--hidden{display:none;}
    .selector-card--visible{display:block;}
    .general-action-card{padding:28px 18px;}
    .general-select-button{margin-top:14px;}
    .info-note{margin-top:12px;padding:12px 14px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;color:#475569;font-size:.82rem;display:flex;flex-direction:column;gap:3px;}
  `;
  document.head.appendChild(style);
}

function showLoading(show) {
  if (!loadingOverlay) return;
  loadingOverlay.classList.toggle('hidden', !show);
}

function showToast(message) {
  if (!appToast) return;
  appToast.textContent = message;
  appToast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => appToast.classList.remove('show'), 2600);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const number = Number(String(value).replace('%', '').replace(',', '.').trim());
  if (!Number.isFinite(number)) return 0;
  return String(value).includes('%') && number > 1 ? number / 100 : number;
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = toNumber(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(toNumber(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(toNumber(value));
}

function formatPercent(value) {
  return `${Math.round(toNumber(value) * 100)}%`;
}

function formatCoverage(value) {
  const days = toNumber(value);
  if (!days) return '-';
  return `${formatNumber(days)} días`;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
