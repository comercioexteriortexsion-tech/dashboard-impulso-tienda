/* =========================================================
   Sprint 3.1 - Referencias compactas en móvil
   Reemplaza la tabla ancha por filas compactas para reducir
   desplazamiento vertical y horizontal en celular.
   ========================================================= */

function getShortStatusLabel(estado) {
  const value = String(estado || '').toLowerCase();
  if (value.includes('prioritario')) return 'Prior.';
  if (value.includes('revisión') || value.includes('revision')) return 'Rev.';
  if (value.includes('controlado')) return 'Ctrl.';
  return estado || '';
}

function getCompactCriteriaText(value) {
  const text = String(value || '').trim();
  if (!text) return 'Sin criterio';

  return text
    .replace(/Criterio\s*/gi, '')
    .replace(/Inventario\s*>\s*24/gi, 'Inv. >24')
    .replace(/venta previa y más de/gi, 'sin venta')
    .replace(/cobertura\s*>\s*60 días/gi, 'cob. >60 días')
    .replace(/sin venta después de/gi, 'sin venta')
    .replace(/desde despacho/gi, 'desde despacho')
    .replace(/\s+/g, ' ')
    .trim();
}

renderSectionRow = function (row, index) {
  const isOpen = openSectionKey === row.key;
  const statusClass = getEstadoGrupoClass(row.estadoGrupo);
  const accentClass = getSectionAccentClass(row.estadoGrupo, index);
  const statusLabel = getShortStatusLabel(row.estadoGrupo);

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
        <span class="status-pill ${statusClass}">${statusLabel}</span>
        <span class="expand-indicator">${isOpen ? '⌃' : '⌄'}</span>
      </button>
      <div class="section-references ${isOpen ? '' : 'hidden'}">
        ${isOpen ? renderSectionReferences(row.productosCriticos) : ''}
      </div>
    </article>
  `;
};

renderSectionReferences = function (items) {
  const filteredItems = typeof filtrarReferenciasVariosDashboard === 'function'
    ? filtrarReferenciasVariosDashboard(items)
    : (items || []);

  if (!filteredItems.length) {
    return renderEmptyState('Sin referencias para revisar', 'No hay referencias que cumplan los criterios críticos definidos.');
  }

  return `
    <div class="compact-ref-list">
      ${filteredItems.map(item => {
        const priorityClass = getPriorityClass(item.prioridad_revision);
        const criterio = getCompactCriteriaText(item.criterio_critico);
        const diasSinVenta = toNumber(item.dias_sin_movimiento);
        const diasDespacho = toNumber(item.dias_desde_ultimo_despacho);
        return `
          <div class="compact-ref-row">
            <div class="compact-ref-main">
              <strong>${escapeHtml(item.referencia)}</strong>
              <span>${escapeHtml(item.descripcion)}</span>
            </div>

            <div class="compact-ref-priority">
              <span class="priority-pill ${priorityClass}">${escapeHtml(item.prioridad_revision || 'Sin prioridad')}</span>
            </div>

            <div class="compact-ref-criteria">
              ${escapeHtml(criterio)}
            </div>

            <div class="compact-ref-metrics">
              <span><b>Inv.</b> ${formatNumber(item.inventario_unidades)}</span>
              <span><b>Cob.</b> ${formatCoverage(item.cobertura_dias)}</span>
              ${diasSinVenta ? `<span><b>Sin venta</b> ${formatNumber(diasSinVenta)}d</span>` : ''}
              ${diasDespacho ? `<span><b>Desp.</b> ${formatNumber(diasDespacho)}d</span>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};
