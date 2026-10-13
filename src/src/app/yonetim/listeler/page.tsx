import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import UstCubuk from '@/components/UstCubuk';
import ListeYonetimi from '@/components/ListeYonetimi';

export const metadata = { title: 'Tavsiye sepetleri' };

export default async function Sayfa() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/listeler" />
      <ListeYonetimi rol="yonetim" />
    </>
  );
}
