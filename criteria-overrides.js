function injectCriteriaStyles() {
  if (document.getElementById('criteriaStyles')) return;

  const style = document.createElement('style');
  style.id = 'criteriaStyles';
  style.textContent = `
    .criteria-cell { min-width: 180px; }
    .criteria-badge { display:inline-flex; align-items:center; width:fit-content; margin:2px 4px 2px 0; padding:4px 8px; border-radius:999px; font-size:11px; font-weight:700; line-height:1.2; border:1px solid transparent; white-space:normal; }
    .criteria-badge--dispatch { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
    .criteria-badge--movement { background:#fff7ed; color:#c2410c; border-color:#fed7aa; }
    .criteria-badge--coverage { background:#fffbeb; color:#a16207; border-color:#fde68a; }
    .criteria-badge--neutral { background:#f3f4f6; color:#374151; border-color:#e5e7eb; }
    .priority-pill { display:inline-flex; align-items:center; justify-content:center; min-width:62px; padding:4px 8px; border-radius:999px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.03em; border:1px solid transparent; }
    .priority-pill--alta { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
    .priority-pill--media { background:#fffbeb; color:#a16207; border-color:#fde68a; }
    .priority-pill--baja, .priority-pill--neutral { background:#f3f4f6; color:#374151; border-color:#e5e7eb; }
    .days-helper { display:block; margin-top:2px; color:#6b7280; font-size:11px; font-weight:600; }
    .days-without-sale { color:#b91c1c; font-size:12px; }
    .compact-reference-table--criteria th, .compact-reference-table--criteria td { vertical-align:top; }
    @media (max-width:760px) { .compact-reference-table--criteria { min-width:980px; } }
  `;
  document.head.appendChild(style);
}

const originalInjectControlledStyles = injectControlledStyles;
injectControlledStyles = function () {
  originalInjectControlledStyles();
  injectCriteriaStyles();
};

renderMundoSeccionCalculated = function (rows) {
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
      <strong>Solo se muestran referencias que cumplen criterios objetivos.</strong>
      <span>Criterio 1: sin venta después de 10 días desde despacho. Criterio 2: más de 5 días sin venta. Criterio 3: inventario alto con cobertura superior a 60 días.</span>
    </div>
  `;

  container.innerHTML = rows.map((row, index) => renderSectionRow(row, index)).join('') + note;
};

renderSectionReferences = function (items) {
  if (!items.length) {
    return renderEmptyState('Sin referencias para revisar', 'No hay referencias que cumplan los criterios críticos definidos.');
  }

  return `
    <div class="compact-table-wrap">
      <table class="compact-reference-table compact-reference-table--criteria">
        <thead>
          <tr>
            <th>Referencia</th>
            <th>Prioridad</th>
            <th>Criterio</th>
            <th>Inventario</th>
            <th>Cobertura</th>
            <th>Últ. despacho</th>
            <th>Días sin venta</th>
            <th>Acción sugerida</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => {
            const colorClass = getColorClass(item.color_estado);
            const priorityClass = getPriorityClass(item.prioridad_revision);
            const criteriaBadges = renderCriteriaBadges(item.criterio_critico);
            return `
              <tr>
                <td class="ref-main"><strong>${escapeHtml(item.referencia)}</strong><span>${escapeHtml(item.descripcion)}</span></td>
                <td><span class="priority-pill ${priorityClass}">${escapeHtml(item.prioridad_revision || 'Sin prioridad')}</span></td>
                <td class="criteria-cell">${criteriaBadges}</td>
                <td>${formatNumber(item.inventario_unidades)}</td>
                <td>${formatCoverage(item.cobertura_dias)}</td>
                <td><span>${formatDate(item.ultimo_despacho)}</span>${formatDaysSinceDispatch(item.dias_desde_ultimo_despacho)}</td>
                <td>${formatDaysWithoutSale(item.dias_sin_movimiento)}</td>
                <td class="action-cell"><span class="dot-status ${colorClass}"></span>${escapeHtml(item.accion_sugerida)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
};

function renderCriteriaBadges(value) {
  const text = String(value || '').trim();
  if (!text) return '<span class="criteria-badge criteria-badge--neutral">Sin criterio</span>';

  return text.split('+').map(part => part.trim()).filter(Boolean).map(part => {
    const normalized = part.toLowerCase();
    let className = 'criteria-badge--neutral';
    if (normalized.includes('10 días') || normalized.includes('despacho')) className = 'criteria-badge--dispatch';
    else if (normalized.includes('5 días') || normalized.includes('sin venta')) className = 'criteria-badge--movement';
    else if (normalized.includes('cobertura')) className = 'criteria-badge--coverage';
    return `<span class="criteria-badge ${className}">${escapeHtml(part)}</span>`;
  }).join('');
}

function getPriorityClass(value) {
  const priority = String(value || '').toLowerCase();
  if (priority.includes('alta')) return 'priority-pill--alta';
  if (priority.includes('media')) return 'priority-pill--media';
  if (priority.includes('baja')) return 'priority-pill--baja';
  return 'priority-pill--neutral';
}

function formatDaysSinceDispatch(value) {
  const days = toNumber(value);
  if (!days) return '';
  return `<small class="days-helper">${formatNumber(days)} días desde despacho</small>`;
}

function formatDaysWithoutSale(value) {
  const days = toNumber(value);
  if (!days) return '-';
  return `<strong class="days-without-sale">${formatNumber(days)} días</strong>`;
}

compareCriticalReferences = function (a, b) {
  const priority = { Alta: 1, Media: 2, Baja: 3 };
  const priorityA = priority[a.prioridad_revision] || 99;
  const priorityB = priority[b.prioridad_revision] || 99;
  if (priorityA !== priorityB) return priorityA - priorityB;

  const criteriaA = String(a.criterio_critico || '');
  const criteriaB = String(b.criterio_critico || '');
  const sinVentaA = criteriaA.includes('Sin venta') ? 1 : 0;
  const sinVentaB = criteriaB.includes('Sin venta') ? 1 : 0;
  if (sinVentaA !== sinVentaB) return sinVentaB - sinVentaA;

  const invDiff = toNumber(b.inventario_unidades) - toNumber(a.inventario_unidades);
  if (invDiff !== 0) return invDiff;
  return toNumber(b.cobertura_dias) - toNumber(a.cobertura_dias);
};

isVisibleCriticalReference = function (item) {
  if (item.criterio_critico || item.prioridad_revision) return true;
  return CRITICAL_STATES.includes(item.estado_referencia) && toNumber(item.inventario_unidades) > PRIORITY_INVENTORY_MIN;
};
