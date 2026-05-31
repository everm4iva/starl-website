(function () {
  // Helpers
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Track global pointer (mouse/touch)
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  // Header state: transparent at top, rounded dark glass after scrolling
  const headEl = document.querySelector('.head');
  const syncHeaderState = () => {
    if (!headEl) return;
    headEl.classList.toggle('head-scrolled', window.scrollY > 8);
  };
  syncHeaderState();
  window.addEventListener('scroll', syncHeaderState, { passive: true });
  window.addEventListener('resize', syncHeaderState);

  const actors = [];

  // Player actor (always follows the mouse)
  const playerWrap = document.querySelector('.player-showcase');
  if (playerWrap) {
    const playerCard = playerWrap.querySelector('.player-card');
    const playerShine = playerWrap.querySelector('.player-shine');
    if (playerCard) {
      actors.push({
        type: 'player',
        boundsEl: playerWrap,
        el: playerCard,
        frame: playerCard,
        shine: playerShine,
        cx: 0, cy: 0, tx: 0, ty: 0,
        maxAngleX: 18, // degrees
        maxAngleY: 14,
        smoothing: 0.12
      });
    }
  }

  // Preview actors (hover or global follow for `.preview-moving`)
  const previewNodes = Array.from(document.querySelectorAll('.preview-card'));
  previewNodes.forEach((preview) => {
    const isMoving = preview.classList.contains('preview-moving');
    const frame = preview.querySelector('.preview-frame');
    const shine = frame ? frame.querySelector('.preview-shine') : null;
    const img = frame ? frame.querySelector('img') : preview.querySelector('img');

    const actor = {
      type: 'preview',
      boundsEl: frame || preview,
      el: img || preview,
      frame: frame,
      shine: shine,
      img: img,
      follow: isMoving,
      hovered: false,
      cx: 0, cy: 0, tx: 0, ty: 0,
      maxAngleX: 16,
      maxAngleY: 12,
      smoothing: 0.15
    };

    if (!isMoving) {
      preview.addEventListener('pointerenter', () => { actor.hovered = true; });
      preview.addEventListener('pointermove', (e) => {
        const rect = (actor.boundsEl && actor.boundsEl.getBoundingClientRect()) || preview.getBoundingClientRect();
        const nx = clamp((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1) - 0.5;
        const ny = clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1) - 0.5;
        actor.tx = nx * actor.maxAngleX * 2; // map -0.5..0.5 -> -maxAngle..+maxAngle
        actor.ty = ny * actor.maxAngleY * 2;
        // update shine position relative to frame if available
        if (actor.shine && actor.frame) {
          const fRect = actor.frame.getBoundingClientRect();
          const fx = clamp((e.clientX - fRect.left) / Math.max(1, fRect.width), 0, 1) - 0.5;
          const fy = clamp((e.clientY - fRect.top) / Math.max(1, fRect.height), 0, 1) - 0.5;
          actor.shine.style.setProperty('--sx', ((fx + 0.5) * 100) + '%');
          actor.shine.style.setProperty('--sy', ((fy + 0.5) * 100) + '%');
        }
      });
      preview.addEventListener('pointerleave', () => { actor.hovered = false; actor.tx = 0; actor.ty = 0; });
    }

    actors.push(actor);
  });

  if (actors.length === 0) return; // nothing to do

  function tick() {
    actors.forEach((actor) => {
      const rect = (actor.boundsEl && actor.boundsEl.getBoundingClientRect()) || { left: 0, top: 0, width: 1, height: 1 };

      // if element is hidden or very small, reset target
      if (rect.width < 20 || rect.height < 10) {
        actor.tx = 0; actor.ty = 0;
      }

      if (actor.type === 'player') {
        const nx = clamp((mouseX - rect.left) / Math.max(1, rect.width), 0, 1) - 0.5;
        const ny = clamp((mouseY - rect.top) / Math.max(1, rect.height), 0, 1) - 0.5;
        actor.tx = nx * actor.maxAngleX * 2;
        actor.ty = ny * actor.maxAngleY * 2;
        if (actor.shine && actor.frame) {
          const fRect = actor.frame.getBoundingClientRect();
          const fx = clamp((mouseX - fRect.left) / Math.max(1, fRect.width), 0, 1) - 0.5;
          const fy = clamp((mouseY - fRect.top) / Math.max(1, fRect.height), 0, 1) - 0.5;
          actor.shine.style.setProperty('--sx', ((fx + 0.5) * 100) + '%');
          actor.shine.style.setProperty('--sy', ((fy + 0.5) * 100) + '%');
        }
      }

      if (actor.type === 'preview') {
        if (actor.follow) {
          const nx = clamp((mouseX - rect.left) / Math.max(1, rect.width), 0, 1) - 0.5;
          const ny = clamp((mouseY - rect.top) / Math.max(1, rect.height), 0, 1) - 0.5;
          actor.tx = nx * actor.maxAngleX * 2;
          actor.ty = ny * actor.maxAngleY * 2;
          if (actor.shine && actor.frame) {
            const fRect = actor.frame.getBoundingClientRect();
            const fx = clamp((mouseX - fRect.left) / Math.max(1, fRect.width), 0, 1) - 0.5;
            const fy = clamp((mouseY - fRect.top) / Math.max(1, fRect.height), 0, 1) - 0.5;
            actor.shine.style.setProperty('--sx', ((fx + 0.5) * 100) + '%');
            actor.shine.style.setProperty('--sy', ((fy + 0.5) * 100) + '%');
          }
        } else {
          if (!actor.hovered) {
            actor.tx = 0; actor.ty = 0;
            if (actor.shine) {
              actor.shine.style.setProperty('--sx', '50%');
              actor.shine.style.setProperty('--sy', '50%');
            }
          }
        }
      }

      // Smoothly interpolate current angles toward targets
      actor.cx = lerp(actor.cx, actor.tx, actor.smoothing);
      actor.cy = lerp(actor.cy, actor.ty, actor.smoothing);

      // Clamp final angles to avoid runaway rotations
      const appliedX = clamp(actor.cx, -actor.maxAngleX, actor.maxAngleX);
      const appliedY = clamp(actor.cy, -actor.maxAngleY, actor.maxAngleY);

      const distance = Math.sqrt(appliedX * appliedX + appliedY * appliedY);
      const scale = 1 + distance * 0.002; // subtle scale based on tilt

      if (actor.type === 'player') {
        actor.el.style.transform = `perspective(900px) rotateX(${ -appliedY }deg) rotateY(${ appliedX }deg) scale(${ scale })`;
      } else {
        // Preview card/text stay static. Apply a stronger 3D tilt + depth to image.
        const moveX = clamp(appliedX * 0.08, -1.4, 1.4);
        const moveY = clamp(appliedY * 0.08, -1.4, 1.4);
        const tiltX = clamp(-appliedY * 0.56, -7, 7);
        const tiltY = clamp(appliedX * 0.56, -9, 9);
        const zoom = 1.0 + distance * 0.0006;
        const shadowX = Math.round(appliedX * 0.8);
        const shadowY = Math.round(14 + Math.abs(appliedY) * 1.2);
        const shadowBlur = Math.round(24 + distance * 1.8);
        const shadowAlpha = (0.34 + Math.min(0.28, distance * 0.015)).toFixed(3);
        actor.el.style.transform = `perspective(900px) translate3d(${moveX}px, ${-moveY}px, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${zoom})`;
        actor.el.style.filter = `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(2,6,23,${shadowAlpha}))`;
      }
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
