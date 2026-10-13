import Link from 'next/link';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { HAZIRLAYAN_ADI, tavsiyeDurumu } from '@/lib/raporlar';
import { tarihSaat, tl } from '@/lib/bicim';
import { Bolum, Bos, Kpi, KpiSatiri, Rozet, SepetRozeti, TABLO } from '@/components/panel/Ortak';
import { telGoster } from '@/components/yonetim/etiketler';

type SP = { sekme?: string; okulId?: string; saat?: string; yayinda?: string };

/** Müşteri sepet raporları: tavsiye sepeti durumu ve terk edilen sepetler (kitabevi: tümü, plasiyer: kendi okulları) */
export default async function SepetRaporlari({ sp, okulIdleri, temel, sepetDetay }: { sp: SP; okulIdleri: number[] | null; temel: string; sepetDetay: boolean }) {
  const sekme = sp.sekme === 'terk' ? 'terk' : 'tavsiye';
  const okulId = Number(sp.okulId) || null;
  const saat = [2, 6, 24, 48, 72, 168].find((x) => x === Number(sp.saat)) ?? 24;
  const okullar = (await (await yonetimRepo()).okulListesi()).filter((x) => !okulIdleri || okulIdleri.includes(x.id));
  const adres = (ek: Partial<SP>) => { const p = new URLSearchParams(Object.entries({ ...sp, ...ek }).filter(([, v]) => v) as [string, string][]); return `${temel}?${p}`; };

  const sekmeler = (
    <nav aria-label="Rapor" className="flex flex-wrap gap-2">
      {([['tavsiye', 'Tavsiye sepeti durumu'], ['terk', 'Terk edilen sepetler']] as const).map(([id, ad]) => (
        <Link key={id} href={adres({ sekme: id })} aria-current={sekme === id ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center rounded-[10px] border-2 px-4 font-baslik text-sm font-bold no-underline ${sekme === id ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white text-lacivert'}`}>{ad}</Link>
      ))}
    </nav>
  );
  const okulSecimi = (
    <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5"><label htmlFor="r-okul" className="etiket">Okul</label>
      <select id="r-okul" name="okulId" defaultValue={okulId ?? ''} className="girdi"><option value="">Tüm okullar</option>{okullar.map((x) => <option key={x.id} value={x.id}>{x.ad}</option>)}</select></div>
  );

  if (sekme === 'terk') {
    const l = await (await ticaretRepo()).terkEdilenSepetler({ saat, okulId, okulIdleri });
    return (
      <>
        {sekmeler}
        <form method="get" className="kart flex flex-wrap items-end gap-3 p-5">
          <input type="hidden" name="sekme" value="terk" />
          {okulSecimi}
          <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-1.5"><label htmlFor="r-saat" className="etiket">Sepete dokunulmayan süre</label>
            <select id="r-saat" name="saat" defaultValue={saat} className="girdi">{[2, 6, 24, 48, 72, 168].map((x) => <option key={x} value={x}>{x < 24 ? `${x} saat` : `${x / 24} gün`} ve üstü</option>)}</select></div>
          <button type="submit" className="btn-koyu">Listele</button>
          <a href={`/api/rapor/terk?${new URLSearchParams({ saat: String(saat), ...(okulId ? { okulId: String(okulId) } : {}) })}`} className="btn-cerceve">Excel&apos;e aktar</a>
        </form>
        <KpiSatiri>
          <Kpi ad="Terk edilen sepet" deger={l.length} ton={l.length ? 'uyari' : undefined} alt={`${saat < 24 ? `${saat} saat` : `${saat / 24} gün`}tür siparişe dönmeyen`} />
          <Kpi ad="Sepetlerdeki tutar" deger={tl(l.reduce((a, x) => a + x.tutar, 0))} alt="KDV dahil" />
          <Kpi ad="E-postası olan veli" deger={l.filter((x) => x.eposta).length} alt="Hatırlatma için" />
        </KpiSatiri>
        <Bolum id="terk" baslik="Siparişe dönmeyen veli sepetleri" ust="TERK EDİLEN">
          {l.length ? (
            <div className={TABLO.sar}>
              <table className={`${TABLO.tablo} min-w-[980px]`}>
                <thead><tr>{['Veli', 'Öğrenci', 'Okul / plasiyer', 'Kalem', 'Tutar', 'Son işlem', 'İletişim'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {l.map((x) => (
                    <tr key={x.sepetId}>
                      <td className={TABLO.td}><strong>{x.veliAd ?? 'Adsız veli'}</strong></td>
                      <td className={TABLO.td}>{sepetDetay ? <Link href={`/yonetim/ogrenciler/${x.ogrenciId}`}>{x.ogrenciAd}</Link> : x.ogrenciAd}<span className="block text-[12px] text-metin-3">{x.sinifSube ?? ''}</span></td>
                      <td className={TABLO.td}>{x.okulAd}<span className="block text-[12px] text-metin-3">{x.plasiyerAd ?? ''}</span></td>
                      <td className={TABLO.td}>{x.kalem}</td>
                      <td className={`${TABLO.td} font-bold`}>{tl(x.tutar)}</td>
                      <td className={`${TABLO.td} whitespace-nowrap`}>{tarihSaat(x.guncelleme)}</td>
                      <td className={TABLO.td}><a href={`tel:+90${x.telefon}`} className="block">{telGoster(x.telefon)}</a>{x.eposta && <a href={`mailto:${x.eposta}`} className="text-[13px]">{x.eposta}</a>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>Bu süre için terk edilen sepet yok.</Bos>}
        </Bolum>
      </>
    );
  }

  const l = await tavsiyeDurumu(okulIdleri, { okulId, yalnizYayinda: sp.yayinda === '1' });
  const yayinda = l.filter((x) => x.durum !== 'taslak');
  const t = (k: 'kapsam' | 'acik' | 'acan' | 'siparis') => yayinda.reduce((a, x) => a + x[k], 0);
  return (
    <>
      {sekmeler}
      <form method="get" className="kart flex flex-wrap items-end gap-3 p-5">
        {okulSecimi}
        <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" name="yayinda" value="1" defaultChecked={sp.yayinda === '1'} className="size-5 accent-lacivert" />Yalnız yayındakiler</label>
        <button type="submit" className="btn-koyu">Listele</button>
        <a href={`/api/rapor/tavsiye?${new URLSearchParams(okulId ? { okulId: String(okulId) } : {})}`} className="btn-cerceve">Excel&apos;e aktar</a>
      </form>
      <KpiSatiri>
        <Kpi ad="Yayındaki sepet" deger={yayinda.length} alt={`${l.length - yayinda.length} taslak`} />
        <Kpi ad="Sepeti açık öğrenci" deger={t('acik')} alt={`${t('kapsam')} kapsamdaki öğrenciden`} />
        <Kpi ad="Veli açtı" deger={t('acan')} alt={t('acik') ? `%${Math.round((t('acan') / t('acik')) * 100)}` : '—'} />
        <Kpi ad="Sipariş veren" deger={t('siparis')} alt={t('acik') ? `Dönüşüm %${Math.round((t('siparis') / t('acik')) * 100)}` : '—'} />
      </KpiSatiri>
      <Bolum id="tavsiye" ust="TAVSİYE SEPETLERİ" baslik="Okul / sınıf bazında durum">
        {l.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[1080px]`}>
              <thead><tr>{['Okul / plasiyer', 'Sepet', 'Sınıf', 'Hazırlayan', 'Durum', 'Kapsam', 'Açık', 'Veli açtı', 'Sipariş', 'Dönüşüm'].map((h) => <th key={h} scope="col" className={TABLO.th}>{h}</th>)}</tr></thead>
              <tbody>
                {l.map((x) => (
                  <tr key={x.listeId}>
                    <td className={TABLO.td}>{x.okulAd}<span className="block text-[12px] text-metin-3">{x.plasiyerAd ?? 'plasiyer yok'}</span></td>
                    <td className={TABLO.td}>{sepetDetay ? <Link href={`/yonetim/listeler/${x.listeId}`} className="font-bold">{x.ad}</Link> : <strong>{x.ad}</strong>}</td>
                    <td className={TABLO.td}>{x.kapsamAd}</td>
                    <td className={TABLO.td}>{x.hazirlayan}<span className="block text-[12px] text-metin-3">{HAZIRLAYAN_ADI[x.hazirlayanTip] ?? ''}</span></td>
                    <td className={TABLO.td}><SepetRozeti durum={x.durum} /></td>
                    <td className={TABLO.td}>{x.kapsam}</td><td className={TABLO.td}>{x.acik}</td><td className={TABLO.td}>{x.acan}</td>
                    <td className={`${TABLO.td} font-bold`}>{x.siparis}</td>
                    <td className={TABLO.td}>{x.acik ? <Rozet ton={x.siparis / x.acik >= 0.5 ? 'yesil' : x.siparis ? 'sari' : 'gri'}>%{Math.round((x.siparis / x.acik) * 100)}</Rozet> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Sepet yok.</Bos>}
      </Bolum>
    </>
  );
}
