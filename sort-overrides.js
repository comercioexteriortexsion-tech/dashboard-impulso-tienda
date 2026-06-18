/* =========================================================
   Sprint 3.1 - Orden comercial de secciones
   Prioridad de orden:
   1. Mayor cantidad de alertas
   2. Mayor porcentaje de alertas
   3. Mayor inventario
   4. Estado del grupo como desempate
   ========================================================= */

function compareSectionsCommercial(a, b) {
  const alertasA = toNumber(a.alertas || a.alertas_total || a.referenciasCriticas);
  const alertasB = toNumber(b.alertas || b.alertas_total || b.referenciasCriticas);

  if (alertasB !== alertasA) {
    return alertasB - alertasA;
  }

  const porcentajeA = toNumber(a.porcentajeAlertas || a.porcentaje_alertas);
  const porcentajeB = toNumber(b.porcentajeAlertas || b.porcentaje_alertas);

  if (porcentajeB !== porcentajeA) {
    return porcentajeB - porcentajeA;
  }

  const inventarioA = toNumber(a.inventario || a.inventario_unidades);
  const inventarioB = toNumber(b.inventario || b.inventario_unidades);

  if (inventarioB !== inventarioA) {
    return inventarioB - inventarioA;
  }

  const rank = {
    Prioritario: 1,
    Revisión: 2,
    Revision: 2,
    Controlado: 3
  };

  const rankA = rank[a.estadoGrupo || a.estado_grupo] || 99;
  const rankB = rank[b.estadoGrupo || b.estado_grupo] || 99;

  return rankA - rankB;
}

compareSections = compareSectionsCommercial;

renderMundoSeccionCalculated = function (rows) {
  const container = document.getElementById('mundoSeccionContainer');
  if (!container) return;

  if (!currentStoreName) {
    renderGeneralDashboard();
    return;
  }

  const baseRows = typeof filtrarZonasVariosDashboard === 'function'
    ? filtrarZonasVariosDashboard(rows)
    : (rows || []).filter(row => toNumber(row.alertas) > 0);

  const sortedRows = baseRows.sort(compareSectionsCommercial);

  if (!sortedRows.length) {
    openSectionKey = null;
    container.innerHTML = renderEmptyState(
      'Sin zonas críticas',
      'Esta tienda no tiene referencias que cumplan los criterios definidos para revisión.'
    );
    return;
  }

  const note = `
    <div class="info-note">
      <strong>Orden comercial aplicado.</strong>
      <span>Las secciones se muestran de mayor a menor cantidad de alertas. Luego se ordenan por % de alertas e inventario.</span>
    </div>
  `;

  container.innerHTML = sortedRows.map((row, index) => renderSectionRow(row, index)).join('') + note;
};
