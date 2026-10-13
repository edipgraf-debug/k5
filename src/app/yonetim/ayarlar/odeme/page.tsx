import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { guvenliAyarlar } from '@/lib/ayar-api';
import { ticaretRepo } from '@/lib/data/ticaret';
import AyarGrubuFormu from '@/components/yonetim/AyarGrubuFormu';
import PosAyarlari from '@/components/yonetim/PosAyarlari';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Ödeme ayarları' };

export default async function OdemeAyarlari() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const t = await ticaretRepo();
  const [{ ayarlar }, poslar, kurallar] = await Promise.all([guvenliAyarlar(), t.posListesi(), t.posKurallari()]);
  return (
    <Sayfa>
      <SayfaBasligi baslik="Ödeme ayarları" alt="Ödeme yöntemleri, taksit sınırları, sanal POS'lar ve kartın hangi POS'tan çekileceği." />
      <AyarGrubuFormu grup="odeme" ust="GENEL" baslik="Ödeme yöntemleri" degerler={{ kartAktif: ayarlar['odeme.kartAktif'] ?? '1', havaleAktif: ayarlar['odeme.havaleAktif'] ?? '1',
        maxTaksit: ayarlar['odeme.maxTaksit'] ?? '6', taksitAltLimit: ayarlar['odeme.taksitAltLimit'] ?? '' }} alanlar={[
        { ad: 'kartAktif', etiket: 'Kredi / banka kartı', tur: 'anahtar' },
        { ad: 'havaleAktif', etiket: 'Havale / EFT', tur: 'anahtar' },
        { ad: 'maxTaksit', etiket: 'En fazla taksit', tur: 'sayi', min: 1, max: 12 },
        { ad: 'taksitAltLimit', etiket: 'Taksit için en az sepet tutarı', tur: 'tutar', ipucu: 'Altında yalnız tek çekim' },
      ]} />
      <PosAyarlari poslar={poslar} kurallar={kurallar} />
    </Sayfa>
  );
}
