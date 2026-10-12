import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import UstCubuk from '@/components/UstCubuk';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';
import KullaniciFormu from '@/components/yonetim/KullaniciFormu';
import HesapIslemleri from '@/components/yonetim/HesapIslemleri';
import IslemGecmisi from '@/components/yonetim/IslemGecmisi';
import { TIP_ADI } from '@/components/yonetim/etiketler';

export const metadata = { title: 'Kullanıcı' };

export default async function Kullanici({ params }: { params: Promise<{ id: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const y = await yonetimRepo();
  const k = await y.personelKaydi(id);
  if (!k) notFound();
  const [okullar, islemler, siniflar] = await Promise.all([y.okulListesi(true), y.islemler('Kullanici', id), k.okulId ? y.okulSiniflari(k.okulId) : Promise.resolve(undefined)]);
  const benim = id === o.sub;
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/kullanicilar" />
      <Sayfa>
        <SayfaBasligi baslik={k.adSoyad} alt={`${TIP_ADI[k.tip]}${k.okulAd ? ` · ${k.okulAd}` : ''} · ${k.eposta}`} geri={{ href: '/yonetim/kullanicilar', ad: 'Kullanıcılar' }} />
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-[999_1_560px]">
            <KullaniciFormu kullanici={k} okullar={okullar.map((x) => ({ id: x.id, kod: x.kod, ad: x.ad }))} siniflar={siniflar} benim={benim} />
          </div>
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-6">
            <HesapIslemleri kullanici={k} benim={benim} />
            <IslemGecmisi islemler={islemler} />
          </div>
        </div>
      </Sayfa>
    </>
  );
}
