import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import UstCubuk from '@/components/UstCubuk';
import YapimAsamasinda from '@/components/YapimAsamasinda';

export const metadata = { title: 'Sepet ve ödeme' };

export default async function Sayfa() {
  const o = await oturumAl();
  if (!o || o.rol !== 'veli') redirect('/giris');
  return (
    <>
      <UstCubuk rol="veli" ad={o.ad} aktif="/veli" />
      <YapimAsamasinda baslik="Sepet ve ödeme" aciklama="Teslimat adresi, bireysel e-Arşiv fatura bilgileri ve kart / havale ile ödeme adımları bir sonraki geliştirme aşamasında bu sayfaya eklenecek (tasarımdaki 4 adımlı akış)." geri={{ href: '/veli', ad: 'Tavsiye sepetine dön' }} />
    </>
  );
}
