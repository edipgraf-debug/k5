import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import KampanyaFormu from '@/components/yonetim/KampanyaFormu';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Yeni kampanya' };

export default async function YeniKampanya() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  return (
    <Sayfa>
      <SayfaBasligi geri={{ href: '/yonetim/kampanyalar', ad: 'Kampanyalar' }} baslik="Yeni kampanya" />
      <KampanyaFormu />
    </Sayfa>
  );
}
