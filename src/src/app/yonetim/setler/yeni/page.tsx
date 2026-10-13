import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import SetFormu from '@/components/yonetim/SetFormu';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Yeni set' };

export default async function YeniSet() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  return (
    <Sayfa>
      <SayfaBasligi geri={{ href: '/yonetim/setler', ad: 'Setler' }} baslik="Yeni set" />
      <SetFormu />
    </Sayfa>
  );
}
