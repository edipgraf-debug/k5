import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import UstCubuk from '@/components/UstCubuk';
import YapimAsamasinda from '@/components/YapimAsamasinda';

export const metadata = { title: 'Siparişlerim' };

export default async function Sayfa() {
  const o = await oturumAl();
  if (!o || o.rol !== 'veli') redirect('/giris');
  return (
    <>
      <UstCubuk rol="veli" ad={o.ad} aktif="/veli/siparisler" />
      <YapimAsamasinda baslik="Siparişlerim" aciklama="Sipariş durumu, kurye takibi ve faturalar sipariş modülüyle birlikte gelecek." geri={{ href: '/veli', ad: 'Tavsiye sepetine dön' }} />
    </>
  );
}
