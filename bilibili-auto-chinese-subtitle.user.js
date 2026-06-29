// ==UserScript==
// @name         Bilibili Auto Chinese Subtitle
// @namespace    https://www.bilibili.com/
// @version      1.8.0
// @description  Automatically enables Chinese subtitles on Bilibili videos after page load or episode changes.
// @author       local
// @match        https://www.bilibili.com/video/*
// @match        https://www.bilibili.com/bangumi/play/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const TARGET_SELECTOR = '.bpx-player-ctrl-subtitle-language-item[data-lan="ai-zh"]';
  const SUBTITLE_BUTTON_SELECTOR = '.bpx-player-ctrl-btn.bpx-player-ctrl-subtitle';
  const SUBTITLE_BOX_SELECTOR = '.bpx-player-ctrl-subtitle-box';
  const SUBTITLE_MENU_SELECTOR = '.bpx-player-ctrl-subtitle-menu';
  const RETRY_DELAY_MS = 500;
  const MAX_RETRY_COUNT = 80;
  const LOG_PREFIX = '[auto-zh-subtitle]';

  let lastUrl = location.href;
  let retryTimer = 0;
  let retryCount = 0;
  let lastClickAt = 0;
  let lastOpenAt = 0;
  let enabledUrl = '';
  let mutationDebounceTimer = 0;

  function log(...args) {
    console.log(LOG_PREFIX, ...args);
  }

  function openSubtitleMenu() {
    const button = document.querySelector(SUBTITLE_BUTTON_SELECTOR);
    if (!button) return false;

    const now = Date.now();
    if (now - lastOpenAt < 800) return true;

    button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
    button.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true, view: window }));
    button.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, view: window }));
    button.click();
    lastOpenAt = now;
    return true;
  }

  function clickLikeUser(el) {
    const rect = el.getBoundingClientRect();
    const options = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };

    for (const type of ['mouseover', 'mouseenter', 'mousemove', 'mousedown', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, options));
    }
  }

  function dispatchMouseAway(el) {
    if (!el) return;

    const options = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: 1,
      clientY: 1,
      relatedTarget: document.documentElement,
    };

    for (const type of ['pointerout', 'mouseout', 'mouseleave', 'pointerleave']) {
      el.dispatchEvent(new MouseEvent(type, options));
    }
  }

  function pressEscape() {
    const options = {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true,
    };

    document.dispatchEvent(new KeyboardEvent('keydown', options));
    document.dispatchEvent(new KeyboardEvent('keyup', options));
  }

  function temporarilyHideSubtitleMenu() {
    const button = document.querySelector(SUBTITLE_BUTTON_SELECTOR);
    const box = document.querySelector(SUBTITLE_BOX_SELECTOR);
    if (!box || box.style.display === 'none') return;

    box.style.display = 'none';

    const restore = () => {
      box.style.display = '';
      button?.removeEventListener('mouseenter', restore);
      button?.removeEventListener('click', restore);
    };

    button?.addEventListener('mouseenter', restore, { once: true });
    button?.addEventListener('click', restore, { once: true });
  }

  function closeSubtitleMenuSoon() {
    setTimeout(() => {
      const button = document.querySelector(SUBTITLE_BUTTON_SELECTOR);
      const box = document.querySelector(SUBTITLE_BOX_SELECTOR);
      const menu = document.querySelector(SUBTITLE_MENU_SELECTOR);

      pressEscape();
      dispatchMouseAway(menu);
      dispatchMouseAway(box);
      dispatchMouseAway(button);

      setTimeout(temporarilyHideSubtitleMenu, 500);
    }, 300);
  }

  function clickChineseSubtitle() {
    if (enabledUrl === location.href) return true;

    const item = document.querySelector(TARGET_SELECTOR);
    if (!item) {
      openSubtitleMenu();
      return false;
    }

    const now = Date.now();
    if (now - lastClickAt < 800) return true;

    clickLikeUser(item);
    lastClickAt = now;
    enabledUrl = location.href;
    log('switched to Chinese AI subtitle', location.href);
    closeSubtitleMenuSoon();
    return true;
  }

  function startRetry() {
    if (enabledUrl === location.href) return;

    clearInterval(retryTimer);
    retryCount = 0;

    if (clickChineseSubtitle()) return;

    retryTimer = setInterval(() => {
      retryCount += 1;
      if (clickChineseSubtitle() || retryCount >= MAX_RETRY_COUNT) {
        clearInterval(retryTimer);
        if (retryCount >= MAX_RETRY_COUNT) log('stopped: subtitle item not found');
      }
    }, RETRY_DELAY_MS);
  }

  function watchUrlChanges() {
    const fire = () => {
      if (lastUrl !== location.href) {
        lastUrl = location.href;
        enabledUrl = '';
        startRetry();
      }
    };

    for (const method of ['pushState', 'replaceState']) {
      const raw = history[method];
      history[method] = function (...args) {
        const result = raw.apply(this, args);
        setTimeout(fire, 0);
        return result;
      };
    }

    window.addEventListener('popstate', fire);
  }

  function watchPlayerChanges() {
    const observer = new MutationObserver(() => {
      if (enabledUrl === location.href) return;
      if (!document.querySelector('.bpx-player-container, #bilibili-player, video')) return;

      clearTimeout(mutationDebounceTimer);
      mutationDebounceTimer = setTimeout(startRetry, 300);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function watchVideoEvents() {
    document.addEventListener(
      'loadedmetadata',
      (event) => {
        if (event.target instanceof HTMLVideoElement) startRetry();
      },
      true,
    );
  }

  window.__AUTO_ZH_SUBTITLE_SCRIPT_LOADED__ = true;
  window.__AUTO_ZH_SUBTITLE_SCRIPT_VERSION__ = '1.8.0';

  function init() {
    watchUrlChanges();
    watchPlayerChanges();
    watchVideoEvents();
    startRetry();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
