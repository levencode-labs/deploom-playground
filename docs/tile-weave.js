// Matched Bézier commands let the same fibers move and retrace their paths.
// Keeping one progress value also handles a pointer leaving halfway through.
(() => {
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const canHover = matchMedia('(any-hover: hover)');
  const number = /-?\d+(?:\.\d+)?/g;
  const duration = 620;

  for (const card of document.querySelectorAll('.tool-home [data-thread]')) {
    const svg = card.querySelector('.tile-weave');
    const strands = Array.from(svg.querySelectorAll('path[data-woven]'), path => {
      const relaxed = path.getAttribute('d');
      const woven = path.dataset.woven;
      return {
        path, relaxed, woven,
        from: relaxed.match(number).map(Number),
        to: woven.match(number).map(Number)
      };
    });
    let hovered = false;
    let keyboardFocus = false;
    let position = 0;
    let target = 0;
    let previousTime = 0;
    let frame = 0;

    function draw() {
      const eased = position * position * (3 - 2 * position);
      for (const {path, relaxed, woven, from, to} of strands) {
        if (position === 0 || position === 1) {
          path.setAttribute('d', position === 0 ? relaxed : woven);
          continue;
        }
        let i = 0;
        const d = relaxed.replace(number, () => {
          const value = from[i] + (to[i] - from[i]) * eased;
          i++;
          return value.toFixed(2);
        });
        path.setAttribute('d', d);
      }
    }

    function step(time) {
      const delta = Math.max(0, time - previousTime) / duration;
      position = target === 1 ? Math.min(1, position + delta) : Math.max(0, position - delta);
      previousTime = time;
      draw();
      frame = position === target ? 0 : requestAnimationFrame(step);
    }

    function update() {
      if (!motion.matches) {
        cancelAnimationFrame(frame);
        frame = 0;
        target = position = 0;
        svg.classList.remove('is-weaving');
        draw();
        return;
      }
      const next = hovered || keyboardFocus ? 1 : 0;
      if (next === target) return;
      target = next;
      svg.classList.toggle('is-weaving', Boolean(next));
      previousTime = performance.now();
      if (!frame) frame = requestAnimationFrame(step);
    }

    card.addEventListener('pointerenter', event => {
      hovered = event.pointerType !== 'touch' && canHover.matches;
      update();
    });
    card.addEventListener('pointerleave', () => {
      hovered = false;
      update();
    });
    card.addEventListener('focus', () => {
      keyboardFocus = card.matches(':focus-visible');
      update();
    });
    card.addEventListener('blur', () => {
      keyboardFocus = false;
      update();
    });
    motion.addEventListener('change', update);
  }
})();
