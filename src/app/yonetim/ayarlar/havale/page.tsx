import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { guvenliAyarlar } from '@/lib/ayar-api';
import { ticaretRepo } from '@/lib/data/ticaret';
import AyarGrubuFormu from '@/components/yonetim/AyarGrubuFormu';
import BankaHesaplari from '@/components/yonetim/BankaHesaplari';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Havale / EFT' };

export default async function HavaleAyarlari() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const [{ ayarlar }, hesaplar] = await Promise.all([guvenliAyarlar(), (await ticaretRepo()).bankaHesaplari(true)]);
  return (
    <Sayfa>
      <SayfaBasligi baslik="Havale / EFT tanımları" alt="Havale ile ödemeyi seçen veliye gösterilen hesaplar, açıklama ve ödeme süresi. Gelen havaleler Tahsilatlar ekranından onaylanır." />
      <AyarGrubuFormu grup="havale" ust="HAVALE" baslik="Havale kuralları" degerler={{ aciklama: ayarlar['havale.aciklama'] ?? '', sureGun: ayarlar.HavaleSureGun ?? '3' }} alanlar={[
        { ad: 'sureGun', etiket: 'Ödeme süresi (gün)', tur: 'sayi', min: 1, max: 14, ipucu: 'Bu süre içinde havale gelmezse sipariş kapatılır' },
        { ad: 'aciklama', etiket: 'Veliye gösterilecek açıklama', tur: 'uzun' },
      ]} />
      <BankaHesaplari hesaplar={hesaplar} />
    </Sayfa>
  );
}
