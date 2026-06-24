function getStorePriorityLabel(value) {
  const priority = String(value || '').toLowerCase();
  if (priority.includes('urgente') || priority.includes('alta')) return 'Urgente';
  if (priority.includes('revisar') || priority.includes('media')) return 'Revisar';
  if (priority.includes('seguimiento') || priority.includes('baja')) return 'Seguimiento';
  return 'Seguimiento';
}

function getStorePriorityClass(value) {
  const level = getSemaphoreLevelFromPriority(value);
  if (level === 1) return 'priority-pill--urgente';
  if (level === 2) return 'priority-pill--revisar';
  return 'priority-pill--seguimiento';
}

function getSimpleSectionLabel(estado) {
  const value = String(estado || '').toLowerCase();
  if (value.includes('prioritario')) return 'Urgente';
  if (value.includes('revisión') || value.includes('revision')) return 'Revisar';
  if (value.includes('controlado')) return 'OK';
  return 'Revisar';
}

function getPriorityValue(item) {
  return item.prioridad_simple || item.prioridad_revision || item.prioridad || '';
}

function getReasonFromApi(item) {
  return String(item.motivo_simple || item.criterio_critico || 'Producto para revisar en tienda').trim();
}

function getActionFromApi(item) {
  return String(item.accion_simple || item.accion_sugerida || 'Revisar exhibición, ubicación y disponibilidad en piso').trim();
}

function formatStoreDays(value, label) {
  const days = toNumber(value);
  if (!days) return '';
  return `<span><b>${label}</b> ${formatNumber(days)} días</span>`;
}

function formatRecentSalesMetric(item) {
  const units15 = toNumber(item.venta_unidades_15d);
  const days15 = toNumber(item.dias_con_venta_15d);
  const sinVenta15 = item.sin_venta_15d === true || String(item.sin_venta_15d).toLowerCase() === 'true';

  if (sinVenta15 || units15 === 0) return '<span><b>Últimos 15 días</b> no vendió</span>';
  if (days15 > 0) return `<span><b>Últimos 15 días</b> vendió ${formatNumber(units15)} und. en ${formatNumber(days15)} días</span>`;
  return `<span><b>Últimos 15 días</b> vendió ${formatNumber(units15)} und.</span>`;
}

function getSemaphoreLevelFromPriority(value) {
  const priority = String(value || '').toLowerCase();
  if (priority.includes('urgente') || priority.includes('alta')) return 1;
  if (priority.includes('revisar') || priority.includes('media')) return 2;
  if (priority.includes('seguimiento') || priority.includes('baja')) return 3;
  return 3;
}

function getCriterionLevel(item) {
  const priorityValue = getPriorityValue(item);
  const priorityLevel = getSemaphoreLevelFromPriority(priorityValue);
  if (priorityLevel) return priorityLevel;

  const text = String([
    item.criterio_orden,
    item.criterio,
    item.criterio_critico,
    item.tipo_alerta,
    item.motivo_simple,
    item.motivo
  ].filter(Boolean).join(' ')).toLowerCase();

  if (/criterio\s*1|nivel\s*1|^\s*1[\.)-]/.test(text)) return 1;
  if (/criterio\s*2|nivel\s*2|^\s*2[\.)-]/.test(text)) return 2;
  if (/sin venta|no ha vendido|no vendió|no vendio|urgente|crítico|critico/.test(text)) return 1;
  if (/mucho inventario|venta lenta|rotación|rotacion|revisar/.test(text)) return 2;
  return 3;
}

function getSemaphoreName(item) {
  const level = getCriterionLevel(item);
  if (level === 1) return 'urgente';
  if (level === 2) return 'revisar';
  return 'seguimiento';
}

function hasAppsScriptCriteria(row) {
  return row && (
    row.referenciasUrgentes !== undefined ||
    row.referenciasRevisar !== undefined ||
    row.referenciasSeguimiento !== undefined
  );
}

function countCriteriaBySection(row) {
  if (hasAppsScriptCriteria(row)) {
    return {
      c1: toNumber(row.referenciasUrgentes),
      c2: toNumber(row.referenciasRevisar),
      c3: toNumber(row.referenciasSeguimiento)
    };
  }

  const counts = { c1: 0, c2: 0, c3: 0 };
  const refs = Array.isArray(row && row.productosCriticos) ? row.productosCriticos : [];

  refs.forEach(item => {
    const level = getCriterionLevel(item);
    if (level === 1) counts.c1 += 1;
    else if (level === 2) counts.c2 += 1;
    else counts.c3 += 1;
  });

  return counts;
}

