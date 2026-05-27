const API_URL = 'https://script.google.com/macros/s/AKfycbwCfspSz1mtp2mrNrqm9fezzLArIMv7Wzxbg3vqYMxZ4xvUbrLtc0F6JUnyAB5eFucO/exec';

let dashboardData = [];
let currentStoreName = '';
let openSectionKey = null;

const CRITICAL_STATES = ['Sin venta', 'Crítico', 'Lento'];
const PRIORITY_INVENTORY_MIN = 15;

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
      currentStoreName = storeSelect.value;
      openSectionKey = null;
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
}

/**
 * Solo se consideran alertas visibles las referencias que:
 * 1. Están en estado Sin venta, Crítico o Lento.
 * 2. Tienen más de 15 unidades en inventario.
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

  const alertasPrincipales = data.filter(isVisibleCriticalReference).length;

  document.getElementById('cumplimientoMeta').textContent =
    cumplimiento === null ? '-' : formatPercent(cumplimiento);

  document.getElementById('ventaMetaTexto').textContent =
    `${formatCurrency(ventaMes)} / ${formatCurrency(metaMes)}`;

  document.getElementById('inventarioTotal').textContent =
    formatNumber(inventarioTotal);

  document.getElementById('referenciasCriticas').textContent =
    formatNumber(alertasPrincipales);
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
      const porcentajeAlertas =
        group.totalReferencias === 0 ? 0 : group.alertas / group.totalReferencias;

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
    container.innerHTML = '<p class="empty-state">No hay zonas con alertas mayores a 15 unidades.</p>';
    return;
  }

  const note = `
    <div class="info-note">
      Solo se muestran secciones con referencias en estado Sin venta, Crítico o Lento y con más de ${PRIORITY_INVENTORY_MIN} unidades en inventario.
    </div>
  `;

  container.innerHTML = rows.map(row => {
    const isOpen = openSectionKey === row.key;

    return `
      <article class="category-card ${isOpen ? 'open' : ''}" onclick="toggleSection('${escapeAttribute(row.key)}')">
        <div class="category-card-header">
          <div class="category-main">
            <strong>${escapeHtml(row.mundo)} / ${escapeHtml(row.seccion)}</strong>
            <span>${formatNumber(row.totalReferencias)} referencias totales</span>
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
            <strong>${formatNumber(row.alertas)}</strong>
          </div>

          <div class="category-metric">
            <span>% alertas</span>
            <strong>${formatPercent(row.porcentajeAlertas)}</strong>
          </div>

          <span class="status-pill ${getEstadoGrupoClass(row.estadoGrupo)}">
            ${row.estadoGrupo}
          </span>

          <div class="expand-indicator">
            ${isOpen ? 'Ocultar ▲' : 'Ver referencias ▼'}
          </div>
        </div>

        <div class="section-references ${isOpen ? '' : 'hidden'}" onclick="event.stopPropagation()">
          ${renderSectionReferences(row.productosCriticos)}
        </div>
      </article>
    `;
  }).join('') + note;
}

function renderSectionReferences(items) {
  if (!items.length) {
    return '<p class="empty-state">No hay productos críticos en esta sección.</p>';
  }

  return `
    <div class="compact-table-wrap">
      <table class="compact-reference-table">
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Inventario</th>
            <th>Cobertura</th>
            <th>Últ. despacho</th>
            <th>Cant. despacho</th>
            <th>Acción sugerida</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const colorClass = getColorClass(item.color_estado);

            return `
              <tr>
                <td>${escapeHtml(item.referencia)}</td>
                <td class="ref-description">${escapeHtml(item.descripcion)}</td>
                <td class="ref-status">
                  <span class="dot-status ${colorClass}"></span>${escapeHtml(item.estado_referencia)}
                </td>
                <td>${formatNumber(item.inventario_unidades)}</td>
                <td>${formatCoverage(item.cobertura_dias)}</td>
                <td>${formatDate(item.ultimo_despacho)}</td>
                <td>${formatNumber(item.cantidad_ultimo_despacho)}</td>
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

function compareSections(a, b) {
  const rank = {
    'Prioritario': 1,
    'Revisión': 2,
    'Controlado': 3
  };

  const rankA = rank[a.estadoGrupo] || 99;
  const rankB = rank[b.estadoGrupo] || 99;

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  if (b.alertas !== a.alertas) {
    return b.alertas - a.alertas;
  }

  if (b.porcentajeAlertas !== a.porcentajeAlertas) {
    return b.porcentajeAlertas - a.porcentajeAlertas;
  }

  return b.inventario - a.inventario;
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
  if (porcentaje > 0.35) return 'Prioritario';
  if (porcentaje > 0.15) return 'Revisión';
  return 'Controlado';
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

function showLoading(show) {
  loadingOverlay.classList.toggle('hidden', !show);
}
