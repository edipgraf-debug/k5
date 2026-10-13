import Link from 'next/link';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { tahsilatFiltresi, ODEME_DURUM_ADI, type TahsilatSP } from '@/lib/raporlar';
import { tarihSaat, tl } from '@/lib/bicim';
import { Bolum, Bos, Kpi, KpiSatiri, Rozet, TABLO, type Ton } from '@/components/panel/Ortak';
import HavaleOnay from './HavaleOnay';

const TON: Record<string, Ton> = { Basarili: 'yesil', Bekliyor: 'sari', Basarisiz: 'kirmizi', Iade: 'gri' };

/** Tahsilat listesi (kitabevi: tüm okullar + havale onayı; plasiyer: kendi okulları, salt okunur) */
export default async function TahsilatRaporu({ sp, okulIdleri, temel, onay }: { sp: TahsilatSP; okulIdleri: number[] | null; temel: string; onay: boolean }) {
  const f = tahsilatFiltresi(sp, okulIdleri);
  const [satirlar, okullar] = await Promise.all([(await ticaretRepo()).tahsilatlar(f), (await yonetimRepo()).okulListesi()]);
  const izinliOkullar = okullar.filter((x) => !okulIdleri || okulIdleri.includes(x.id));
  const top = (l: typeof satirlar) => l.reduce((a, x) => a + x.tutar, 0);
  const basarili = satirlar.filter((x) => x.durum === 'Basarili');
  const bekleyen = satirlar.filter((x) => x.durum === 'Bekliyor');
  const p = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);

  return (
    <>
      <form method="get" className="kart flex flex-wrap items-end gap-3 p-5">
        <div className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5"><label htmlFor="t-bas" className="etiket">Başlangıç</label><input id="t-bas" type="date" name="bas" defaultValue={sp.bas ?? ''} className="girdi" /></div>
        <div className="flex min-w-0 flex-[1_1_150px] flex-col gap-1.5"><label htmlFor="t-bit" className="etiket">Bitiş</label><input id="t-bit" type="date" name="bit" defaultValue={sp.bit ?? ''} className="girdi" /></div>
        <div className="flex min-w-0 flex-[1_1_130px] flex-col gap-1.5"><label htmlFor="t-tip" className="etiket">Ödeme tipi</label>
          <select id="t-tip" name="tip" defaultValue={sp.tip ?? ''} className="girdi"><option value="">Tümü</option><option value="Kart">Kart</option><option value="Havale">Havale / EFT</option></select></div>
        <div className="flex min-w-0 flex-[1_1_130px] flex-col gap-1.5"><label htmlFor="t-d" className="etiket">Durum</label>
          <select id="t-d" name="durum" defaultValue={sp.durum ?? ''} className="girdi"><option value="">Tümü</option>{Object.entries(ODEME_DURUM_ADI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-1.5"><label htmlFor="t-okul" className="etiket">Okul</label>
          <select id="t-okul" name="okulId" defaultValue={sp.okulId ?? ''} className="girdi"><option value="">Tüm okullar</option>{izinliOkullar.map((x) => <option key={x.id} value={x.id}>{x.ad}</option>)}</select></div>
        <div className="flex min-w-0 flex-[2_1_200px] flex-col gap-1.5"><label htmlFor="t-q" className="etiket">Ara</label><input id="t-q" name="q" type="search" defaultValue={sp.q ?? ''} className="girdi" placeholder="Sipariş no, veli, öğrenci, referans" /></div>
        <button type="submit" className="btn-koyu">Listele</button>
        <Link href={temel} className="self-center text-sm font-bold">Temizle</Link>
        <a href={`/api/rapor/tahsilat?${p}`} className="btn-cerceve">Excel&apos;e aktar</a>
      </form>
      <KpiSatiri>
        <Kpi ad="Başarılı tahsilat" deger={tl(top(basarili))} alt={`${basarili.length} işlem`} />
        <Kpi ad="Onay bekleyen" deger={tl(top(bekleyen))} alt={`${bekleyen.length} havale`} ton={bekleyen.length ? 'uyari' : undefined} />
        <Kpi ad="Başarısız deneme" deger={satirlar.filter((x) => x.durum === 'Basarisiz').length} alt="Kart reddi / 3D hatası" />
        <Kpi ad="İade" deger={tl(top(satirlar.filter((x) => x.durum === 'Iade')))} />
      </KpiSatiri>
      <Bolum id="tahsilat" baslik={`${satirlar.length} tahsilat kaydı`}>
        {satirlar.length ? (
          <div className={TABLO.sar}>
            <table className={`${TABLO.tablo} min-w-[1100px]`}>
              <thead><tr>{['Tarih', 'Sipariş', 'Okul / plasiyer', 'Veli / öğrenci', 'Tip', 'Ayrıntı', 'Tutar', 'Durum', ''].map((h, i) => <th key={i} scope="col" className={TABLO.th}>{h || <span className="sr-only">İşlem</span>}</th>)}</tr></thead>
              <tbody>
                {satirlar.map((x) => (
                  <tr key={x.id}>
                    <td className={`${TABLO.td} whitespace-nowrap`}>{tarihSaat(x.tarih)}</td>
                    <td className={TABLO.td}><strong>{x.siparisNo}</strong>{x.referans && <span className="block text-[12px] text-metin-3">Ref. {x.referans}</span>}</td>
                    <td className={TABLO.td}>{x.okulAd}<span className="block text-[12px] text-metin-3">{x.plasiyerAd ?? 'plasiyer yok'}</span></td>
                    <td className={TABLO.td}>{x.veliAd ?? '—'}<span className="block text-[12px] text-metin-3">{x.ogrenciAd ?? ''}</span></td>
                    <td className={TABLO.td}>{x.tip === 'Kart' ? 'Kart' : 'Havale'}</td>
                    <td className={`${TABLO.td} text-[13px]`}>{x.tip === 'Kart' ? `${x.pos ?? ''}${x.taksit && x.taksit > 1 ? ` · ${x.taksit} taksit` : ' · tek çekim'}${x.kartSonDort ? ` · **** ${x.kartSonDort}` : ''}`
                      : `${x.banka ?? ''}${x.havaleGonderen ? ` · ${x.havaleGonderen}` : ''}${x.onaylayan ? ` · onay: ${x.onaylayan}` : ''}`}</td>
                    <td className={`${TABLO.td} whitespace-nowrap font-bold`}>{tl(x.tutar)}</td>
                    <td className={TABLO.td}><Rozet ton={TON[x.durum]}>{ODEME_DURUM_ADI[x.durum]}</Rozet></td>
                    <td className={TABLO.td}>{onay && x.tip === 'Havale' && x.durum === 'Bekliyor' && <HavaleOnay id={x.id} tutar={tl(x.tutar)} siparisNo={x.siparisNo} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Bos>Bu filtrelere uyan tahsilat yok.</Bos>}
      </Bolum>
    </>
  );
}
