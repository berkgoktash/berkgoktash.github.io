(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- prevent browser scroll-restoration from fighting the boot screen ---------- */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);

  /* ---------- Commodore-style boot intro ---------- */
  const boot = document.getElementById('boot');
  const bootText = document.getElementById('boot-text');

  function finishBoot() {
    if (!boot) return;
    window.scrollTo(0, 0);
    boot.classList.add('done');
    document.body.classList.remove('boot-active');
    window.setTimeout(() => { boot.remove(); window.scrollTo(0, 0); }, 600);
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

    let i = 0;
    function type() {
      if (i <= typed.length) {
        textNode.nodeValue = prefix + typed.slice(0, i);
        i += 1;
        window.setTimeout(type, 55 + Math.random() * 55);
      } else {
        cursor.remove();
        bootText.textContent = prefix + typed + '\n\nPRESS PLAY ON TAPE';
        window.setTimeout(hideScreen, 900);
      }
    }
    window.setTimeout(type, 700);

    function hideScreen() {
      bootScreen.classList.add('hidden');
      window.setTimeout(showFull, 1200);
    }
    function showFull() {
      bootText.textContent = fullText;
      bootScreen.classList.remove('hidden');
      window.setTimeout(finishBoot, 1400);
    }
  } else if (boot) {
    finishBoot();
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
})();
