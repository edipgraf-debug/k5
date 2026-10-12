import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import UstCubuk from '@/components/UstCubuk';
import YapimAsamasinda from '@/components/YapimAsamasinda';

export const metadata = { title: 'Hesabım' };

export default async function Sayfa() {
  const o = await oturumAl();
  if (!o || o.rol !== 'veli') redirect('/giris');
  return (
    <>
      <UstCubuk rol="veli" ad={o.ad} aktif="/veli/hesap" />
      <YapimAsamasinda baslik="Hesabım" aciklama="Profil, adresler (yeni adres ekleme) ve faturalar bu sayfada olacak." geri={{ href: '/veli', ad: 'Tavsiye sepetine dön' }} />
    </>
  );
}
