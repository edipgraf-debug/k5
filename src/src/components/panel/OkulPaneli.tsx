import Link from 'next/link';
import type { PanelVerisi } from '@/lib/panel';
import { hedefMetni, sepetDurumu, tarihSaat } from '@/lib/bicim';
import { Bolum, Bos, Kpi, KpiSatiri, Rozet, SepetRozeti, TABLO } from './Ortak';
import OgrenciArama from './OgrenciArama';
import SepetKartlari from './SepetKartlari';

const TIP: Record<string, string> = { Ogretmen: 'Öğretmen', Okul: 'Okul yönetimi', Yonetim: 'Kitabevi' };

/** Öğretmen ve okul ana sayfası (Kardelen'de okul detayında da kullanılır). */
export default function OkulPaneli({ veri, rolOnek, ogretmen, okulId, hakedis }:
  { veri: PanelVerisi; rolOnek: string; ogretmen?: boolean; okulId?: number; hakedis?: { tutar: string; ciro: string; oran: number | null } | null }) {
  const t = veri.toplam;
  const okulParam = okulId ? `&okulId=${okulId}` : '';
  return (
    <>
      <KpiSatiri>
        <Kpi ad={ogretmen ? 'Öğrencilerim' : 'Öğrenci'} deger={t.ogrenci} alt={t.velisiz ? `${t.velisiz} öğrencinin kayıtlı velisi yok` : 'Tüm öğrencilerin velisi kayıtlı'} />
        <Kpi ad="Yayındaki sepet" deger={t.yayinda} alt={t.taslak ? `${t.taslak} taslak` : 'Taslak yok'} />
        <Kpi ad="Sepeti açık öğrenci" deger={`${t.sepetiAcik} / ${t.ogrenci}`} alt={`${t.acan} öğrencinin velisi sepeti açtı`} />
        <Kpi ad="Sipariş veren öğrenci" deger={`${t.siparis} / ${t.ogrenci}`} alt={t.sepetiAcik ? `Sepeti açık olanların %${Math.round((t.siparis / t.sepetiAcik) * 100)}'i` : 'Henüz açık sepet yok'} />
        <Kpi ad="Ulaşmayan SMS" deger={t.ulasmayan} alt={t.ulasmayan ? 'Sepet detayından hatırlatın' : 'Sorun yok'} ton={t.ulasmayan ? 'uyari' : undefined} />
        {hakedis && <Kpi ad="Hakedişiniz" deger={hakedis.tutar} alt={`Ciro ${hakedis.ciro}${hakedis.oran != null ? ` · %${hakedis.oran}` : ''}`} />}
      </KpiSatiri>

      <SepetKartlari sepetler={veri.sepetler} rolOnek={rolOnek} ogretmen={!!ogretmen} yeniHref={`${rolOnek}/listeler?yeni=1${okulParam}`} />

      <div className="flex flex-wrap items-start gap-6">
        {(
          <div className="min-w-0 flex-[1_1_420px]">
            <Bolum id="subeler" ust="SINIFLAR" baslik={ogretmen ? 'Sınıflarım' : 'Şube bazında durum'}>
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
