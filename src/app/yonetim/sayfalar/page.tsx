import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import SayfaYonetimi from '@/components/yonetim/SayfaYonetimi';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Kurumsal sayfalar' };

export default async function Sayfalar() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  return (
    <Sayfa>
      <SayfaBasligi baslik="Kurumsal sayfalar ve sözleşmeler" alt="Gizlilik, çerez, KVKK, mesafeli satış, ön bilgilendirme, iade, teslimat, hakkımızda, iletişim… Tüm sayfalarda alt bilgide görünür; metinleri hukuk birimi onayıyla girin." />
      <SayfaYonetimi sayfalar={await (await ticaretRepo()).sayfalar()} />
    </Sayfa>
  );
}
