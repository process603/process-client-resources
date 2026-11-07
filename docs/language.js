const PUBLIC_ORIGIN = 'https://resources.theprocessrecoverycenter.com';

export function originalPage(value) {
  const current = new URL(value);
  const result = new URL(current.pathname + current.search + current.hash, PUBLIC_ORIGIN);
  for (const key of [...result.searchParams.keys()]) {
    if (key.startsWith('_x_tr_')) result.searchParams.delete(key);
  }
  return result.href;
}

export function spanishPage(value) {
  const target = new URL('https://translate.google.com/translate');
  target.search = new URLSearchParams({sl:'en', tl:'es', hl:'es', u:originalPage(value)});
  return target.href;
}

if (typeof document !== 'undefined') {
  const english = document.querySelector('[data-language="en"]');
  const spanish = document.querySelector('[data-language="es"]');
  if (english && spanish) {
    english.href = originalPage(location.href);
    spanish.href = spanishPage(location.href);
    const translated = location.hostname.endsWith('.translate.goog') || new URL(location.href).searchParams.get('_x_tr_tl') === 'es';
    english.removeAttribute('aria-current');
    (translated ? spanish : english).setAttribute('aria-current', 'true');
    // Preserve filters changed by the map without navigating away first.
    spanish.addEventListener('click', () => { spanish.href = spanishPage(location.href); });
    english.addEventListener('click', () => { english.href = originalPage(location.href); });
  }
}
