import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import UstCubuk from '@/components/UstCubuk';
import ListeYonetimi from '@/components/ListeYonetimi';

export const metadata = { title: 'Tavsiye sepetleri' };

export default async function Sayfa() {
  const o = await oturumAl();
  if (!o || o.rol !== 'okul') redirect('/giris');
  return (
    <>
      <UstCubuk rol="okul" ad={o.ad} aktif="/okul/listeler" />
      <ListeYonetimi rol="okul" />
    </>
  );
}
