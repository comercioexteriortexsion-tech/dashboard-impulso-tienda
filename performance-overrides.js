(function () {
  const CACHE_PREFIX = 'impulso_cache_v2_';
  const INITIAL_CACHE_KEY = CACHE_PREFIX + 'inicio';
  const STORE_CACHE_PREFIX = CACHE_PREFIX + 'tienda_';
  const INITIAL_TTL_MS = 1000 * 60 * 60 * 8;
  const STORE_TTL_MS = 1000 * 60 * 60 * 8;
  const FAST_TIMEOUT_MS = 16000;
  const STORE_TIMEOUT_MS = 24000;

  function now() {
    return Date.now();
  }

  function normalizeStoreKey(storeName) {
    return String(storeName || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function setCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: now(), data: data }));
    } catch (e) {
      console.warn('No se pudo guardar cache local del dashboard', e);
    }
  }

  function getCache(key, ttlMs) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data || !parsed.ts) return null;
      if (ttlMs && now() - parsed.ts > ttlMs) return null;
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  function getAnyCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.data ? parsed.data : null;
    } catch (e) {
      return null;
    }
  }

  function storeCacheKey(storeName) {
    return STORE_CACHE_PREFIX + normalizeStoreKey(storeName);
  }

  function makeTimeoutError() {
    return new Error('La consulta demoró más de lo esperado. Se intentó usar información guardada localmente.');
  }

  async function fetchJsonFast(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs || FAST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': no fue posible consultar Apps Script.');
      }

      return await response.json();
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw makeTimeoutError();
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function validateGeneralPayload(json) {
    if (!json) throw new Error('Apps Script no devolvió respuesta general.');
    if (json.ok !== true) throw new Error(json.error || 'Apps Script devolvió error en modo general.');
    if (!json.resumen_general) throw new Error('Falta resumen_general en modo=general.');
  }

  function validateStoresPayload(json) {
    if (!json) throw new Error('Apps Script no devolvió respuesta de tiendas.');
    if (json.ok !== true) throw new Error(json.error || 'Apps Script devolvió error en modo tiendas.');
    if (!Array.isArray(json.tiendas)) throw new Error('Falta lista de tiendas en modo=tiendas.');
  }

  function mergeInitialPayload(inicioJson, generalJson, tiendasJson) {
    const resumen =
      (inicioJson && inicioJson.resumen_general) ||
      (generalJson && generalJson.resumen_general) ||
      {};

    const tiendas =
      (inicioJson && Array.isArray(inicioJson.tiendas) && inicioJson.tiendas) ||
      (tiendasJson && Array.isArray(tiendasJson.tiendas) && tiendasJson.tiendas) ||
      [];

    return {
      ok: true,
      version: 'inicio_frontend_optimizado_v2',
      ultima_actualizacion:
        (inicioJson && inicioJson.ultima_actualizacion) ||
        (generalJson && generalJson.ultima_actualizacion) ||
        (tiendasJson && tiendasJson.ultima_actualizacion) ||
        '',
      resumen_general: resumen,
      tiendas: tiendas,
      ranking_cumplimiento:
        (inicioJson && Array.isArray(inicioJson.ranking_cumplimiento) && inicioJson.ranking_cumplimiento) ||
        [],
      ranking_alertas:
        (inicioJson && Array.isArray(inicioJson.ranking_alertas) && inicioJson.ranking_alertas) ||
        []
    };
  }

  function applyInitialPayload(json) {
    storeDashboards = {};
    storesList = Array.isArray(json.tiendas) ? json.tiendas.filter(Boolean) : [];
    generalSummary = normalizeSummary(json.resumen_general || {});
    rankingCumplimientoTiendas = normalizeRankingCumplimiento(json.ranking_cumplimiento || []);
    rankingAlertasTiendas = normalizeRankingAlertas(json.ranking_alertas || []);
    lastLoadError = '';

    setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
    loadStoreSelector(storesList);
  }

  window.validateInitialPayload = function (json) {
    if (!json) throw new Error('Apps Script no devolvió respuesta.');
    if (json.ok !== true) throw new Error(json.error || 'Apps Script devolvió error.');
    if (!json.resumen_general) throw new Error('Falta resumen_general.');
    if (!Array.isArray(json.tiendas)) throw new Error('Falta lista de tiendas.');
  };

  window.loadInitialData = async function () {
    const cachedFresh = getCache(INITIAL_CACHE_KEY, INITIAL_TTL_MS);
    const cachedAny = getAnyCache(INITIAL_CACHE_KEY);

    try {
      const inicioJson = await fetchJsonFast(buildApiUrl({ modo: 'inicio', light: '1' }), FAST_TIMEOUT_MS);
      validateInitialPayload(inicioJson);
      const payload = mergeInitialPayload(inicioJson, null, null);
      applyInitialPayload(payload);
      setCache(INITIAL_CACHE_KEY, payload);
      return payload;
    } catch (inicioError) {
      console.warn('modo=inicio no respondió rápido. Se intenta carga liviana.', inicioError);
    }

    try {
      const results = await Promise.allSettled([
        fetchJsonFast(buildApiUrl({ modo: 'general' }), FAST_TIMEOUT_MS),
        fetchJsonFast(buildApiUrl({ modo: 'tiendas' }), FAST_TIMEOUT_MS)
      ]);

      const generalJson = results[0].status === 'fulfilled' ? results[0].value : null;
      const tiendasJson = results[1].status === 'fulfilled' ? results[1].value : null;

      validateGeneralPayload(generalJson);
      validateStoresPayload(tiendasJson);

      const payload = mergeInitialPayload(null, generalJson, tiendasJson);
      applyInitialPayload(payload);
      setCache(INITIAL_CACHE_KEY, payload);
      return payload;
    } catch (fallbackError) {
      console.warn('Carga liviana no respondió. Se usa cache local si existe.', fallbackError);

      const cached = cachedFresh || cachedAny;
      if (cached) {
        applyInitialPayload(cached);
        showToast('Mostrando última información guardada. Actualiza de nuevo en unos segundos.');
        return cached;
      }

      throw fallbackError;
    }
  };

  window.loadStoreDashboard = async function (storeName, forceRefresh) {
    if (!forceRefresh && storeDashboards[storeName]) return storeDashboards[storeName];

    const key = storeCacheKey(storeName);
    const cachedFresh = getCache(key, STORE_TTL_MS);
    const cachedAny = getAnyCache(key);

    if (!forceRefresh && cachedFresh) {
      storeDashboards[storeName] = cachedFresh;
      setTimeout(async function () {
        try {
          const json = await fetchJsonFast(buildApiUrl({ modo: 'tienda', nombre: storeName }), STORE_TIMEOUT_MS);
          validateStorePayload(json, storeName);
          const dashboard = normalizeOptimizedDashboard(json);
          storeDashboards[storeName] = dashboard;
          setCache(key, dashboard);
          if (currentStoreName === storeName) {
            renderDashboard(storeName);
          }
          if (json.ultima_actualizacion) {
            setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
          }
        } catch (e) {
          console.warn('Actualización silenciosa de tienda no disponible', e);
        }
      }, 300);
      return cachedFresh;
    }

    try {
      const json = await fetchJsonFast(buildApiUrl({ modo: 'tienda', nombre: storeName }), STORE_TIMEOUT_MS);
      validateStorePayload(json, storeName);

      const dashboard = normalizeOptimizedDashboard(json);
      storeDashboards[storeName] = dashboard;
      setCache(key, dashboard);

      if (json.ultima_actualizacion) {
        setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
      }

      return dashboard;
    } catch (error) {
      const cached = cachedFresh || cachedAny;
      if (cached) {
        storeDashboards[storeName] = cached;
        showToast('Mostrando última información guardada de la tienda.');
        return cached;
      }

      throw error;
    }
  };

  window.handleStoreChange = async function (storeName) {
    currentStoreName = storeName;
    openSectionKey = null;

    if (!currentStoreName) {
      renderGeneralDashboard();
      return;
    }

    if (!storesList.includes(currentStoreName)) {
      showToast('La tienda seleccionada no está disponible en la base actual.');
      renderErrorState('Tienda no disponible', 'Actualiza el dashboard o selecciona otra tienda.');
      return;
    }

    updateActiveStoreUI(currentStoreName, false);

    try {
      const cached = getCache(storeCacheKey(currentStoreName), STORE_TTL_MS);
      if (cached && !storeDashboards[currentStoreName]) {
        storeDashboards[currentStoreName] = cached;
        renderDashboard(currentStoreName);
      } else {
        showLoading(true, 'Cargando ' + currentStoreName + '...');
      }

      await loadStoreDashboard(currentStoreName, false);
      renderDashboard(currentStoreName);
    } catch (error) {
      console.error('Error cargando tienda:', error);
      lastLoadError = error.message || String(error);
      showToast('No se pudo cargar esta tienda.');
      renderErrorState('No fue posible cargar la tienda', getFriendlyErrorMessage(error));
    } finally {
      showLoading(false);
    }
  };
})();
