document.addEventListener('DOMContentLoaded', function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Lenis smooth scroll ---------- */
  var lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
    });

    if (window.gsap && window.gsap.ticker) {
      lenis.on('scroll', window.ScrollTrigger ? window.ScrollTrigger.update : null);
      window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      window.gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })();
    }
  }

  var hasGSAP = !reduceMotion && window.gsap && window.ScrollTrigger;
  if (hasGSAP) { window.gsap.registerPlugin(window.ScrollTrigger); }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (hasGSAP) {
    revealEls.forEach(function (el) {
      window.ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: function () { el.classList.add('in-view'); }
      });
    });
  } else if (!reduceMotion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ---------- Vanilla-tilt: subtle tilt on project cards ---------- */
  if (!reduceMotion && window.VanillaTilt) {
    window.VanillaTilt.init(document.querySelectorAll('.highlight-card[data-tilt]'), {
      max: 6,
      speed: 400,
      glare: false,
      scale: 1.01
    });

    /* Punchier FIFA-card-style tilt + glare for the hero photo */
    window.VanillaTilt.init(document.querySelectorAll('.squad-photo[data-tilt]'), {
      max: 18,
      speed: 500,
      perspective: 900,
      glare: true,
      'max-glare': 0.35,
      scale: 1.04,
      gyroscope: true
    });
  }

  /* ---------- Cleat cursor, scoped to the hero pitch only ----------
     Outside the hero, the cursor is left completely alone. */
  function initCleatCursor() {
    if (reduceMotion || !window.matchMedia('(pointer: fine)').matches) { return; }
    var hero = document.querySelector('.hero');
    if (!hero) { return; }

    var cleat = document.createElement('div');
    cleat.className = 'cleat-cursor';
    cleat.innerHTML =
      '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M6 34c0-3 2-5 5-6l14-5c3-1 5-1 8 1l9 6c2 1.3 3 3 3 5.5 0 2-1.5 3.5-3.5 3.5H9c-1.7 0-3-1.3-3-3v-2z" fill="#141414" stroke="#F4F1E8" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M11 28l3-7c.6-1.3 2-2 3.4-1.6l9 2.6" fill="none" stroke="#F4F1E8" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="14" cy="33" r="1" fill="#E8B923"/><circle cx="19" cy="34" r="1" fill="#E8B923"/><circle cx="24" cy="34.5" r="1" fill="#E8B923"/>' +
      '</svg>';
    document.body.appendChild(cleat);

    var moveX = hasGSAP ? window.gsap.quickTo(cleat, 'left', { duration: 0.12, ease: 'power2' }) : null;
    var moveY = hasGSAP ? window.gsap.quickTo(cleat, 'top', { duration: 0.12, ease: 'power2' }) : null;

    hero.addEventListener('mouseenter', function () {
      hero.classList.add('cleat-active');
      cleat.style.opacity = '1';
    });
    hero.addEventListener('mouseleave', function () {
      hero.classList.remove('cleat-active');
      cleat.style.opacity = '0';
    });
    hero.addEventListener('mousemove', function (e) {
      if (moveX && moveY) { moveX(e.clientX); moveY(e.clientY); }
      else { cleat.style.left = e.clientX + 'px'; cleat.style.top = e.clientY + 'px'; }
    });
  }
  initCleatCursor();

  /* ---------- Magnetic pull on buttons and footer social icons ---------- */
  function initMagnetic(selector, strength) {
    if (reduceMotion || !hasGSAP || !window.matchMedia('(pointer: fine)').matches) { return; }
    document.querySelectorAll(selector).forEach(function (el) {
      var xTo = window.gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
      var yTo = window.gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });

      el.addEventListener('mousemove', function (e) {
        var rect = el.getBoundingClientRect();
        xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
        yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
      });
      el.addEventListener('mouseleave', function () { xTo(0); yTo(0); });
    });
  }
  initMagnetic('.btn', 0.35);
  initMagnetic('.social-links-icons a', 0.5);

  /* ---------- Kickable physics ball in the hero (Matter.js) ----------
     Falls back to the existing CSS zigzag ball if reduced-motion is on,
     Matter.js failed to load, or football.png isn't found yet. Works via
     both mouse movement AND touch — kicking isn't a mouse-only concept,
     it just needed touch handling wired up. On narrow screens the ball
     is also confined to a strip above the text so it can't drift over it. */
  function initPhysicsBall() {
    if (reduceMotion) { return; }
    var hero = document.querySelector('.hero');
    var heroField = document.querySelector('.hero-field');
    var physicsLayer = document.querySelector('.physics-layer');
    var cssBall = document.querySelector('.pitch-ball-photo');
    if (!hero || !heroField || !physicsLayer || !window.Matter) { return; }

    var probe = new Image();
    probe.onload = function () { setup(probe.naturalWidth || 512, probe.naturalHeight || 512); };
    probe.onerror = function () { /* no football.png yet — keep the CSS ball */ };
    probe.src = 'football.png';

    function setup(naturalW, naturalH) {
      var Engine = Matter.Engine, Render = Matter.Render, Runner = Matter.Runner,
          Bodies = Matter.Bodies, Composite = Matter.Composite, Body = Matter.Body;

      var engine = Engine.create();
      engine.gravity.y = 0;

      function isMobile() { return window.innerWidth <= 640; }

      function getSize() {
        var rect = heroField.getBoundingClientRect();
        return { w: Math.max(rect.width, 1), h: Math.max(rect.height, 1) };
      }
      /* On mobile, keep the roaming area to the top ~30% of the hero —
         above the FIFA card and well clear of the name/role text below. */
      function getFloorY(h) { return isMobile() ? h * 0.3 : h + 30; }

      var size = getSize();

      var render = Render.create({
        element: physicsLayer,
        engine: engine,
        options: { width: size.w, height: size.h, wireframes: false, background: 'transparent' }
      });

      var radius = isMobile() ? 16 : 22;
      var ball = Bodies.circle(size.w * 0.15, size.h * (isMobile() ? 0.1 : 0.3), radius, {
        restitution: 0.92,
        friction: 0.02,
        frictionAir: 0.003,
        render: {
          sprite: {
            texture: 'football.png',
            xScale: (radius * 2) / naturalW,
            yScale: (radius * 2) / naturalH
          }
        }
      });
      Body.setVelocity(ball, { x: 3, y: 2 });
      Body.setAngularVelocity(ball, 0.06);

      var hidden = { isStatic: true, render: { visible: false } };
      var thickness = 60;
      var floorWall = Bodies.rectangle(size.w / 2, getFloorY(size.h) + thickness / 2, size.w, thickness, hidden);
      var walls = [
        Bodies.rectangle(size.w / 2, -thickness / 2, size.w, thickness, hidden),
        floorWall,
        Bodies.rectangle(-thickness / 2, size.h / 2, thickness, size.h, hidden),
        Bodies.rectangle(size.w + thickness / 2, size.h / 2, thickness, size.h, hidden)
      ];

      /* Rough goalpost colliders, scaled to match the goal-svg viewBox (1200x500).
         Skipped on mobile since the ball's confined zone sits above them anyway. */
      var goalBodies = [];
      if (!isMobile()) {
        var sx = size.w / 1200, sy = size.h / 500;
        goalBodies = [
          Bodies.rectangle(70 * sx, 250 * sy, 14, 420 * sy, hidden),
          Bodies.rectangle(1130 * sx, 250 * sy, 14, 420 * sy, hidden)
        ];
      }

      Composite.add(engine.world, walls.concat([ball]).concat(goalBodies));

      /* Keeps the ball gently wandering forever instead of coasting to a
         stop — only tops it up with a small random nudge once it's
         nearly at rest, so kicks are never fought or dampened. */
      Matter.Events.on(engine, 'beforeUpdate', function () {
        var speed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
        if (speed < 0.4) {
          Body.setVelocity(ball, {
            x: ball.velocity.x + (Math.random() - 0.5) * 0.5,
            y: ball.velocity.y + (Math.random() - 0.5) * 0.5
          });
        }
      });

      Render.run(render);
      var runner = Runner.create();
      Runner.run(runner, engine);

      if (cssBall) { cssBall.style.display = 'none'; }

      /* Touch-to-kick / cursor-to-kick: no drag needed — moving through
         the ball nudges its velocity in the direction and speed of that
         movement. Shared by mouse and touch alike. */
      var lastPoint = null;
      function kickAt(clientX, clientY) {
        var rect = physicsLayer.getBoundingClientRect();
        var mx = clientX - rect.left;
        var my = clientY - rect.top;
        var now = performance.now();

        if (lastPoint) {
          var dt = Math.max((now - lastPoint.t) / 1000, 0.001);
          var vx = (mx - lastPoint.x) / dt;
          var vy = (my - lastPoint.y) / dt;
          var dx = ball.position.x - mx;
          var dy = ball.position.y - my;
          var dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < radius + 16) {
            Body.setVelocity(ball, {
              x: Matter.Common.clamp(ball.velocity.x + vx * 0.045, -9, 9),
              y: Matter.Common.clamp(ball.velocity.y + vy * 0.045, -9, 9)
            });
          }
        }
        lastPoint = { x: mx, y: my, t: now };
      }
      function resetPoint() { lastPoint = null; }

      hero.addEventListener('mousemove', function (e) { kickAt(e.clientX, e.clientY); });
      hero.addEventListener('mouseleave', resetPoint);
      hero.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) { kickAt(e.touches[0].clientX, e.touches[0].clientY); }
      }, { passive: true });
      hero.addEventListener('touchend', resetPoint);
      hero.addEventListener('touchcancel', resetPoint);

      window.addEventListener('resize', function () {
        var s = getSize();
        render.canvas.width = s.w;
        render.canvas.height = s.h;
        render.options.width = s.w;
        render.options.height = s.h;
        Body.setPosition(walls[0], { x: s.w / 2, y: -thickness / 2 });
        Body.setPosition(floorWall, { x: s.w / 2, y: getFloorY(s.h) + thickness / 2 });
        Body.setPosition(walls[2], { x: -thickness / 2, y: s.h / 2 });
        Body.setPosition(walls[3], { x: s.w + thickness / 2, y: s.h / 2 });
      });
    }
  }
  initPhysicsBall();

  /* ---------- Live match clock: climbs from 90+1' to 90+30' then holds ---------- */
  var clockEl = document.getElementById('matchClock');
  if (clockEl) {
    var extra = 1;
    if (!reduceMotion) {
      var clockTimer = setInterval(function () {
        extra += 1;
        clockEl.textContent = "90+" + extra + "'";
        if (extra >= 30) { clearInterval(clockTimer); }
      }, 4000);
    } else {
      clockEl.textContent = "90+30'";
    }
  }

  /* ---------- Football marker riding each timeline ----------
     Each ball fades in shortly after its own segment starts, travels
     down tracking scroll, then fades out shortly before its segment
     ends — so it's invisible during Half Time and never appears
     early or stays stuck once you've scrolled past it. */
  if (hasGSAP) {
    document.querySelectorAll('.timeline').forEach(function (tl) {
      var ball = tl.querySelector('.scroll-ball');
      if (!ball) { return; }
      var ballImg = ball.querySelector('img');
      var scrollConf = { trigger: tl, start: 'top center', end: 'bottom center', scrub: 0.4 };

      window.gsap.to(ball, {
        keyframes: {
          '0%':   { top: '0%',   opacity: 0 },
          '15%':  { top: '15%',  opacity: 1 },
          '85%':  { top: '85%',  opacity: 1 },
          '100%': { top: '100%', opacity: 0 }
        },
        ease: 'none',
        scrollTrigger: scrollConf
      });

      if (ballImg) {
        window.gsap.to(ballImg, {
          rotate: 720,
          ease: 'none',
          scrollTrigger: { trigger: tl, start: 'top center', end: 'bottom center', scrub: 0.4 }
        });
      }
    });
  }

  /* ---------- Radar (spider) charts for the Skills section ---------- */
  function buildRadarSVG(items) {
    var size = 200;
    var center = size / 2;
    var radius = center - 40;
    var levels = 4;
    var n = items.length;
    var angleStep = (Math.PI * 2) / n;

    function angleOf(i) { return -Math.PI / 2 + i * angleStep; }
    function pointAt(i, value) {
      var r = (value / 100) * radius;
      var a = angleOf(i);
      return [center + r * Math.cos(a), center + r * Math.sin(a)];
    }

    var rings = '';
    for (var lvl = 1; lvl <= levels; lvl++) {
      var r = (radius * lvl) / levels;
      var pts = [];
      for (var i = 0; i < n; i++) {
        var a = angleOf(i);
        pts.push((center + r * Math.cos(a)).toFixed(1) + ',' + (center + r * Math.sin(a)).toFixed(1));
      }
      rings += '<polygon points="' + pts.join(' ') + '" class="radar-ring" />';
    }

    var axes = '';
    var labels = '';
    items.forEach(function (item, i) {
      var a = angleOf(i);
      var x2 = center + radius * Math.cos(a);
      var y2 = center + radius * Math.sin(a);
      axes += '<line x1="' + center + '" y1="' + center + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" class="radar-axis" />';

      var lx = center + (radius + 14) * Math.cos(a);
      var ly = center + (radius + 14) * Math.sin(a);
      var anchor = 'middle';
      if (Math.cos(a) > 0.25) { anchor = 'start'; }
      else if (Math.cos(a) < -0.25) { anchor = 'end'; }

      /* Two-word skill names ("Power BI", "SQL Server") stack onto two lines
         so nothing runs off the edge of the small chart. */
      var words = item[0].split(' ');
      var line1 = words.length > 1 ? words.slice(0, -1).join(' ') : words[0];
      var line2 = words.length > 1 ? words[words.length - 1] : null;

      var tspans = '<tspan x="' + lx.toFixed(1) + '" dy="0">' + line1 + '</tspan>';
      if (line2) {
        tspans += '<tspan x="' + lx.toFixed(1) + '" dy="9">' + line2 + '</tspan>';
      }
      labels += '<text y="' + ly.toFixed(1) + '" text-anchor="' + anchor + '" class="radar-label">' + tspans + '</text>';
    });

    var dataPoints = items.map(function (item, i) { return pointAt(i, item[1]); });
    var dataPts = dataPoints.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); });
    var dots = dataPoints.map(function (p) {
      return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.5" class="radar-dot" />';
    }).join('');

    return '<svg viewBox="0 0 ' + size + ' ' + size + '" class="radar-svg">' +
      rings + axes +
      '<polygon points="' + dataPts.join(' ') + '" class="radar-shape" />' +
      dots + labels +
      '</svg>';
  }

  document.querySelectorAll('.radar-canvas').forEach(function (canvas) {
    var items;
    try {
      items = JSON.parse(canvas.getAttribute('data-radar'));
      canvas.innerHTML = buildRadarSVG(items);
    } catch (e) {
      /* malformed data-radar attribute — leave canvas empty rather than break the page */
      return;
    }

    var shape = canvas.querySelector('.radar-shape');
    var rings = canvas.querySelectorAll('.radar-ring');
    var axes = canvas.querySelectorAll('.radar-axis');
    var dots = canvas.querySelectorAll('.radar-dot');
    var labels = canvas.querySelectorAll('.radar-label');

    var canDraw = hasGSAP && shape && typeof shape.getTotalLength === 'function';
    var len = 0;
    if (canDraw) {
      try { len = shape.getTotalLength(); } catch (err) { canDraw = false; }
    }

    if (!canDraw || !len) { return; } /* falls back to showing the chart fully drawn, as before */

    window.gsap.set(shape, { strokeDasharray: len, strokeDashoffset: len, fillOpacity: 0 });
    window.gsap.set(dots, { opacity: 0, scale: 0, transformOrigin: '50% 50%' });
    window.gsap.set([rings, axes, labels], { opacity: 0 });

    window.ScrollTrigger.create({
      trigger: canvas,
      start: 'top 85%',
      once: true,
      onEnter: function () {
        window.gsap.timeline()
          .to([rings, axes, labels], { opacity: 1, duration: 0.4, stagger: 0.03 })
          .to(shape, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out' }, '-=0.1')
          .to(shape, { fillOpacity: 1, duration: 0.5 }, '-=0.3')
          .to(dots, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.04, ease: 'back.out(2)' }, '-=0.4');
      }
    });
  });

  /* ---------- Smooth anchor scrolling ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) { return; }
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -20 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});
