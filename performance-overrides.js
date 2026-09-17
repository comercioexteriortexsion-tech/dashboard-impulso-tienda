(function () {
  const CACHE_PREFIX = 'impulso_cache_v2_';
  const INITIAL_CACHE_KEY = CACHE_PREFIX + 'inicio';
  const STORE_CACHE_PREFIX = CACHE_PREFIX + 'tienda_';

  const INITIAL_TTL_MS = 1000 * 60 * 60 * 12;
  const STORE_TTL_MS = 1000 * 60 * 60 * 12;

  const INITIAL_TIMEOUT_MS = 45000;
  const INITIAL_FULL_TIMEOUT_MS = 60000;
  const STORE_TIMEOUT_MS = 60000;
  const SILENT_REFRESH_TIMEOUT_MS = 45000;
  const RANKING_REFRESH_TIMEOUT_MS = 60000;

  let rankingRefreshPromise = null;

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

  function storeCacheKey(storeName) {
    return STORE_CACHE_PREFIX + normalizeStoreKey(storeName);
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

  function getInitialCacheAny() {
    return getAnyCache(INITIAL_CACHE_KEY) || {};
  }

  function makeTimeoutError(timeoutMs) {
    return new Error('Apps Script no respondió dentro de ' + Math.round(timeoutMs / 1000) + ' segundos. Se intentó usar información guardada localmente.');
  }

  async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, timeoutMs);

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
        throw makeTimeoutError(timeoutMs);
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

  function firstArray() {
    for (let i = 0; i < arguments.length; i++) {
      if (Array.isArray(arguments[i]) && arguments[i].length) return arguments[i];
    }
    for (let j = 0; j < arguments.length; j++) {
      if (Array.isArray(arguments[j])) return arguments[j];
    }
    return [];
  }

  function mergeInitialPayload(inicioJson, generalJson, tiendasJson) {
    const cached = getInitialCacheAny();

    const resumen =
      (inicioJson && inicioJson.resumen_general) ||
      (generalJson && generalJson.resumen_general) ||
      cached.resumen_general ||
      {};

    const tiendas = firstArray(
      inicioJson && inicioJson.tiendas,
      tiendasJson && tiendasJson.tiendas,
      cached.tiendas
    );

    const rankingCumplimiento = firstArray(
      inicioJson && inicioJson.ranking_cumplimiento,
      generalJson && generalJson.ranking_cumplimiento,
      cached.ranking_cumplimiento
    );

    const rankingAlertas = firstArray(
      inicioJson && inicioJson.ranking_alertas,
      generalJson && generalJson.ranking_alertas,
      cached.ranking_alertas
    );

    return {
      ok: true,
      version: 'inicio_frontend_resiliente_v4_rankings_cache',
      ultima_actualizacion:
        (inicioJson && inicioJson.ultima_actualizacion) ||
        (generalJson && generalJson.ultima_actualizacion) ||
        (tiendasJson && tiendasJson.ultima_actualizacion) ||
        cached.ultima_actualizacion ||
        '',
      resumen_general: resumen,
      tiendas: tiendas,
      ranking_cumplimiento: rankingCumplimiento,
      ranking_alertas: rankingAlertas
    };
  }

  function hasRankings(payload) {
    return !!payload && (
      (Array.isArray(payload.ranking_cumplimiento) && payload.ranking_cumplimiento.length) ||
      (Array.isArray(payload.ranking_alertas) && payload.ranking_alertas.length)
    );
  }

  function hydrateRankingsFromPayload(payload) {
    if (!payload) return false;
    let changed = false;

    if (Array.isArray(payload.ranking_cumplimiento) && payload.ranking_cumplimiento.length) {
      rankingCumplimientoTiendas = normalizeRankingCumplimiento(payload.ranking_cumplimiento);
      changed = true;
    }

    if (Array.isArray(payload.ranking_alertas) && payload.ranking_alertas.length) {
      rankingAlertasTiendas = normalizeRankingAlertas(payload.ranking_alertas);
      changed = true;
    }

    if (changed) {
      window.dispatchEvent(new CustomEvent('impulsoRankingsReady'));
    }

    return changed;
  }

  function applyInitialPayload(json) {
    storeDashboards = {};
    storesList = Array.isArray(json.tiendas) ? json.tiendas.filter(Boolean) : [];
    generalSummary = normalizeSummary(json.resumen_general || {});

    const hasRankingCumplimiento = Array.isArray(json.ranking_cumplimiento) && json.ranking_cumplimiento.length;
    const hasRankingAlertas = Array.isArray(json.ranking_alertas) && json.ranking_alertas.length;

    if (hasRankingCumplimiento || !Array.isArray(rankingCumplimientoTiendas) || !rankingCumplimientoTiendas.length) {
      rankingCumplimientoTiendas = normalizeRankingCumplimiento(json.ranking_cumplimiento || []);
    }

    if (hasRankingAlertas || !Array.isArray(rankingAlertasTiendas) || !rankingAlertasTiendas.length) {
      rankingAlertasTiendas = normalizeRankingAlertas(json.ranking_alertas || []);
    }

    lastLoadError = '';

    setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
    loadStoreSelector(storesList);
  }

  async function fetchInitialLightPayload(timeoutMs) {
    const results = await Promise.allSettled([
      fetchJsonWithTimeout(buildApiUrl({ modo: 'general' }), timeoutMs),
      fetchJsonWithTimeout(buildApiUrl({ modo: 'tiendas' }), timeoutMs)
    ]);

    const generalJson = results[0].status === 'fulfilled' ? results[0].value : null;
    const tiendasJson = results[1].status === 'fulfilled' ? results[1].value : null;

    validateGeneralPayload(generalJson);
    validateStoresPayload(tiendasJson);

    return mergeInitialPayload(null, generalJson, tiendasJson);
  }

  async function fetchInitialFullPayload(timeoutMs) {
    const inicioJson = await fetchJsonWithTimeout(buildApiUrl({ modo: 'inicio', light: '1' }), timeoutMs);
    validateInitialPayload(inicioJson);
    return mergeInitialPayload(inicioJson, null, null);
  }

  async function refreshRankingsSilently(force) {
    if (rankingRefreshPromise && !force) return rankingRefreshPromise;

    rankingRefreshPromise = (async function () {
      try {
        const payload = await fetchInitialFullPayload(RANKING_REFRESH_TIMEOUT_MS);
        if (!hasRankings(payload)) return payload;

        const cached = getInitialCacheAny();
        const merged = Object.assign({}, cached, payload, {
          resumen_general: payload.resumen_general || cached.resumen_general || {},
          tiendas: Array.isArray(payload.tiendas) && payload.tiendas.length ? payload.tiendas : (cached.tiendas || []),
          ranking_cumplimiento: Array.isArray(payload.ranking_cumplimiento) && payload.ranking_cumplimiento.length ? payload.ranking_cumplimiento : (cached.ranking_cumplimiento || []),
          ranking_alertas: Array.isArray(payload.ranking_alertas) && payload.ranking_alertas.length ? payload.ranking_alertas : (cached.ranking_alertas || [])
        });

        setCache(INITIAL_CACHE_KEY, merged);
        hydrateRankingsFromPayload(merged);
        return merged;
      } catch (error) {
        console.warn('Ranking de tiendas no disponible en segundo plano', error);
        return getInitialCacheAny();
      } finally {
        setTimeout(function () {
          rankingRefreshPromise = null;
        }, 500);
      }
    })();

    return rankingRefreshPromise;
  }

  async function refreshInitialSilently() {
    try {
      const payload = await fetchInitialLightPayload(SILENT_REFRESH_TIMEOUT_MS);
      setCache(INITIAL_CACHE_KEY, payload);
      hydrateRankingsFromPayload(payload);

      if (!currentStoreName) {
        applyInitialPayload(payload);
        renderGeneralDashboard();
      }

      setTimeout(function () {
        refreshRankingsSilently(false);
      }, 800);
    } catch (lightError) {
      try {
        const payload = await fetchInitialFullPayload(SILENT_REFRESH_TIMEOUT_MS);
        setCache(INITIAL_CACHE_KEY, payload);
        hydrateRankingsFromPayload(payload);
        if (!currentStoreName) {
          applyInitialPayload(payload);
          renderGeneralDashboard();
        }
      } catch (fullError) {
        console.warn('Actualización silenciosa inicial no disponible', fullError || lightError);
      }
    }
  }

  async function refreshStoreSilently(storeName) {
    try {
      const json = await fetchJsonWithTimeout(buildApiUrl({ modo: 'tienda', nombre: storeName }), SILENT_REFRESH_TIMEOUT_MS);
      validateStorePayload(json, storeName);
      const dashboard = normalizeOptimizedDashboard(json);
      storeDashboards[storeName] = dashboard;
      setCache(storeCacheKey(storeName), dashboard);

      if (json.ultima_actualizacion) {
        setText('ultimaActualizacion', formatDate(json.ultima_actualizacion) || 'Sin dato');
      }

      if (currentStoreName === storeName) {
        renderDashboard(storeName);
        showToast('Información de la tienda actualizada.');
      }
    } catch (e) {
      console.warn('Actualización silenciosa de tienda no disponible', e);
    }
  }

  window.validateInitialPayload = function (json) {
    if (!json) throw new Error('Apps Script no devolvió respuesta.');
    if (json.ok !== true) throw new Error(json.error || 'Apps Script devolvió error.');
    if (!json.resumen_general) throw new Error('Falta resumen_general.');
    if (!Array.isArray(json.tiendas)) throw new Error('Falta lista de tiendas.');
  };

  window.getDashboardInitialCache = function () {
    return getInitialCacheAny();
  };

  window.refreshDashboardRankings = function (force) {
    return refreshRankingsSilently(!!force);
  };

  const originalRenderErrorState = typeof renderErrorState === 'function' ? renderErrorState : null;
  window.renderErrorState = function (title, description) {
    const container = document.getElementById('mundoSeccionContainer');
    if (container) {
      container.innerHTML = `
        <div class="empty-state empty-state--error" role="alert">
          <p class="empty-state__title">${escapeHtml(title || 'No fue posible cargar la información')}</p>
          <p class="empty-state__desc">${escapeHtml(description || 'Revisa la conexión o intenta actualizar de nuevo.')}</p>
          ${lastLoadError ? `<p class="empty-state__desc error-detail">Detalle técnico: ${escapeHtml(lastLoadError)}</p>` : ''}
          <button class="store-bar__change general-select-button" type="button" onclick="location.reload()">Volver a cargar</button>
        </div>
      `;
      return;
    }

    if (originalRenderErrorState) {
      originalRenderErrorState(title, description);
    }
  };

  window.loadInitialData = async function () {
    const cachedFresh = getCache(INITIAL_CACHE_KEY, INITIAL_TTL_MS);
    const cachedAny = getAnyCache(INITIAL_CACHE_KEY);

    if (cachedFresh) {
      applyInitialPayload(cachedFresh);
      hydrateRankingsFromPayload(cachedFresh);
      setTimeout(refreshInitialSilently, 500);
      setTimeout(function () {
        refreshRankingsSilently(false);
      }, 1200);
      return cachedFresh;
    }

    try {
      const payload = await fetchInitialLightPayload(INITIAL_TIMEOUT_MS);
      applyInitialPayload(payload);
      setCache(INITIAL_CACHE_KEY, payload);
      hydrateRankingsFromPayload(payload);
      setTimeout(refreshInitialSilently, 500);
      setTimeout(function () {
        refreshRankingsSilently(false);
      }, 1200);
      return payload;
    } catch (lightError) {
      console.warn('Carga liviana inicial no respondió. Se intenta modo=inicio.', lightError);
    }

    try {
      const payload = await fetchInitialFullPayload(INITIAL_FULL_TIMEOUT_MS);
      applyInitialPayload(payload);
      setCache(INITIAL_CACHE_KEY, payload);
      hydrateRankingsFromPayload(payload);
      return payload;
    } catch (fullError) {
      console.warn('Modo inicio no respondió. Se usa cache local si existe.', fullError);

      const cached = cachedAny;
      if (cached) {
        applyInitialPayload(cached);
        hydrateRankingsFromPayload(cached);
        showToast('Mostrando última información guardada. Actualiza de nuevo en unos segundos.');
        setTimeout(refreshInitialSilently, 1000);
        setTimeout(function () {
          refreshRankingsSilently(false);
        }, 1800);
        return cached;
      }

      throw fullError;
    }
  };

  window.loadStoreDashboard = async function (storeName, forceRefresh) {
    if (!forceRefresh && storeDashboards[storeName]) return storeDashboards[storeName];

    const key = storeCacheKey(storeName);
    const cachedFresh = getCache(key, STORE_TTL_MS);
    const cachedAny = getAnyCache(key);

    if (!forceRefresh && cachedFresh) {
      storeDashboards[storeName] = cachedFresh;
      setTimeout(function () {
        refreshStoreSilently(storeName);
      }, 500);
      return cachedFresh;
    }

    try {
      const json = await fetchJsonWithTimeout(buildApiUrl({ modo: 'tienda', nombre: storeName }), STORE_TIMEOUT_MS);
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
        setTimeout(function () {
          refreshStoreSilently(storeName);
        }, 1000);
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
      const cached = getCache(storeCacheKey(currentStoreName), STORE_TTL_MS) || getAnyCache(storeCacheKey(currentStoreName));

      if (cached && !storeDashboards[currentStoreName]) {
        storeDashboards[currentStoreName] = cached;
        renderDashboard(currentStoreName);
        showToast('Mostrando información guardada mientras se actualiza.');
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
