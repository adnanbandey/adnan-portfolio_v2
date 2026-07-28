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

  /* ---------- Vanilla-tilt on project cards ---------- */
  if (!reduceMotion && window.VanillaTilt) {
    window.VanillaTilt.init(document.querySelectorAll('[data-tilt]'), {
      max: 6,
      speed: 400,
      glare: false,
      scale: 1.01
    });
  }

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
    try {
      var items = JSON.parse(canvas.getAttribute('data-radar'));
      canvas.innerHTML = buildRadarSVG(items);
    } catch (e) {
      /* malformed data-radar attribute — leave canvas empty rather than break the page */
    }
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
