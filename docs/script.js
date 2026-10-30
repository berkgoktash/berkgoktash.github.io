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
    return { section, content, hold, pin: 90, enabled: false };
  });
  let frame = 0;
  let stageEnabled = false;
  let stageTop = 100;
  let step = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  // Adjacent chapters share the same boundary and complementary fade curves.
  // The handoff starts at the viewport bottom and finishes below the fixed nav.
  function boundaryOpacity(section) {
    if (motionPreference.matches) return 1;
    const { top, bottom } = section.getBoundingClientRect();
    const navBottom = header.getBoundingClientRect().bottom;
    const span = Math.max(1, window.innerHeight - navBottom);
    const entering = smooth((window.innerHeight - top) / span);
    const leaving = smooth((bottom - navBottom) / span);
    return entering * leaving;
  }
  function measureChapters() {
    work.classList.add('measure-stage');
    const height = Math.max(...workPanels.map(panel => panel.scrollHeight));
    work.classList.remove('measure-stage');
    stageEnabled = !motionPreference.matches && height <= window.innerHeight - 130 && window.innerWidth > 920;
    stageTop = Math.max(90, (window.innerHeight - height) / 2);
    step = window.innerHeight * 0.85;
    work.classList.toggle('has-stage', stageEnabled);
    work.style.setProperty('--stage-top', `${stageTop}px`);
    work.style.setProperty('--chapter-height', `${height + step * (workPanels.length - 1) + window.innerHeight * 0.4}px`);
    readingChapters.forEach(chapter => {
      const contentHeight = chapter.content.offsetHeight;
      chapter.enabled = !motionPreference.matches && contentHeight <= window.innerHeight - 130;
      chapter.pin = Math.max(90, (window.innerHeight - contentHeight) / 2);
      chapter.section.classList.toggle('has-reading-stage', chapter.enabled);
      chapter.section.style.setProperty('--reading-top', `${chapter.pin}px`);
      chapter.section.style.setProperty('--reading-height', `${contentHeight + window.innerHeight * 1.1}px`);
    });
    finalChapter.style.setProperty('--final-height', `${Math.max(0, window.innerHeight - footer.offsetHeight)}px`);
    queueChapters();
  }
  function paintChapters() {
    frame = 0;
    const position = clamp((window.scrollY - work.offsetTop + stageTop) / (step * (workPanels.length - 1))) * (workPanels.length - 1);
    const active = Math.round(position);
    stage.style.setProperty('--work-opacity', boundaryOpacity(work).toFixed(3));
    if (!motionPreference.matches) {
      const { top } = finalChapter.getBoundingClientRect();
      const span = Math.max(1, window.innerHeight - header.getBoundingClientRect().bottom);
      finalContent.style.setProperty('--final-opacity', smooth((window.innerHeight - top) / span).toFixed(3));
    } else finalContent.style.removeProperty('--final-opacity');
    readingChapters.forEach(({ section, hold }) => {
      hold.style.setProperty('--reading-opacity', boundaryOpacity(section).toFixed(3));
    });
    workPanels.forEach((panel, index) => {
      const selected = !stageEnabled || index === active;
      const opacity = stageEnabled ? 1 - smooth((Math.abs(position - index) - 0.2) / 0.3) : 1;
      panel.style.setProperty('--chapter-opacity', opacity.toFixed(3));
      panel.classList.toggle('chapter-active', selected);
      panel.inert = !selected;
      panel.setAttribute('aria-hidden', String(!selected));
      if (!selected && panel.contains(document.activeElement)) document.activeElement.blur();
    });
    const total = document.documentElement.scrollHeight - window.innerHeight;
    document.documentElement.style.setProperty('--page-progress', total > 0 ? clamp(window.scrollY / total) : 0);
    const chapters = ['about', 'experience', 'work', 'contact'];
    let current = '';
    chapters.forEach(id => { if (document.getElementById(id).getBoundingClientRect().top < window.innerHeight * 0.5) current = id; });
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
      const target = link.hash === '#approach' ? 'work' : link.hash.slice(1);
      link.classList.toggle('active', target === current);
    });
  }
  function queueChapters() { if (!frame) frame = requestAnimationFrame(paintChapters); }
  function goToWorkPanel(id) {
    const reading = readingChapters.find(chapter => chapter.section.id === id && chapter.enabled);
    if (reading) {
      window.scrollTo({ top: reading.section.offsetTop - reading.pin + window.innerHeight * 0.3, behavior: 'smooth' });
      return true;
    }
    const index = workPanels.findIndex(panel => panel.id === id);
    if (!stageEnabled || index < 0) return false;
    window.scrollTo({ top: work.offsetTop - stageTop + step * index + (index === 0 ? window.innerHeight * 0.2 : 0), behavior: 'smooth' });
    return true;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (goToWorkPanel(link.hash.slice(1))) { event.preventDefault(); history.pushState(null, '', link.hash); }
  });
  window.addEventListener('popstate', () => goToWorkPanel(location.hash.slice(1)));
  window.addEventListener('scroll', queueChapters, { passive: true });
  window.addEventListener('resize', measureChapters, { passive: true });
  motionPreference.addEventListener('change', measureChapters);
  document.fonts.ready.then(measureChapters);
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
    el.addEventListener('pointermove', event => {
      if (!pointerMedia.matches || motionMedia.matches) return;
      const rect = el.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
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
