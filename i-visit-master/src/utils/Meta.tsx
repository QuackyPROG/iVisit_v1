import type { MetaType } from '../types/MetaType';
export default function Meta(meta: MetaType) {
  if (meta.title) document.title = meta.title;
}
