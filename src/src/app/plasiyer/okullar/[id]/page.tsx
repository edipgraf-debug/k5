import Link from 'next/link';
import { notFound } from 'next/navigation';
import { plasiyerOturumu } from '@/lib/plasiyer-sayfa';
import { plasiyerOkulIdleri } from '@/lib/plasiyer';
import { yonetimRepo } from '@/lib/data/yonetim';
import { panelVerisi } from '@/lib/panel';
import { telGoster } from '@/components/yonetim/etiketler';
import UstCubuk from '@/components/UstCubuk';
import SepetRaporlari from '@/components/rapor/SepetRaporlari';
import { Bolum, Bos, Kpi, KpiSatiri, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';

export const metadata = { title: 'Okul' };

/** Plasiyer: okulun sınıfları, öğretmenleri ve tavsiye sepeti durumu (salt okunur) */
export default async function PlasiyerOkul({ params }: { params: Promise<{ id: string }> }) {
  const o = await plasiyerOturumu();
  const id = Number((await params).id);
  if (!(await plasiyerOkulIdleri(o.sub)).includes(id)) notFound();
  const y = await yonetimRepo();
  const [okul, ogretmenler, yetkililer, veri] = await Promise.all([y.okulKaydi(id), y.personelListesi({ tip: 'Ogretmen', okulId: id }), y.personelListesi({ tip: 'Okul', okulId: id }),
    panelVerisi({ ...o, rol: 'yonetim' }, id, null)]);
  if (!okul) notFound();
  return (
    <>
      <UstCubuk rol="plasiyer" ad={o.ad} />
      <Sayfa>
        <SayfaBasligi geri={{ href: '/plasiyer', ad: 'Okullarım' }} baslik={okul.ad} alt={`${okul.il} / ${okul.ilce}${okul.telefon ? ` · ${okul.telefon}` : ''}${okul.opakCariKodu ? ` · Opak cari ${okul.opakCariKodu}` : ''}`} />
        <KpiSatiri>
          <Kpi ad="Öğrenci" deger={veri.toplam.ogrenci} alt={`${veri.toplam.velisiz} velisiz`} />
          <Kpi ad="Yayındaki sepet" deger={veri.toplam.yayinda} alt={`${veri.toplam.taslak} taslak`} />
          <Kpi ad="Veli açtı" deger={veri.toplam.acan} alt={`${veri.toplam.sepetiAcik} öğrencinin sepeti açık`} />
          <Kpi ad="Sipariş veren" deger={veri.toplam.siparis} />
        </KpiSatiri>
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-[1_1_420px]">
            <Bolum id="yetkili" ust="OKUL YÖNETİMİ" baslik={`${yetkililer.length} yetkili · ${ogretmenler.length} öğretmen`}>
              {yetkililer.length + ogretmenler.length ? (
                <ul className="flex flex-col">
                  {[...yetkililer, ...ogretmenler].map((k) => (
                    <li key={k.id} className="flex flex-wrap justify-between gap-2 border-b border-[#EEF0F3] px-6 py-3 last:border-0">
                      <span><strong>{k.adSoyad}</strong> <span className="text-sm text-metin-3">· {k.tip === 'Okul' ? 'okul yetkilisi' : `öğretmen ${k.subeler.map((s) => s.ad).join(', ')}`}</span>
                        {k.tip === 'Ogretmen' && k.gecerliPlasiyerId !== o.sub && <span className="block text-[12px] text-sari">Plasiyeri: {k.gecerliPlasiyerAd ?? 'yok'}</span>}</span>
                      <span className="text-sm text-metin-2">{k.eposta}{k.telefon ? ` · ${telGoster(k.telefon)}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : <Bos>Kayıtlı kullanıcı yok.</Bos>}
            </Bolum>
          </div>
          <div className="min-w-0 flex-[1_1_360px]">
            <Bolum id="subeler" ust="SINIFLAR" baslik="Şube bazında durum">
              {veri.subeler.length ? (
                <div className={TABLO.sar}>
                  <table className={`${TABLO.tablo} min-w-[360px]`}>
                    <thead><tr>{['Şube', 'Öğrenci', 'Sepeti açık', 'Veli açtı'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
                    <tbody>{veri.subeler.map((s) => <tr key={s.sinifSube}><td className={`${TABLO.td} font-bold`}>{s.sinifSube}</td><td className={TABLO.td}>{s.ogrenci}</td><td className={TABLO.td}>{s.sepetAcik}</td><td className={TABLO.td}>{s.acan}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : <Bos>Şube yok.</Bos>}
            </Bolum>
          </div>
        </div>
        <SepetRaporlari sp={{ okulId: String(id) }} okulIdleri={[id]} temel={`/plasiyer/okullar/${id}`} sepetDetay={false} />
        <p className="text-sm text-metin-3"><Link href="/plasiyer/tahsilatlar">Bu okulun tahsilatları için Tahsilatlar →</Link></p>
      </Sayfa>
    </>
  );
}
