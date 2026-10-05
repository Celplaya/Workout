export const toast = $state({ text: '', kind: '' as '' | 'pr', id: 0 });

let t: ReturnType<typeof setTimeout> | undefined;

export function showToast(text: string, kind: '' | 'pr' = '', ms = 3000) {
  toast.text = text;
  toast.kind = kind;
  toast.id++;
  clearTimeout(t);
  t = setTimeout(() => (toast.text = ''), ms);
}
