import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import UstCubuk from '@/components/UstCubuk';
import ListeYonetimi from '@/components/ListeYonetimi';

export const metadata = { title: 'Tavsiye sepetleri' };

export default async function Sayfa() {
  const o = await oturumAl();
  if (!o || o.rol !== 'ogretmen') redirect('/giris');
  return (
    <>
      <UstCubuk rol="ogretmen" ad={o.ad} aktif="/ogretmen/listeler" />
      <ListeYonetimi rol="ogretmen" />
    </>
  );
}
