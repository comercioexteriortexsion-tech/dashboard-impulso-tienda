const API_URL = 'https://script.google.com/macros/s/AKfycbwCfspSz1mtp2mrNrqm9fezzLArIMv7Wzxbg3vqYMxZ4xvUbrLtc0F6JUnyAB5eFucO/exec';
const API_TIMEOUT_MS = 28000;

let storeDashboards = {};
let storesList = [];
let generalSummary = null;
let rankingCumplimientoTiendas = [];
let rankingAlertasTiendas = [];
let currentStoreName = '';
let openSectionKey = null;
let lastLoadError = '';

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
    showLoading(true, 'Cargando información...');
    await loadInitialData();

    if (storeSelect) {
      storeSelect.addEventListener('change', async () => {
        await handleStoreChange(storeSelect.value);
      });
    }

    renderGeneralDashboard();
  } catch (error) {
    console.error('Error cargando dashboard:', error);
    lastLoadError = error.message || String(error);
    renderErrorState(
      'No fue posible cargar el dashboard',
      getFriendlyErrorMessage(error)
    );
    showToast('No se pudo cargar la información. Revisa Apps Script.');
  } finally {
    showLoading(false);
  }
}

async function loadInitialData() {
  const json = await fetchJson(buildApiUrl({ modo: 'inicio' }));
  validateInitialPayload(json);

  storeDashboards = {};
  storesList = Array.isArray(json.tiendas) ? json.tiendas.filter(Boolean) : [];
  generalSummary = normalizeSummary(json.resumen_general || {});
  rankingCumplimientoTiendas = normalizeRankingCumplimiento(json.ranking_cumplimiento || []);
  rankingAlertasTiendas = normalizeRankingAlertas(json.ranking_alertas || []);
  lastLoadError = '';

  setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
  loadStoreSelector(storesList);
}

function validateInitialPayload(json) {
  if (!json) throw new Error('Apps Script no devolvió respuesta.');
  if (json.ok !== true) throw new Error(json.error || 'Apps Script devolvió error.');
  if (!json.resumen_general) throw new Error('Falta resumen_general en modo=inicio.');
  if (!Array.isArray(json.tiendas)) throw new Error('Falta lista de tiendas en modo=inicio.');
  if (!Array.isArray(json.ranking_cumplimiento)) throw new Error('Falta ranking_cumplimiento en modo=inicio.');
  if (!Array.isArray(json.ranking_alertas)) throw new Error('Falta ranking_alertas en modo=inicio.');
}

function validateStorePayload(json, storeName) {
  if (!json) throw new Error('Apps Script no devolvió respuesta para la tienda.');
  if (json.ok !== true) throw new Error(json.error || 'Apps Script devolvió error para la tienda.');
  if (!json.resumen) throw new Error(`Falta resumen para ${storeName}.`);
  if (!Array.isArray(json.zonas)) throw new Error(`Falta arreglo de zonas para ${storeName}.`);
}

