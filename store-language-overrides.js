function getStorePriorityLabel(value) {
  const priority = String(value || '').toLowerCase();
  if (priority.includes('alta')) return 'Urgente';
  if (priority.includes('media')) return 'Revisar';
  if (priority.includes('baja')) return 'Seguimiento';
  return 'Revisar';
}

function getStorePriorityClass(value) {
  const priority = String(value || '').toLowerCase();
  if (priority.includes('alta')) return 'priority-pill--alta';
  if (priority.includes('media')) return 'priority-pill--media';
  if (priority.includes('baja')) return 'priority-pill--baja';
  return 'priority-pill--neutral';
}

function getSimpleReason(item) {
  const criterio = String(item.criterio_critico || '').toLowerCase();
  const estado = String(item.estado_referencia || '').toLowerCase();

  if (criterio.includes('despacho') || criterio.includes('10 días')) {
    return 'Llegó hace varios días y no ha vendido';
  }
  if (criterio.includes('5 días') || criterio.includes('sin venta') || estado.includes('sin venta')) {
    return 'Lleva varios días sin vender';
  }
  if (criterio.includes('cobertura') || criterio.includes('>60') || toNumber(item.cobertura_dias) > 60) {
    return 'Mucho inventario y poca venta';
  }
  if (toNumber(item.inventario_unidades) > 24) {
    return 'Hay muchas unidades para revisar';
  }
  return 'Producto para revisar en tienda';
}

function getSimpleAction(item) {
  const reason = getSimpleReason(item).toLowerCase();
  if (reason.includes('no ha vendido') || reason.includes('sin vender')) {
    return 'Revisar si está exhibido y ubicarlo en una zona visible';
  }
  if (reason.includes('mucho inventario')) {
    return 'Mejorar exhibición y revisar tallas disponibles';
  }
  return 'Revisar exhibición, ubicación y disponibilidad en piso';
}

function formatStoreDays(value, label) {
  const days = toNumber(value);
  if (!days) return '';
  return `<span><b>${label}</b> ${formatNumber(days)} días</span>`;
}

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
        const priorityClass = getStorePriorityClass(item.prioridad_revision);
        const priorityLabel = getStorePriorityLabel(item.prioridad_revision);
        const reason = getSimpleReason(item);
        const action = getSimpleAction(item);
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
              ${toNumber(item.cobertura_dias) ? `<span><b>Venta lenta</b> ${formatCoverage(item.cobertura_dias)}</span>` : ''}
              ${formatStoreDays(item.dias_sin_movimiento, 'Sin venta')}
              ${formatStoreDays(item.dias_desde_ultimo_despacho, 'Llegó hace')}
            </div>
            <div class="compact-ref-action"><b>Qué hacer:</b> ${escapeHtml(action)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
};
