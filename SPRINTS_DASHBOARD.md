# Plan de sprints - Dashboard Impulso en Tienda

## Arquitectura definida

- Apps Script calcula.
- Google Sheets guarda tablas calculadas.
- GitHub Pages consulta y muestra.
- El frontend no debe asumir calculos pesados ni consultas tienda por tienda.

## Sprints implementados

### Sprint 3.2 - Acciones simples por referencia
- Campos operativos para tienda: motivo_simple, accion_simple, prioridad_simple y tipo_alerta.
- Lenguaje mas claro para impulsadoras y tiendas.

### Sprint 3.3 - Venta real ultimos 15 dias
- Uso de venta_unidades_15d, venta_pesos_15d, dias_con_venta_15d y sin_venta_15d.
- El historico de movimiento dejo de calcularse en Apps Script.

### Sprint 3.4 - Avance esperado de meta
- Calculo de avance_esperado_mes con fecha de corte.
- Comparacion entre cumplimiento real y avance esperado.

### Sprint 3.5 - Modales de ranking
- Ranking de cumplimiento por tienda.
- Ranking de alertas por tienda.

### Sprint 3.6 - Rendimiento inicial
- modo=inicio entrega resumen, tiendas y rankings en una sola respuesta.
- Se evitan multiples consultas por tienda al abrir el dashboard.

### Sprint 3.7 - Estabilidad
- Timeout controlado.
- Validacion de estructura de respuestas.
- Mensajes de error mas claros.

### Sprint 3.8 - Visual movil y referencias
- Tarjetas moviles ajustadas.
- Referencias compactas con separaciones visuales.
- Semaforo visual de referencias.

### Sprint 3.9 - Priorizacion visual por seccion
- Resumen de referencias urgentes, revisar y seguimiento por seccion.
- Orden visual por nivel de prioridad.

### Sprint 3.10 - Prioridad calculada desde Apps Script
- Apps Script entrega referencias_urgentes, referencias_revisar, referencias_seguimiento, nivel_prioridad_seccion y orden_prioridad_seccion.
- GitHub consume primero los campos calculados.

### Sprint 3.11 - Ultima tienda consultada
- El navegador recuerda la ultima tienda abierta.
- Al volver a entrar, carga automaticamente esa tienda.

### Sprint 3.12 - Orden de referencias desde Apps Script
- GitHub respeta el campo orden entregado por Apps Script para las referencias criticas.
- Se mantiene respaldo visual si falta el campo.

### Sprint 3.13 - Enlace directo por tienda
- Permite abrir una tienda con parametro en la URL.
- Parametros aceptados: tienda, store y almacen.

### Sprint 3.14 - Link compartible por tienda
- Se creo la base tecnica del boton Link tienda.
- Estado actual: funcionalidad instalada, boton oculto temporalmente por decision operativa.
- Archivo relacionado: store-share-link.js.

### Sprint 3.15 - Panel tecnico
- Se creo una prueba de panel tecnico.
- Estado actual: retirado del dashboard porque no se requiere en la operacion.
- Archivo technical-status.js eliminado.

## Sprint 4 - Reporte ejecutivo y seguimiento comercial

### Sprint 4.1 - Reporte ejecutivo comercial
- Se creo la base tecnica para generar reporte ejecutivo desde vista general o desde tienda.
- Estado actual: funcionalidad instalada, boton Reporte oculto temporalmente para revision posterior.
- Archivo relacionado: executive-report.js.

### Sprint 4.2 - Ordenamiento del roadmap y cierre de pendientes visibles
- Se documenta que Link tienda y Reporte quedan en pausa visual, pero no eliminados.
- El dashboard operativo queda limpio para uso diario.
- La continuidad del Sprint 4 debe enfocarse en estructuras de seguimiento comercial que no saturen la pantalla principal.

## Estado operativo actual

- Dashboard operativo limpio.
- Apps Script calcula.
- Google Sheets guarda.
- GitHub muestra.
- Semaforo operativo activo.
- Ultima tienda recordada activa.
- Enlace directo por parametro activo.
- Boton Link tienda oculto.
- Boton Reporte oculto.
- Panel tecnico eliminado.

## Proximos sprints sugeridos

### Sprint 4.3 - Resumen comercial por tienda en Google Sheets
- Crear una tabla calculada para resumen ejecutivo por tienda.
- Debe venir desde Apps Script, no desde calculos pesados en GitHub.
- Base sugerida: dashboard_resumen_tienda.

### Sprint 4.4 - Ranking ejecutivo consolidado
- Crear ranking de tiendas con mayor oportunidad comercial.
- Combinar cumplimiento, alertas, inventario y venta reciente.
- Base sugerida: dashboard_ranking_oportunidad.

### Sprint 4.5 - Seguimiento semanal
- Crear una salida para corte semanal.
- Debe permitir lectura rapida para coordinacion, gerencia o lideres comerciales.

### Sprint 4.6 - Limpieza de frontend
- Consolidar estilos en menos archivos.
- Reducir reglas duplicadas.
- Dejar una sola capa visual de override.
