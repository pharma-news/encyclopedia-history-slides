/* Необязательный прогрессивный слой: клавиатура, счётчик, точки, фолбэк-анимации.
   Без этого файла презентация полностью рабочая — прокрутка, снап и CSS-анимации. */
(function () {
  'use strict';

  var root = document.documentElement;
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('.dots a'));
  var counter = document.querySelector('[data-counter]');
  var bar = document.querySelector('[data-progress]');
  var nextBtn = document.querySelector('[data-next]');
  var nav = Array.prototype.slice.call(document.querySelectorAll('.topbar__nav a'));
  if (!slides.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = -1;

  /* к каждой ссылке раздела привязан номер слайда, к которому она ведёт */
  var navIndex = nav.map(function (a) {
    var id = (a.getAttribute('href') || '').slice(1);
    for (var k = 0; k < slides.length; k++) { if (slides[k].id === id) return k; }
    return -1;
  });

  function pad(n) { return String(n).padStart(2, '0'); }
  function total() { return pad(slides.length); }

  function setActive(i) {
    if (i === current) return;
    current = i;

    dots.forEach(function (d, k) {
      d.classList.toggle('is-active', k === i);
      if (k === i) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });

    /* подсветка раздела, которому принадлежит слайд */
    var best = -1;
    navIndex.forEach(function (idx, k) { if (idx >= 0 && idx <= i) best = k; });
    nav.forEach(function (a, k) { a.classList.toggle('is-on', k === best); });

    if (counter) counter.textContent = pad(i + 1) + '\u00a0/\u00a0' + total();

    if (nextBtn) {
      var last = i >= slides.length - 1;
      var target = slides[Math.min(i + 1, slides.length - 1)];
      nextBtn.href = '#' + (target.id || 'top');
      nextBtn.style.opacity = last ? '0' : '';
      nextBtn.style.pointerEvents = last ? 'none' : '';
    }

    // цвет эпохи перетекает в глобальные слои
    var cs = getComputedStyle(slides[i]);
    var acc = cs.getPropertyValue('--acc').trim();
    var acc2 = cs.getPropertyValue('--acc-2').trim();
    if (acc) root.style.setProperty('--acc', acc);
    if (acc2) root.style.setProperty('--acc-2', acc2);
  }

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  var ticking = false;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var docH = root.scrollHeight - vh;
    if (bar) bar.style.setProperty('--p', docH > 0 ? Math.min(1, Math.max(0, root.scrollTop / docH)).toFixed(4) : '1');

    var idx = 0;
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].getBoundingClientRect().top <= vh * 0.5) idx = i;
    }
    setActive(idx);
  }
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  /* авто-вписывание: если контент не помещается во вьюпорт, немного уменьшаем его
     (единица макета не учитывает переносы строк и высоту фотографий) */
  function fit() {
    var vh = window.innerHeight;
    slides.forEach(function (s) {
      var f = s.querySelector('.frame, .cover__body');
      if (!f) return;
      f.style.setProperty('--fit', '1');
      var cs = getComputedStyle(s);
      var avail = Math.min(s.clientHeight, vh) - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var need = f.getBoundingClientRect().height;
      if (need > 0 && need > avail) f.style.setProperty('--fit', Math.max(0.72, avail / need).toFixed(3));
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { fit(); onScroll(); }, { passive: true });
  fit();
  update();
  Array.prototype.forEach.call(document.querySelectorAll('.shot img'), function (img) {
    img.addEventListener('load', fit);
  });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fit); }
  setTimeout(fit, 500);

  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Spacebar') { go(current + 1); e.preventDefault(); }
    else if (k === 'ArrowUp' || k === 'PageUp') { go(current - 1); e.preventDefault(); }
    else if (k === 'Home') { go(0); e.preventDefault(); }
    else if (k === 'End') { go(slides.length - 1); e.preventDefault(); }
    else if (k === 'f' || k === 'F' || k === 'а' || k === 'А') {
      if (!document.fullscreenElement) { (root.requestFullscreen || function () {}).call(root); }
      else if (document.exitFullscreen) { document.exitFullscreen(); }
    }
  });

  /* фолбэк появления контента для браузеров без scroll-driven animations */
  var hasSDA = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()'));
  if (!hasSDA && 'IntersectionObserver' in window) {
    root.classList.add('no-sda');
    var sel = '.head, .prose > *, .visual > *, .lead--narrow, .grid4, .timeline, .callout--big, .finale';
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    slides.forEach(function (s) {
      Array.prototype.forEach.call(s.querySelectorAll(sel), function (el) {
        el.classList.add('reveal');
        io.observe(el);
      });
    });
  }
})();
