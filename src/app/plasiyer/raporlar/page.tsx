import { plasiyerOturumu } from '@/lib/plasiyer-sayfa';
import { plasiyerOkulIdleri } from '@/lib/plasiyer';
import UstCubuk from '@/components/UstCubuk';
import SepetRaporlari from '@/components/rapor/SepetRaporlari';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Sepet raporları' };

export default async function PlasiyerRapor({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const o = await plasiyerOturumu();
  return (
    <>
      <UstCubuk rol="plasiyer" ad={o.ad} />
      <Sayfa>
        <SayfaBasligi baslik="Sepet raporları" alt="Okullarınızdaki tavsiye sepetlerinin durumu ve siparişe dönmeyen veli sepetleri." />
        <SepetRaporlari sp={await searchParams} okulIdleri={await plasiyerOkulIdleri(o.sub)} temel="/plasiyer/raporlar" sepetDetay={false} />
      </Sayfa>
    </>
  );
}
