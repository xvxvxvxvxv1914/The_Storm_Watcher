/**
 * Material touch ripple for the Android build.
 *
 * One delegated `pointerdown` listener rather than a wrapper component, so every
 * button and link in the app — across 30-odd pages that were never written with
 * Material in mind — gets the feedback without any of them being edited.
 *
 * The ripple must be clipped to its host, which means `overflow: hidden` on that
 * host. Elements holding an absolutely positioned child (a notification badge, a
 * dropdown panel) are skipped instead: clipping those would hide real UI, and a
 * missing ripple is a far smaller defect than a missing badge.
 */

const INTERACTIVE = 'button, a[href], [role="button"], [role="menuitem"], [role="tab"]';

/** Children that would be cut off by the clipping the ripple requires. */
const OVERFLOWING_CHILD = '.absolute, [class*=":absolute"]';

function spawnRipple(event: PointerEvent): void {
  const origin = event.target as Element | null;
  const host = origin?.closest?.(INTERACTIVE) as HTMLElement | null;
  if (!host || host.hasAttribute('data-no-ripple')) return;
  if (host.querySelector(OVERFLOWING_CHILD)) return;

  const rect = host.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  // Reach the farthest corner so the wave covers the whole control.
  const radius = Math.hypot(
    Math.max(x, rect.width - x),
    Math.max(y, rect.height - y),
  );

  host.classList.add('md-ripple-host');

  const wave = document.createElement('span');
  wave.className = 'md-ripple';
  wave.style.width = wave.style.height = `${radius * 2}px`;
  wave.style.left = `${x - radius}px`;
  wave.style.top = `${y - radius}px`;
  wave.addEventListener('animationend', () => wave.remove(), { once: true });
  host.appendChild(wave);
}

let installed = false;

export function installRipple(): void {
  if (installed) return;
  installed = true;
  // Capture phase: handlers that call stopPropagation (menus, sheets) still ripple.
  document.addEventListener('pointerdown', spawnRipple, { capture: true, passive: true });
}
