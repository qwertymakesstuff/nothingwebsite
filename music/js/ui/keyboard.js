// Desktop keyboard shortcuts. Ignored while typing and for keys a focused button already handles.
export function registerShortcuts({ player, store }) {
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    const onButton = !!t.closest?.('button, a');
    const s = store.getState();
    switch (e.key) {
      case ' ': if (onButton) return; e.preventDefault(); player.togglePlay(); break;
      case 'ArrowRight': if (t.closest?.('.slider')) return; e.preventDefault(); player.seek(s.position + 5); break;
      case 'ArrowLeft': if (t.closest?.('.slider')) return; e.preventDefault(); player.seek(s.position - 5); break;
      case 'ArrowUp': if (t.closest?.('.slider')) return; e.preventDefault(); player.setVolume(s.volume + 0.05); break;
      case 'ArrowDown': if (t.closest?.('.slider')) return; e.preventDefault(); player.setVolume(s.volume - 0.05); break;
      case 'm': case 'M': player.toggleMute(); break;
      case 'N': player.next(); break;
      case 'P': player.previous(); break;
      default: return;
    }
  }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
