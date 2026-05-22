const API_URL = 'https://script.google.com/macros/s/AKfycbwCfspSz1mtp2mrNrqm9fezzLArIMv7Wzxbg3vqYMxZ4xvUbrLtc0F6JUnyAB5eFucO/exec';

let dashboardData = [];
let currentStoreName = '';
let showAllProducts = false;

const CRITICAL_STATES = ['Sin venta', 'Crítico', 'Lento'];
const PRIORITY_INVENTORY_MIN = 15;
const INITIAL_PRODUCT_LIMIT = 10;

const storeSelect = document.getElementById('storeSelect');
const loadingOverlay = document.getElementById('loadingOverlay');

document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
  try {
    showLoading(true);

    const response = await fetch(API_URL);
    const json = await response.json();

    if (!json.ok) {
      throw new Error(json.error || 'Error al cargar datos');
    }

    dashboardData = json.data || [];

    document.getElementById('ultimaActualizacion').textContent =
      formatDate(json.ultima_actualizacion) || 'Sin dato';

    loadStoreSelector(dashboardData);

    storeSelect.addEventListener('change', () => {
      showAllProducts = false;
      currentStoreName = storeSelect.value;
      renderDashboard(currentStoreName);
    });

    if (storeSelect.options.length > 1) {
      storeSelect.selectedIndex = 1;
      currentStoreName = storeSelect.value;
      renderDashboard(currentStoreName);
    }

  } catch (error) {
    console.error(error);
    alert('No fue posible cargar la información del dashboard.');
  } finally {
    showLoading(false);
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
  renderCriticalReferences(storeData);
}

/**
 * Una referencia solo se considera crítica visible si:
 * 1. Su estado está en Sin venta, Crítico o Lento.
 * 2. Tiene más de 15 unidades en inventario.
 */
function isVisibleCriticalReference(item) {
  return (
    CRITICAL_STATES.includes(item.estado_referencia) &&
    toNumber(item.inventario_unidades) > PRIORITY_INVENTORY_MIN
  );
}

function renderSummary(data) {
  const cumplimiento = getFirstNumber(data, 'cumplimiento_meta');
  const ventaMes = getFirstNumber(data, 'venta_pesos_mes');
  const metaMes = getFirstNumber(data, 'meta_venta_pesos');
  const inventarioTotal = sum(data, 'inventario_unidades');

  const referenciasCriticasVisibles = data.filter(isVisibleCriticalReference).length;

  document.getElementById('cumplimientoMeta').textContent =
    cumplimiento === null ? '-' : formatPercent(cumplimiento);

  document.getElementById('ventaMetaTexto').textContent =
    `${formatCurrency(ventaMes)} / ${formatCurrency(metaMes)}`;

  document.getElementById('inventarioTotal').textContent =
    formatNumber(inventarioTotal);

  document.getElementById('referenciasCriticas').textContent =
    formatNumber(referenciasCriticasVisibles);

  document.getElementById('contadorCriticas').textContent =
    formatNumber(referenciasCriticasVisibles);
}

function renderMundoSeccion(data) {
  const container = document.getElementById('mundoSeccionContainer');

  if (!data.length) {
    container.innerHTML = '<p class="empty-state">Selecciona una tienda para ver el desempeño.</p>';
    return;
  }

  const grouped = {};

  data.forEach(item => {
    const key = `${item.mundo || 'SIN MUNDO'}|${item.seccion || 'SIN SECCIÓN'}`;

    if (!grouped[key]) {
      grouped[key] = {
        mundo: item.mundo || 'SIN MUNDO',
        seccion: item.seccion || 'SIN SECCIÓN',
        inventario: 0,
        ventaUnidades: 0,
        totalReferencias: 0,
        referenciasCriticas: 0
      };
    }

    grouped[key].inventario += toNumber(item.inventario_unidades);
    grouped[key].ventaUnidades += toNumber(item.venta_unidades);
    grouped[key].totalReferencias += 1;

    if (isVisibleCriticalReference(item)) {
      grouped[key].referenciasCriticas += 1;
    }
  });

  const rows = Object.values(grouped)
    .map(group => {
      const porcentajeCriticas =
        group.totalReferencias === 0 ? 0 : group.referenciasCriticas / group.totalReferencias;

      return {
        ...group,
        porcentajeCriticas,
        estadoGrupo: getEstadoGrupo(porcentajeCriticas)
      };
    })
    .filter(row => row.referenciasCriticas > 0)
    .sort((a, b) => b.referenciasCriticas - a.referenciasCriticas || b.porcentajeCriticas - a.porcentajeCriticas);

  if (!rows.length) {
    container.innerHTML = '<p class="empty-state">No hay zonas con alertas mayores a 15 unidades.</p>';
    return;
  }

  container.innerHTML = rows.map(row => `
    <article class="category-card">
      <div class="category-main">
        <strong>${escapeHtml(row.mundo)} / ${escapeHtml(row.seccion)}</strong>
        <span>${formatNumber(row.totalReferencias)} referencias</span>
      </div>

      <div class="category-metric">
        <span>Inventario</span>
        <strong>${formatNumber(row.inventario)}</strong>
      </div>

      <div class="category-metric">
        <span>Venta und.</span>
        <strong>${formatNumber(row.ventaUnidades)}</strong>
      </div>

      <div class="category-metric">
        <span>Alertas +15 und.</span>
        <strong>${formatNumber(row.referenciasCriticas)}</strong>
      </div>

      <div class="category-metric">
        <span>% alertas</span>
        <strong>${formatPercent(row.porcentajeCriticas)}</strong>
      </div>

      <span class="status-pill ${getEstadoGrupoClass(row.estadoGrupo)}">
        ${row.estadoGrupo}
      </span>
    </article>
  `).join('');
}

