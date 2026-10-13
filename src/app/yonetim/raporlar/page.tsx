import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import SepetRaporlari from '@/components/rapor/SepetRaporlari';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Sepet raporları' };

export default async function Raporlar({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  return (
    <Sayfa>
      <SayfaBasligi baslik="Müşteri sepet raporları" alt="Tavsiye sepetlerinin okul / sınıf / plasiyer bazında açılma ve siparişe dönüşme durumu; sepete ürün koyup siparişi tamamlamayan veliler." />
      <SepetRaporlari sp={await searchParams} okulIdleri={null} temel="/yonetim/raporlar" sepetDetay />
    </Sayfa>
  );
}
