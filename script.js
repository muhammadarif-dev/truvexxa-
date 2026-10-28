/* =========================================================
   Truvexxa - Landing Page Scripts
   Vanilla JS: mobile menu, scroll effects, logo settings
   ========================================================= */

(function () {
  'use strict';

  // Flag that JS is running so CSS can enable reveal animations
  document.documentElement.classList.add('js');

  /* ---------- Helpers ---------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /* =========================================================
     1. Footer year (always current)
     ========================================================= */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
     2. Mobile menu
     ========================================================= */
  const menuToggle = $('#menuToggle');
  const navMenu = $('#navMenu');

  function setMenu(open) {
    navMenu.classList.toggle('open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  menuToggle.addEventListener('click', () => {
    setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
  });

  // Close the menu after tapping any link inside it
  $$('a', navMenu).forEach((link) => link.addEventListener('click', () => setMenu(false)));

  // Close with Escape, or when the screen grows to desktop size
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMenu(false);
  });
  window.matchMedia('(min-width: 821px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* =========================================================
     3. Header shadow on scroll
     ========================================================= */
  const header = $('#siteHeader');
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* =========================================================
     4. Scroll reveal animations
     ========================================================= */
  const revealItems = $$('.reveal');

  if ('IntersectionObserver' in window) {
    // Small stagger for items that appear together inside the same grid
    revealItems.forEach((el) => {
      const siblings = $$('.reveal', el.parentElement);
      const index = siblings.indexOf(el);
      if (siblings.length > 1) el.style.setProperty('--delay', index * 90 + 'ms');
    });

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealItems.forEach((el) => revealObserver.observe(el));
  } else {
    // Very old browsers: just show everything
    revealItems.forEach((el) => el.classList.add('visible'));
  }

  /* =========================================================
     5. Highlight the active nav link while scrolling
     ========================================================= */
  const navLinks = $$('.nav-links a');
  const trackedSections = ['home', 'services', 'about', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    trackedSections.forEach((section) => sectionObserver.observe(section));
  }

  /* =========================================================
     6. Logo settings (upload, preview, save, reset)
     The logo is stored in localStorage as a small data URL.
     localStorage only exists in the current browser, so it
     does not change the site for other visitors.
     ========================================================= */
  const STORAGE_KEY = 'truvexxa_logo';
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB upload limit
  const MAX_LOGO_WIDTH = 480;            // logos are scaled down to keep storage small
  const MAX_LOGO_HEIGHT = 160;
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  const settingsToggle = $('#settingsToggle');
  const settingsPanel = $('#settingsPanel');
  const logoInput = $('#logoInput');
  const previewImg = $('#previewImg');
  const DEFAULT_LOGO = 'logo.png'; // the logo file that ships with the site
  const saveBtn = $('#saveLogo');
  const resetBtn = $('#resetLogo');
  const closeBtn = $('#closeSettings');
  const msgEl = $('#settingsMsg');

  // Logo that has been chosen but not saved yet
  let pendingLogo = null;

  /* --- storage (wrapped in try/catch: can fail in private mode or when full) --- */
  function readSavedLogo() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function writeSavedLogo(dataUrl) {
    try {
      localStorage.setItem(STORAGE_KEY, dataUrl);
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearSavedLogo() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* nothing to do */
    }
  }

  /* --- UI helpers --- */
  function showMessage(text, type) {
    msgEl.textContent = text || '';
    msgEl.className = 'settings-msg' + (type ? ' ' + type : '');
  }

  // Show a custom logo (data URL), or the default logo file when null
  function applyLogo(dataUrl) {
    $$('[data-logo-img]').forEach((img) => {
      img.src = dataUrl || DEFAULT_LOGO;
    });
  }

  // Update the small preview inside the settings panel
  function setPreview(dataUrl) {
    previewImg.src = dataUrl || DEFAULT_LOGO;
  }

  /* --- image processing: read the file, scale it down, return a data URL --- */
  function processImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.onload = () => {
        const img = new Image();

        img.onerror = () => reject(new Error('That file is not a valid image.'));
        img.onload = () => {
          const scale = Math.min(1, MAX_LOGO_WIDTH / img.width, MAX_LOGO_HEIGHT / img.height);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // PNG keeps transparent backgrounds intact
          resolve(canvas.toDataURL('image/png'));
        };

        img.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  /* --- open / close panel --- */
  function openSettings() {
    settingsPanel.hidden = false;
    settingsToggle.setAttribute('aria-expanded', 'true');
    settingsToggle.setAttribute('aria-label', 'Close logo settings');
    logoInput.focus();
  }

  function closeSettings() {
    settingsPanel.hidden = true;
    settingsToggle.setAttribute('aria-expanded', 'false');
    settingsToggle.setAttribute('aria-label', 'Open logo settings');
  }

  settingsToggle.addEventListener('click', () => {
    if (settingsPanel.hidden) openSettings();
    else closeSettings();
  });
  closeBtn.addEventListener('click', () => {
    closeSettings();
    settingsToggle.focus();
  });

  // Escape closes the panel; clicking elsewhere on the page does too
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsPanel.hidden) {
      closeSettings();
      settingsToggle.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (settingsPanel.hidden) return;
    if (!settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) closeSettings();
  });

  /* --- choose a file --- */
  logoInput.addEventListener('change', async () => {
    const file = logoInput.files && logoInput.files[0];
    pendingLogo = null;
    saveBtn.disabled = true;

    if (!file) {
      setPreview(readSavedLogo());
      showMessage('');
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      showMessage('Please choose a PNG, JPG or WebP image.', 'error');
      logoInput.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showMessage('That image is larger than 2 MB. Please choose a smaller one.', 'error');
      logoInput.value = '';
      return;
    }

    try {
      pendingLogo = await processImage(file);
      setPreview(pendingLogo);
      saveBtn.disabled = false;
      showMessage('Preview ready. Click "Save logo" to use it.', '');
    } catch (err) {
      showMessage(err.message, 'error');
      logoInput.value = '';
    }
  });

  /* --- save --- */
  saveBtn.addEventListener('click', () => {
    if (!pendingLogo) return;

    if (writeSavedLogo(pendingLogo)) {
      applyLogo(pendingLogo);
      pendingLogo = null;
      saveBtn.disabled = true;
      logoInput.value = '';
      showMessage('Logo saved in this browser.', 'ok');
    } else {
      showMessage('Could not save. Browser storage may be full or blocked.', 'error');
    }
  });

  /* --- reset to the default text logo --- */
  resetBtn.addEventListener('click', () => {
    clearSavedLogo();
    pendingLogo = null;
    saveBtn.disabled = true;
    logoInput.value = '';
    applyLogo(null);
    setPreview(null);
    showMessage('Default logo restored.', 'ok');
  });

  /* --- on page load: restore a saved logo if there is one --- */
  const savedLogo = readSavedLogo();
  if (savedLogo) {
    applyLogo(savedLogo);
    setPreview(savedLogo);
  }
})();