function renderCriticalReferences(data) {
  const container = document.getElementById('referenciasContainer');

  const criticalItems = data
    .filter(isVisibleCriticalReference)
    .sort(compareCriticalReferences);

  if (!criticalItems.length) {
    container.innerHTML = '<p class="empty-state">No hay productos con alerta mayor a 15 unidades en esta tienda.</p>';
    return;
  }

  const itemsToShow = showAllProducts
    ? criticalItems
    : criticalItems.slice(0, INITIAL_PRODUCT_LIMIT);

  const hiddenCount = criticalItems.length - itemsToShow.length;

  const note = `
    <div class="info-note">
      Se muestran únicamente productos críticos con más de ${PRIORITY_INVENTORY_MIN} unidades en inventario.
    </div>
  `;

  const cards = itemsToShow.map(item => {
    const colorClass = getColorClass(item.color_estado);

    return `
      <article class="reference-card ${colorClass}">
        <div class="reference-header">
          <div>
            <h3>${escapeHtml(item.referencia)} - ${escapeHtml(item.descripcion)}</h3>
            <span>${escapeHtml(item.mundo)} / ${escapeHtml(item.seccion)}</span>
            <br>
            <span class="priority-label priority-high">
              Alerta principal +15 und.
            </span>
          </div>
          <div class="reference-status">${escapeHtml(item.estado_referencia)}</div>
        </div>

        <div class="reference-grid">
          <div>
            <span>Inventario</span>
            <strong>${formatNumber(item.inventario_unidades)}</strong>
          </div>
          <div>
            <span>Cobertura</span>
            <strong>${formatCoverage(item.cobertura_dias)}</strong>
          </div>
          <div>
            <span>Últ. despacho</span>
            <strong>${formatDate(item.ultimo_despacho)}</strong>
          </div>
          <div>
            <span>Días despacho</span>
            <strong>${formatValue(item.dias_ultimo_despacho)}</strong>
          </div>
          <div>
            <span>Cant. despacho</span>
            <strong>${formatNumber(item.cantidad_ultimo_despacho)}</strong>
          </div>
        </div>

        <div class="action-box">
          <strong>Qué hacer:</strong> ${escapeHtml(item.accion_sugerida)}
        </div>
      </article>
    `;
  }).join('');

  const loadMoreButton = hiddenCount > 0
    ? `
      <div class="load-more-box">
        <button class="load-more-button" onclick="showMoreProducts()">
          Ver más productos (${hiddenCount})
        </button>
      </div>
    `
    : showAllProducts && criticalItems.length > INITIAL_PRODUCT_LIMIT
      ? `
        <div class="load-more-box">
          <button class="load-more-button" onclick="showLessProducts()">
            Ver solo los primeros ${INITIAL_PRODUCT_LIMIT}
          </button>
        </div>
      `
      : '';

  container.innerHTML = note + cards + loadMoreButton;
}

function showMoreProducts() {
  showAllProducts = true;
  renderDashboard(currentStoreName);
}

function showLessProducts() {
  showAllProducts = false;
  renderDashboard(currentStoreName);
}

function compareCriticalReferences(a, b) {
  const priority = {
    'Sin venta': 1,
    'Crítico': 2,
    'Lento': 3
  };

  const priorityA = priority[a.estado_referencia] || 99;
  const priorityB = priority[b.estado_referencia] || 99;

  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }

  const invDiff = toNumber(b.inventario_unidades) - toNumber(a.inventario_unidades);

  if (invDiff !== 0) {
    return invDiff;
  }

  return toNumber(b.cobertura_dias) - toNumber(a.cobertura_dias);
}

function getEstadoGrupo(porcentaje) {
  if (porcentaje <= 0.15) return 'Controlado';
  if (porcentaje <= 0.35) return 'Revisión';
  return 'Prioritario';
}

function getEstadoGrupoClass(estado) {
  if (estado === 'Controlado') return 'status-controlado';
  if (estado === 'Revisión') return 'status-revision';
  return 'status-prioritario';
}

function getColorClass(color) {
  const normalized = String(color || '').toLowerCase();

  if (normalized.includes('rojo')) return 'rojo';
  if (normalized.includes('amarillo')) return 'amarillo';
  if (normalized.includes('azul')) return 'azul';
  if (normalized.includes('verde')) return 'verde';

  return '';
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
  return toNumber(value).toLocaleString('es-CO', {
    maximumFractionDigits: 0
  });
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
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}

function formatDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('es-CO');
}

function formatCoverage(value) {
  if (typeof value === 'string') return escapeHtml(value);

  const number = toNumber(value);

  if (!number) return '-';

  return `${number.toLocaleString('es-CO', {
    maximumFractionDigits: 1
  })} días`;
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  return escapeHtml(value);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showLoading(show) {
  loadingOverlay.classList.toggle('hidden', !show);
}
