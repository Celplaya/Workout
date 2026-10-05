// Minimal hash router: #/path/param

function parse() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] ?? '', params: parts.slice(1) };
}

export const route = $state(parse());

window.addEventListener('hashchange', () => {
  Object.assign(route, parse());
  window.scrollTo(0, 0);
});

export function go(path: string, replace = false) {
  const hash = '#/' + path.replace(/^\//, '');
  if (replace) history.replaceState(null, '', hash);
  else history.pushState(null, '', hash);
  Object.assign(route, parse());
  window.scrollTo(0, 0);
}
