function getStorePriorityLabel(value) {
  const priority = String(value || '').toLowerCase();
  if (priority.includes('urgente') || priority.includes('alta')) return 'Urgente';
  if (priority.includes('revisar') || priority.includes('media')) return 'Revisar';
  if (priority.includes('seguimiento') || priority.includes('baja')) return 'Seguimiento';
  return 'Revisar';
}

function getStorePriorityClass(value) {
  const priority = String(value || '').toLowerCase();
  if (priority.includes('urgente') || priority.includes('alta')) return 'priority-pill--alta';
  if (priority.includes('revisar') || priority.includes('media')) return 'priority-pill--media';
  if (priority.includes('seguimiento') || priority.includes('baja')) return 'priority-pill--baja';
  return 'priority-pill--neutral';
}

function getSimpleSectionLabel(estado) {
  const value = String(estado || '').toLowerCase();
  if (value.includes('prioritario')) return 'Urgente';
  if (value.includes('revisión') || value.includes('revision')) return 'Revisar';
  if (value.includes('controlado')) return 'OK';
  return 'Revisar';
}

function getPriorityValue(item) {
  return item.prioridad_simple || item.prioridad_revision || '';
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

renderSectionRow = function (row, index) {
  const isOpen = openSectionKey === row.key;
  const statusClass = getEstadoGrupoClass(row.estadoGrupo);
  const accentClass = getSectionAccentClass(row.estadoGrupo, index);
  const statusLabel = getSimpleSectionLabel(row.estadoGrupo);

  return `
    <article class="category-card ${isOpen ? 'open' : ''} ${accentClass}">
      <button class="category-card-header" type="button" onclick="toggleSection('${escapeAttribute(row.key)}')" aria-expanded="${isOpen}">
        <div class="rank-badge">${index + 1}</div>
        <div class="category-main">
          <strong>${escapeHtml(row.mundo)} / ${escapeHtml(row.seccion)}</strong>
          <span>${formatNumber(row.totalReferencias)} referencias totales</span>
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
  const filteredItems = items || [];
  if (!filteredItems.length) {
    return renderEmptyState('Sin referencias para revisar', 'No hay referencias que cumplan los criterios definidos.');
  }

  return `
    <div class="reference-detail-head">
      <div>
        <strong>Referencias para revisar</strong>
        <span>Gestiona estas prendas en piso según el motivo y el plan de acción.</span>
      </div>
    </div>
    <div class="compact-ref-list">
      ${filteredItems.map(item => {
        const priorityValue = getPriorityValue(item);
        const priorityClass = getStorePriorityClass(priorityValue);
        const priorityLabel = getStorePriorityLabel(priorityValue);
        const reason = getReasonFromApi(item);
        const action = getActionFromApi(item);
        return `
          <div class="compact-ref-row">
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
