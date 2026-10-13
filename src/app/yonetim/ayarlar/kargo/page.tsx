import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { guvenliAyarlar } from '@/lib/ayar-api';
import { ticaretRepo } from '@/lib/data/ticaret';
import AyarGrubuFormu from '@/components/yonetim/AyarGrubuFormu';
import KargoTanimlari from '@/components/yonetim/KargoTanimlari';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Kargo & kurye' };

export default async function KargoAyarlari() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const [{ ayarlar }, firmalar] = await Promise.all([guvenliAyarlar(), (await ticaretRepo()).kargoFirmalari(true)]);
  return (
    <Sayfa>
      <SayfaBasligi baslik="Kargo ve kurye tanımları" alt="Teslimat seçenekleri, ücretler ve ücretsiz teslimat limitleri. Bölge tanımı eşleşirse bölge ücreti, yoksa firma ücreti, o da yoksa varsayılan ücret uygulanır." />
      <AyarGrubuFormu grup="kargo" ust="GENEL" baslik="Teslimat genel ayarları" degerler={{ varsayilanUcret: ayarlar['kargo.varsayilanUcret'] ?? '0', ucretsizLimit: ayarlar['kargo.ucretsizLimit'] ?? '', okulaTeslimAktif: ayarlar['kargo.okulaTeslimAktif'] ?? '1' }} alanlar={[
        { ad: 'varsayilanUcret', etiket: 'Varsayılan teslimat ücreti', tur: 'tutar' },
        { ad: 'ucretsizLimit', etiket: 'Genel ücretsiz teslimat limiti', tur: 'tutar', ipucu: 'Boş = yok' },
        { ad: 'okulaTeslimAktif', etiket: 'Okula teslim seçeneği', tur: 'anahtar', ipucu: 'Veli siparişi okula toplu teslim edilebilir' },
      ]} />
      <KargoTanimlari firmalar={firmalar} />
    </Sayfa>
  );
}