async function handleStoreChange(storeName) {
  currentStoreName = storeName;
  openSectionKey = null;

  if (!currentStoreName) {
    renderGeneralDashboard();
    return;
  }

  if (!storesList.includes(currentStoreName)) {
    showToast('La tienda seleccionada no está disponible en la base actual.');
    renderErrorState('Tienda no disponible', 'Actualiza el dashboard o selecciona otra tienda.');
    return;
  }

  updateActiveStoreUI(currentStoreName, false);

  try {
    showLoading(true, `Cargando ${currentStoreName}...`);
    await loadStoreDashboard(currentStoreName);
    renderDashboard(currentStoreName);
  } catch (error) {
    console.error('Error cargando tienda:', error);
    lastLoadError = error.message || String(error);
    showToast('No se pudo cargar esta tienda.');
    renderErrorState('No fue posible cargar la tienda', getFriendlyErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

async function loadStoreDashboard(storeName, forceRefresh = false) {
  if (!forceRefresh && storeDashboards[storeName]) return storeDashboards[storeName];

  const json = await fetchJson(buildApiUrl({ modo: 'tienda', nombre: storeName }));
  validateStorePayload(json, storeName);

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
  return (rows || []).map((row, index) => {
    const cumplimiento = toNumber(row.cumplimiento_meta);
    const esperado = toNumber(row.avance_esperado_mes);
    return {
      posicion: toNumber(row.posicion) || index + 1,
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
  return (rows || []).map((row, index) => ({
    posicion: toNumber(row.posicion) || index + 1,
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}: no fue posible consultar Apps Script.`);
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La consulta superó el tiempo máximo de espera. Revisa Apps Script o la conexión.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function bindRefreshButton() {
  if (!refreshButton) return;

  refreshButton.addEventListener('click', async () => {
    refreshButton.classList.add('loading');

    try {
      showToast('Actualizando información...');
      showLoading(true, 'Actualizando información...');
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
      lastLoadError = error.message || String(error);
      renderErrorState('No fue posible actualizar', getFriendlyErrorMessage(error));
      showToast('No se pudo actualizar. Revisa Apps Script.');
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

  if (!sortedStores.length) {
    storeSelect.innerHTML = '<option value="">No hay tiendas disponibles</option>';
    storeSelect.disabled = true;
    return;
  }

  storeSelect.disabled = false;
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
  const updatedText = generalSummary && generalSummary.fecha_corte_datos
    ? `Fecha de corte: ${formatDate(generalSummary.fecha_corte_datos)}.`
    : '';

  if (!storesList.length) {
    container.innerHTML = renderEmptyState(
      'No hay tiendas disponibles',
      'Apps Script respondió, pero no entregó tiendas para consultar. Revisa la tabla dashboard_tiendas.'
    );
    return;
  }

  container.innerHTML = `
    <div class="empty-state general-action-card" role="status">
      <p class="empty-state__title">Vista general de tiendas</p>
      <p class="empty-state__desc">
        Estás viendo el cumplimiento consolidado${totalTiendas ? ` de ${formatNumber(totalTiendas)} tiendas` : ''}.
        Selecciona una tienda para revisar zonas, secciones y referencias críticas.
        ${updatedText}
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
  renderMundoSeccionCalculated(dashboard.zonas || []);
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
  if (!Array.isArray(rows) || !rows.length) {
    openSectionKey = null;
    container.innerHTML = renderEmptyState(
      'Sin zonas críticas',
      'Esta tienda no tiene referencias que cumplan los criterios definidos para revisión.'
    );
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
        <span class="status-pill ${statusClass}">${escapeHtml(row.estadoGrupo)}</span>
        <span class="expand-indicator">${isOpen ? '⌃' : '⌄'}</span>
      </button>
      <div class="section-references ${isOpen ? '' : 'hidden'}">${isOpen ? renderSectionReferences(row.productosCriticos || []) : ''}</div>
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

function renderErrorState(title = 'No fue posible cargar la información', description = 'Revisa la conexión o intenta actualizar de nuevo.') {
  const container = document.getElementById('mundoSeccionContainer');
  if (container) {
    container.innerHTML = `
      <div class="empty-state empty-state--error" role="alert">
        <p class="empty-state__title">${escapeHtml(title)}</p>
        <p class="empty-state__desc">${escapeHtml(description)}</p>
        ${lastLoadError ? `<p class="empty-state__desc error-detail">Detalle técnico: ${escapeHtml(lastLoadError)}</p>` : ''}
        <button class="store-bar__change general-select-button" type="button" onclick="location.reload()">Volver a cargar</button>
      </div>
    `;
  }

  renderSummaryCalculated({});
}

function renderEmptyState(title, description) {
  return `<div class="empty-state" role="status"><p class="empty-state__title">${escapeHtml(title)}</p><p class="empty-state__desc">${escapeHtml(description)}</p></div>`;
}

function getFriendlyErrorMessage(error) {
  const message = String(error && error.message ? error.message : error || '');
  if (message.includes('ranking_cumplimiento')) return 'Falta la tabla o respuesta de ranking de cumplimiento. Ejecuta la generación de tablas calculadas en Apps Script.';
  if (message.includes('ranking_alertas')) return 'Falta la tabla o respuesta de ranking de alertas. Ejecuta la generación de tablas calculadas en Apps Script.';
  if (message.includes('tiendas')) return 'Falta la lista de tiendas calculada. Revisa la hoja dashboard_tiendas.';
  if (message.includes('zonas')) return 'Falta la información de zonas para esta tienda. Revisa dashboard_zonas.';
  if (message.includes('tiempo máximo')) return message;
  return 'Revisa que Apps Script esté publicado, que modo=inicio responda y que las tablas calculadas existan.';
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
    .empty-state--error{border:1px solid #fecaca;background:#fff7f7;}
    .error-detail{margin-top:8px;font-size:.75rem;color:#991b1b;word-break:break-word;}
  `;
  document.head.appendChild(style);
}

function showLoading(show, message) {
  if (!loadingOverlay) return;
  const loadingText = loadingOverlay.querySelector('p');
  if (loadingText && message) loadingText.textContent = message;
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
