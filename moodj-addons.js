// ============================================================================
// MOOD Lounge PRO - Correcciones + Módulos Avanzados + Auto API Key
// ============================================================================

(function () {
  // 1. API KEY PRECONFIGURADA (Desde Apikey.txt)
  const BUILTIN_API_KEY = 'AIzaSyCyNih7_WzLSkBPTDt2QJrfMpdBhc-AMKc';

  // 2. LOGO SVG POR DEFECTO (Reemplaza via.placeholder.com roto)
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
  if (typeof DEFAULT_LOGO !== 'undefined') {
    window.DEFAULT_LOGO = SVG_DEFAULT_LOGO;
  }
  if (typeof logoData !== 'undefined' && (!logoData.src || logoData.src.includes('via.placeholder.com'))) {
    logoData.src = SVG_DEFAULT_LOGO;
  }

  // 3. ESTADO DE MÓDULOS (Todos ACTIVOS por defecto, configurables con botones ON/OFF)
  const MODULES_KEY = 'moodj_pro_modules_state';
  const defaultModules = {
    tvDualFade: true,      // Crossfade visual de video en pantalla externa
    tvBanner: true,        // Banner "Sonando Ahora / A continuación" en TV
    tvTicker: false,       // Marquesina de texto promocional en TV
    autoSkipError: true,   // Saltar videos con error de inserción automáticamente
    hotkeys: true,         // Atajos de teclado DJ
    fxAndPitch: true,      // Panel Sampler FX + Control de Tempo/Pitch
    queueManager: true     // Drag & Drop, Play Next, Historial y Sesiones Guardadas
  };

  window.proModules = Object.assign({}, defaultModules, JSON.parse(localStorage.getItem(MODULES_KEY) || '{}'));
  window.playHistory = JSON.parse(localStorage.getItem('moodj_pro_history') || '[]');
  window.savedSessions = JSON.parse(localStorage.getItem('moodj_pro_sessions') || '{}');
  window.tickerMessage = localStorage.getItem('moodj_pro_ticker_msg') || 'BIENVENIDOS A MOOD LOUNGE — DISFRUTA LA MEJOR MÚSICA Y MIXES EN VIVO';
  window.extPlayerB = null;

  function saveModulesState() {
    localStorage.setItem(MODULES_KEY, JSON.stringify(window.proModules));
    updateModulesUI();
    syncExternalScreen('proConfig', {
      modules: window.proModules,
      tickerMessage: window.tickerMessage,
      nowPlaying: getActiveDeckTitle(),
      upNext: playlistQueue.length > 0 ? playlistQueue[0].title : 'Modo Automix'
    });
  }

  window.toggleProModule = function (modKey) {
    window.proModules[modKey] = !window.proModules[modKey];
    saveModulesState();
    showToast(`${getModuleLabel(modKey)}: ${window.proModules[modKey] ? 'ACTIVADO' : 'DESACTIVADO'}`);
  };

  function getModuleLabel(key) {
    const labels = {
      tvDualFade: 'Crossfade Video TV',
      tvBanner: 'Banner Now Playing TV',
      tvTicker: 'Ticker Promo TV',
      autoSkipError: 'Auto-Skip Errores',
      hotkeys: 'Atajos de Teclado',
      fxAndPitch: 'Sampler FX & Pitch',
      queueManager: 'Sesiones & Historial'
    };
    return labels[key] || key;
  }

  function getActiveDeckTitle() {
    const el = document.getElementById(`deck${activeDeck}-title`);
    return el ? el.textContent : 'MOOD Lounge';
  }

  // 4. NOTIFICACIONES TOAST NO INTRUSIVAS
  window.showToast = function (msg, isError = false) {
    let container = document.getElementById('moodj-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'moodj-toast-container';
      container.className = 'fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `px-3.5 py-2 rounded-lg text-xs font-mono font-bold shadow-xl border backdrop-blur-md transition-all duration-300 ${
      isError ? 'bg-red-950/90 text-red-300 border-red-500/50' : 'bg-neutral-900/95 text-cyan-300 border-cyan-500/40'
    }`;
    toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation text-red-400' : 'fa-circle-check text-cyan-400'} mr-1.5"></i>${msg}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  };

  // 5. CARGA AUTOMÁTICA DE API KEY (Sin pedirla cada vez)
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

  // 6. INYECCIÓN DE ESTILOS CSS CORREGIDOS
  function injectProStyles() {
    const style = document.createElement('style');
    style.textContent = `
      input[type=range].vertical-vol {
        writing-mode: vertical-lr !important;
        direction: rtl !important;
        -webkit-appearance: auto !important;
        appearance: auto !important;
      }
      @keyframes moodMarquee {
        0% { transform: translateX(100vw); }
        100% { transform: translateX(-100%); }
      }
      .mood-ticker-text {
        display: inline-block;
        white-space: nowrap;
        animation: moodMarquee 20s linear infinite;
      }
      .ext-video-fade {
        transition: opacity 0.25s linear;
      }
      .mod-pill-on {
        background: rgba(6, 182, 212, 0.18);
        color: #22d3ee;
        border-color: rgba(6, 182, 212, 0.5);
        box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
      }
      .mod-pill-off {
        background: #14161f;
        color: #6b7280;
        border-color: rgba(255,255,255,0.07);
      }
    `;
    document.head.appendChild(style);
  }

  // 7. MEJORAS EN SALIDA EXTERNA (TV): Dual Video Crossfade + Lower Third Banner + Ticker
  function upgradeExternalDisplayDOM() {
    const extVideoLayer = document.getElementById('extVideoLayer');
    if (extVideoLayer && !document.getElementById('extPlayerB')) {
      extVideoLayer.innerHTML = `
        <div id="extWrapA" class="ext-video-fade absolute inset-0 w-full h-full" style="opacity:1;">
          <div id="extPlayer" class="w-full h-full"></div>
        </div>
        <div id="extWrapB" class="ext-video-fade absolute inset-0 w-full h-full" style="opacity:0;">
          <div id="extPlayerB" class="w-full h-full"></div>
        </div>
      `;
    }

    const displayRoot = document.getElementById('display-mode-root');
    if (displayRoot && !document.getElementById('extNowPlayingBanner')) {
      const banner = document.createElement('div');
      banner.id = 'extNowPlayingBanner';
      banner.className = 'fixed bottom-12 left-8 z-40 bg-black/85 backdrop-blur-md border-l-4 border-cyan-400 rounded-r-xl px-5 py-3 shadow-2xl max-w-xl pointer-events-none transition-all duration-500 opacity-0 -translate-x-8';
      banner.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
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
      ticker.className = 'hidden fixed bottom-0 inset-x-0 z-40 bg-gradient-to-r from-red-950/95 via-black/95 to-red-950/95 border-t border-red-500/40 py-1.5 overflow-hidden pointer-events-none';
      ticker.innerHTML = `<div id="extTickerContent" class="mood-ticker-text font-display font-bold text-sm text-amber-300 tracking-wider uppercase"></div>`;
      displayRoot.appendChild(ticker);
    }
  }

  let bannerTimeout = null;
  function triggerExternalBanner(nowPlaying, upNext) {
    const banner = document.getElementById('extNowPlayingBanner');
    if (!banner) return;
    if (!window.proModules.tvBanner) {
      banner.classList.add('opacity-0', '-translate-x-8');
      return;
    }
    document.getElementById('extBannerCurrent').textContent = nowPlaying || 'MOOD Lounge';
    document.getElementById('extBannerNext').textContent = upNext || 'Cola Automix';
    banner.classList.remove('opacity-0', '-translate-x-8');
    if (bannerTimeout) clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      banner.classList.add('opacity-0', '-translate-x-8');
    }, 9000);
  }

  // 8. REESCRITURA DE FUNCIONES CON BUGS CORREGIDOS
  window.toggleFullScreen = function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  document.addEventListener('fullscreenchange', () => {
    const fsBtn = document.getElementById('fsBtn');
    if (fsBtn) {
      fsBtn.style.display = document.fullscreenElement ? 'none' : 'block';
    }
  });

  // Compresión de Logo para evitar QuotaExceededError en localStorage
  window.handleLogoUpload = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        const maxW = 600;
        const scale = img.width > maxW ? maxW / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        logoData.src = canvas.toDataURL('image/png', 0.9);
        try {
          localStorage.setItem('moodj_logo_src', logoData.src);
        } catch (err) {
          showToast('Logo aplicado en sesión (imagen grande)', false);
        }
        applyLogoStyles();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
    closeAllDropdowns();
  };

  // Inicialización YouTube IFrame con soporte de errores (Auto-Skip) y Dual Display
  window.onYouTubeIframeAPIReady = function () {
    if (isDisplayMode) {
      upgradeExternalDisplayDOM();
      const vidA = urlParams.get('vidA') || urlParams.get('vid') || currentVideoIdA;
      const vidB = urlParams.get('vidB') || currentVideoIdB;

      extPlayer = new YT.Player('extPlayer', {
        height: '100%',
        width: '100%',
        videoId: vidA,
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, playsinline: 1, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            extPlayer.mute();
            extPlayer.playVideo();
          }
        }
      });

      window.extPlayerB = new YT.Player('extPlayerB', {
        height: '100%',
        width: '100%',
        videoId: vidB,
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, playsinline: 1, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            window.extPlayerB.mute();
            window.extPlayerB.pauseVideo();
          }
        }
      });
    } else {
      playerA = new YT.Player('playerA', {
        height: '100%',
        width: '100%',
        videoId: currentVideoIdA,
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, playsinline: 1, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            applyMasterCrossfade(parseFloat(document.getElementById('crossfader').value));
            startPlaybackTracker();
          },
          onStateChange: (e) => handlePlayerState('A', e),
          onError: (e) => handlePlayerError('A', e)
        }
      });

      playerB = new YT.Player('playerB', {
        height: '100%',
        width: '100%',
        videoId: currentVideoIdB,
        playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0, playsinline: 1, enablejsapi: 1, origin: window.location.origin },
        events: {
          onReady: () => {
            applyMasterCrossfade(parseFloat(document.getElementById('crossfader').value));
            if (playerB && playerB.pauseVideo) playerB.pauseVideo();
          },
          onStateChange: (e) => handlePlayerState('B', e),
          onError: (e) => handlePlayerError('B', e)
        }
      });
    }
  };

  function handlePlayerError(deck, event) {
    showToast(`Video en Deck ${deck} restringido por YouTube (Código ${event.data})`, true);
    if (!window.proModules.autoSkipError) return;

    if (playlistQueue.length > 0) {
      const nextTrack = playlistQueue.shift();
      saveQueueToCache();
      renderQueue();
      loadDirectly(deck, nextTrack.videoId, nextTrack.title);
      if (deck === activeDeck) {
        setTimeout(() => playDeck(deck), 400);
      }
      showToast(`Auto-Skip: Cargada "${nextTrack.title}" en Deck ${deck}`);
    } else if (deck === activeDeck && !isTransitioning) {
      const otherDeck = deck === 'A' ? 'B' : 'A';
      executeTransition(otherDeck, 2);
    }
  }

  // Receptor mejorado para la pantalla externa
  window.setupDisplayReceiver = function () {
    if (!displayBroadcast) return;
    displayBroadcast.onmessage = (e) => {
      const d = e.data;
      if (!d) return;

      if (d.action === 'changeVideo') {
        const target = d.deck || 'A';
        if (target === 'B' && window.extPlayerB && window.extPlayerB.loadVideoById) {
          window.extPlayerB.loadVideoById(d.videoId);
        } else if (extPlayer && extPlayer.loadVideoById) {
          extPlayer.loadVideoById(d.videoId);
        }
        if (d.title) triggerExternalBanner(d.title, d.upNext);
      } else if (d.action === 'crossfadeSync') {
        const wrapA = document.getElementById('extWrapA');
        const wrapB = document.getElementById('extWrapB');
        if (wrapA && wrapB) {
          if (window.proModules.tvDualFade) {
            const pct = d.faderVal / 100;
            wrapA.style.opacity = (1 - pct).toFixed(2);
            wrapB.style.opacity = pct.toFixed(2);
          } else {
            const showB = d.faderVal > 50;
            wrapA.style.opacity = showB ? '0' : '1';
            wrapB.style.opacity = showB ? '1' : '0';
          }
        }
      } else if (d.action === 'seek') {
        const p = d.deck === 'B' && window.extPlayerB ? window.extPlayerB : extPlayer;
        if (p && p.seekTo) p.seekTo(d.seconds, true);
      } else if (d.action === 'play') {
        const p = d.deck === 'B' && window.extPlayerB ? window.extPlayerB : extPlayer;
        if (p && p.playVideo) p.playVideo();
      } else if (d.action === 'pause') {
        const p = d.deck === 'B' && window.extPlayerB ? window.extPlayerB : extPlayer;
        if (p && p.pauseVideo) p.pauseVideo();
      } else if (d.action === 'switchMode') {
        applyDisplayModeLayout(d.mode);
      } else if (d.action === 'timeSync') {
        const syncOne = (playerObj, sec, st) => {
          if (!playerObj || typeof playerObj.getCurrentTime !== 'function') return;
          if (st === 1) {
            const cur = playerObj.getCurrentTime();
            if (Math.abs(cur - sec) > 0.75) playerObj.seekTo(sec, true);
            if (playerObj.getPlayerState() !== 1) playerObj.playVideo();
          } else if (st === 2 && playerObj.getPlayerState() === 1) {
            playerObj.pauseVideo();
          }
        };
        syncOne(extPlayer, d.secA, d.stateA);
        syncOne(window.extPlayerB, d.secB, d.stateB);
      } else if (d.action === 'updateLogo') {
        logoData = d.logo;
        applyLogoStyles();
      } else if (d.action === 'proConfig') {
        window.proModules = d.modules || window.proModules;
        window.tickerMessage = d.tickerMessage || window.tickerMessage;
        const tickerBar = document.getElementById('extTickerContainer');
        const tickerTxt = document.getElementById('extTickerContent');
        if (tickerBar && tickerTxt) {
          tickerTxt.textContent = window.tickerMessage;
          tickerBar.classList.toggle('hidden', !window.proModules.tvTicker);
        }
        if (d.showBannerNow) {
          triggerExternalBanner(d.nowPlaying, d.upNext);
        }
      }
    };
  };

  window.openExternalDisplay = function (modeType) {
    const url = `${window.location.origin}${window.location.pathname}?mode=display&type=${modeType}&vidA=${currentVideoIdA}&vidB=${currentVideoIdB}`;
    const left = window.screen.width ? window.screen.width : 1366;
    window.open(url, 'MOOD_Lounge_Display', `width=1280,height=720,left=${left},top=0,menubar=no,toolbar=no,location=no,status=no`);
    setTimeout(() => {
      syncExternalScreen('switchMode', { mode: modeType });
      syncExternalScreen('crossfadeSync', { faderVal: parseFloat(document.getElementById('crossfader').value) || 0 });
      saveModulesState();
    }, 900);
    closeAllDropdowns();
  };

  window.startContinuousFrameLockSync = function () {
    setInterval(() => {
      const secA = playerA && typeof playerA.getCurrentTime === 'function' ? playerA.getCurrentTime() : 0;
      const stateA = playerA && typeof playerA.getPlayerState === 'function' ? playerA.getPlayerState() : 2;
      const secB = playerB && typeof playerB.getCurrentTime === 'function' ? playerB.getCurrentTime() : 0;
      const stateB = playerB && typeof playerB.getPlayerState === 'function' ? playerB.getPlayerState() : 2;
      syncExternalScreen('timeSync', { secA, stateA, secB, stateB });
    }, 400);
  };

  // Crossfade manual actualiza activeDeck y sincroniza el video en TV
  const origApplyMasterCrossfade = window.applyMasterCrossfade;
  window.applyMasterCrossfade = function (v) {
    origApplyMasterCrossfade(v);
    if (!isTransitioning) {
      if (v <= 25 && activeDeck !== 'A') {
        activeDeck = 'A';
      } else if (v >= 75 && activeDeck !== 'B') {
        activeDeck = 'B';
      }
    }
    syncExternalScreen('crossfadeSync', { faderVal: v });
  };

  window.loadDirectly = function (deck, videoId, title) {
    document.getElementById(`deck${deck}-title`).textContent = title;
    if (deck === 'A') currentVideoIdA = videoId;
    if (deck === 'B') currentVideoIdB = videoId;

    const player = deck === 'A' ? playerA : playerB;
    if (player) {
      if (deck === activeDeck) {
        if (player.loadVideoById) player.loadVideoById(videoId);
      } else {
        if (player.cueVideoById) {
          player.cueVideoById(videoId);
        } else if (player.loadVideoById) {
          player.loadVideoById(videoId);
          setTimeout(() => { if (player.pauseVideo) player.pauseVideo(); }, 150);
        }
      }
    }

    syncExternalScreen('changeVideo', {
      deck,
      videoId,
      title: deck === activeDeck ? title : null,
      upNext: playlistQueue.length > 0 ? playlistQueue[0].title : 'Cola Automix'
    });

    addToHistory(videoId, title, deck);
    applyMasterCrossfade(parseFloat(document.getElementById('crossfader').value));
  };

  // Transición corregida: sincroniza ambos reproductores externos y lanza el banner TV
  window.executeTransition = function (targetDeck, durationSecs) {
    isTransitioning = true;
    const nextPlayer = targetDeck === 'A' ? playerA : playerB;
    const prevDeck = targetDeck === 'A' ? 'B' : 'A';
    const prevPlayer = prevDeck === 'A' ? playerA : playerB;
    const nextVideoId = targetDeck === 'A' ? currentVideoIdA : currentVideoIdB;
    const nextTitle = document.getElementById(`deck${targetDeck}-title`)?.textContent || 'Track';

    if (nextPlayer && nextPlayer.unMute) {
      nextPlayer.unMute();
      nextPlayer.playVideo();
    }

    syncExternalScreen('changeVideo', {
      deck: targetDeck,
      videoId: nextVideoId,
      title: nextTitle,
      upNext: playlistQueue.length > 0 ? playlistQueue[0].title : 'Modo Automix'
    });
    syncExternalScreen('play', { deck: targetDeck });

    const steps = 40;
    const stepTime = (durationSecs * 1000) / steps;
    let currentStep = 0;
    const crossfader = document.getElementById('crossfader');

    const startVal = parseFloat(crossfader.value);
    const endVal = targetDeck === 'B' ? 100 : 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      const faderVal = startVal + (endVal - startVal) * progress;
      crossfader.value = faderVal;
      applyMasterCrossfade(faderVal);

      if (currentStep >= steps) {
        clearInterval(fadeInterval);

        if (prevPlayer && prevPlayer.pauseVideo) prevPlayer.pauseVideo();
        syncExternalScreen('pause', { deck: prevDeck });
        activeDeck = targetDeck;
        isTransitioning = false;

        if (playlistQueue.length > 0) {
          const nextTrack = playlistQueue.shift();
          saveQueueToCache();
          loadDirectly(prevDeck, nextTrack.videoId, nextTrack.title);
          renderQueue();
        }
      }
    }, stepTime);
  };

  // 9. BÚSQUEDA Y COLA CON ESCAPADO SEGURO + DRAG & DROP + PLAY NEXT
  function decodeHtmlEntities(str) {
    const txt = document.createElement('textarea');
    txt.innerHTML = str || '';
    return txt.value;
  }

  window.searchYouTube = async function (e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    const apiKey = document.getElementById('apiKeyInput').value.trim() || await ensureApiKeyLoaded();
    const resultsContainer = document.getElementById('searchResults');
    const status = document.getElementById('searchStatus');

    if (!query) return;

    status.textContent = 'Buscando...';
    resultsContainer.innerHTML = '<div class="py-6 text-center text-xs text-neutral-400 font-mono"><i class="fa-solid fa-spinner animate-spin text-cyan-400 text-base mb-1.5"></i><br>Cargando...</div>';

    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=12&q=${encodeURIComponent(query)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) throw new Error(data.error.message);

      status.textContent = `${data.items.length} resultados`;
      resultsContainer.innerHTML = '';

      data.items.forEach((item) => {
        const videoId = item.id.videoId;
        const title = decodeHtmlEntities(item.snippet.title);
        const channel = decodeHtmlEntities(item.snippet.channelTitle);
        const thumb = item.snippet.thumbnails.medium ? item.snippet.thumbnails.medium.url : item.snippet.thumbnails.default.url;

        const card = document.createElement('div');
        card.className = 'flex items-center justify-between gap-2.5 p-1.5 bg-neutral-950 hover:bg-neutral-900 border border-white/5 hover:border-cyan-500/30 rounded-lg transition duration-150 group';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex items-center gap-2.5 overflow-hidden';
        infoDiv.innerHTML = `
          <div class="relative w-14 h-9 rounded overflow-hidden flex-shrink-0 border border-white/10">
            <img src="${thumb}" class="w-full h-full object-cover group-hover:scale-105 transition" alt="thumb">
          </div>
          <div class="overflow-hidden">
            <div class="font-semibold text-xs text-neutral-200 truncate"></div>
            <div class="text-[9px] text-neutral-500 font-mono truncate"></div>
          </div>
        `;
        infoDiv.querySelector('.font-semibold').textContent = title;
        infoDiv.querySelector('.font-semibold').title = title;
        infoDiv.querySelector('.font-mono').textContent = channel;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'flex items-center gap-1 flex-shrink-0';

        const btnA = document.createElement('button');
        btnA.className = 'px-2 py-1 bg-cyan-950/80 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/30 rounded text-[9px] font-display font-bold transition';
        btnA.textContent = 'DECK A';
        btnA.onclick = () => loadDirectly('A', videoId, title);

        const btnB = document.createElement('button');
        btnB.className = 'px-2 py-1 bg-indigo-950/80 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/30 rounded text-[9px] font-display font-bold transition';
        btnB.textContent = 'DECK B';
        btnB.onclick = () => loadDirectly('B', videoId, title);

        const btnQ = document.createElement('button');
        btnQ.className = 'px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded text-[9px] font-display font-bold transition shadow shadow-pink-600/30 flex items-center gap-1';
        btnQ.innerHTML = '<i class="fa-solid fa-plus"></i> COLA';
        btnQ.onclick = () => {
          addToQueue(videoId, title, thumb, channel);
          showToast(`Añadida a la cola: ${title}`);
        };

        actionsDiv.append(btnA, btnB, btnQ);
        card.append(infoDiv, actionsDiv);
        resultsContainer.appendChild(card);
      });
    } catch (err) {
      status.textContent = 'Error';
      resultsContainer.innerHTML = `<div class="p-3 text-center text-xs text-red-400 font-mono bg-red-950/20 border border-red-900/30 rounded-lg">Error: ${err.message}</div>`;
    }
  };

  let dragSrcIndex = null;
  window.renderQueue = function () {
    const container = document.getElementById('queueContainer');
    document.getElementById('queueCount').textContent = playlistQueue.length;

    if (playlistQueue.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-neutral-500 font-mono text-xs flex flex-col items-center gap-1.5">
          <i class="fa-solid fa-list text-lg text-neutral-600"></i>
          <span>Cola vacía. Añade pistas para Automix continuo.</span>
        </div>`;
      return;
    }

    container.innerHTML = '';
    playlistQueue.forEach((item, idx) => {
      const cleanTitle = decodeHtmlEntities(item.title);
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-1.5 bg-neutral-950 hover:bg-neutral-900 border border-white/5 rounded-lg text-xs group transition cursor-grab';
      div.draggable = true;

      div.ondragstart = () => { dragSrcIndex = idx; div.classList.add('opacity-40'); };
      div.ondragend = () => { div.classList.remove('opacity-40'); };
      div.ondragover = (ev) => ev.preventDefault();
      div.ondrop = () => {
        if (dragSrcIndex === null || dragSrcIndex === idx) return;
        const moved = playlistQueue.splice(dragSrcIndex, 1)[0];
        playlistQueue.splice(idx, 0, moved);
        dragSrcIndex = null;
        saveQueueToCache();
        renderQueue();
      };

      const left = document.createElement('div');
      left.className = 'flex items-center gap-2 overflow-hidden';
      left.innerHTML = `
        <i class="fa-solid fa-grip-vertical text-neutral-600 text-[10px]"></i>
        <span class="text-[9px] font-mono text-cyan-400 font-bold w-4">${idx + 1}.</span>
        <img src="${item.thumb}" class="w-8 h-6 object-cover rounded flex-shrink-0 border border-white/10" alt="thumb">
        <div class="overflow-hidden">
          <span class="truncate block text-xs text-neutral-200 font-semibold q-title"></span>
          <span class="text-[8px] text-neutral-500 font-mono block truncate q-chan"></span>
        </div>
      `;
      left.querySelector('.q-title').textContent = cleanTitle;
      left.querySelector('.q-chan').textContent = item.channel || 'YouTube';

      const right = document.createElement('div');
      right.className = 'flex items-center gap-1 flex-shrink-0';

      if (idx > 0) {
        const btnTop = document.createElement('button');
        btnTop.className = 'px-1.5 py-0.5 bg-neutral-900 hover:bg-amber-950 text-[8px] font-mono text-amber-400 rounded border border-white/5';
        btnTop.title = 'Subir al 1º lugar (Play Next)';
        btnTop.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
        btnTop.onclick = () => {
          const track = playlistQueue.splice(idx, 1)[0];
          playlistQueue.unshift(track);
          saveQueueToCache();
          renderQueue();
        };
        right.appendChild(btnTop);
      }

      const btnA = document.createElement('button');
      btnA.className = 'px-1.5 py-0.5 bg-neutral-900 hover:bg-cyan-950 text-[8px] font-mono text-cyan-400 rounded border border-white/5';
      btnA.textContent = 'A';
      btnA.title = 'Cargar en Deck A';
      btnA.onclick = () => loadDirectly('A', item.videoId, cleanTitle);

      const btnB = document.createElement('button');
      btnB.className = 'px-1.5 py-0.5 bg-neutral-900 hover:bg-indigo-950 text-[8px] font-mono text-indigo-400 rounded border border-white/5';
      btnB.textContent = 'B';
      btnB.title = 'Cargar en Deck B';
      btnB.onclick = () => loadDirectly('B', item.videoId, cleanTitle);

      const btnDel = document.createElement('button');
      btnDel.className = 'text-neutral-500 hover:text-red-400 p-1 transition';
      btnDel.innerHTML = '<i class="fa-solid fa-xmark text-xs"></i>';
      btnDel.onclick = () => removeFromQueue(idx);

      right.append(btnA, btnB, btnDel);
      div.append(left, right);
      container.appendChild(div);
    });
  };

  // 10. HISTORIAL Y SESIONES GUARDADAS
  function addToHistory(videoId, title, deck) {
    if (!title || title === 'Track Listo') return;
    window.playHistory.unshift({
      videoId,
      title,
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

  // 11. SAMPLER DE EFECTOS DE SONIDO DJ (Web Audio API Synth — Cero archivos externos)
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  window.playDjSfx = function (type) {
    if (!window.proModules.fxAndPitch) return;
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    if (type === 'airhorn') {
      [390, 466, 587].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 0.96, now);
        osc.frequency.linearRampToValueAtTime(freq, now + 0.08);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.75);
      });
    } else if (type === 'siren') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.35);
      osc.frequency.linearRampToValueAtTime(440, now + 0.7);
      osc.frequency.linearRampToValueAtTime(880, now + 1.05);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.1);
    } else if (type === 'laser') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'subdrop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 1.1);
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.1);
    }
  };

  // Control de Velocidad / Tempo (Pitch) en Decks
  window.setDeckPlaybackRate = function (deck, rate) {
    const player = deck === 'A' ? playerA : playerB;
    if (player && typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(parseFloat(rate));
      showToast(`Deck ${deck} Tempo: ${rate}x`);
    }
  };

  // 12. ATAJOS DE TECLADO (HOTKEYS DJ)
  window.addEventListener('keydown', (e) => {
    if (!window.proModules.hotkeys || isDisplayMode) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

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
    } else if (e.key === '1') {
      playDjSfx('airhorn');
    } else if (e.key === '2') {
      playDjSfx('siren');
    } else if (e.key === '3') {
      playDjSfx('laser');
    } else if (e.key === '4') {
      playDjSfx('subdrop');
    }
  });

  // 13. CONSTRUCCIÓN DE LA INTERFAZ DE MÓDULOS Y BOTONES ACTIVAR/DESACTIVAR
  function injectProConsoleUI() {
    if (isDisplayMode) return;

    // A) Controles de Pitch/Tempo dentro de cada Deck
    ['A', 'B'].forEach((deck) => {
      const container = document.getElementById(`deck${deck}-container`);
      if (container && !document.getElementById(`deck${deck}-pitchBar`)) {
        const pitchDiv = document.createElement('div');
        pitchDiv.id = `deck${deck}-pitchBar`;
        pitchDiv.className = 'flex items-center justify-between text-[9px] font-mono bg-black/40 px-2 py-1 rounded border border-white/5';
        pitchDiv.innerHTML = `
          <span class="text-neutral-400"><i class="fa-solid fa-gauge-simple-high mr-1"></i>TEMPO / PITCH:</span>
          <div class="flex gap-1">
            ${[0.75, 1, 1.25, 1.5].map(r => `
              <button onclick="setDeckPlaybackRate('${deck}', ${r})" class="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-700 text-neutral-300 border border-white/10">${r}x</button>
            `).join('')}
          </div>
        `;
        container.appendChild(pitchDiv);
      }
    });

    // B) Barra de Módulos (Botones Activar/Desactivar) + Panel Sampler FX / TV Ticker / Sesiones
    const mainRoot = document.getElementById('main-dj-root');
    const mainWorkstation = mainRoot ? mainRoot.querySelector('main') : null;
    if (!mainRoot || !mainWorkstation) return;

    const proBar = document.createElement('div');
    proBar.id = 'moodj-pro-modules-bar';
    proBar.className = 'w-full max-w-[1680px] mx-auto mb-2.5 flex flex-col gap-2';
    proBar.innerHTML = `
      <!-- INTERRUPTORES DE MÓDULOS (ON/OFF) -->
      <div class="dj-panel rounded-xl p-2 px-3 flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2 text-xs font-display font-bold text-cyan-400">
          <i class="fa-solid fa-cubes"></i>
          <span>MÓDULOS PRO (CLIC PARA ACTIVAR / DESACTIVAR):</span>
        </div>
        <div id="proModuleTogglesContainer" class="flex flex-wrap items-center gap-1.5"></div>
      </div>

      <!-- PANEL FX SAMPLER & TV PROMO TICKER -->
      <div id="proFxAndPromoPanel" class="dj-panel rounded-xl p-2.5 grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center">
        <div class="lg:col-span-5 flex flex-wrap items-center gap-1.5">
          <span class="text-[10px] font-display font-bold text-pink-400 mr-1"><i class="fa-solid fa-bolt"></i> SAMPLER FX:</span>
          <button onclick="playDjSfx('airhorn')" class="px-2.5 py-1 rounded bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white border border-pink-500/40 text-[10px] font-mono font-bold transition">[1] AIRHORN</button>
          <button onclick="playDjSfx('siren')" class="px-2.5 py-1 rounded bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-black border border-amber-500/40 text-[10px] font-mono font-bold transition">[2] SIRENA</button>
          <button onclick="playDjSfx('laser')" class="px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/40 text-[10px] font-mono font-bold transition">[3] LASER</button>
          <button onclick="playDjSfx('subdrop')" class="px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 text-[10px] font-mono font-bold transition">[4] SUB DROP</button>
        </div>

        <div class="lg:col-span-7 flex flex-wrap items-center gap-1.5">
          <span class="text-[10px] font-display font-bold text-amber-400"><i class="fa-solid fa-bullhorn"></i> MENSAJE TV:</span>
          <input id="tvTickerInput" type="text" class="flex-1 min-w-[180px] bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-neutral-100 font-mono outline-none focus:border-amber-400" placeholder="Escribe anuncio o promo para la pantalla externa...">
          <button onclick="sendTickerToTv()" class="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-display font-bold text-[10px] transition">ENVIAR A TV</button>
          <button onclick="triggerBannerNow()" class="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/30 font-display font-bold text-[10px] transition" title="Mostrar tarjeta de canción actual en TV">MOSTRAR CANCIÓN EN TV</button>
        </div>
      </div>

      <!-- PANEL DE SESIONES GUARDADAS E HISTORIAL -->
      <div id="proSessionsPanel" class="dj-panel rounded-xl p-2.5 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        <div class="lg:col-span-6 flex flex-col gap-1.5 border-b lg:border-b-0 lg:border-r border-white/10 pb-2 lg:pb-0 lg:pr-3">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-display font-bold text-emerald-400"><i class="fa-solid fa-folder-plus mr-1"></i>GUARDAR / CARGAR SESIONES DE COLA</span>
            <div class="flex gap-1">
              <input id="sessionNameInput" type="text" placeholder="Nombre (ej. Hora Pico)" class="bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-[10px] text-white font-mono outline-none">
              <button onclick="saveCurrentSession()" class="px-2 py-0.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[10px] rounded font-mono">Guardar Cola</button>
            </div>
          </div>
          <div id="savedSessionsContainer" class="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto"></div>
        </div>

        <div class="lg:col-span-6 flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-display font-bold text-indigo-400"><i class="fa-solid fa-clock-rotate-left mr-1"></i>HISTORIAL RECIENTE EN VIVO</span>
            <button onclick="window.playHistory=[];localStorage.removeItem('moodj_pro_history');renderHistoryList();" class="text-[9px] font-mono text-neutral-500 hover:text-red-400">Limpiar historial</button>
          </div>
          <div id="playHistoryContainer" class="flex gap-1.5 overflow-x-auto py-0.5 text-[10px] font-mono"></div>
        </div>
      </div>
    `;

    mainRoot.insertBefore(proBar, mainWorkstation);
    const tickerInput = document.getElementById('tvTickerInput');
    if (tickerInput) tickerInput.value = window.tickerMessage;

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
    showToast('Mensaje promocional enviado y activado en TV');
  };

  window.triggerBannerNow = function () {
    window.proModules.tvBanner = true;
    localStorage.setItem(MODULES_KEY, JSON.stringify(window.proModules));
    updateModulesUI();
    syncExternalScreen('proConfig', {
      modules: window.proModules,
      tickerMessage: window.tickerMessage,
      showBannerNow: true,
      nowPlaying: getActiveDeckTitle(),
      upNext: playlistQueue.length > 0 ? playlistQueue[0].title : 'Modo Automix'
    });
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
      btnLoad.className = 'text-emerald-400 hover:underline font-bold';
      btnLoad.textContent = `${name} (${count})`;
      btnLoad.onclick = () => loadSavedSession(name);
      const btnDel = document.createElement('button');
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
        btn.className = `px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition flex items-center gap-1.5 ${isOn ? 'mod-pill-on' : 'mod-pill-off'}`;
        btn.innerHTML = `<span class="w-1.5 h-1.5 rounded-full ${isOn ? 'bg-cyan-400' : 'bg-neutral-600'}"></span>${getModuleLabel(key)}: ${isOn ? 'ON' : 'OFF'}`;
        btn.onclick = () => toggleProModule(key);
        container.appendChild(btn);
      });
    }

    const fxPanel = document.getElementById('proFxAndPromoPanel');
    if (fxPanel) fxPanel.classList.toggle('hidden', !window.proModules.fxAndPitch && !window.proModules.tvTicker);

    ['A', 'B'].forEach((d) => {
      const pb = document.getElementById(`deck${d}-pitchBar`);
      if (pb) pb.classList.toggle('hidden', !window.proModules.fxAndPitch);
    });

    const sessPanel = document.getElementById('proSessionsPanel');
    if (sessPanel) sessPanel.classList.toggle('hidden', !window.proModules.queueManager);
  }

  // 14. ARRANQUE AUTOMÁTICO AL CARGAR EL DOM
  document.addEventListener('DOMContentLoaded', () => {
    injectProStyles();
    ensureApiKeyLoaded();
    if (isDisplayMode) {
      upgradeExternalDisplayDOM();
      setupDisplayReceiver();
    } else {
      injectProConsoleUI();
      applyLogoStyles();
      renderQueue();
    }
  });
})();