function renderCriteriaChips(counts) {
  const chips = [];
  if (counts.c1) chips.push(`<span class="section-semaphore-chip section-semaphore-chip--urgent">${formatNumber(counts.c1)} urgente${counts.c1 === 1 ? '' : 's'}</span>`);
  if (counts.c2) chips.push(`<span class="section-semaphore-chip section-semaphore-chip--review">${formatNumber(counts.c2)} revisar</span>`);
  if (counts.c3) chips.push(`<span class="section-semaphore-chip section-semaphore-chip--follow">${formatNumber(counts.c3)} seguimiento</span>`);
  return chips.length ? `<div class="section-semaphore-summary">${chips.join('')}</div>` : '';
}

function ensureSectionSemaphoreStyles() {
  if (document.getElementById('sectionSemaphoreStyles')) return;
  const style = document.createElement('style');
  style.id = 'sectionSemaphoreStyles';
  style.textContent = `
    .section-semaphore-summary{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;align-items:center}
    .section-semaphore-chip{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;font-size:.62rem;font-weight:900;line-height:1;white-space:nowrap;border:1px solid transparent}
    .section-semaphore-chip--urgent{background:#fee2e2;color:#b91c1c;border-color:#fca5a5}
    .section-semaphore-chip--review{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .section-semaphore-chip--follow{background:#dcfce7;color:#166534;border-color:#86efac}
    @media(max-width:760px){.section-semaphore-chip{font-size:.58rem;padding:3px 6px}.section-semaphore-summary{gap:3px}}
  `;
  document.head.appendChild(style);
}

function sortReferencesByCriterion(items) {
  return [...(items || [])].sort((a, b) => {
    const ordenA = toNumber(a.orden);
    const ordenB = toNumber(b.orden);
    if (ordenA || ordenB) return (ordenA || 9999) - (ordenB || 9999);

    return getCriterionLevel(a) - getCriterionLevel(b) ||
      toNumber(b.inventario_unidades) - toNumber(a.inventario_unidades) ||
      String(a.referencia || '').localeCompare(String(b.referencia || ''), 'es');
  });
}

function sortSectionsByCriterion(rows) {
  return [...(rows || [])].sort((a, b) => {
    const ordenA = toNumber(a.ordenPrioridadSeccion);
    const ordenB = toNumber(b.ordenPrioridadSeccion);
    if (ordenA || ordenB) return (ordenA || 9999) - (ordenB || 9999);

    const ca = countCriteriaBySection(a);
    const cb = countCriteriaBySection(b);

    return cb.c1 - ca.c1 ||
      cb.c2 - ca.c2 ||
      cb.c3 - ca.c3 ||
      toNumber(b.alertas) - toNumber(a.alertas) ||
      toNumber(b.porcentajeAlertas) - toNumber(a.porcentajeAlertas) ||
      String(`${a.mundo || ''} ${a.seccion || ''}`).localeCompare(String(`${b.mundo || ''} ${b.seccion || ''}`), 'es');
  });
}

if (typeof normalizeOptimizedDashboard === 'function') {
  const originalNormalizeOptimizedDashboard = normalizeOptimizedDashboard;
  normalizeOptimizedDashboard = function (json) {
    const dashboard = originalNormalizeOptimizedDashboard(json);
    const zonasRaw = Array.isArray(json && json.zonas) ? json.zonas : [];

    dashboard.zonas = (dashboard.zonas || []).map((zona, index) => {
      const raw = zonasRaw[index] || {};
      return Object.assign({}, zona, {
        referenciasUrgentes: toNumber(raw.referencias_urgentes),
        referenciasRevisar: toNumber(raw.referencias_revisar),
        referenciasSeguimiento: toNumber(raw.referencias_seguimiento),
        nivelPrioridadSeccion: toNumber(raw.nivel_prioridad_seccion),
        ordenPrioridadSeccion: toNumber(raw.orden_prioridad_seccion) || toNumber(raw.orden) || index + 1
      });
    }).sort((a, b) => {
      const ordenA = toNumber(a.ordenPrioridadSeccion);
      const ordenB = toNumber(b.ordenPrioridadSeccion);
      return (ordenA || 9999) - (ordenB || 9999);
    });

    return dashboard;
  };
}

