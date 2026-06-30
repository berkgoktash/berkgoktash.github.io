(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- prevent browser scroll-restoration from fighting the boot screen ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);

  /* ---------- Commodore-style boot intro ---------- */
  const boot = document.getElementById('boot');
  const bootText = document.getElementById('boot-text');

  const heroEnterEls = document.querySelectorAll('.hero-enter');

  function triggerHeroEntrance() {
    if (reduceMotion) {
      heroEnterEls.forEach(el => el.classList.add('in'));
      return;
    }
    heroEnterEls.forEach((el, i) => {
      window.setTimeout(() => el.classList.add('in'), 80 + i * 75);
    });
  }

  function finishBoot() {
    if (!boot) return;
    window.scrollTo(0, 0);
    boot.classList.add('done');
    document.body.classList.remove('boot-active');
    window.setTimeout(() => { boot.remove(); window.scrollTo(0, 0); }, 600);
    triggerHeroEntrance();
  }

  if (boot && bootText && !reduceMotion) {
    document.body.classList.add('boot-active');
    const bootScreen = boot.querySelector('.boot-screen');
    const prefix = 'READY.\n';
    const typed = 'LOAD "PORTFOLIO"';
    const fullText = 'READY.\nLOAD "PORTFOLIO"\n\nPRESS PLAY ON TAPE\nOK\n\nSEARCHING\nFOUND PORTFOLIO';

    bootText.textContent = '';
    const textNode = document.createTextNode(prefix);
    const cursor = document.createElement('span');
    cursor.className = 'blink';
    cursor.textContent = '█';
    bootText.appendChild(textNode);
    bootText.appendChild(cursor);

    const bootTimers = [];
    let rafId = null;
    let skipped = false;

    function skipBoot() {
      if (skipped) return;
      skipped = true;
      if (rafId) cancelAnimationFrame(rafId);
      bootTimers.forEach(id => clearTimeout(id));
      document.removeEventListener('keydown', skipBoot);
      boot.removeEventListener('click', skipBoot);
      finishBoot();
    }
    document.addEventListener('keydown', skipBoot, { once: true });
    boot.addEventListener('click', skipBoot, { once: true });

    /* rAF-driven typewriter — characters align with paint frames, no setTimeout jitter */
    const CHAR_INTERVAL = 85; // ms per character, consistent rhythm
    let i = 0;
    let lastCharTime = null;

    function typeFrame(ts) {
      if (lastCharTime === null) lastCharTime = ts;
      if (ts - lastCharTime >= CHAR_INTERVAL) {
        textNode.nodeValue = prefix + typed.slice(0, i);
        i++;
        lastCharTime = ts;
      }
      if (i <= typed.length) {
        rafId = requestAnimationFrame(typeFrame);
      } else {
        cursor.remove();
        bootText.textContent = prefix + typed + '\n\nPRESS PLAY ON TAPE';
        bootTimers.push(window.setTimeout(hideScreen, 900));
      }
    }

    bootTimers.push(window.setTimeout(() => {
      rafId = requestAnimationFrame(typeFrame);
    }, 700));

    function hideScreen() {
      bootScreen.classList.add('hidden');
      bootTimers.push(window.setTimeout(showFull, 1200));
    }
    function showFull() {
      bootText.textContent = fullText;
      bootScreen.classList.remove('hidden');
      bootTimers.push(window.setTimeout(finishBoot, 1400));
    }
  } else {
    triggerHeroEntrance();
    if (boot) finishBoot();
  }

  /* ---------- header scrolled state ---------- */
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ---------- mobile nav ---------- */
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.getElementById('nav-links');
  navToggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Open navigation');
  }));

  /* ---------- scroll reveal with stagger ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      const shown = [];
      entries.forEach(entry => {
        if (entry.isIntersecting) { shown.push(entry.target); obs.unobserve(entry.target); }
      });
      shown.forEach((el, idx) => {
        window.setTimeout(() => el.classList.add('is-visible'), idx * 90);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  /* ---------- active nav highlighting ---------- */
  const sections = document.querySelectorAll('main section[id]');
  const linkFor = id => document.querySelector(`.nav-links a[href="#${id}"]`);
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const link = linkFor(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          document.querySelectorAll('.nav-links a.active').forEach(a => a.classList.remove('active'));
          link.classList.add('active');
        }
      });
    }, { threshold: 0.5, rootMargin: '-30% 0px -50% 0px' });
    sections.forEach(section => navObserver.observe(section));
  }

  /* ---------- email copy-to-clipboard ---------- */
  const emailLink = document.querySelector('a[href^="mailto:"]');
  if (emailLink && navigator.clipboard) {
    const address = emailLink.getAttribute('href').replace('mailto:', '');
    let toastEl = null;
    function showToast(msg) {
      if (toastEl) toastEl.remove();
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.textContent = msg;
      document.body.appendChild(toastEl);
      requestAnimationFrame(() => requestAnimationFrame(() => toastEl.classList.add('show')));
      window.setTimeout(() => {
        toastEl.classList.remove('show');
        window.setTimeout(() => { if (toastEl) { toastEl.remove(); toastEl = null; } }, 280);
      }, 1800);
    }
    emailLink.addEventListener('click', e => {
      e.preventDefault();
      navigator.clipboard.writeText(address).then(() => showToast('Email copied ✓'));
    });
  }
})();
