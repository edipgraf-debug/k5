import Link from 'next/link';
import type { PanelVerisi } from '@/lib/panel';
import { hedefMetni, sepetDurumu, tarihSaat } from '@/lib/bicim';
import { Bolum, Bos, Kpi, KpiSatiri, Rozet, SepetRozeti, TABLO } from './Ortak';
import OgrenciArama from './OgrenciArama';

const TIP: Record<string, string> = { Ogretmen: 'Öğretmen', Okul: 'Okul yönetimi', Yonetim: 'Kitabevi' };

/** Öğretmen ve okul ana sayfası (Kardelen'de okul detayında da kullanılır). */
export default function OkulPaneli({ veri, rolOnek, ogretmen, okulId }: { veri: PanelVerisi; rolOnek: string; ogretmen?: boolean; okulId?: number }) {
  const t = veri.toplam;
  const okulParam = okulId ? `&okulId=${okulId}` : '';
  return (
    <>
      <KpiSatiri>
        <Kpi ad={ogretmen ? 'Öğrencilerim' : 'Öğrenci'} deger={t.ogrenci} alt={t.velisiz ? `${t.velisiz} öğrencinin kayıtlı velisi yok` : 'Tüm öğrencilerin velisi kayıtlı'} />
        <Kpi ad="Yayındaki sepet" deger={t.yayinda} alt={t.taslak ? `${t.taslak} taslak` : 'Taslak yok'} />
        <Kpi ad="Sepeti açık öğrenci" deger={`${t.sepetiAcik} / ${t.ogrenci}`} alt={`${t.acan} öğrencinin velisi sepeti açtı`} />
        <Kpi ad="Ulaşmayan SMS" deger={t.ulasmayan} alt={t.ulasmayan ? 'Sepet detayından hatırlatın' : 'Sorun yok'} ton={t.ulasmayan ? 'uyari' : undefined} />
      </KpiSatiri>

      <Bolum id="sepetler" ust="TAVSİYE SEPETLERİ" baslik={ogretmen ? 'Sepetlerim' : 'Okulun sepetleri'}
        aksiyon={<Link href={`${rolOnek}/listeler?yeni=1${okulParam}`} className="btn-turuncu min-h-11">+ Yeni tavsiye sepeti</Link>}>
        {veri.sepetler.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-5">
            {veri.sepetler.map((s) => (
              <Link key={s.liste.id} href={`${rolOnek}/listeler/${s.liste.id}`}
                className="flex flex-col gap-2 rounded-2xl border-2 border-cizgi bg-white p-4 no-underline hover:border-turuncu">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-baslik text-base font-extrabold">{s.liste.ad}</span>
                  <SepetRozeti durum={sepetDurumu(s.liste)} />
                </div>
                <span className="text-sm text-metin-2">{s.liste.kapsamAd} · {s.liste.satirlar.length} kitap · {hedefMetni(s.liste)}</span>
                {s.liste.yayinda && (
                  <div className="mt-1 flex flex-col gap-1.5">
                    <div className="h-2 overflow-hidden rounded-full bg-[#EEF0F3]" aria-hidden="true">
                      <div className="h-full rounded-full bg-turuncu" style={{ width: `${s.acik ? Math.round((s.acan / s.acik) * 100) : 0}%` }} />
                    </div>
                    <span className="text-[13px] text-metin-3">{s.acan} / {s.acik} veli sepeti açtı{s.ulasmayan ? ` · ${s.ulasmayan} SMS ulaşmadı` : ''}</span>
                  </div>
                )}
                <span className="mt-auto text-sm font-bold text-kiremit">Takip ve detay →</span>
              </Link>
            ))}
          </div>
        ) : <Bos>Henüz sepet yok. &quot;+ Yeni tavsiye sepeti&quot; ile başlayın.</Bos>}
      </Bolum>

      <div className="flex flex-wrap items-start gap-6">
        {!ogretmen && (
          <div className="min-w-0 flex-[1_1_420px]">
            <Bolum id="subeler" ust="SINIFLAR" baslik="Şube bazında durum">
              {veri.subeler.length ? (
                <div className={TABLO.sar}>
                  <table className={`${TABLO.tablo} min-w-[420px]`}>
                    <thead><tr>
                      <th scope="col" className={TABLO.th}>Şube</th><th scope="col" className={TABLO.th}>Öğrenci</th>
                      <th scope="col" className={TABLO.th}>Sepeti açık</th><th scope="col" className={TABLO.th}>Veli açtı</th><th scope="col" className={TABLO.th}>Velisiz</th>
                    </tr></thead>
                    <tbody>
                      {veri.subeler.map((s) => (
                        <tr key={s.sinifSube}>
                          <td className={`${TABLO.td} font-bold`}>{s.sinifSube}</td><td className={TABLO.td}>{s.ogrenci}</td>
                          <td className={TABLO.td}>{s.sepetAcik}</td><td className={TABLO.td}>{s.acan}</td>
                          <td className={TABLO.td}>{s.velisiz ? <span className="font-bold text-kirmizi">{s.velisiz}</span> : 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Bos>Bu sezon için kayıtlı öğrenci yok.</Bos>}
            </Bolum>
          </div>
        )}
        <div className="min-w-0 flex-[1_1_420px]">
          <Bolum id="yayinlar" ust="SON YAYINLAR" baslik={ogretmen ? 'Son yayınladıklarım' : 'Son yayınlanan sepetler'}>
            {veri.sonYayinlar.length ? (
              <ul className="flex flex-col">
                {veri.sonYayinlar.map((y) => (
                  <li key={y.yayinId} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F3] px-6 py-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link href={`${rolOnek}/listeler/${y.listeId}`} className="font-bold">{y.listeAd}</Link>
                      <span className="text-[13px] text-metin-3">
                        {tarihSaat(y.tarih)} · {y.hatirlatma ? 'hatırlatma' : y.hedefTipi === 'Toplu' ? 'tüm sınıf' : `${y.ogrenciSayisi} seçili öğrenci`} · {y.smsSayisi} SMS, {y.epostaSayisi} e-posta
                      </span>
                    </div>
                    {!ogretmen && <Rozet ton={y.yayinlayanTip === 'Yonetim' ? 'lacivert' : 'gri'}>{TIP[y.yayinlayanTip]} · {y.yayinlayan}</Rozet>}
                  </li>
                ))}
              </ul>
            ) : <Bos>Henüz yayın yok.</Bos>}
          </Bolum>
        </div>
      </div>

      <Bolum id="ogrenciler" ust="ÖĞRENCİLER" baslik={ogretmen ? 'Sınıflarımdaki öğrenciler' : 'Öğrenciler'}>
        <OgrenciArama rolOnek={rolOnek} satirlar={veri.ogrenciler.map((x) => ({ id: x.id, ad: `${x.ad} ${x.soyad}`, okulNo: x.okulNo, sinifSube: x.sinifSube,
          veliSayisi: x.veliSayisi, acikSepet: x.acikSepet, acilan: x.acilan }))} />
      </Bolum>
    </>
  );
}
