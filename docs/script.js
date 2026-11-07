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
  let cleanupBoot = () => {};
  let bootFinished = false;

  function triggerHeroEntrance() {
    if (reduceMotion) {
      heroEnterEls.forEach(el => el.classList.add('in'));
      return;
    }
    heroEnterEls.forEach((el, i) => {
      window.setTimeout(() => el.classList.add('in'), 100 + i * 110);
    });
  }

  function finishBoot() {
    if (!boot || bootFinished) return;
    bootFinished = true;
    cleanupBoot();
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
    cleanupBoot = () => {
      if (rafId) cancelAnimationFrame(rafId);
      bootTimers.forEach(id => clearTimeout(id));
      document.removeEventListener('keydown', skipBoot);
      boot.removeEventListener('click', skipBoot);
    };

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

  /* ---------- header scrolled state (painted with the chapters, once per frame) ---------- */
  const header = document.querySelector('.site-header');
  let headerScrolled = null;

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

  /* ---------- chapters scroll naturally; related work shares a sticky stage ---------- */
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const workPanels = ['approach', 'projects', 'skills'].map(id => document.getElementById(id));
  const work = document.createElement('div'); work.id = 'work'; work.className = 'work-chapter';
  const stage = document.createElement('div'); stage.className = 'work-stage';
  workPanels[0].before(work); work.append(stage);
  workPanels.forEach(panel => stage.append(panel));
  const experience = document.querySelector('.experience .container');
  const experienceHeading = document.createElement('div'); experienceHeading.className = 'experience-heading';
  experience.prepend(experienceHeading);
  experienceHeading.append(experience.querySelector('.section-index'), experience.querySelector('.section-title'));
  // Contact is the final chapter: it fills the last screen together with the footer
  // instead of pinning, so the footer arrives with it rather than after a long hold.
  const finalChapter = document.getElementById('contact');
  const footer = document.querySelector('.footer');
  const finalContent = finalChapter.querySelector('.container');
  finalChapter.classList.add('final-chapter');
  const readingChapters = ['about', 'experience'].map(id => {
    const section = document.getElementById(id);
    const content = section.querySelector('.container');
    const hold = document.createElement('div'); hold.className = 'reading-stage';
    section.prepend(hold); hold.append(content);
    section.classList.add('reading-chapter');
    // Experience stacks its timeline cards in one place beside the pinned heading;
    // they take turns at full brightness, like the shared Work stage.
    const items = id === 'experience' ? [...section.querySelectorAll('.timeline-item')] : [];
    return { section, content, hold, items, pin: 90, enabled: false, staged: false, itemStep: 0, activeItem: -1 };
  });
  // Scroll held at full brightness once a reading chapter has arrived (fraction of
  // the viewport), and scroll spent on each Experience card handoff.
  const READING_HOLD = 0.25, ITEM_STEP = 0.5;
  let frame = 0;
  // Choreography is laid out against a stable viewport height. Mobile browsers
  // collapse and restore their toolbars while scrolling; re-laying the pinned
  // chapters on that height-only change made content jump under the reader.
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  let viewW = window.innerWidth;
  let viewH = window.innerHeight;
  function viewportChanged() {
    const w = window.innerWidth, h = window.innerHeight;
    if (w === viewW && h === viewH) return false;
    if (w === viewW && coarsePointer.matches && Math.abs(h - viewH) < 160) return false;
    viewW = w; viewH = h;
    return true;
  }
  // Shared-stage panels hold at full brightness within ±HOLD of their scroll
  // position and dim over FADE, meeting at the midpoint without overlapping text.
  // The curve settles softly at full brightness (zero velocity and acceleration)
  // but leaves black quickly, so the handoff is a brief dissolve through dim
  // rather than a long empty screen (smootherstep lingers near zero).
  const PANEL_HOLD = 0.2, PANEL_FADE = 0.3;
  const settle = value => { const u = clamp(value); return 1 - (1 - u) ** 3; };
  let stageEnabled = false;
  let stageTop = 100;
  let step = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  // Quintic ease (smootherstep): zero velocity *and* acceleration at both ends,
  // so brightness starts and settles without a visible kink.
  const smooth = value => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
  const hero = document.getElementById('home');
  const navTargets = ['about', 'experience', 'work', 'contact'].map(id => document.getElementById(id));
  const navAnchors = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  // Geometry is measured once per layout change, never during scroll. Each frame
  // only reads window.scrollY, so painting never forces a synchronous reflow.
  const geo = { navBottom: 0, span: 1, total: 0, work: null, hero: null, final: null, reading: [], targets: [] };
  const docBox = el => { const r = el.getBoundingClientRect(); return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY }; };
  const last = new Map();
  function setVar(el, name, value) {
    const key = value.toFixed(3);
    let cache = last.get(el);
    if (!cache) { cache = {}; last.set(el, cache); }
    if (cache[name] === key) return;
    cache[name] = key;
    el.style.setProperty(name, key);
  }
  // Adjacent chapters share the same boundary and complementary fade curves.
  // The handoff starts at the viewport bottom and finishes below the fixed nav.
  function boundaryOpacity(box, y, { enter = true, leave = true } = {}) {
    if (motionPreference.matches) return 1;
    const top = box.top - y, bottom = box.bottom - y;
    const entering = enter ? smooth((viewH - top) / geo.span) : 1;
    const leaving = leave ? smooth((bottom - geo.navBottom) / geo.span) : 1;
    return entering * leaving;
  }
  function measureGeometry() {
    geo.navBottom = header.offsetHeight;
    geo.span = Math.max(1, viewH - geo.navBottom);
    geo.total = document.documentElement.scrollHeight - viewH;
    geo.work = docBox(work);
    geo.hero = docBox(hero);
    geo.final = docBox(finalChapter);
    geo.reading = readingChapters.map(({ section }) => docBox(section));
    geo.targets = navTargets.map(el => docBox(el).top);
    geo.workTop = work.offsetTop;
  }
  function measureChapters() {
    work.classList.add('measure-stage');
    const height = Math.max(...workPanels.map(panel => panel.scrollHeight));
    work.classList.remove('measure-stage');
    stageEnabled = !motionPreference.matches && height <= viewH - 130 && window.innerWidth > 920;
    stageTop = Math.max(90, (viewH - height) / 2);
    step = viewH * 0.85;
    work.classList.toggle('has-stage', stageEnabled);
    work.style.setProperty('--stage-top', `${stageTop}px`);
    work.style.setProperty('--chapter-height', `${height + step * (workPanels.length - 1) + viewH * 0.4}px`);
    const span = Math.max(1, viewH - header.offsetHeight);
    readingChapters.forEach(chapter => {
      const fits = height => !motionPreference.matches && height <= viewH - 130;
      const canStage = chapter.items.length > 1 && !motionPreference.matches && window.innerWidth > 920;
      chapter.section.classList.toggle('has-timeline-stage', canStage);
      let contentHeight = chapter.content.offsetHeight;
      if (canStage && !fits(contentHeight)) {
        chapter.section.classList.remove('has-timeline-stage');
        contentHeight = chapter.content.offsetHeight;
      }
      chapter.enabled = fits(contentHeight);
      chapter.staged = canStage && chapter.enabled;
      chapter.itemStep = chapter.staged ? viewH * ITEM_STEP : 0;
      chapter.activeItem = -1;
      chapter.pin = Math.max(90, (viewH - contentHeight) / 2);
      // Full brightness lasts (height - span): the entering fade ends as the section
      // top reaches the nav, the leaving fade starts as its bottom meets the viewport bottom.
      const handoffs = chapter.itemStep * Math.max(0, chapter.items.length - 1);
      chapter.section.classList.toggle('has-reading-stage', chapter.enabled);
      const gap = chapter.enabled ? parseFloat(getComputedStyle(chapter.section).paddingBottom) || 0 : 0;
      const sectionHeight = Math.max(contentHeight + chapter.pin + gap, span + viewH * READING_HOLD) + handoffs;
      chapter.section.style.setProperty('--reading-top', `${chapter.pin}px`);
      chapter.section.style.setProperty('--reading-height', `${sectionHeight}px`);
    });
    finalChapter.style.setProperty('--final-height', `${Math.max(0, viewH - footer.offsetHeight)}px`);
    measureGeometry();
    last.clear();
    activePanel = -1;
    currentNav = null;
    paintChapters();
  }
  let activePanel = -1;
  let currentNav = null;
  function paintChapters() {
    frame = 0;
    const y = window.scrollY;
    const scrolled = y > 8;
    if (scrolled !== headerScrolled) { headerScrolled = scrolled; header.classList.toggle('scrolled', scrolled); }
    // Hero dims as About rises over it: the mirror of About's entering curve.
    setVar(hero, '--hero-opacity', boundaryOpacity(geo.hero, y, { enter: false }));
    setVar(stage, '--work-opacity', boundaryOpacity(geo.work, y));
    readingChapters.forEach((chapter, index) => {
      setVar(chapter.hold, '--reading-opacity', boundaryOpacity(geo.reading[index], y));
      if (!chapter.staged) return;
      // Cards hand off across the held stretch, with half the hold before the first
      // swap and half after the last.
      const count = chapter.items.length - 1;
      const start = geo.reading[index].top - geo.navBottom + viewH * READING_HOLD / 2;
      const at = clamp((y - start) / (chapter.itemStep * count)) * count;
      chapter.items.forEach((item, i) => {
        const opacity = settle((PANEL_HOLD + PANEL_FADE - Math.abs(at - i)) / PANEL_FADE);
        setVar(item, '--item-opacity', opacity);
        const lit = opacity > 0.002;
        if (item.classList.contains('item-lit') !== lit) item.classList.toggle('item-lit', lit);
      });
      const active = Math.round(at);
      if (active !== chapter.activeItem) {
        chapter.activeItem = active;
        chapter.items.forEach((item, i) => item.classList.toggle('item-active', i === active));
      }
    });
    setVar(finalContent, '--final-opacity', boundaryOpacity(geo.final, y, { leave: false }));
    const position = clamp((y - geo.workTop + stageTop) / (step * (workPanels.length - 1))) * (workPanels.length - 1);
    const active = stageEnabled ? Math.round(position) : -2;
    workPanels.forEach((panel, index) => {
      const opacity = stageEnabled ? settle((PANEL_HOLD + PANEL_FADE - Math.abs(position - index)) / PANEL_FADE) : 1;
      setVar(panel, '--chapter-opacity', opacity);
      // A panel is painted whenever it carries any light; only the active one is interactive.
      const lit = !stageEnabled || opacity > 0.002;
      if (panel.classList.contains('chapter-lit') !== lit) panel.classList.toggle('chapter-lit', lit);
    });
    if (active !== activePanel) {
      activePanel = active;
      workPanels.forEach((panel, index) => {
        const selected = !stageEnabled || index === active;
        panel.classList.toggle('chapter-active', selected);
        panel.inert = !selected;
        panel.setAttribute('aria-hidden', String(!selected));
        if (!selected && panel.contains(document.activeElement)) document.activeElement.blur();
      });
    }
    setVar(document.documentElement, '--page-progress', geo.total > 0 ? clamp(y / geo.total) : 0);
    let current = '';
    geo.targets.forEach((top, index) => { if (top - y < viewH * 0.5) current = navTargets[index].id; });
    if (current !== currentNav) {
      currentNav = current;
      navAnchors.forEach(link => {
        const target = link.hash === '#approach' ? 'work' : link.hash.slice(1);
        link.classList.toggle('active', target === current);
      });
    }
  }
  function queueChapters() { if (!frame) frame = requestAnimationFrame(paintChapters); }
  function goToWorkPanel(id) {
    const reading = readingChapters.find(chapter => chapter.section.id === id && chapter.enabled);
    if (reading) {
      // Land where the chapter is fully lit (and, for Experience, on the first card).
      window.scrollTo({ top: geo.reading[readingChapters.indexOf(reading)].top - geo.navBottom + viewH * READING_HOLD / 2, behavior: 'smooth' });
      return true;
    }
    const index = workPanels.findIndex(panel => panel.id === id);
    if (!stageEnabled || index < 0) return false;
    window.scrollTo({ top: work.offsetTop - stageTop + step * index + (index === 0 ? viewH * 0.2 : 0), behavior: 'smooth' });
    return true;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (goToWorkPanel(link.hash.slice(1))) { event.preventDefault(); history.pushState(null, '', link.hash); }
  });
  window.addEventListener('popstate', () => goToWorkPanel(location.hash.slice(1)));
  window.addEventListener('scroll', queueChapters, { passive: true });
  // Images, fonts, or a real viewport change move section positions; re-measure
  // at most once per frame instead of synchronously on every resize event.
  let measureQueued = 0;
  function queueMeasure() {
    if (!measureQueued) measureQueued = requestAnimationFrame(() => { measureQueued = 0; measureChapters(); });
  }
  window.addEventListener('resize', () => { if (viewportChanged()) queueMeasure(); }, { passive: true });
  motionPreference.addEventListener('change', measureChapters);
  document.fonts.ready.then(measureChapters);
  window.addEventListener('load', measureChapters);
  new ResizeObserver(queueMeasure).observe(document.querySelector('main'));
  measureChapters();

  /* ---------- soft pointer-follow lighting; idle when the pointer leaves ---------- */
  const pointerMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.project-card, .research-blocks article, .skills-grid article, .contact-links a').forEach(el => {
    el.classList.add('hover-light');
    let frame = 0;
    let targetX = 0, targetY = 0, x = 0, y = 0, lastTime = 0;
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      el.classList.remove('light-active');
    }
    function paint(time) {
      if (!pointerMedia.matches || motionMedia.matches) { stop(); return; }
      const ease = 1 - Math.exp(-Math.min(time - (lastTime || time - 16), 50) / 65);
      lastTime = time;
      x += (targetX - x) * ease;
      y += (targetY - y) * ease;
      el.style.setProperty('--light-x', `${x}px`);
      el.style.setProperty('--light-y', `${y}px`);
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.2 ? requestAnimationFrame(paint) : 0;
    }
    let clientX = 0, clientY = 0;
    function retarget() {
      const rect = el.getBoundingClientRect();
      targetX = clientX - rect.left;
      targetY = clientY - rect.top;
    }
    // When the page scrolls under a resting cursor, the light keeps tracking it
    // instead of riding along with the card.
    window.addEventListener('scroll', () => {
      if (!el.classList.contains('light-active')) return;
      retarget();
      if (!frame) { lastTime = 0; frame = requestAnimationFrame(paint); }
    }, { passive: true });
    el.addEventListener('pointermove', event => {
      if (!pointerMedia.matches || motionMedia.matches) return;
      clientX = event.clientX; clientY = event.clientY;
      retarget();
      if (!el.classList.contains('light-active')) {
        x = targetX; y = targetY;
        el.classList.add('light-active');
      }
      if (!frame) { lastTime = 0; frame = requestAnimationFrame(paint); }
    }, { passive: true });
    el.addEventListener('pointerleave', stop);
    el.addEventListener('pointercancel', stop);
    motionMedia.addEventListener('change', stop);
    pointerMedia.addEventListener('change', stop);
  });

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
