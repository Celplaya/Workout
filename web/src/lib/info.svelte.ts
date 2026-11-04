// Which exercise guide is open in the info sheet ('' = closed).
export const info = $state({ name: '' });

export function openInfo(name: string) {
  info.name = name;
}

export function closeInfo() {
  info.name = '';
}
