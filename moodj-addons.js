// ============================================================================
// MOOD Lounge PRO - Ultra Optimizado para PC de Bajos Recursos (Cero Lag en SALIDA)
// (Reproductor de Consola Original de index1.html Intacto)
// ============================================================================

(function () {
  // 1. FAVICON DE "M" ROJA MAYÚSCULA
  const RED_M_FAVICON = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="60" height="60" x="2" y="2" rx="14" fill="#08090d" stroke="#ef4444" stroke-width="4"/>
      <text x="32" y="48" text-anchor="middle" font-family="Orbitron, Arial Black, Impact, sans-serif" font-size="44" font-weight="900" fill="#ef4444">M</text>
    </svg>
  `);

  function injectRedMFavicon() {
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = RED_M_FAVICON;
  }
  injectRedMFavicon();

  // 2. API KEY PRECONFIGURADA (Desde Apikey.txt)
  const BUILTIN_API_KEY = 'AIzaSyCyNih7_WzLSkBPTDt2QJrfMpdBhc-AMKc';

  // 3. LOGO SVG POR DEFECTO (Reemplaza via.placeholder.com roto)
  const SVG_DEFAULT_LOGO = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 110">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#00f0ff"/>
        </linearGradient>
      </defs>
      <rect width="310" height="100" x="5" y="5" rx="16" fill="#090a0f" fill-opacity="0.85" stroke="url(#g)" stroke-width="3"/>
      <circle cx="52" cy="55" r="26" fill="none" stroke="#ef4444" stroke-width="4" stroke-dasharray="10 6"/>
      <circle cx="52" cy="55" r="8" fill="#00f0ff"/>
      <text x="95" y="52" font-family="Orbitron, Arial, sans-serif" font-size="26" font-weight="900" fill="#ffffff" letter-spacing="2">MOOD</text>
      <text x="95" y="78" font-family="monospace" font-size="16" font-weight="700" fill="#00f0ff" letter-spacing="5">LOUNGE PRO</text>
    </svg>
  `);

  if (!localStorage.getItem('moodj_logo_src') || (localStorage.getItem('moodj_logo_src') || '').includes('via.placeholder.com')) {
    localStorage.setItem('moodj_logo_src', SVG_DEFAULT_LOGO);
  }
  if (typeof logoData !== 'undefined' && (!logoData.src || logoData.src.includes('via.placeholder.com'))) {
    logoData.src = SVG_DEFAULT_LOGO;
  }

  // 4. ESTADO DE MÓDULOS, SLIDER MENSAJE TV (10%-100%) Y FONDO/COLOR DE PANTALLA
  const MODULES_KEY = 'moodj_pro_modules_state';
  const TICKER_SIZE_KEY = 'moodj_pro_ticker_size';
  const BG_CONFIG_KEY = 'moodj_pro_bg_config';

  const defaultModules = {
    lowSpecMode: true,     // Optimización extrema para PC de bajos recursos (activado por defecto)
    tvBanner: true,        // Banner "Sonando Ahora / A continuación" en TV
    tvTicker: false,       // Marquesina de texto promocional en TV
    hotkeys: true,         // Atajos de teclado DJ
    pitchControl: true,    // Control de Tempo/Pitch en Decks
    queueManager: true     // Play Next, Historial y Sesiones Guardadas
  };

  const defaultBgConfig = {
    color: '#000000',
    imageData: '',
    imageOpacity: 60,
    applyToConsole: true
  };

  window.proModules = Object.assign({}, defaultModules, JSON.parse(localStorage.getItem(MODULES_KEY) || '{}'));
  window.bgConfig = Object.assign({}, defaultBgConfig, JSON.parse(localStorage.getItem(BG_CONFIG_KEY) || '{}'));
  window.playHistory = JSON.parse(localStorage.getItem('moodj_pro_history') || '[]');
  window.savedSessions = JSON.parse(localStorage.getItem('moodj_pro_sessions') || '{}');
  window.tickerMessage = localStorage.getItem('moodj_pro_ticker_msg') || 'BIENVENIDOS A MOOD LOUNGE — DISFRUTA LA MEJOR MÚSICA Y MIXES EN VIVO';
  window.tickerSizePercent = Math.max(10, Math.min(100, parseInt(localStorage.getItem(TICKER_SIZE_KEY)) || 25));

  let consoleIsPlaying = false;
  let extLoadedVideoId = (typeof urlParams !== 'undefined' && urlParams.get('vid')) ? urlParams.get('vid') : '';
  let extStartSeconds = (typeof urlParams !== 'undefined' && urlParams.get('t')) ? (parseInt(urlParams.get('t')) || 0) : 0;

  // Control de si la ventana externa tiene SALIDA VIDEO activa (para ahorrar GPU en la consola)
  let externalVideoOutputActive = false;
  let lastExternalVideoPing = 0;
  let forceShowConsolePreviews = false;

  function isAnyConsoleDeckPlaying() {
    const sA = (typeof playerA !== 'undefined' && playerA && playerA.getPlayerState) ? playerA.getPlayerState() : -1;
    const sB = (typeof playerB !== 'undefined' && playerB && playerB.getPlayerState) ? playerB.getPlayerState() : -1;
    return sA === 1 || sB === 1;
  }

  function broadcastProConfig(extra = {}) {
    syncExternalScreen('proConfig', Object.assign({
      modules: window.proModules,
      bgConfig: window.bgConfig,
      tickerMessage: window.tickerMessage,
      tickerSizePercent: window.tickerSizePercent,
      isPlaying: isDisplayMode ? consoleIsPlaying : isAnyConsoleDeckPlaying(),
      nowPlaying: getActiveDeckTitle(),
      upNext: (typeof playlistQueue !== 'undefined' && playlistQueue.length > 0) ? playlistQueue[0].title : 'Modo Automix'
    }, extra));
  }

  function saveModulesState() {
    localStorage.setItem(MODULES_KEY, JSON.stringify(window.proModules));
    applyLowSpecModeClasses();
    updateModulesUI();
    broadcastProConfig();
  }

  window.toggleProModule = function (modKey) {
    window.proModules[modKey] = !window.proModules[modKey];
    saveModulesState();
    showToast(`${getModuleLabel(modKey)}: ${window.proModules[modKey] ? 'ACTIVADO' : 'DESACTIVADO'}`);
  };

  function getModuleLabel(key) {
    const labels = {
      lowSpecMode: 'Modo PC Bajos Recursos',
      tvBanner: 'Banner Now Playing TV',
      tvTicker: `Mensaje Promo TV (${window.tickerSizePercent}%)`,
      hotkeys: 'Atajos de Teclado',
      pitchControl: 'Control Tempo / Pitch',
      queueManager: 'Sesiones & Historial'
    };
    return labels[key] || key;
  }

  function getActiveDeckTitle() {
    const el = document.getElementById(`deck${activeDeck}-title`);
    return el ? el.textContent : 'MOOD Lounge';
  }

  // 5. NOTIFICACIONES TOAST NO INTRUSIVAS
  window.showToast = function (msg, isError = false) {
    let container = document.getElementById('moodj-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'moodj-toast-container';
      container.className = 'fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `px-3.5 py-2 rounded-lg text-xs font-mono font-bold shadow-xl border transition-all duration-300 ${
      isError ? 'bg-red-950 text-red-300 border-red-500/50' : 'bg-neutral-900 text-cyan-300 border-cyan-500/40'
    }`;
    toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation text-red-400' : 'fa-circle-check text-cyan-400'} mr-1.5"></i>${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  };

  // 6. CARGA AUTOMÁTICA DE API KEY
  async function ensureApiKeyLoaded() {
    let key = localStorage.getItem(STORAGE_KEY_API);
    if (!key) {
      try {
        const res = await fetch('Apikey.txt', { cache: 'no-store' });
        if (res.ok) {
          const txt = (await res.text()).trim();
          if (txt.length > 20) key = txt;
        }
      } catch (e) {}
    }
    if (!key) key = BUILTIN_API_KEY;
    localStorage.setItem(STORAGE_KEY_API, key);
    const input = document.getElementById('apiKeyInput');
    if (input) input.value = key;
    return key;
  }

  // ============================================================================
  // 7. ARQUITECTURA SIN LAG AL ABRIR SALIDA (VIDEO Y SIN VIDEO)
  // ============================================================================
  window.applyQualityPolicy = function () {};
  window.updateBandwidthLimit = function () {};

  // SOLUCIÓN RAÍZ 1: En SALIDA SIN VIDEO NO creamos el 3er reproductor de YouTube (extPlayer).
  // Solo se crea bajo demanda si el usuario abre o cambia a SALIDA VIDEO.
  // En la consola DJ (!isDisplayMode), el código de playerA y playerB es 100% idéntico a index1.html.
  let ytApiReadyFired = false;

  function ensureExtPlayerCreated(videoId, startSeconds = 0) {
    if (!isDisplayMode || displayVisualMode === 'ambient') return;
    if (extPlayer && typeof extPlayer.loadVideoById === 'function') return;
    if (!ytApiReadyFired || typeof YT === 'undefined' || !YT.Player) return;

    const vid = videoId || extLoadedVideoId || (typeof urlParams !== 'undefined' && urlParams.get('vid')) || currentVideoIdA;
    extLoadedVideoId = vid;

    // Asegurar que exista el div #extPlayer dentro de #extVideoLayer
    const videoLayer = document.getElementById('extVideoLayer');
    if (videoLayer && !document.getElementById('extPlayer')) {
      const div = document.createElement('div');
      div.id = 'extPlayer';
      div.className = 'w-full h-full';
      videoLayer.appendChild(div);
    }

    extPlayer = new YT.Player('extPlayer', {
      height: '100%',
      width: '100%',
      videoId: vid,
      playerVars: {
        autoplay: 1,
        controls: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        enablejsapi: 1,
        start: Math.max(0, Math.floor(startSeconds || 0)),
        origin: window.location.origin
      },
      events: {
        'onReady': () => {
          hintLightweightQualityOnce(extPlayer, 'medium');
          extPlayer.mute();
          if (consoleIsPlaying) {
            extPlayer.playVideo();
          }
        }
      }
    });
  }

  function destroyExtPlayerIfAmbient() {
    if (!isDisplayMode || displayVisualMode !== 'ambient') return;
    if (extPlayer) {
      try {
        if (typeof extPlayer.stopVideo === 'function') extPlayer.stopVideo();
        if (typeof extPlayer.destroy === 'function') extPlayer.destroy();
      } catch (e) {}
      extPlayer = null;
    }
  }

  window.onYouTubeIframeAPIReady = function () {
    ytApiReadyFired = true;
    if (isDisplayMode) {
      // Si se abrió en SALIDA SIN VIDEO (ambient), NO creamos extPlayer (0 consumo de red/CPU/GPU)
      if (displayVisualMode === 'video') {
        const vid = urlParams.get('vid') || currentVideoIdA;
        ensureExtPlayerCreated(vid, extStartSeconds);
      }
    } else {
      // Inicialización original de playerA y playerB de index1.html intacta
      playerA = new YT.Player('playerA', {
        height: '100%',
        width: '100%',
        videoId: currentVideoIdA,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          'onReady': () => {
            if (window.proModules.lowSpecMode) hintLightweightQualityOnce(playerA, 'small');
            applyMasterCrossfade(parseFloat(document.getElementById('crossfader').value));
            startPlaybackTracker();
          },
          'onStateChange': (e) => handlePlayerState('A', e)
        }
      });

      playerB = new YT.Player('playerB', {
        height: '100%',
        width: '100%',
        videoId: currentVideoIdB,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          'onReady': () => {
            if (window.proModules.lowSpecMode) hintLightweightQualityOnce(playerB, 'small');
            applyMasterCrossfade(parseFloat(document.getElementById('crossfader').value));
            if (playerB && playerB.pauseVideo) playerB.pauseVideo();
            updateStandbyDeckVisibility();
          },
          'onStateChange': (e) => handlePlayerState('B', e)
        }
      });
    }
  };

  function applyLowSpecModeClasses() {
    document.body.classList.toggle('low-spec-mode', !!window.proModules.lowSpecMode);
    updateStandbyDeckVisibility();
  }

  window.toggleConsolePreviewOverride = function () {
    forceShowConsolePreviews = !forceShowConsolePreviews;
    updateStandbyDeckVisibility();
  };

  // SOLUCIÓN RAÍZ 2: Cuando SALIDA VIDEO está abierta en la TV, pausamos el dibujado visual
  // de los cuadritos de video de la Consola (dejando el audio al 100%) para que la PC solo dibuje 1 video
  function updateStandbyDeckVisibility() {
    if (isDisplayMode) return;

    const pA = document.getElementById('playerA');
    const pB = document.getElementById('playerB');
    const badgeA = document.getElementById('deckA-ecoOverlay');
    const badgeB = document.getElementById('deckB-ecoOverlay');

    if (!window.proModules.lowSpecMode) {
      if (pA) pA.style.visibility = 'visible';
      if (pB) pB.style.visibility = 'visible';
      if (badgeA) badgeA.classList.add('hidden');
      if (badgeB) badgeB.classList.add('hidden');
      return;
    }

    // Si SALIDA VIDEO está activa en la otra ventana y no se forzó ver la miniatura local,
    // ocultamos el renderizado gráfico de ambos iframes en la consola (el audio sigue sonando normal)
    if (externalVideoOutputActive && !forceShowConsolePreviews) {
      if (pA) pA.style.visibility = 'hidden';
      if (pB) pB.style.visibility = 'hidden';
      if (badgeA) badgeA.classList.remove('hidden');
      if (badgeB) badgeB.classList.remove('hidden');
      return;
    }

    if (badgeA) badgeA.classList.add('hidden');
    if (badgeB) badgeB.classList.add('hidden');

    const faderEl = document.getElementById('crossfader');
    const v = faderEl ? parseFloat(faderEl.value) : 0;
    if (pA) pA.style.visibility = (v >= 99 && !isTransitioning) ? 'hidden' : 'visible';
    if (pB) pB.style.visibility = (v <= 1 && !isTransitioning) ? 'hidden' : 'visible';
  }

  function hintLightweightQualityOnce(player, quality = 'small') {
    if (!player) return;
    try {
      if (typeof player.setPlaybackQualityRange === 'function') {
        player.setPlaybackQualityRange(quality, quality);
      }
      if (typeof player.setPlaybackQuality === 'function') {
        player.setPlaybackQuality(quality);
      }
    } catch (e) {}
  }

  // Sincronización de estado ligera (1200ms) + detección de ventana externa abierta
  window.startContinuousFrameLockSync = function () {
    setInterval(() => {
      if (isDisplayMode) {
        // Informar a la consola si la ventana externa está en modo VIDEO para activar ahorro de GPU en consola
        syncExternalScreen('displayHeartbeat', { mode: displayVisualMode });
        return;
      }

      // Verificar si la ventana de SALIDA VIDEO se cerró (sin latido por > 3.5s)
      if (externalVideoOutputActive && (Date.now() - lastExternalVideoPing > 3500)) {
        externalVideoOutputActive = false;
        updateStandbyDeckVisibility();
      }

      const livePlayer = activeDeck === 'A' ? playerA : playerB;
      if (livePlayer && typeof livePlayer.getPlayerState === 'function') {
        const st = livePlayer.getPlayerState();
        const playingNow = (st === 1);
        if (playingNow !== consoleIsPlaying) {
          consoleIsPlaying = playingNow;
          broadcastProConfig({ isPlaying: consoleIsPlaying });
        }
      }
    }, 1200);
  };

  // VU Meter ligero (500ms) usando transform: scaleY (acelerado por GPU, 0 reflows de diseño)
  window.startVuMeterSimulator = function () {
    setInterval(() => {
      if (isDisplayMode) return;
      const isPlayingA = playerA && playerA.getPlayerState && playerA.getPlayerState() === 1;
      const isPlayingB = playerB && playerB.getPlayerState && playerB.getPlayerState() === 1;

      const crossfaderEl = document.getElementById('crossfader');
      const faderVal = crossfaderEl ? parseFloat(crossfaderEl.value) : 0;
      let volA = faderVal <= 50 ? 1 : ((100 - faderVal) / 50);
      let volB = faderVal >= 50 ? 1 : (faderVal / 50);

      volA = (volA * (deckGainA / 100)) * (isMutedA ? 0 : 1);
      volB = (volB * (deckGainB / 100)) * (isMutedB ? 0 : 1);

      for (let i = 1; i <= 4; i++) {
        const elA = document.getElementById(`vuA-${i}`);
        if (elA) {
          const sA = isPlayingA && volA > 0 ? Math.min(1, Math.max(0.12, (Math.random() * 0.75 + 0.25) * volA)) : 0.1;
          elA.style.height = '100%';
          elA.style.transformOrigin = 'bottom';
          elA.style.transform = `scaleY(${sA.toFixed(2)})`;
        }
        const elB = document.getElementById(`vuB-${i}`);
        if (elB) {
          const sB = isPlayingB && volB > 0 ? Math.min(1, Math.max(0.12, (Math.random() * 0.75 + 0.25) * volB)) : 0.1;
          elB.style.height = '100%';
          elB.style.transformOrigin = 'bottom';
          elB.style.transform = `scaleY(${sB.toFixed(2)})`;
        }
      }
    }, 500);
  };

  // Playback Tracker ligero (900ms) solo en el deck activo
  let playbackTrackerStarted = false;
  window.startPlaybackTracker = function () {
    if (playbackTrackerStarted || isDisplayMode) return;
    playbackTrackerStarted = true;

    setInterval(() => {
      try {
        ['A', 'B'].forEach((deck) => {
          const player = deck === 'A' ? playerA : playerB;
          if (!player || typeof player.getCurrentTime !== 'function') return;

          const state = player.getPlayerState ? player.getPlayerState() : -1;
          if (deck !== activeDeck && state !== 1 && state !== 3 && !isTransitioning) return;

          const cur = player.getCurrentTime() || 0;
          const dur = player.getDuration ? (player.getDuration() || 0) : 0;
          const remaining = Math.max(0, dur - cur);
          const loadedFraction = player.getVideoLoadedFraction ? player.getVideoLoadedFraction() : 0;

          document.getElementById(`deck${deck}-currentTime`).textContent = formatTime(cur);
          document.getElementById(`deck${deck}-duration`).textContent = formatTime(dur);
          document.getElementById(`deck${deck}-remainingTime`).textContent = `-${formatTime(remaining)}`;

          const bufferPct = (loadedFraction * 100).toFixed(0);
          document.getElementById(`deck${deck}-bufferBar`).style.width = `${bufferPct}%`;
          document.getElementById(`deck${deck}-bufferStatus`).textContent = `Búfer: ${bufferPct}%`;

          const isSeeking = deck === 'A' ? isSeekingA : isSeekingB;
          if (dur > 0 && !isSeeking) {
            const playPct = (cur / dur) * 100;
            document.getElementById(`deck${deck}-playBar`).style.width = `${playPct}%`;
            document.getElementById(`seek${deck}`).value = playPct;
          }
        });
      } catch (e) {}
    }, 900);
  };

  // SOLUCIÓN RAÍZ 3: Eliminar el rebote continuo de 25ms (startAntiBurnBounce)
  // El logo ya no se anima desplazándose continuamente, sino que aparece y desaparece
  // en distintas posiciones cada 20 segundos (0% uso de CPU en movimiento).
  window.startAntiBurnBounce = function () {
    if (typeof bounceInterval !== 'undefined' && bounceInterval) {
      clearInterval(bounceInterval);
      bounceInterval = null;
    }
  };

  window.playDeck = function (deck) {
    const player = deck === 'A' ? playerA : playerB;
    if (player && player.playVideo) {
      if (window.proModules.lowSpecMode) {
        hintLightweightQualityOnce(player, 'small');
      }
      player.unMute();
      player.playVideo();
      applyMasterCrossfade(parseFloat(document.getElementById('crossfader').value));
      updateStandbyDeckVisibility();
      if (deck === activeDeck) {
        const videoId = deck === 'A' ? currentVideoIdA : currentVideoIdB;
        const curSec = player.getCurrentTime ? (player.getCurrentTime() || 0) : 0;
        syncExternalScreen('play', { videoId, seconds: curSec });
        consoleIsPlaying = true;
        broadcastProConfig({ isPlaying: true });
      }
    }
  };

  window.pauseDeck = function (deck) {
    const player = deck === 'A' ? playerA : playerB;
    if (player && player.pauseVideo) {
      player.pauseVideo();
      if (deck === activeDeck) {
        syncExternalScreen('pause', {});
        consoleIsPlaying = false;
        broadcastProConfig({ isPlaying: false });
      }
    }
  };

  const origApplyMasterCrossfade = window.applyMasterCrossfade;
  if (typeof origApplyMasterCrossfade === 'function') {
    window.applyMasterCrossfade = function (v) {
      origApplyMasterCrossfade(v);
      updateStandbyDeckVisibility();
    };
  }

  // Evitar que applyLogoStyles envíe mensajes 'updateLogo' recursivos desde la ventana de SALIDA
  const origApplyLogoStyles = window.applyLogoStyles;
  if (typeof origApplyLogoStyles === 'function') {
    window.applyLogoStyles = function () {
      const boxes = [
        document.getElementById('deckA-logoBox'),
        document.getElementById('deckB-logoBox'),
        document.getElementById('screenLogoBox')
      ];
      const imgs = [
        document.getElementById('deckA-logoImg'),
        document.getElementById('deckB-logoImg'),
        document.getElementById('screenLogoImg')
      ];

      boxes.forEach(el => {
        if (el) {
          if (!logoData.src) {
            el.style.display = 'none';
          } else {
            if (el.id === 'screenLogoBox' && displayVisualMode === 'ambient') {
              el.style.display = 'flex';
              el.style.width = '30vw';
              el.style.transform = 'none';
            } else {
              el.style.display = 'block';
              el.style.width = `${logoData.size}%`;
              el.style.top = `${logoData.topPercent}%`;
              el.style.left = `${logoData.leftPercent}%`;
              el.style.transform = 'none';
            }
            el.style.opacity = logoData.opacity;
          }
        }
      });

      imgs.forEach(img => {
        if (img && logoData.src) {
          img.src = logoData.src;
          img.style.display = 'block';
        } else if (img) {
          img.style.display = 'none';
        }
      });

      const sizeSlider = document.getElementById('logoSizeSlider');
      if (sizeSlider) {
        sizeSlider.value = logoData.size;
        document.getElementById('logoSizeDisplay').textContent = `${logoData.size}%`;
        document.getElementById('logoOpacitySlider').value = logoData.opacity * 100;
        document.getElementById('logoOpacityDisplay').textContent = `${Math.round(logoData.opacity * 100)}%`;
      }

      if (!isDisplayMode) {
        syncExternalScreen('updateLogo', { logo: logoData });
      }
    };
  }

  window.onSeekInput = function (deck, percentage) {
    if (deck === 'A') isSeekingA = true;
    if (deck === 'B') isSeekingB = true;

    const player = deck === 'A' ? playerA : playerB;
    if (player && player.getDuration) {
      const targetSeconds = (percentage / 100) * player.getDuration();
      document.getElementById(`deck${deck}-currentTime`).textContent = formatTime(targetSeconds);
      document.getElementById(`deck${deck}-playBar`).style.width = `${percentage}%`;
    }
  };

  // SOLUCIÓN RAÍZ 4: Abrir la ventana de SALIDA con 'noopener' para que corra en un proceso
  // separado del procesador y no comparta el mismo hilo de CPU con la Consola DJ.
  window.openExternalDisplay = function (modeType) {
    const activeVideoId = activeDeck === 'A' ? currentVideoIdA : currentVideoIdB;
    const livePlayer = activeDeck === 'A' ? playerA : playerB;
    const curSec = (livePlayer && livePlayer.getCurrentTime) ? Math.floor(livePlayer.getCurrentTime() || 0) : 0;
    const url = `${window.location.origin}${window.location.pathname}?mode=display&type=${modeType}&vid=${activeVideoId}&t=${curSec}`;
    const left = window.screen.width ? window.screen.width : 1366;

    // Usamos noopener para aislar el proceso de renderizado en otro núcleo del CPU
    window.open(url, 'MOOD_Lounge_Display', `width=1280,height=720,left=${left},top=0,menubar=no,toolbar=no,location=no,status=no,noopener`);

    externalVideoOutputActive = (modeType === 'video');
    lastExternalVideoPing = Date.now();
    updateStandbyDeckVisibility();

    syncExternalScreen('switchMode', { mode: modeType, videoId: activeVideoId, seconds: curSec });
    setTimeout(() => broadcastProConfig(), 600);
    closeAllDropdowns();
  };

  function hidePrecargaWidget() {
    const bwSlider = document.getElementById('bandwidthSlider');
    if (bwSlider) {
      const box = bwSlider.closest('div.flex.items-center.gap-2');
      if (box) box.style.display = 'none';
    }
  }

  // ============================================================================
  // 8. PERSONALIZACIÓN DE FONDO Y COLOR DE LA PANTALLA (TV + CONSOLA)
  // ============================================================================
  function applyScreenBackgroundStyles() {
    const cfg = window.bgConfig || defaultBgConfig;
    const bgColor = cfg.color || '#000000';
    const hasImg = !!(cfg.imageData && cfg.imageData.length > 10);
    const imgOpacity = Math.max(10, Math.min(100, parseInt(cfg.imageOpacity) || 60)) / 100;

    const displayRoot = document.getElementById('display-mode-root');
    const ambientLayer = document.getElementById('extAmbientLayer');
    const videoLayer = document.getElementById('extVideoLayer');

    if (displayRoot) displayRoot.style.backgroundColor = bgColor;
    if (videoLayer) videoLayer.style.backgroundColor = bgColor;
    if (ambientLayer) {
      ambientLayer.style.backgroundColor = bgColor;
      let bgImgEl = document.getElementById('extCustomBgImageLayer');
      if (!bgImgEl && ambientLayer) {
        bgImgEl = document.createElement('div');
        bgImgEl.id = 'extCustomBgImageLayer';
        bgImgEl.style.cssText = 'position:absolute;inset:0;background-size:cover;background-position:center;background-repeat:no-repeat;pointer-events:none;z-index:1;';
        ambientLayer.insertBefore(bgImgEl, ambientLayer.firstChild);
      }
      if (bgImgEl) {
        bgImgEl.style.backgroundImage = hasImg ? `url("${cfg.imageData}")` : 'none';
        bgImgEl.style.opacity = hasImg ? String(imgOpacity) : '0';
      }
    }

    const mainRoot = document.getElementById('main-dj-root');
    if (mainRoot) {
      if (cfg.applyToConsole) {
        mainRoot.style.backgroundColor = bgColor;
        document.body.style.backgroundColor = bgColor;
        if (hasImg) {
          mainRoot.style.backgroundImage = `linear-gradient(rgba(0,0,0,${(1 - imgOpacity * 0.65).toFixed(2)}), rgba(0,0,0,${(1 - imgOpacity * 0.65).toFixed(2)})), url("${cfg.imageData}")`;
          mainRoot.style.backgroundSize = 'cover';
          mainRoot.style.backgroundPosition = 'center';
        } else {
          mainRoot.style.backgroundImage = 'none';
        }
      } else {
        mainRoot.style.backgroundColor = '#000000';
        mainRoot.style.backgroundImage = 'none';
        document.body.style.backgroundColor = '#000000';
      }
    }

    const picker = document.getElementById('screenBgColorPicker');
    if (picker && picker.value.toLowerCase() !== bgColor.toLowerCase()) {
      picker.value = bgColor;
    }
    const opSlider = document.getElementById('screenBgOpacitySlider');
    const opDisp = document.getElementById('screenBgOpacityDisplay');
    if (opSlider) opSlider.value = cfg.imageOpacity || 60;
    if (opDisp) opDisp.textContent = `${cfg.imageOpacity || 60}%`;
  }

  function saveBgConfig() {
    try {
      localStorage.setItem(BG_CONFIG_KEY, JSON.stringify(window.bgConfig));
    } catch (e) {
      showToast('Imagen aplicada en esta sesión', true);
    }
    applyScreenBackgroundStyles();
    broadcastProConfig();
  }

  window.setScreenBgColor = function (hexColor) {
    window.bgConfig.color = hexColor;
    saveBgConfig();
  };

  window.handleScreenBgImageUpload = function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      window.bgConfig.imageData = evt.target.result;
      saveBgConfig();
      showToast('Imagen de fondo aplicada');
    };
    reader.readAsDataURL(file);
  };

  window.clearScreenBgImage = function () {
    window.bgConfig.imageData = '';
    saveBgConfig();
    showToast('Imagen de fondo eliminada');
  };

  window.updateScreenBgOpacity = function (val) {
    window.bgConfig.imageOpacity = Math.max(10, Math.min(100, parseInt(val) || 60));
    saveBgConfig();
  };

  window.toggleBgApplyToConsole = function () {
    window.bgConfig.applyToConsole = !window.bgConfig.applyToConsole;
    saveBgConfig();
    const btn = document.getElementById('btnBgApplyConsole');
    if (btn) {
      btn.textContent = window.bgConfig.applyToConsole ? 'APLICAR EN: TV + CONSOLA' : 'APLICAR EN: SOLO TV';
    }
  };

  // ============================================================================
  // 9. SLIDER DE TAMAÑO DE MENSAJE TV (10% A 100%) Y BOTÓN FULLSCREEN LIGERO
  // ============================================================================
  function applyTickerSizeStyles(pct) {
    const size = Math.max(10, Math.min(100, parseInt(pct) || 25));
    window.tickerSizePercent = size;

    const tickerBar = document.getElementById('extTickerContainer');
    const tickerTxt = document.getElementById('extTickerContent');
    if (tickerBar) {
      tickerBar.style.setProperty('height', `${size}vh`, 'important');
      tickerBar.classList.toggle('hidden', !window.proModules.tvTicker);
    }
    if (tickerTxt) {
      const fontVh = Math.max(4.2, Math.min(44, +(size * 0.44).toFixed(1)));
      tickerTxt.style.setProperty('font-size', `${fontVh}vh`, 'important');
    }

    const fsBtn = document.getElementById('fsBtn');
    const banner = document.getElementById('extNowPlayingBanner');
    const tickerActive = !!window.proModules.tvTicker;

    if (fsBtn) {
      fsBtn.style.setProperty('display', 'flex', 'important');
      if (!tickerActive) {
        fsBtn.style.setProperty('bottom', '18px', 'important');
        fsBtn.style.setProperty('top', 'auto', 'important');
      } else if (size <= 78) {
        fsBtn.style.setProperty('bottom', `calc(${size}vh + 14px)`, 'important');
        fsBtn.style.setProperty('top', 'auto', 'important');
      } else {
        fsBtn.style.setProperty('top', '18px', 'important');
        fsBtn.style.setProperty('bottom', 'auto', 'important');
      }
    }

    if (banner) {
      if (!tickerActive) {
        banner.style.bottom = '24px';
      } else if (size <= 72) {
        banner.style.bottom = `calc(${size}vh + 14px)`;
      } else {
        banner.style.bottom = '74vh';
      }
    }
  }

  window.updateTickerSize = function (val) {
    const pct = Math.max(10, Math.min(100, parseInt(val) || 25));
    window.tickerSizePercent = pct;
    localStorage.setItem(TICKER_SIZE_KEY, pct);

    const disp = document.getElementById('tvTickerSizeDisplay');
    if (disp) disp.textContent = `${pct}%`;
    const slider = document.getElementById('tvTickerSizeSlider');
    if (slider && parseInt(slider.value) !== pct) slider.value = pct;
    const lbl = document.getElementById('tvTickerLabelPct');
    if (lbl) lbl.textContent = `(${pct}% PANTALLA)`;

    updateModulesUI();
    broadcastProConfig();
  };

  let fsMouseTimer = null;
  let isHoveringFsBtn = false;
  let lastMouseWakeTime = 0;

  function updateFsButtonText() {
    const fsBtn = document.getElementById('fsBtn');
    if (!fsBtn) return;
    fsBtn.style.setProperty('display', 'flex', 'important');
    fsBtn.textContent = document.fullscreenElement ? '⛶ SALIR PANTALLA COMPLETA (ESC / F)' : '⛶ PANTALLA COMPLETA (F)';
  }

  function showFsButtonOnMouseMove() {
    if (!isDisplayMode) return;
    const now = Date.now();
    // Throttle a 250ms para no ejecutar cambios DOM en cada pixel de movimiento del mouse
    if (now - lastMouseWakeTime < 250) return;
    lastMouseWakeTime = now;

    const fsBtn = document.getElementById('fsBtn');
    if (!fsBtn) return;
    fsBtn.style.setProperty('display', 'flex', 'important');
    fsBtn.classList.add('fs-visible');

    if (fsMouseTimer) clearTimeout(fsMouseTimer);
    fsMouseTimer = setTimeout(() => {
      if (!isHoveringFsBtn) {
        fsBtn.classList.remove('fs-visible');
      }
    }, 2600);
  }

  window.toggleFullScreen = function () {
    const fsBtn = document.getElementById('fsBtn');
    if (fsBtn) fsBtn.style.setProperty('display', 'flex', 'important');

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        updateFsButtonText();
        lastMouseWakeTime = 0;
        showFsButtonOnMouseMove();
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        updateFsButtonText();
        lastMouseWakeTime = 0;
        showFsButtonOnMouseMove();
      }).catch(() => {});
    }
    lastMouseWakeTime = 0;
    showFsButtonOnMouseMove();
  };

  document.addEventListener('fullscreenchange', () => {
    updateFsButtonText();
    lastMouseWakeTime = 0;
    showFsButtonOnMouseMove();
  });

  if (isDisplayMode) {
    window.addEventListener('mousemove', showFsButtonOnMouseMove, { passive: true });
    window.addEventListener('mousedown', showFsButtonOnMouseMove, { passive: true });
    window.addEventListener('touchstart', showFsButtonOnMouseMove, { passive: true });
  }

  // ============================================================================
  // 10. ECUALIZADOR GRÁFICO CON ACELERACIÓN GPU (transform: scaleY, 0 REFLOWS)
  // ============================================================================
  window.startSymmetricAmbientVisualizer = function () {
    if (!isDisplayMode) return;

    let beatAngle = 0;
    let lastColorIndex = -1;

    setInterval(() => {
      if (displayVisualMode !== 'ambient') return;

      const isPlaying = consoleIsPlaying;
      const currentColors = (typeof COLOR_THEMES !== 'undefined' && COLOR_THEMES[currentThemeIndex])
        ? COLOR_THEMES[currentThemeIndex]
        : ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#0284c7', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'];

      const colorChanged = (currentThemeIndex !== lastColorIndex);
      if (colorChanged) lastColorIndex = currentThemeIndex;

      let kickPeak = 0;
      if (isPlaying) {
        beatAngle += 0.24;
        kickPeak = Math.pow(Math.sin(beatAngle), 4);
      } else {
        beatAngle = 0;
        kickPeak = 0;
      }

      for (let i = 1; i <= 12; i++) {
        const topBar = document.getElementById(`ambTopBar-${i}`);
        const btmBar = document.getElementById(`ambBtmBar-${i}`);

        const isBassBar = (i <= 4 || i >= 9);
        const energy = isBassBar ? (kickPeak * 68 + Math.random() * 22) : (Math.random() * 45 + kickPeak * 25);
        const scale = isPlaying ? Math.min(0.95, Math.max(0.10, energy / 100)) : 0.08;

        if (topBar) {
          if (colorChanged) topBar.style.backgroundColor = currentColors[(i - 1) % currentColors.length];
          topBar.style.transform = `scaleY(${scale.toFixed(2)})`;
        }

        if (btmBar) {
          if (colorChanged) btmBar.style.backgroundColor = currentColors[(i - 1) % currentColors.length];
          btmBar.style.transform = `scaleY(${scale.toFixed(2)})`;
        }
      }
    }, 85);
  };

  // ============================================================================
  // 11. LOGO ANTI-QUEMADO SIN ANIMACIÓN DE MOVIMIENTO:
  // APARECE Y DESAPARECE EN DIFERENTES DIRECCIONES CADA 20 SEGUNDOS
  // ============================================================================
  const VIDEO_LOGO_SPOTS = [
    'top-left',
    'top-center',
    'top-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
  ];

  // En SALIDA SIN VIDEO (ambient), 9 zonas alrededor de la pantalla para no quemar píxeles
  const AMBIENT_LOGO_SPOTS = [
    { top: 8, left: 6 },
    { top: 8, left: 35 },
    { top: 8, left: 64 },
    { top: 36, left: 6 },
    { top: 36, left: 35 },
    { top: 36, left: 64 },
    { top: 64, left: 6 },
    { top: 64, left: 35 },
    { top: 64, left: 64 }
  ];

  let currentVideoLogoSpot = 'top-right';
  let currentAmbientSpotIdx = 4;
  let logoAppearDisappearInterval = null;

  function computeLogoCoordsForSpot(spot) {
    const w = (typeof logoData !== 'undefined' && logoData.size) ? parseFloat(logoData.size) : 25;
    const estHeightPct = Math.max(14, w * 0.52);

    let top = 5;
    let left = 4;

    if (spot.startsWith('top-')) {
      top = 5;
    } else {
      top = Math.max(6, 93 - estHeightPct);
    }

    if (spot.endsWith('-left')) {
      left = 4;
    } else if (spot.endsWith('-center')) {
      left = Math.max(2, (100 - w) / 2);
    } else if (spot.endsWith('-right')) {
      left = Math.max(4, 100 - w - 4);
    }

    return { top, left };
  }

  // Cambia de posición desapareciendo y volviendo a aparecer en otra dirección (sin animar desplazamiento)
  function placeLogoAtSpotWithFade(mode, spotOrIdx, useFade = true) {
    const logoBox = document.getElementById('screenLogoBox');
    if (!logoBox) return;
    const targetOpacity = (typeof logoData !== 'undefined' && logoData.opacity) ? logoData.opacity : 0.9;

    const applyNewPosition = () => {
      logoBox.style.transform = 'none';
      if (mode === 'ambient') {
        const pt = AMBIENT_LOGO_SPOTS[spotOrIdx] || AMBIENT_LOGO_SPOTS[4];
        logoBox.style.top = `${pt.top}%`;
        logoBox.style.left = `${pt.left}%`;
      } else {
        currentVideoLogoSpot = spotOrIdx;
        const coords = computeLogoCoordsForSpot(spotOrIdx);
        logoBox.style.top = `${coords.top}%`;
        logoBox.style.left = `${coords.left}%`;
      }
    };

    if (!useFade) {
      applyNewPosition();
      logoBox.style.opacity = targetOpacity;
      return;
    }

    // 1. Desaparece suavemente en su posición actual
    logoBox.style.opacity = '0';

    // 2. Cuando está oculto, cambia instantáneamente de coordenadas y vuelve a aparecer
    setTimeout(() => {
      applyNewPosition();
      requestAnimationFrame(() => {
        logoBox.style.opacity = targetOpacity;
      });
    }, 650);
  }

  function startLogoAntiBurnAppearDisappear() {
    if (logoAppearDisappearInterval) clearInterval(logoAppearDisappearInterval);
    if (!isDisplayMode) return;

    // Cada 20 segundos desaparece y reaparece en una dirección distinta (tanto en SALIDA VIDEO como en SALIDA SIN VIDEO)
    logoAppearDisappearInterval = setInterval(() => {
      if (!logoData || !logoData.src) return;

      if (displayVisualMode === 'ambient') {
        const candidates = AMBIENT_LOGO_SPOTS.map((_, idx) => idx).filter(idx => idx !== currentAmbientSpotIdx);
        currentAmbientSpotIdx = candidates[Math.floor(Math.random() * candidates.length)] || 0;
        placeLogoAtSpotWithFade('ambient', currentAmbientSpotIdx, true);
      } else {
        const available = VIDEO_LOGO_SPOTS.filter(s => s !== currentVideoLogoSpot);
        const nextSpot = available[Math.floor(Math.random() * available.length)] || VIDEO_LOGO_SPOTS[0];
        placeLogoAtSpotWithFade('video', nextSpot, true);
      }
    }, 20000);
  }

  const origSetLogoCorner = window.setLogoCorner;
  window.setLogoCorner = function (corner) {
    const w = logoData.size || 25;
    if (corner === 'top-center') {
      logoData.topPercent = 5;
      logoData.leftPercent = Math.max(2, Math.round((100 - w) / 2));
      localStorage.setItem('moodj_logo_top', logoData.topPercent);
      localStorage.setItem('moodj_logo_left', logoData.leftPercent);
      applyLogoStyles();
      syncExternalScreen('setLogoSpot', { spot: 'top-center' });
      return;
    } else if (corner === 'bottom-center') {
      logoData.topPercent = 75;
      logoData.leftPercent = Math.max(2, Math.round((100 - w) / 2));
      localStorage.setItem('moodj_logo_top', logoData.topPercent);
      localStorage.setItem('moodj_logo_left', logoData.leftPercent);
      applyLogoStyles();
      syncExternalScreen('setLogoSpot', { spot: 'bottom-center' });
      return;
    }
    if (typeof origSetLogoCorner === 'function') {
      origSetLogoCorner(corner);
    }
    syncExternalScreen('setLogoSpot', { spot: corner });
  };

  window.applyDisplayModeLayout = function (mode) {
    displayVisualMode = mode;
    if (typeof bounceInterval !== 'undefined' && bounceInterval) {
      clearInterval(bounceInterval);
      bounceInterval = null;
    }

    const videoLayer = document.getElementById('extVideoLayer');
    const ambientLayer = document.getElementById('extAmbientLayer');
    const logoBox = document.getElementById('screenLogoBox');
    const ambientTopEQ = document.getElementById('ambientTopEQ');
    const ambientBottomEQ = document.getElementById('ambientBottomEQ');

    if (mode === 'ambient') {
      if (videoLayer) videoLayer.classList.add('opacity-0', 'pointer-events-none');
      if (ambientLayer) ambientLayer.classList.remove('hidden');
      if (ambientTopEQ) ambientTopEQ.classList.remove('hidden');
      if (ambientBottomEQ) ambientBottomEQ.classList.remove('hidden');
      if (logoBox) {
        logoBox.className = 'ambient-floating-container';
        logoBox.style.width = '30vw';
        logoBox.style.display = logoData && logoData.src ? 'flex' : 'none';
        logoBox.style.transform = 'none';
        placeLogoAtSpotWithFade('ambient', currentAmbientSpotIdx, false);
      }
      destroyExtPlayerIfAmbient();
    } else {
      if (videoLayer) videoLayer.classList.remove('opacity-0', 'pointer-events-none');
      if (ambientLayer) ambientLayer.classList.add('hidden');
      if (ambientTopEQ) ambientTopEQ.classList.add('hidden');
      if (ambientBottomEQ) ambientBottomEQ.classList.add('hidden');
      if (logoBox) {
        logoBox.className = 'logo-watermark';
        logoBox.style.transform = 'none';
        logoBox.style.width = `${logoData.size}%`;
        logoBox.style.display = logoData && logoData.src ? 'block' : 'none';
        placeLogoAtSpotWithFade('video', currentVideoLogoSpot, false);
      }
      ensureExtPlayerCreated(extLoadedVideoId, extStartSeconds);
    }

    startLogoAntiBurnAppearDisappear();
  };

  // ============================================================================
  // 12. RECEPTOR DE PANTALLA EXTERNA Y CONSOLA (LIGERO Y SIN BUCLES)
  // ============================================================================
  window.setupDisplayReceiver = function () {
    if (!displayBroadcast) return;
    displayBroadcast.onmessage = (e) => {
      if (!e.data) return;
      const d = e.data;

      if (!isDisplayMode) {
        if (d.action === 'requestSync') {
          broadcastProConfig();
          syncExternalScreen('updateLogo', { logo: logoData });
        } else if (d.action === 'displayHeartbeat') {
          const wasActive = externalVideoOutputActive;
          externalVideoOutputActive = (d.mode === 'video');
          lastExternalVideoPing = Date.now();
          if (wasActive !== externalVideoOutputActive) {
            updateStandbyDeckVisibility();
          }
        }
        return;
      }

      if (d.action === 'proConfig') {
        window.proModules = d.modules || window.proModules;
        if (d.bgConfig) {
          window.bgConfig = d.bgConfig;
          applyScreenBackgroundStyles();
        }
        window.tickerMessage = d.tickerMessage || window.tickerMessage;
        if (typeof d.tickerSizePercent === 'number') {
          window.tickerSizePercent = d.tickerSizePercent;
        }
        if (typeof d.isPlaying === 'boolean') {
          consoleIsPlaying = d.isPlaying;
        }

        applyLowSpecModeClasses();
        const tickerTxt = document.getElementById('extTickerContent');
        if (tickerTxt) {
          tickerTxt.textContent = window.tickerMessage;
        }
        applyTickerSizeStyles(window.tickerSizePercent);

        if (d.showBannerNow) {
          triggerExternalBanner(d.nowPlaying, d.upNext);
        }
        return;
      }

      if (d.action === 'setLogoSpot' && d.spot) {
        if (displayVisualMode !== 'ambient') {
          placeLogoAtSpotWithFade('video', d.spot, true);
        }
        return;
      }

      if (d.action === 'switchMode') {
        if (d.videoId) extLoadedVideoId = d.videoId;
        if (typeof d.seconds === 'number') extStartSeconds = d.seconds;
        applyDisplayModeLayout(d.mode);

        if (d.mode === 'video' && extPlayer) {
          if (d.videoId && d.videoId !== extLoadedVideoId && extPlayer.loadVideoById) {
            extLoadedVideoId = d.videoId;
            extPlayer.loadVideoById({ videoId: d.videoId, startSeconds: d.seconds || 0, suggestedQuality: 'medium' });
          } else if (extPlayer.playVideo) {
            if (typeof d.seconds === 'number' && extPlayer.seekTo) {
              extPlayer.seekTo(d.seconds, true);
            }
            extPlayer.playVideo();
          }
        }
        return;
      }

      if (d.action === 'updateLogo') {
        logoData = d.logo;
        applyLogoStyles();
        if (displayVisualMode !== 'ambient') {
          placeLogoAtSpotWithFade('video', currentVideoLogoSpot, false);
        } else {
          placeLogoAtSpotWithFade('ambient', currentAmbientSpotIdx, false);
        }
        return;
      }

      if (d.action === 'changeVideo') {
        consoleIsPlaying = true;
        extLoadedVideoId = d.videoId || extLoadedVideoId;
        if (displayVisualMode === 'ambient') return;
        ensureExtPlayerCreated(d.videoId, 0);
        if (extPlayer && extPlayer.loadVideoById) {
          extPlayer.loadVideoById({ videoId: d.videoId, suggestedQuality: 'medium' });
        }
      } else if (d.action === 'seek') {
        if (displayVisualMode !== 'ambient' && extPlayer && extPlayer.seekTo) {
          extPlayer.seekTo(d.seconds, true);
        }
      } else if (d.action === 'play') {
        consoleIsPlaying = true;
        if (displayVisualMode === 'ambient') return;
        ensureExtPlayerCreated(d.videoId, d.seconds || 0);
        if (extPlayer) {
          if (d.videoId && d.videoId !== extLoadedVideoId && extPlayer.loadVideoById) {
            extLoadedVideoId = d.videoId;
            extPlayer.loadVideoById({ videoId: d.videoId, startSeconds: d.seconds || 0, suggestedQuality: 'medium' });
          } else if (extPlayer.playVideo) {
            extPlayer.playVideo();
          }
        }
      } else if (d.action === 'pause') {
        consoleIsPlaying = false;
        if (extPlayer && extPlayer.pauseVideo) extPlayer.pauseVideo();
      }
    };
  };

  // ============================================================================
  // 13. ESTILOS CSS: CERO REFLOWS EN ECUALIZADOR + APARICIÓN DE LOGO + BAJOS RECURSOS
  // ============================================================================
  function injectProStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* En la ventana externa, el iframe de YouTube no captura el mouse */
      #display-mode-root #extVideoLayer,
      #display-mode-root #extPlayer,
      #display-mode-root iframe {
        pointer-events: none !important;
      }

      /* El Logo SIEMPRE se sobrepone a todo (incluyendo MENSAJE TV) y solo anima opacidad al aparecer/desaparecer */
      #screenLogoBox {
        z-index: 9000 !important;
        pointer-events: none !important;
        transition: opacity 0.6s ease !important;
      }

      /* Barras del ecualizador aceleradas por GPU con transform: scaleY (0 recálculos de pantalla) */
      .eq-bar-wrapper {
        height: 46px !important;
        gap: 5px !important;
      }
      .ambient-bar {
        height: 100% !important;
        transform: scaleY(0.08);
        border-radius: 3px !important;
        box-shadow: none !important;
        transition: transform 0.08s linear !important;
        will-change: transform;
      }
      #ambientTopEQ .ambient-bar {
        transform-origin: bottom !important;
      }
      #ambientBottomEQ .ambient-bar {
        transform-origin: top !important;
      }

      /* Barra de MENSAJE TV proporcional */
      #extTickerContainer {
        height: 25vh;
        display: flex !important;
        align-items: center !important;
        background: #0b0709 !important;
        border-top: 3px solid rgba(245, 158, 11, 0.7) !important;
        z-index: 45 !important;
      }
      #extTickerContainer.hidden {
        display: none !important;
      }
      #extTickerContent {
        font-size: 11vh;
        line-height: 1.05 !important;
        letter-spacing: 0.06em !important;
        will-change: transform;
      }

      /* Botón Pantalla Completa: persistente y aparece siempre al mover el mouse */
      #fsBtn {
        display: flex !important;
        align-items: center;
        justify-content: center;
        gap: 6px;
        position: fixed !important;
        bottom: 18px;
        right: 18px !important;
        z-index: 99999 !important;
        background: rgba(0, 0, 0, 0.9) !important;
        border: 1.5px solid rgba(239, 68, 68, 0.85) !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.2s ease !important;
      }
      #fsBtn.fs-visible {
        opacity: 0.96 !important;
        pointer-events: auto !important;
      }
      #fsBtn.fs-visible:hover {
        opacity: 1 !important;
        background: #dc2626 !important;
        color: #ffffff !important;
      }

      /* MODO OPTIMIZADO PARA PC DE BAJOS RECURSOS */
      body.low-spec-mode *,
      body.low-spec-mode *::before,
      body.low-spec-mode *::after {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      body.low-spec-mode .animate-pulse,
      body.low-spec-mode .animate-ping {
        animation: none !important;
      }
      body.low-spec-mode .neon-border-a,
      body.low-spec-mode .neon-border-b,
      body.low-spec-mode .dj-panel,
      body.low-spec-mode .mixer-panel {
        box-shadow: none !important;
      }
      body.low-spec-mode .logo-watermark img,
      body.low-spec-mode #screenLogoImg {
        filter: none !important;
      }

      @keyframes moodMarquee {
        0% { transform: translate3d(100vw, 0, 0); }
        100% { transform: translate3d(-100%, 0, 0); }
      }
      .mood-ticker-text {
        display: inline-block;
        white-space: nowrap;
        animation: moodMarquee 18s linear infinite;
      }
      .mod-pill-on {
        background: rgba(6, 182, 212, 0.18);
        color: #22d3ee;
        border-color: rgba(6, 182, 212, 0.5);
      }
      .mod-pill-off {
        background: #14161f;
        color: #6b7280;
        border-color: rgba(255,255,255,0.07);
      }
    `;
    document.head.appendChild(style);
  }

  // 14. CAPAS EN SALIDA EXTERNA + LIMPIEZA DEL DOM DE CONSOLA EN LA VENTANA DE TV
  function injectExternalOverlaysDOM() {
    // Eliminar el DOM pesado de la consola DJ cuando estamos en la ventana de SALIDA
    const unusedConsole = document.getElementById('main-dj-root');
    if (unusedConsole) unusedConsole.remove();
    const unusedModal = document.getElementById('logoSettingsModal');
    if (unusedModal) unusedModal.remove();

    const displayRoot = document.getElementById('display-mode-root');
    if (displayRoot && !document.getElementById('extNowPlayingBanner')) {
      const mouseShield = document.createElement('div');
      mouseShield.id = 'extMouseShield';
      mouseShield.style.cssText = 'position:fixed;inset:0;z-index:42;background:transparent;cursor:default;';
      mouseShield.addEventListener('mousemove', showFsButtonOnMouseMove, { passive: true });
      mouseShield.addEventListener('mousedown', showFsButtonOnMouseMove, { passive: true });
      mouseShield.addEventListener('dblclick', () => window.toggleFullScreen());
      displayRoot.appendChild(mouseShield);

      const banner = document.createElement('div');
      banner.id = 'extNowPlayingBanner';
      banner.style.bottom = '24px';
      banner.className = 'fixed left-8 z-50 bg-black/90 border-l-4 border-cyan-400 rounded-r-xl px-5 py-3 max-w-xl pointer-events-none transition-opacity duration-300 opacity-0';
      banner.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500"></span>
          <span class="text-[10px] font-display font-bold tracking-widest text-cyan-400">SONANDO AHORA</span>
        </div>
        <div id="extBannerCurrent" class="font-display font-black text-base sm:text-lg text-white truncate mt-0.5">MOOD Lounge</div>
        <div class="text-xs font-mono text-neutral-300 truncate mt-1 border-t border-white/10 pt-1">
          <span class="text-pink-400 font-bold">SIGUIENTE:</span> <span id="extBannerNext">Cola Automix</span>
        </div>
      `;
      displayRoot.appendChild(banner);

      const ticker = document.createElement('div');
      ticker.id = 'extTickerContainer';
      ticker.className = 'hidden fixed bottom-0 inset-x-0 z-40 overflow-hidden pointer-events-none';
      ticker.innerHTML = `<div id="extTickerContent" class="mood-ticker-text font-display font-black text-amber-300 tracking-wider uppercase"></div>`;
      displayRoot.appendChild(ticker);
    }

    const fsBtn = document.getElementById('fsBtn');
    if (fsBtn) {
      fsBtn.addEventListener('mouseenter', () => {
        isHoveringFsBtn = true;
        if (fsMouseTimer) clearTimeout(fsMouseTimer);
        fsBtn.classList.add('fs-visible');
      });
      fsBtn.addEventListener('mouseleave', () => {
        isHoveringFsBtn = false;
        lastMouseWakeTime = 0;
        showFsButtonOnMouseMove();
      });
    }

    const tickerTxt = document.getElementById('extTickerContent');
    if (tickerTxt) tickerTxt.textContent = window.tickerMessage;
    applyTickerSizeStyles(window.tickerSizePercent);
    applyScreenBackgroundStyles();
    updateFsButtonText();
    lastMouseWakeTime = 0;
    showFsButtonOnMouseMove();

    applyDisplayModeLayout(displayVisualMode);
  }

  let bannerTimeout = null;
  function triggerExternalBanner(nowPlaying, upNext) {
    const banner = document.getElementById('extNowPlayingBanner');
    if (!banner) return;
    if (!window.proModules.tvBanner) {
      banner.classList.add('opacity-0');
      return;
    }
    document.getElementById('extBannerCurrent').textContent = nowPlaying || 'MOOD Lounge';
    document.getElementById('extBannerNext').textContent = upNext || 'Cola Automix';
    banner.classList.remove('opacity-0');
    if (bannerTimeout) clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      banner.classList.add('opacity-0');
    }, 9000);
  }

  const origLoadDirectly = window.loadDirectly;
  if (typeof origLoadDirectly === 'function') {
    window.loadDirectly = function (deck, videoId, title) {
      document.getElementById(`deck${deck}-title`).textContent = title;
      if (deck === 'A') currentVideoIdA = videoId;
      if (deck === 'B') currentVideoIdB = videoId;

      const player = deck === 'A' ? playerA : playerB;
      if (player) {
        if (deck === activeDeck) {
          if (player.loadVideoById) {
            player.loadVideoById({ videoId: videoId, suggestedQuality: 'small' });
          }
          syncExternalScreen('changeVideo', { videoId });
        } else {
          if (player.cueVideoById) {
            player.cueVideoById({ videoId: videoId, suggestedQuality: 'small' });
          } else if (player.loadVideoById) {
            player.loadVideoById({ videoId: videoId, suggestedQuality: 'small' });
            setTimeout(() => { if (player.pauseVideo) player.pauseVideo(); }, 150);
          }
        }
      }

      applyMasterCrossfade(parseFloat(document.getElementById('crossfader').value));
      addToHistory(videoId, title, deck);
      if (deck === activeDeck) {
        consoleIsPlaying = true;
        broadcastProConfig({
          isPlaying: true,
          showBannerNow: true,
          nowPlaying: title,
          upNext: playlistQueue.length > 0 ? playlistQueue[0].title : 'Cola Automix'
        });
      }
    };
  }

  // 15. COLA CON BOTÓN SUBIR AL 1º LUGAR (PLAY NEXT)
  function decodeHtmlEntities(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str || '';
    return txt.value;
  }

  window.moveQueueItemToTop = function (idx) {
    if (idx <= 0 || idx >= playlistQueue.length) return;
    const track = playlistQueue.splice(idx, 1)[0];
    playlistQueue.unshift(track);
    saveQueueToCache();
    renderQueue();
    showToast(`Subida al #1: ${decodeHtmlEntities(track.title)}`);
  };

  const origRenderQueue = window.renderQueue;
  window.renderQueue = function () {
    if (typeof origRenderQueue === 'function') {
      origRenderQueue();
    }
    if (!window.proModules.queueManager) return;
    const container = document.getElementById('queueContainer');
    if (!container || playlistQueue.length <= 1) return;

    const rows = container.children;
    for (let idx = 1; idx < rows.length; idx++) {
      const btnGroup = rows[idx].querySelector('div:last-child');
      if (btnGroup && !btnGroup.querySelector('.btn-play-next')) {
        const btnTop = document.createElement('button');
        btnTop.type = 'button';
        btnTop.className = 'btn-play-next px-1.5 py-0.5 bg-neutral-900 hover:bg-amber-950 text-[8px] font-mono text-amber-400 rounded border border-white/5';
        btnTop.title = 'Subir al 1º lugar (Play Next)';
        btnTop.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        btnTop.onclick = () => window.moveQueueItemToTop(idx);
        btnGroup.insertBefore(btnTop, btnGroup.firstChild);
      }
    }
  };

  // 16. HISTORIAL Y SESIONES GUARDADAS
  function addToHistory(videoId, title, deck) {
    if (!title || title === 'Track Listo') return;
    window.playHistory.unshift({
      videoId,
      title: decodeHtmlEntities(title),
      deck,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (window.playHistory.length > 40) window.playHistory.pop();
    localStorage.setItem('moodj_pro_history', JSON.stringify(window.playHistory));
    renderHistoryList();
  }

  window.saveCurrentSession = function () {
    const nameInput = document.getElementById('sessionNameInput');
    const name = (nameInput ? nameInput.value.trim() : '') || `Sesión ${Object.keys(window.savedSessions).length + 1}`;
    if (playlistQueue.length === 0) {
      showToast('La cola está vacía, añade canciones antes de guardar', true);
      return;
    }
    window.savedSessions[name] = [...playlistQueue];
    localStorage.setItem('moodj_pro_sessions', JSON.stringify(window.savedSessions));
    if (nameInput) nameInput.value = '';
    renderSessionsList();
    showToast(`Sesión "${name}" guardada (${playlistQueue.length} pistas)`);
  };

  window.loadSavedSession = function (name) {
    if (!window.savedSessions[name]) return;
    playlistQueue = [...window.savedSessions[name]];
    saveQueueToCache();
    renderQueue();
    showToast(`Sesión "${name}" cargada en la cola`);
  };

  window.deleteSavedSession = function (name) {
    delete window.savedSessions[name];
    localStorage.setItem('moodj_pro_sessions', JSON.stringify(window.savedSessions));
    renderSessionsList();
  };

  window.setDeckPlaybackRate = function (deck, rate) {
    const player = deck === 'A' ? playerA : playerB;
    if (player && typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(parseFloat(rate));
      showToast(`Deck ${deck} Tempo: ${rate}x`);
    }
  };

  // 17. ATAJOS DE TECLADO (CONSOLA Y PANTALLA EXTERNA)
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    if (isDisplayMode) {
      if (e.code === 'KeyF') {
        e.preventDefault();
        window.toggleFullScreen();
      }
      return;
    }

    if (!window.proModules.hotkeys) return;

    if (e.code === 'Space') {
      e.preventDefault();
      const p = activeDeck === 'A' ? playerA : playerB;
      if (p && p.getPlayerState) {
        p.getPlayerState() === 1 ? pauseDeck(activeDeck) : playDeck(activeDeck);
      }
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      triggerManualTransition();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      const cf = document.getElementById('crossfader');
      setFaderPosition(Math.max(0, parseFloat(cf.value) - 8));
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      const cf = document.getElementById('crossfader');
      setFaderPosition(Math.min(100, parseFloat(cf.value) + 8));
    } else if (e.code === 'KeyA') {
      e.preventDefault();
      setFaderPosition(0);
    } else if (e.code === 'KeyB') {
      e.preventDefault();
      setFaderPosition(100);
    } else if (e.code === 'KeyC') {
      e.preventDefault();
      setFaderPosition(50);
    } else if (e.code === 'KeyT') {
      e.preventDefault();
      window.proModules.tvTicker ? hideTickerFromTv() : sendTickerToTv();
    }
  });

  // 18. CONSTRUCCIÓN DE LA INTERFAZ DE MÓDULOS + OVERLAY DE AHORRO EN DECKS
  function injectProConsoleUI() {
    if (isDisplayMode) return;

    // A) Controles de Pitch/Tempo y aviso de Ahorro de GPU cuando SALIDA VIDEO está abierta
    ['A', 'B'].forEach((deck) => {
      const container = document.getElementById(`deck${deck}-container`);
      const viewport = container ? container.querySelector('.video-viewport') : null;

      if (viewport && !document.getElementById(`deck${deck}-ecoOverlay`)) {
        const ecoDiv = document.createElement('div');
        ecoDiv.id = `deck${deck}-ecoOverlay`;
        ecoDiv.className = 'hidden absolute inset-0 z-20 bg-neutral-950 flex flex-col items-center justify-center text-center p-3 gap-1.5';
        ecoDiv.innerHTML = `
          <i class="fa-solid fa-tv text-cyan-400 text-lg"></i>
          <div class="text-[10px] font-display font-bold text-neutral-200 tracking-wider">VIDEO EN PANTALLA EXTERNA</div>
          <div class="text-[9px] font-mono text-neutral-400">Vista previa en pausa para máximo rendimiento sin cortes</div>
          <button type="button" onclick="toggleConsolePreviewOverride()" class="mt-1 px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[9px] font-mono text-cyan-300 border border-cyan-500/30">
            Mostrar vista previa aquí
          </button>
        `;
        viewport.appendChild(ecoDiv);
      }

      if (container && !document.getElementById(`deck${deck}-pitchBar`)) {
        const pitchDiv = document.createElement('div');
        pitchDiv.id = `deck${deck}-pitchBar`;
        pitchDiv.className = 'flex items-center justify-between text-[9px] font-mono bg-black/40 px-2 py-1 rounded border border-white/5';
        pitchDiv.innerHTML = `
          <span class="text-neutral-400"><i class="fa-solid fa-gauge-simple-high mr-1"></i>TEMPO / PITCH:</span>
          <div class="flex gap-1">
            ${[0.75, 1, 1.25, 1.5].map(r => `
              <button type="button" onclick="setDeckPlaybackRate('${deck}', ${r})" class="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-700 text-neutral-300 border border-white/10">${r}x</button>
            `).join('')}
          </div>
        `;
        container.appendChild(pitchDiv);
      }
    });

    // B) Agregar botones Centro Superior e Inferior al Modal de Configuración de Logo
    const logoModalGrid = document.querySelector('#logoSettingsModal .grid.grid-cols-2');
    if (logoModalGrid && !document.getElementById('btnLogoTopCenter')) {
      const btnTopCenter = document.createElement('button');
      btnTopCenter.id = 'btnLogoTopCenter';
      btnTopCenter.type = 'button';
      btnTopCenter.onclick = () => window.setLogoCorner('top-center');
      btnTopCenter.className = 'p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono text-neutral-200 border border-white/5';
      btnTopCenter.textContent = '⬆ Centro Superior';

      const btnBtmCenter = document.createElement('button');
      btnBtmCenter.id = 'btnLogoBtmCenter';
      btnBtmCenter.type = 'button';
      btnBtmCenter.onclick = () => window.setLogoCorner('bottom-center');
      btnBtmCenter.className = 'p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-[10px] font-mono text-neutral-200 border border-white/5';
      btnBtmCenter.textContent = '⬇ Centro Inferior';

      logoModalGrid.appendChild(btnTopCenter);
      logoModalGrid.appendChild(btnBtmCenter);
    }

    // C) Barra de Módulos + Fondo y Color de Pantalla + Panel MENSAJE TV con Slider (10% a 100%) + Sesiones
    const mainRoot = document.getElementById('main-dj-root');
    const mainWorkstation = mainRoot ? mainRoot.querySelector('main') : null;
    if (!mainRoot || !mainWorkstation) return;

    const bgPresets = [
      { name: 'Negro Puro', hex: '#000000' },
      { name: 'Azul Noche', hex: '#07142b' },
      { name: 'Violeta Club', hex: '#18072c' },
      { name: 'Rojo Carmesí', hex: '#2a060d' },
      { name: 'Esmeralda', hex: '#04221b' },
      { name: 'Dorado Dark', hex: '#241905' },
      { name: 'Gris Grafito', hex: '#181b24' }
    ];

    const proBar = document.createElement('div');
    proBar.id = 'moodj-pro-modules-bar';
    proBar.className = 'w-full max-w-[1680px] mx-auto mb-2.5 flex flex-col gap-2';
    proBar.innerHTML = `
      <!-- INTERRUPTORES DE MÓDULOS (ON/OFF) -->
      <div class="dj-panel rounded-xl p-2 px-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs font-display font-bold text-cyan-400">
          <i class="fa-solid fa-bolt"></i>
          <span>MÓDULOS PRO Y RENDIMIENTO:</span>
        </div>
        <div id="proModuleTogglesContainer" class="flex flex-wrap items-center gap-1.5"></div>
      </div>

      <!-- PANEL DE FONDO Y COLOR DE LA PANTALLA -->
      <div id="proBackgroundPanel" class="dj-panel rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[10px] font-display font-bold text-pink-400 whitespace-nowrap">
            <i class="fa-solid fa-palette mr-1"></i>FONDO Y COLOR DE PANTALLA:
          </span>
          <div class="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-lg border border-white/10">
            <label for="screenBgColorPicker" class="text-[10px] font-mono text-neutral-300 cursor-pointer">Color:</label>
            <input id="screenBgColorPicker" type="color" value="${window.bgConfig.color || '#000000'}"
                   oninput="setScreenBgColor(this.value)"
                   class="w-6 h-5 rounded cursor-pointer bg-transparent border-0">
            <div class="flex items-center gap-1 ml-1">
              ${bgPresets.map(p => `
                <button type="button" onclick="setScreenBgColor('${p.hex}')" title="${p.name}"
                        style="background-color:${p.hex}"
                        class="w-4 h-4 rounded-full border border-white/30 hover:scale-110 transition"></button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input type="file" id="screenBgImageInput" accept="image/*" class="hidden" onchange="handleScreenBgImageUpload(event)">
          <button type="button" onclick="document.getElementById('screenBgImageInput').click()"
                  class="px-2.5 py-1 rounded bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white border border-pink-500/40 font-display font-bold text-[10px] transition flex items-center gap-1">
            <i class="fa-solid fa-image"></i> SUBIR IMAGEN FONDO
          </button>
          <button type="button" onclick="clearScreenBgImage()"
                  class="px-2.5 py-1 rounded bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-300 border border-white/10 font-mono text-[10px] transition">
            QUITAR IMAGEN
          </button>
          <div class="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-lg border border-white/10" title="Opacidad de la imagen de fondo">
            <span class="text-[9px] font-mono text-neutral-400">OPACIDAD FONDO:</span>
            <input id="screenBgOpacitySlider" type="range" min="10" max="100" step="5" value="${window.bgConfig.imageOpacity || 60}"
                   oninput="updateScreenBgOpacity(this.value)" class="w-16 accent-pink-500 cursor-pointer">
            <span id="screenBgOpacityDisplay" class="text-[10px] font-mono text-pink-400 font-bold w-8 text-right">${window.bgConfig.imageOpacity || 60}%</span>
          </div>
          <button id="btnBgApplyConsole" type="button" onclick="toggleBgApplyToConsole()"
                  class="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-[10px] transition">
            ${window.bgConfig.applyToConsole ? 'APLICAR EN: TV + CONSOLA' : 'APLICAR EN: SOLO TV'}
          </button>
        </div>
      </div>

      <!-- PANEL MENSAJE TV CON SLIDER DE TAMAÑO EN PORCENTAJE (10% A 100%) -->
      <div id="proPromoPanel" class="dj-panel rounded-xl p-2.5 flex flex-wrap items-center gap-2.5">
        <span class="text-[10px] font-display font-bold text-amber-400 whitespace-nowrap">
          <i class="fa-solid fa-bullhorn mr-1"></i>MENSAJE TV <span id="tvTickerLabelPct">(${window.tickerSizePercent}% PANTALLA)</span>:
        </span>
        <input id="tvTickerInput" type="text" class="flex-1 min-w-[200px] bg-neutral-950 border border-neutral-800 rounded px-3 py-1.5 text-xs text-neutral-100 font-mono outline-none focus:border-amber-400" placeholder="Escribe anuncio o promo para la pantalla externa...">

        <div class="flex items-center gap-2 bg-neutral-950/90 px-3 py-1.5 rounded-lg border border-amber-500/30" title="Ajusta el tamaño que ocupa la barra de Mensaje TV en la pantalla (10% a 100%)">
          <span class="text-[10px] font-mono text-amber-300 font-bold whitespace-nowrap">TAMAÑO:</span>
          <input id="tvTickerSizeSlider" type="range" min="10" max="100" step="1" value="${window.tickerSizePercent}"
                 oninput="updateTickerSize(this.value)"
                 class="w-24 sm:w-28 accent-amber-400 cursor-pointer">
          <span id="tvTickerSizeDisplay" class="text-xs font-mono font-black text-amber-400 w-10 text-right">${window.tickerSizePercent}%</span>
        </div>

        <button type="button" onclick="sendTickerToTv()" class="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-display font-bold text-[10px] transition">MOSTRAR MENSAJE EN TV</button>
        <button type="button" onclick="hideTickerFromTv()" class="px-3 py-1.5 rounded bg-neutral-800 hover:bg-red-900/70 text-neutral-300 hover:text-red-200 border border-white/10 font-display font-bold text-[10px] transition">OCULTAR MENSAJE</button>
        <button type="button" onclick="triggerBannerNow()" class="px-3 py-1.5 rounded bg-cyan-950 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/30 font-display font-bold text-[10px] transition" title="Mostrar tarjeta de canción actual en TV">MOSTRAR CANCIÓN EN TV</button>
      </div>

      <!-- PANEL DE SESIONES GUARDADAS E HISTORIAL -->
      <div id="proSessionsPanel" class="dj-panel rounded-xl p-2.5 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        <div class="lg:col-span-6 flex flex-col gap-1.5 border-b lg:border-b-0 lg:border-r border-white/10 pb-2 lg:pb-0 lg:pr-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-display font-bold text-emerald-400"><i class="fa-solid fa-folder-plus mr-1"></i>GUARDAR / CARGAR SESIONES DE COLA</span>
            <div class="flex gap-1">
              <input id="sessionNameInput" type="text" placeholder="Nombre (ej. Hora Pico)" class="bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-[10px] text-white font-mono outline-none">
              <button type="button" onclick="saveCurrentSession()" class="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] rounded font-mono">Guardar Cola</button>
            </div>
          </div>
          <div id="savedSessionsContainer" class="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto"></div>
        </div>

        <div class="lg:col-span-6 flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-display font-bold text-indigo-400"><i class="fa-solid fa-clock-rotate-left mr-1"></i>HISTORIAL RECIENTE EN VIVO</span>
            <button type="button" onclick="window.playHistory=[];localStorage.removeItem('moodj_pro_history');renderHistoryList();" class="text-[9px] font-mono text-neutral-500 hover:text-red-400">Limpiar historial</button>
          </div>
          <div id="playHistoryContainer" class="flex gap-1.5 overflow-x-auto py-0.5 text-[10px] font-mono"></div>
        </div>
      </div>
    `;

    mainRoot.insertBefore(proBar, mainWorkstation);
    const tickerInput = document.getElementById('tvTickerInput');
    if (tickerInput) tickerInput.value = window.tickerMessage;

    applyLowSpecModeClasses();
    applyScreenBackgroundStyles();
    updateModulesUI();
    renderSessionsList();
    renderHistoryList();
  }

  window.sendTickerToTv = function () {
    const val = document.getElementById('tvTickerInput')?.value.trim();
    if (val) {
      window.tickerMessage = val;
      localStorage.setItem('moodj_pro_ticker_msg', val);
    }
    window.proModules.tvTicker = true;
    saveModulesState();
    showToast(`Mensaje TV (${window.tickerSizePercent}%) activado en pantalla externa`);
  };

  window.hideTickerFromTv = function () {
    window.proModules.tvTicker = false;
    saveModulesState();
    showToast('Mensaje TV ocultado');
  };

  window.triggerBannerNow = function () {
    window.proModules.tvBanner = true;
    localStorage.setItem(MODULES_KEY, JSON.stringify(window.proModules));
    updateModulesUI();
    broadcastProConfig({ showBannerNow: true });
    showToast('Mostrando banner "Sonando Ahora" en TV');
  };

  window.renderSessionsList = function () {
    const el = document.getElementById('savedSessionsContainer');
    if (!el) return;
    const names = Object.keys(window.savedSessions);
    if (names.length === 0) {
      el.innerHTML = '<span class="text-[10px] font-mono text-neutral-500">Sin sesiones guardadas todavía.</span>';
      return;
    }
    el.innerHTML = '';
    names.forEach((name) => {
      const count = window.savedSessions[name].length;
      const badge = document.createElement('div');
      badge.className = 'flex items-center gap-1 bg-neutral-900 border border-white/10 rounded px-2 py-0.5 text-[10px] font-mono';
      const btnLoad = document.createElement('button');
      btnLoad.type = 'button';
      btnLoad.className = 'text-emerald-400 hover:underline font-bold';
      btnLoad.textContent = `${name} (${count})`;
      btnLoad.onclick = () => loadSavedSession(name);
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'text-neutral-500 hover:text-red-400 ml-1';
      btnDel.innerHTML = '×';
      btnDel.onclick = () => deleteSavedSession(name);
      badge.append(btnLoad, btnDel);
      el.appendChild(badge);
    });
  };

  window.renderHistoryList = function () {
    const el = document.getElementById('playHistoryContainer');
    if (!el) return;
    if (window.playHistory.length === 0) {
      el.innerHTML = '<span class="text-[10px] font-mono text-neutral-500">Aún no se han reproducido pistas en esta sesión.</span>';
      return;
    }
    el.innerHTML = '';
    window.playHistory.slice(0, 12).forEach((h) => {
      const item = document.createElement('span');
      item.className = 'px-2 py-0.5 rounded bg-neutral-950 border border-white/5 text-neutral-300 whitespace-nowrap flex items-center gap-1';
      item.innerHTML = `<span class="text-cyan-400">[${h.time}]</span> `;
      const t = document.createElement('span');
      t.className = 'truncate max-w-[140px]';
      t.textContent = h.title;
      item.appendChild(t);
      el.appendChild(item);
    });
  };

  function updateModulesUI() {
    const container = document.getElementById('proModuleTogglesContainer');
    if (container) {
      container.innerHTML = '';
      Object.keys(defaultModules).forEach((key) => {
        const isOn = !!window.proModules[key];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition flex items-center gap-1.5 ${isOn ? 'mod-pill-on' : 'mod-pill-off'}`;
        btn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${isOn ? 'bg-cyan-400' : 'bg-neutral-600'}"></span>${getModuleLabel(key)}: ${isOn ? 'ON' : 'OFF'}`;
        btn.onclick = () => toggleProModule(key);
        container.appendChild(btn);
      });
    }

    ['A', 'B'].forEach((d) => {
      const pb = document.getElementById(`deck${d}-pitchBar`);
      if (pb) pb.classList.toggle('hidden', !window.proModules.pitchControl);
    });

    const sessPanel = document.getElementById('proSessionsPanel');
    if (sessPanel) sessPanel.classList.toggle('hidden', !window.proModules.queueManager);
  }

  // 19. ARRANQUE AUTOMÁTICO AL CARGAR EL DOM
  document.addEventListener('DOMContentLoaded', () => {
    injectRedMFavicon();
    injectProStyles();
    hidePrecargaWidget();
    ensureApiKeyLoaded();
    applyLowSpecModeClasses();
    applyScreenBackgroundStyles();
    if (isDisplayMode) {
      injectExternalOverlaysDOM();
      setupDisplayReceiver();
      startContinuousFrameLockSync();
      syncExternalScreen('requestSync', {});
    } else {
      setupDisplayReceiver();
      injectProConsoleUI();
      applyLogoStyles();
      renderQueue();
    }
  });
})();
