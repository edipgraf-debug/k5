import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import UstCubuk from '@/components/UstCubuk';
import OkulFormu from '@/components/yonetim/OkulFormu';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Yeni okul' };

export default async function YeniOkul() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/okullar" />
      <Sayfa>
        <SayfaBasligi baslik="Yeni okul" geri={{ href: '/yonetim/okullar', ad: 'Okullar' }} alt="Okulu oluşturduktan sonra sınıf/şube, öğrenci ve kullanıcıları ekleyin; giriş adresini Giriş sayfası bölümünden verin." />
        <OkulFormu oneriKod={await (await yonetimRepo()).okulKodOner()} />
      </Sayfa>
    </>
  );
}