if (typeof renderMundoSeccionCalculated === 'function') {
  const originalRenderMundoSeccionCalculated = renderMundoSeccionCalculated;
  renderMundoSeccionCalculated = function (rows) {
    const sortedRows = sortSectionsByCriterion(rows || []);
    return originalRenderMundoSeccionCalculated(sortedRows);
  };
}

renderSectionRow = function (row, index) {
  ensureSectionSemaphoreStyles();
  const isOpen = openSectionKey === row.key;
  const statusClass = getEstadoGrupoClass(row.estadoGrupo);
  const accentClass = getSectionAccentClass(row.estadoGrupo, index);
  const counts = countCriteriaBySection(row);
  const statusLabel = row.nivelPrioridadSeccion === 1 || counts.c1 > 0 ? 'Urgente' : (row.nivelPrioridadSeccion === 2 || counts.c2 > 0 ? 'Revisar' : getSimpleSectionLabel(row.estadoGrupo));

  return `
    <article class="category-card ${isOpen ? 'open' : ''} ${accentClass}">
      <button class="category-card-header" type="button" onclick="toggleSection('${escapeAttribute(row.key)}')" aria-expanded="${isOpen}">
        <div class="rank-badge">${index + 1}</div>
        <div class="category-main">
          <strong>${escapeHtml(row.mundo)} / ${escapeHtml(row.seccion)}</strong>
          <span>${formatNumber(row.totalReferencias)} referencias totales</span>
          ${renderCriteriaChips(counts)}
        </div>
        <div class="category-metric"><span>Hay</span><strong>${formatNumber(row.inventario)}</strong></div>
        <div class="category-metric"><span>Vendió</span><strong>${formatNumber(row.ventaUnidades)}</strong></div>
        <div class="category-metric alert-metric"><span>Revisar</span><strong>${formatNumber(row.alertas)}</strong></div>
        <div class="category-metric percent-metric"><span>% revisar</span><strong>${formatPercent(row.porcentajeAlertas)}</strong></div>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
        <span class="expand-indicator">${isOpen ? 'Cerrar' : 'Ver'}</span>
      </button>
      <div class="section-references ${isOpen ? '' : 'hidden'}">
        ${isOpen ? renderSectionReferences(row.productosCriticos) : ''}
      </div>
    </article>
  `;
};

renderSectionReferences = function (items) {
  const filteredItems = sortReferencesByCriterion(items || []);
  if (!filteredItems.length) {
    return renderEmptyState('Sin referencias para revisar', 'No hay referencias que cumplan los criterios definidos.');
  }

  return `
    <div class="reference-detail-head">
      <div>
        <strong>Referencias para revisar</strong>
        <span>Semáforo: rojo urgente · amarillo revisar · verde seguimiento.</span>
      </div>
    </div>
    <div class="compact-ref-list">
      ${filteredItems.map(item => {
        const semaforo = getSemaphoreName(item);
        const priorityClass = `priority-pill--${semaforo}`;
        const priorityLabel = semaforo === 'urgente' ? 'Urgente' : semaforo === 'revisar' ? 'Revisar' : 'Seguimiento';
        const reason = getReasonFromApi(item);
        const action = getActionFromApi(item);
        return `
          <div class="compact-ref-row compact-ref-row--${semaforo}">
            <div class="compact-ref-main">
              <strong>${escapeHtml(item.referencia)}</strong>
              <span>${escapeHtml(item.descripcion)}</span>
            </div>
            <div class="compact-ref-priority">
              <span class="priority-pill ${priorityClass}">${escapeHtml(priorityLabel)}</span>
            </div>
            <div class="compact-ref-criteria">
              <span class="reason-label">Motivo:</span> ${escapeHtml(reason)}
            </div>
            <div class="compact-ref-metrics">
              <span><b>Hay</b> ${formatNumber(item.inventario_unidades)} und.</span>
              ${formatRecentSalesMetric(item)}
              ${toNumber(item.cobertura_dias) ? `<span><b>Rotación</b> ${formatCoverage(item.cobertura_dias)}</span>` : ''}
              ${formatStoreDays(item.dias_desde_ultimo_despacho, 'Llegó hace')}
            </div>
            <div class="compact-ref-action"><b>Plan de acción sugerido:</b> ${escapeHtml(action)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};
