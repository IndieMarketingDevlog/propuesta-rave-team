(function () {
  var sheetOverlay = document.getElementById('sheetOverlay');
  var sheetContent = document.getElementById('sheetContent');
  var sheetScroll = document.getElementById('sheetScroll');
  var summaryOverlay = document.getElementById('summaryOverlay');
  var summaryContent = document.getElementById('summaryContent');
  var welcomeOverlay = document.getElementById('welcomeOverlay');
  var welcomeContent = document.getElementById('welcomeContent');
  var panels = document.querySelectorAll('[data-panel]');
  var lastOrigin = null;
  var closeTimer = null;

  var OPEN_MS = 850;
  var CLOSE_MS = 620; // must match the .overlay opacity transition duration in styles.css

  function isDesktopLayout() {
    return window.matchMedia('(min-width: 820px)').matches;
  }

  // reads the rotation (in degrees) a folder is currently tilted at, so the sheet
  // can animate to/from that same angle instead of popping straight upright
  function getRotationDeg(el) {
    var st = window.getComputedStyle(el).transform;
    if (!st || st === 'none') return 0;
    var m = st.match(/matrix\(([^)]+)\)/);
    if (!m) return 0;
    var v = m[1].split(',').map(Number);
    return Math.atan2(v[1], v[0]) * (180 / Math.PI);
  }

  // ---------- SHEET: opens/closes as if the paper slides out of the folder ----------

  function openSheet(name, originEl) {
    closeSummary();
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }

    panels.forEach(function (p) {
      p.hidden = p.getAttribute('data-panel') !== name;
    });
    sheetScroll.scrollTop = 0;
    sheetOverlay.classList.remove('closing');
    sheetOverlay.classList.add('open');

    var originRect = originEl ? originEl.getBoundingClientRect() : null;
    var targetRect = sheetContent.getBoundingClientRect();

    if (originRect && targetRect.width && targetRect.height) {
      var originDeg = getRotationDeg(originEl);
      var dx = (originRect.left + originRect.width / 2) - (targetRect.left + targetRect.width / 2);
      var dy = (originRect.top + originRect.height / 2) - (targetRect.top + targetRect.height / 2);
      var sx = Math.max(originRect.width / targetRect.width, 0.08);
      var sy = Math.max(originRect.height / targetRect.height, 0.08);

      sheetContent.style.transition = 'none';
      sheetContent.style.opacity = '0';
      sheetContent.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + originDeg + 'deg) scale(' + sx + ',' + sy + ')';
      // force reflow so the browser registers the start state before animating
      void sheetContent.offsetWidth;

      requestAnimationFrame(function () {
        sheetContent.style.transition = 'transform ' + OPEN_MS + 'ms cubic-bezier(.19,1,.22,1), opacity ' + Math.round(OPEN_MS * 0.6) + 'ms ease';
        sheetContent.style.transform = 'translate(0,0) rotate(0deg) scale(1,1)';
        sheetContent.style.opacity = '1';
      });
    } else {
      sheetContent.style.transition = 'opacity .3s ease';
      sheetContent.style.transform = 'none';
      sheetContent.style.opacity = '1';
    }

    lastOrigin = originEl || null;
  }

  function closeSheet() {
    if (!sheetOverlay.classList.contains('open') || sheetOverlay.classList.contains('closing')) return;

    var originRect = lastOrigin ? lastOrigin.getBoundingClientRect() : null;
    var currentRect = sheetContent.getBoundingClientRect();
    sheetOverlay.classList.add('closing');

    if (originRect && currentRect.width && currentRect.height) {
      var originDeg = getRotationDeg(lastOrigin);
      var dx = (originRect.left + originRect.width / 2) - (currentRect.left + currentRect.width / 2);
      var dy = (originRect.top + originRect.height / 2) - (currentRect.top + currentRect.height / 2);
      var sx = Math.max(originRect.width / currentRect.width, 0.08);
      var sy = Math.max(originRect.height / currentRect.height, 0.08);

      sheetContent.style.transition = 'transform ' + CLOSE_MS + 'ms cubic-bezier(.7,0,.84,0), opacity ' + Math.round(CLOSE_MS * 0.85) + 'ms ease';
      sheetContent.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + originDeg + 'deg) scale(' + sx + ',' + sy + ')';
      sheetContent.style.opacity = '0';
      closeTimer = setTimeout(finishCloseSheet, CLOSE_MS);
    } else {
      sheetContent.style.transition = 'opacity .25s ease';
      sheetContent.style.opacity = '0';
      closeTimer = setTimeout(finishCloseSheet, 250);
    }
  }

  function finishCloseSheet() {
    sheetOverlay.classList.remove('open', 'closing');
    sheetContent.style.transition = '';
    sheetContent.style.transform = '';
    sheetContent.style.opacity = '';
    lastOrigin = null;
    closeTimer = null;
  }

  // ---------- SUMMARY: "run complete" popup ----------

  function openSummary() {
    closeSheet();
    summaryOverlay.classList.remove('closing');
    summaryOverlay.classList.add('open');
  }

  function closeSummary() {
    if (!summaryOverlay.classList.contains('open') || summaryOverlay.classList.contains('closing')) return;
    summaryOverlay.classList.add('closing');
    setTimeout(function () {
      summaryOverlay.classList.remove('open', 'closing');
    }, 250);
  }

  // ---------- WELCOME: shown once when the page loads ----------

  function closeWelcome() {
    if (!welcomeOverlay.classList.contains('open') || welcomeOverlay.classList.contains('closing')) return;
    welcomeOverlay.classList.add('closing');
    setTimeout(function () {
      welcomeOverlay.classList.remove('open', 'closing');
    }, 250);
  }

  function closeAll() {
    closeSheet();
    closeSummary();
    closeWelcome();
  }

  welcomeOverlay.classList.add('open');
  document.getElementById('welcomeCloseBtn').addEventListener('click', closeWelcome);
  document.getElementById('welcomeOkBtn').addEventListener('click', closeWelcome);
  welcomeOverlay.addEventListener('click', function (e) {
    if (e.target === welcomeOverlay) closeWelcome();
  });
  welcomeContent.addEventListener('click', function (e) { e.stopPropagation(); });

  document.querySelectorAll('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var folder = btn.closest('.folder');
      if (folder && folder.dataset.justDragged) return;
      openSheet(btn.getAttribute('data-open'), folder || btn);
    });
  });

  document.getElementById('openSummaryBtn').addEventListener('click', openSummary);
  document.getElementById('sheetCloseBtn').addEventListener('click', closeSheet);
  document.getElementById('summaryCloseBtn').addEventListener('click', closeSummary);

  sheetOverlay.addEventListener('click', function (e) {
    if (e.target === sheetOverlay) closeSheet();
  });
  summaryOverlay.addEventListener('click', function (e) {
    if (e.target === summaryOverlay) closeSummary();
  });
  sheetContent.addEventListener('click', function (e) { e.stopPropagation(); });
  summaryContent.addEventListener('click', function (e) { e.stopPropagation(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  // ---------- FOLDER DRAG ----------

  // Uses document-level listeners (not setPointerCapture) because capturing the
  // pointer on an ancestor other than the mousedown target suppresses the
  // synthesized "click" event in some browsers, which broke opening folders.
  function makeDraggable(folder) {
    var active = false, moved = false;
    var startX = 0, startY = 0, origLeft = 0, origTop = 0, pointerId = null;

    function onMove(e) {
      if (!active || e.pointerId !== pointerId) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;

      if (!moved) {
        if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return;
        moved = true;
        folder.classList.add('dragging');
      }

      var desktop = folder.parentElement;
      var deskRect = desktop.getBoundingClientRect();
      var maxLeft = Math.max(0, deskRect.width - folder.offsetWidth);
      var maxTop = Math.max(0, deskRect.height - folder.offsetHeight);

      var newLeft = Math.min(Math.max(origLeft + dx, 0), maxLeft);
      var newTop = Math.min(Math.max(origTop + dy, 0), maxTop);

      folder.style.left = newLeft + 'px';
      folder.style.top = newTop + 'px';
    }

    function onUp(e) {
      if (!active || e.pointerId !== pointerId) return;
      active = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      folder.classList.remove('dragging');
      if (moved) {
        folder.dataset.justDragged = '1';
        setTimeout(function () { delete folder.dataset.justDragged; }, 0);
      }
    }

    folder.addEventListener('pointerdown', function (e) {
      if (!isDesktopLayout()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      var desktop = folder.parentElement;
      var folderRect = folder.getBoundingClientRect();
      var deskRect = desktop.getBoundingClientRect();

      origLeft = folderRect.left - deskRect.left;
      origTop = folderRect.top - deskRect.top;
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      active = true;
      pointerId = e.pointerId;

      folder.style.right = 'auto';
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }

  document.querySelectorAll('.folder').forEach(makeDraggable);

  window.addEventListener('resize', function () {
    if (isDesktopLayout()) return;
    document.querySelectorAll('.folder').forEach(function (folder) {
      folder.style.left = '';
      folder.style.top = '';
      folder.style.right = '';
    });
  });
})();
