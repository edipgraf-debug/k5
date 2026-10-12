import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import UstCubuk from '@/components/UstCubuk';
import OgrenciFormu from '@/components/yonetim/OgrenciFormu';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Yeni öğrenci' };

export default async function YeniOgrenci({ searchParams }: { searchParams: Promise<{ okulId?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const y = await yonetimRepo();
  const okullar = await y.okulListesi();
  const istenen = Number((await searchParams).okulId);
  const okulId = okullar.some((x) => x.id === istenen) ? istenen : okullar.length === 1 ? okullar[0].id : null;
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/ogrenciler" />
      <Sayfa>
        <SayfaBasligi baslik="Yeni öğrenci" geri={{ href: okulId ? `/yonetim/ogrenciler?okulId=${okulId}` : '/yonetim/ogrenciler', ad: 'Öğrenci & veli' }}
          alt={<>Tek tek kayıt içindir. Bir sınıfın tamamı için <a href={`/yonetim/ogrenciler/yukle${okulId ? `?okulId=${okulId}` : ''}`} className="font-bold">Excel ile yükleyin</a>.</>} />
        <OgrenciFormu okullar={okullar.map((x) => ({ id: x.id, kod: x.kod, ad: x.ad }))} okulId={okulId} siniflar={okulId ? await y.okulSiniflari(okulId) : undefined} />
      </Sayfa>
    </>
  );
}
