// Media Session integration - NOT IMPLEMENTED IN PHASE 1.
//
// Reserved seam. A later phase will push title / artist / artwork and the
// play / pause / previous / next / seek handlers to navigator.mediaSession so phones
// can show lock-screen controls. Phase 1 only provides feature detection.

export function isMediaSessionSupported() {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}
