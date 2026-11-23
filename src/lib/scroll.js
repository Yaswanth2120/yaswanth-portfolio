// Shared scroll state read by the 3D scene every frame.
// `s` is a fractional stop index: 0 at the first [data-stop] section, 1 at the
// next, and so on, measured at the vertical middle of the viewport.
export const scroll = { s: 0, reduced: false, mobile: false, listeners: new Set() };

export function measureScrollStop() {
  const stops = Array.from(document.querySelectorAll("[data-stop]"));
  if (stops.length === 0) return 0;

  const probe = window.scrollY + window.innerHeight / 2;
  const centers = stops.map((el) => {
    const rect = el.getBoundingClientRect();
    return rect.top + window.scrollY + rect.height / 2;
  });

  if (probe <= centers[0]) return 0;
  if (probe >= centers[centers.length - 1]) return centers.length - 1;
  for (let i = 0; i < centers.length - 1; i++) {
    const a = centers[i];
    const b = centers[i + 1];
    if (probe >= a && probe <= b) return i + (probe - a) / (b - a);
  }
  return 0;
}
