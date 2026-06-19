/* =========================================================
   Sprint 3.4 - Avance esperado de meta mensual
   Muestra en la tarjeta de meta solo dos datos:
   - Cumplimiento real
   - Debería ir
   ========================================================= */

normalizeSummary = function (resumen) {
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
};

renderSummaryCalculated = function (resumen) {
  const cumplimiento = toNumberOrNull(resumen.cumplimiento_meta);
  const avanceEsperadoMes = toNumberOrNull(resumen.avance_esperado_mes);
  const ventaMes = toNumber(resumen.venta_pesos_mes);
  const metaMes = toNumber(resumen.meta_venta_pesos);
  const inventarioTotal = toNumber(resumen.inventario_total);
  const alertasPrincipales = toNumber(resumen.alertas_total);
  const sinVenta = toNumber(resumen.sin_venta);
  const criticos = toNumber(resumen.criticos);
  const lentos = toNumber(resumen.lentos);

  pintarSummary({
    cumplimiento,
    avanceEsperadoMes,
    ventaMes,
    metaMes,
    inventarioTotal,
    alertasPrincipales,
    sinVenta,
    criticos,
    lentos
  });
};

pintarSummary = function ({ cumplimiento, avanceEsperadoMes, ventaMes, metaMes, inventarioTotal, alertasPrincipales, sinVenta, criticos, lentos }) {
  const cumplimientoValue = cumplimiento === null ? 0 : cumplimiento;
  const cumplimientoPct = Math.max(0, Math.min(cumplimientoValue * 100, 100));
  const esperadoTexto = avanceEsperadoMes === null || avanceEsperadoMes === 0
    ? 'Debería ir: -'
    : `Debería ir: ${formatPercent(avanceEsperadoMes)}`;

  setText('cumplimientoMeta', cumplimiento === null ? '-' : formatPercent(cumplimiento));
  setText('ventaMetaTexto', esperadoTexto);
  setText('inventarioTotal', formatNumber(inventarioTotal));
  setText('referenciasCriticas', formatNumber(alertasPrincipales));
  setText('alertasTexto', alertasPrincipales === 0 ? 'Sin alertas activas' : 'Productos que necesitan atención');

  const metaCard = document.getElementById('kpiMetaCard');
  const inventarioCard = document.getElementById('kpiInventarioCard');
  const alertasCard = document.getElementById('kpiAlertasCard');

  if (metaCard) {
    metaCard.className = `summary-card ${cumplimientoValue >= 1 ? 'summary-card--success' : cumplimientoValue >= 0.75 ? 'summary-card--info' : 'summary-card--warning'}`;
  }

  if (inventarioCard) inventarioCard.className = 'summary-card summary-card--info';

  if (alertasCard) {
    alertasCard.className = `summary-card ${alertasPrincipales === 0 ? 'summary-card--success' : criticos > 0 || sinVenta > 0 ? 'summary-card--danger' : 'summary-card--warning'}`;
  }

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
};
