import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import UstCubuk from '@/components/UstCubuk';
import OgrenciDetaySayfasi from '@/components/panel/OgrenciDetaySayfasi';
import { Rozet, Sayfa, SayfaBasligi } from '@/components/panel/Ortak';
import Sekmeler from '@/components/yonetim/Sekmeler';
import OgrenciFormu from '@/components/yonetim/OgrenciFormu';
import VeliYonetimi from '@/components/yonetim/VeliYonetimi';
import IslemGecmisi from '@/components/yonetim/IslemGecmisi';

export const metadata = { title: 'Öğrenci' };

/** Kitabevi: öğrenci kaydı (bilgiler, şube, veliler) ve sepet / bildirim durumu */
export default async function YonetimOgrenci({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sekme?: string; yeni?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const sp = await searchParams;
  const y = await yonetimRepo();
  const ogr = await y.ogrenciKaydi(id);
  if (!ogr) notFound();
  const sekmeler = (aktif: string) => (
    <Sekmeler aktif={aktif} sekmeler={[
      { id: 'kayit', ad: 'Kayıt ve veliler', href: `/yonetim/ogrenciler/${id}` },
      { id: 'sepet', ad: 'Sepetler ve bildirimler', href: `/yonetim/ogrenciler/${id}?sekme=sepet` },
    ]} />
  );

  // sepet sekmesi: öğretmen/okul ile aynı detay (şubesi olan aktif öğrenci için)
  if (sp.sekme === 'sepet' && ogr.subeId && ogr.aktif) return <OgrenciDetaySayfasi rol="yonetim" id={id} ust={sekmeler('sepet')} />;

  const [siniflar, ogrIslem, ...veliIslem] = await Promise.all([y.okulSiniflari(ogr.okulId), y.islemler('Ogrenci', id),
    ...ogr.veliler.map((v) => y.islemler('Veli', v.id, 10))]);
  // öğrencinin ve velilerinin değişiklikleri tek akışta
  const islemler = [...ogrIslem, ...veliIslem.flat().map((i) => ({ ...i, islem: `Veli: ${i.islem}` }))]
    .sort((a, b) => new Date(b.tarih).getTime() - new Date(a.tarih).getTime()).slice(0, 25);
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/ogrenciler" />
      <Sayfa>
        <SayfaBasligi baslik={`${ogr.ad} ${ogr.soyad}`} alt={`${ogr.okulAd} · ${ogr.sinifSube ?? 'şube yok'} · Okul no ${ogr.okulNo}`}
          geri={{ href: `/yonetim/ogrenciler?okulId=${ogr.okulId}`, ad: 'Öğrenci & veli' }}>
          {!ogr.aktif && <Rozet ton="kirmizi">Pasif öğrenci</Rozet>}
        </SayfaBasligi>
        {sp.yeni && <p role="status" className="rounded-xl bg-yesil-zemin px-4 py-3 text-sm font-bold text-yesil">✓ Öğrenci eklendi.{ogr.veliler.length ? ' Veli ilk girişte SMS koduyla kendi şifresini belirleyecek.' : ' Şimdi veli ekleyin; velisi olmayan öğrenciye bildirim gitmez.'}</p>}
        {sekmeler('kayit')}
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
            <VeliYonetimi ogrenci={ogr} />
            <OgrenciFormu ogrenci={ogr} siniflar={siniflar} />
          </div>
          <div className="min-w-0 flex-[1_1_300px]"><IslemGecmisi islemler={islemler} /></div>
        </div>
      </Sayfa>
    </>
  );
}
