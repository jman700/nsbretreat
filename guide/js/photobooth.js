// photobooth.js — Photo Booth (guide only)
(function () {
  'use strict';

  var section = document.getElementById('pb-section');
  if (!section) return;

  // ── Output dimensions ──────────────────────────────────
  var OUT_W = 900, OUT_H = 1200;

  // ── State ──────────────────────────────────────────────
  var facing       = 'environment'; // rear camera default
  var stream       = null;
  var activeFrame  = 'minimal';
  var resultBlob   = null;

  // ── Supabase (background upload, silent) ───────────────
  var pbSb = (typeof supabase !== 'undefined')
    ? supabase.createClient(
        'https://xittuxwilxmzzawjdivd.supabase.co',
        'sb_publishable_AxzdizEiC3FOPYdzS3lPWA_H1aH9hSV'
      )
    : null;

  // ── Frame SVG definitions ──────────────────────────────
  function getFrameSvg(id) {
    var frames = {

      // Minimal / Elegant
      minimal: [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">',
          '<rect x="14" y="14" width="872" height="1172" fill="none" stroke="white" stroke-width="4" opacity="0.9"/>',
          '<rect x="27" y="27" width="846" height="1146" fill="none" stroke="white" stroke-width="1" opacity="0.38"/>',
          '<rect x="0" y="1044" width="900" height="156" fill="rgba(0,0,0,0.54)"/>',
          '<line x1="220" y1="1060" x2="680" y2="1060" stroke="white" stroke-width="0.7" opacity="0.32"/>',
          '<text x="450" y="1100" text-anchor="middle" fill="white" font-family="Georgia,serif" font-size="38" letter-spacing="8">THE NSB RETREAT</text>',
          '<text x="450" y="1134" text-anchor="middle" fill="white" font-family="Georgia,serif" font-size="21" letter-spacing="4" opacity="0.72" font-style="italic">New Smyrna Beach, FL</text>',
          '<text x="450" y="1168" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="22" letter-spacing="3" opacity="0.58">@thensbretreat</text>',
        '</svg>'
      ].join(''),

      // Beach / Coastal
      beach: [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">',
          // Wave bottom
          '<path d="M0,1088 C150,1048 300,1128 450,1088 C600,1048 750,1128 900,1088 L900,1200 L0,1200 Z" fill="white" opacity="0.93"/>',
          '<path d="M0,1120 C150,1098 300,1145 450,1120 C600,1098 750,1145 900,1120 L900,1200 L0,1200 Z" fill="white" opacity="0.6"/>',
          // Text on wave
          '<text x="450" y="1132" text-anchor="middle" fill="#1a4a6b" font-family="Georgia,serif" font-size="32" letter-spacing="5">THE NSB RETREAT</text>',
          '<text x="450" y="1160" text-anchor="middle" fill="#2a6a8a" font-family="Georgia,serif" font-size="19" letter-spacing="3" font-style="italic">New Smyrna Beach, FL</text>',
          '<text x="450" y="1188" text-anchor="middle" fill="#4a8aaa" font-family="Arial,sans-serif" font-size="20" letter-spacing="3">@thensbretreat</text>',
          // Compass — top left
          '<circle cx="46" cy="46" r="28" fill="none" stroke="white" stroke-width="2" opacity="0.85"/>',
          '<line x1="46" y1="18" x2="46" y2="74" stroke="white" stroke-width="2" opacity="0.85"/>',
          '<line x1="18" y1="46" x2="74" y2="46" stroke="white" stroke-width="2" opacity="0.85"/>',
          '<circle cx="46" cy="46" r="3" fill="white" opacity="0.85"/>',
          // Compass — top right
          '<circle cx="854" cy="46" r="28" fill="none" stroke="white" stroke-width="2" opacity="0.85"/>',
          '<line x1="854" y1="18" x2="854" y2="74" stroke="white" stroke-width="2" opacity="0.85"/>',
          '<line x1="826" y1="46" x2="882" y2="46" stroke="white" stroke-width="2" opacity="0.85"/>',
          '<circle cx="854" cy="46" r="3" fill="white" opacity="0.85"/>',
        '</svg>'
      ].join(''),

      // Tropical / Vibrant
      tropical: [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">',
          // Border bars
          '<rect x="0" y="0" width="900" height="76" fill="#d94f38" opacity="0.84"/>',
          '<rect x="0" y="1124" width="900" height="76" fill="#d94f38" opacity="0.84"/>',
          '<rect x="0" y="0" width="22" height="1200" fill="#d94f38" opacity="0.84"/>',
          '<rect x="878" y="0" width="22" height="1200" fill="#d94f38" opacity="0.84"/>',
          // Top text
          '<text x="450" y="51" text-anchor="middle" fill="white" font-family="Georgia,serif" font-size="28" letter-spacing="6">THE NSB RETREAT</text>',
          // Bottom text (extend bar to fit 3 lines)
          '<rect x="0" y="1110" width="900" height="90" fill="#d94f38" opacity="0.84"/>',
          '<text x="450" y="1141" text-anchor="middle" fill="white" font-family="Georgia,serif" font-size="26" letter-spacing="5">THE NSB RETREAT</text>',
          '<text x="450" y="1164" text-anchor="middle" fill="white" font-family="Georgia,serif" font-size="17" letter-spacing="3" opacity="0.88" font-style="italic">New Smyrna Beach, FL</text>',
          '<text x="450" y="1187" text-anchor="middle" fill="white" font-family="Arial,sans-serif" font-size="18" letter-spacing="3" opacity="0.8">@thensbretreat</text>',
          // Palm leaves — top left
          '<path d="M22,76 C50,20 110,18 130,46 C100,46 62,58 22,76 Z" fill="#2a7a4e" opacity="0.82"/>',
          '<path d="M22,76 C36,14 90,6 106,34 C80,38 50,56 22,76 Z" fill="#3a9e68" opacity="0.72"/>',
          '<path d="M22,76 C70,40 122,52 138,72 C108,66 62,66 22,76 Z" fill="#2a7a4e" opacity="0.7"/>',
          // Palm leaves — top right
          '<path d="M878,76 C850,20 790,18 770,46 C800,46 838,58 878,76 Z" fill="#2a7a4e" opacity="0.82"/>',
          '<path d="M878,76 C864,14 810,6 794,34 C820,38 850,56 878,76 Z" fill="#3a9e68" opacity="0.72"/>',
          '<path d="M878,76 C830,40 778,52 762,72 C792,66 838,66 878,76 Z" fill="#2a7a4e" opacity="0.7"/>',
        '</svg>'
      ].join(''),

      // Retro / Polaroid — authentic proportions
      // Real Polaroid: thin top/sides (~6%), thick bottom (~25% of total height)
      // Cream/off-white border, clean sans-serif, subtle hairline at photo edge
      polaroid: [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200">',
          // Outer card edge — very slightly warm gray to look like plastic casing
          '<rect x="0" y="0" width="900" height="1200" fill="#e8e2da"/>',
          // Main cream body
          '<rect x="6" y="6" width="888" height="1188" fill="#fdf9f3"/>',
          // Top border (thin ~48px)
          '<rect x="6" y="6" width="888" height="48" fill="#fdf9f3"/>',
          // Side borders (thin ~56px each)
          '<rect x="6" y="6" width="56" height="892" fill="#fdf9f3"/>',
          '<rect x="838" y="6" width="56" height="892" fill="#fdf9f3"/>',
          // Thick bottom caption strip (~300px, ~25% of 1200)
          '<rect x="6" y="898" width="888" height="296" fill="#fdf9f3"/>',
          // Very subtle inner shadow at top of caption strip
          '<rect x="62" y="898" width="776" height="3" fill="rgba(0,0,0,0.07)"/>',
          // Hairline separator
          '<line x1="62" y1="901" x2="838" y2="901" stroke="#ddd5c8" stroke-width="1"/>',
          // Caption text — clean, physical feel
          '<text x="450" y="1000" text-anchor="middle" fill="#1c1510" font-family="Helvetica Neue,Arial,sans-serif" font-size="44" font-weight="300" letter-spacing="3">The NSB Retreat</text>',
          '<text x="450" y="1052" text-anchor="middle" fill="#6a5a4a" font-family="Helvetica Neue,Arial,sans-serif" font-size="24" font-weight="300" letter-spacing="2" font-style="italic">New Smyrna Beach, FL</text>',
          '<text x="450" y="1098" text-anchor="middle" fill="#9a8a7a" font-family="Helvetica Neue,Arial,sans-serif" font-size="22" font-weight="300" letter-spacing="3">@thensbretreat</text>',
        '</svg>'
      ].join('')
    };
    return frames[id] || frames.minimal;
  }

  function frameSrc(id) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(getFrameSvg(id));
  }

  // ── DOM refs ───────────────────────────────────────────
  var elStart   = document.getElementById('pb-start');
  var elCamera  = document.getElementById('pb-camera');
  var elPreview = document.getElementById('pb-preview');
  var video     = document.getElementById('pb-video');
  var frameImg  = document.getElementById('pb-frame-img');
  var canvas    = document.getElementById('pb-canvas');
  var resultImg = document.getElementById('pb-result-img');

  // ── Screen transitions ─────────────────────────────────
  function showStart() {
    elStart.style.display   = '';
    elCamera.style.display  = 'none';
    elPreview.style.display = 'none';
    stopStream();
  }
  function showCamera() {
    elStart.style.display   = 'none';
    elCamera.style.display  = '';
    elPreview.style.display = 'none';
  }
  function showPreview() {
    elStart.style.display   = 'none';
    elCamera.style.display  = 'none';
    elPreview.style.display = '';
  }

  // ── Camera ─────────────────────────────────────────────
  function startCamera() {
    stopStream();
    var constraints = {
      video: {
        facingMode: facing,
        width:  { ideal: 1280 },
        height: { ideal: 960  }
      },
      audio: false
    };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function (s) {
        stream = s;
        video.srcObject = s;
        video.play();
        video.style.transform = (facing === 'user') ? 'scaleX(-1)' : 'none';
        showCamera();
        updateFrameOverlay();
      })
      .catch(function (err) {
        alert('Camera access denied or unavailable: ' + (err.message || err));
      });
  }

  function stopStream() {
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    if (video) video.srcObject = null;
  }

  function updateFrameOverlay() {
    if (frameImg) frameImg.src = frameSrc(activeFrame);
  }

  // ── Capture ────────────────────────────────────────────
  function capture() {
    var btn = document.getElementById('pb-capture-btn');
    if (btn) { btn.disabled = true; }

    canvas.width  = OUT_W;
    canvas.height = OUT_H;
    var ctx = canvas.getContext('2d');

    // Draw video (mirror if front camera)
    if (facing === 'user') {
      ctx.save();
      ctx.translate(OUT_W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, OUT_W, OUT_H);
      ctx.restore();
    } else {
      ctx.drawImage(video, 0, 0, OUT_W, OUT_H);
    }

    // Draw frame overlay
    var fImg = new Image();
    fImg.onload = function () {
      ctx.drawImage(fImg, 0, 0, OUT_W, OUT_H);
      canvas.toBlob(function (blob) {
        if (btn) { btn.disabled = false; }
        resultBlob = blob;
        resultImg.src = URL.createObjectURL(blob);
        showPreview();
        uploadSilent(blob);
      }, 'image/jpeg', 0.92);
    };
    fImg.onerror = function () {
      // Fallback: save without frame
      canvas.toBlob(function (blob) {
        if (btn) { btn.disabled = false; }
        resultBlob = blob;
        resultImg.src = URL.createObjectURL(blob);
        showPreview();
        uploadSilent(blob);
      }, 'image/jpeg', 0.92);
    };
    fImg.src = frameSrc(activeFrame);
  }

  // ── Background upload (silent, no user feedback) ───────
  function uploadSilent(blob) {
    if (!pbSb) return;
    try {
      var filename = 'booth-' + Date.now() + '.jpg';
      pbSb.storage.from('photo-booth')
        .upload(filename, blob, { contentType: 'image/jpeg' })
        .then(function () {})
        .catch(function () {});
    } catch (e) {}
  }

  // ── Native share sheet (iOS/Android) or fallback download ──
  function nativeShareOrDownload() {
    if (!resultBlob) return;
    var file = new File([resultBlob], 'the-nsb-retreat.jpg', { type: 'image/jpeg' });
    var shareData = { files: [file], title: 'The NSB Retreat' };
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData).catch(function () {});
    } else {
      // Desktop fallback — trigger browser download
      var a = document.createElement('a');
      a.href     = URL.createObjectURL(resultBlob);
      a.download = 'the-nsb-retreat.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }

  // Save and Share both use the native sheet on mobile
  function downloadPhoto() { nativeShareOrDownload(); }
  function sharePhoto()    { nativeShareOrDownload(); }

  // ── Events ─────────────────────────────────────────────
  document.getElementById('pb-open-btn').addEventListener('click', function () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera not supported on this browser.');
      return;
    }
    startCamera();
  });

  document.getElementById('pb-flip-btn').addEventListener('click', function () {
    facing = (facing === 'environment') ? 'user' : 'environment';
    startCamera();
  });

  document.getElementById('pb-capture-btn').addEventListener('click', capture);

  document.getElementById('pb-retake-btn').addEventListener('click', function () {
    showCamera();
    if (!stream) startCamera();
  });

  document.getElementById('pb-download-btn').addEventListener('click', downloadPhoto);
  document.getElementById('pb-share-btn').addEventListener('click', sharePhoto);

  // Frame selector
  document.querySelectorAll('.pb-frame-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.pb-frame-opt').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      activeFrame = btn.dataset.frame;
      updateFrameOverlay();
    });
  });

  // Stop camera on page hide / unload
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopStream();
  });
  window.addEventListener('pagehide', stopStream);

})();
