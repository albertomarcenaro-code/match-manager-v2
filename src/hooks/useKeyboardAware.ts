import { useEffect } from 'react';

/**
 * Mobile keyboard-aware UX:
 * - Tracks visualViewport height and exposes it via CSS var --app-vh
 *   so layouts can use `min-height: var(--app-vh)` instead of 100vh and
 *   shrink correctly when the virtual keyboard appears.
 * - Exposes --kb-inset (keyboard height) for adaptive bottom padding.
 * - Auto-scrolls focused inputs/textareas into the visible center of the
 *   viewport, so the user always sees what they're typing.
 *
 * Safe to mount once at app root. Pure presentation / no business logic.
 */
export function useKeyboardAware() {
  useEffect(() => {
    const root = document.documentElement;
    let lastH = -1;
    let lastKb = -1;
    let rafId: number | null = null;

    const apply = () => {
      rafId = null;
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      const kb = Math.max(0, window.innerHeight - h);
      // Skip writes if nothing changed — avoids style invalidation / forced reflow
      if (h === lastH && kb === lastKb) return;
      lastH = h;
      lastKb = kb;
      root.style.setProperty('--app-vh', `${h}px`);
      root.style.setProperty('--kb-inset', `${kb}px`);
    };

    const update = () => {
      // Coalesce bursts of resize/scroll events into a single rAF write
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(apply);
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', update, { passive: true });
    vv?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });

    // Scroll focused field into view (centered) when keyboard pops up
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName;
      const isEditable =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (target as HTMLElement).isContentEditable;
      if (!isEditable) return;
      // Defer to allow keyboard to actually open and viewport to resize
      window.setTimeout(() => {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          target.scrollIntoView();
        }
      }, 250);
    };

    document.addEventListener('focusin', onFocusIn);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);
}
