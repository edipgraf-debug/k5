import 'server-only';
import { redirect } from 'next/navigation';
import { oturumAl } from './auth';

/** Plasiyer sayfaları: oturum yoksa kitabevi girişine */
export async function plasiyerOturumu() {
  const o = await oturumAl();
  if (!o || o.rol !== 'plasiyer') redirect('/yonetim/giris');
  return o;
}
