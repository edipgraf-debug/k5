'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PosKaydi, PosKurali, TaksitKaydi } from '@/lib/data/ticaret';
import { DurumMesaji, FormKarti, useIstek } from './ortak';

type KuralForm = Omit<PosKurali, 'id' | 'posAd'> & { id: number | null };
const kayit = '/api/yonetim/ayarlar/kayit';

/** Sanal POS'lar (aktif / test), taksit seçenekleri ve kart → POS yönlendirme kuralları. POS anahtarları burada değil, sunucu yapılandırmasındadır. */
export default function PosAyarlari({ poslar, kurallar }: { poslar: PosKaydi[]; kurallar: PosKurali[] }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [taksitPos, setTaksitPos] = useState<number | null>(null);
  const [taksitler, setTaksitler] = useState<Omit<TaksitKaydi, 'id'>[]>([]);
  const [kural, setKural] = useState<KuralForm | null>(null);

  async function posDegistir(p: PosKaydi, g: { test?: boolean; aktif?: boolean }) {
    if (await gonder(kayit, 'POST', { tur: 'pos', id: p.id, veri: { test: g.test ?? p.test, aktif: g.aktif ?? p.aktif } }, `${p.ad} güncellendi`)) router.refresh();
  }
  async function taksitKaydet() {
    if (!taksitPos) return;
    if (await gonder(kayit, 'POST', { tur: 'taksit', id: taksitPos, veri: { taksitler } }, 'Taksitler kaydedildi')) { setTaksitPos(null); router.refresh(); }
  }
  async function kuralKaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!kural) return;
    const { id, ...veri } = kural;
    if (await gonder(kayit, 'POST', { tur: 'kural', id, veri }, 'Kural kaydedildi')) { setKural(null); router.refresh(); }
  }
  async function kuralSil(k: PosKurali) {
    if (!window.confirm(`"${k.ad}" kuralı silinsin mi?`)) return;
    if (await gonder(kayit, 'POST', { tur: 'kural', id: k.id, sil: true }, 'Kural silindi')) router.refresh();
  }
  const sayiN = (s: string) => (s === '' ? null : Number(s));

  return (
    <>
      <FormKarti ust="SANAL POS" baslik="POS'lar ve taksitler">
        <DurumMesaji durum={durum} />
        <p className="text-sm text-metin-2">Mağaza numarası, anahtar ve şifreler güvenlik için bu ekranda değil, sunucu yapılandırmasındadır. Test modundaki POS gerçek çekim yapmaz.</p>
        <ul className="flex flex-col gap-3">
          {poslar.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-xl border border-cizgi p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-baslik text-base font-extrabold">{p.ad} <span className="text-sm font-semibold text-metin-3">· {p.kod}</span></span>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" role="switch" checked={p.aktif} onChange={(e) => posDegistir(p, { aktif: e.target.checked })} className="size-5 accent-lacivert" />Aktif</label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" role="switch" checked={p.test} onChange={(e) => posDegistir(p, { test: e.target.checked })} className="size-5 accent-lacivert" />Test modu</label>
                  <button type="button" className="btn-cerceve min-h-10" onClick={() => { setTaksitPos(p.id); setTaksitler(p.taksitler.map(({ id: _i, ...t }) => t)); }}>Taksitler ({p.taksitler.length})</button>
                </div>
              </div>
              {p.taksitler.length > 0 && taksitPos !== p.id && (
                <span className="text-sm text-metin-2">{p.taksitler.filter((t) => t.aktif).map((t) => `${t.taksit} taksit${t.kartAilesi ? ` (${t.kartAilesi})` : ''}${t.vadeFarki ? ` +%${t.vadeFarki}` : ''}`).join(' · ') || 'Aktif taksit yok'}</span>
              )}
              {taksitPos === p.id && (
                <div className="flex flex-col gap-2 rounded-xl bg-zemin p-3">
                  {taksitler.map((t, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-2 [&>label]:flex-[1_1_120px]">
                      <label className="flex flex-col gap-1"><span className="etiket">Kart ailesi (boş = tümü)</span><input className="girdi h-11" value={t.kartAilesi ?? ''} onChange={(e) => setTaksitler(taksitler.map((x, j) => (j === i ? { ...x, kartAilesi: e.target.value || null } : x)))} placeholder="World, Bonus…" /></label>
                      <label className="flex flex-col gap-1"><span className="etiket">Taksit</span><input type="number" min={1} max={12} className="girdi h-11" value={t.taksit} onChange={(e) => setTaksitler(taksitler.map((x, j) => (j === i ? { ...x, taksit: Number(e.target.value) || 1 } : x)))} /></label>
                      <label className="flex flex-col gap-1"><span className="etiket">Vade farkı %</span><input type="number" min={0} step="0.01" className="girdi h-11" value={t.vadeFarki} onChange={(e) => setTaksitler(taksitler.map((x, j) => (j === i ? { ...x, vadeFarki: Number(e.target.value) || 0 } : x)))} /></label>
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={t.aktif} onChange={(e) => setTaksitler(taksitler.map((x, j) => (j === i ? { ...x, aktif: e.target.checked } : x)))} className="size-5 accent-lacivert" />Aktif</label>
                      <button type="button" aria-label="Satırı sil" className="inline-flex size-11 items-center justify-center rounded-[10px] border-2 border-kenar bg-white text-kirmizi" onClick={() => setTaksitler(taksitler.filter((_, j) => j !== i))}>✕</button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-cerceve min-h-11" onClick={() => setTaksitler([...taksitler, { kartAilesi: null, taksit: (taksitler.at(-1)?.taksit ?? 1) + 1, vadeFarki: 0, aktif: true }])}>+ Taksit</button>
                    <button type="button" disabled={bekliyor} className="btn-koyu min-h-11" onClick={taksitKaydet}>Taksitleri kaydet</button>
                    <button type="button" className="btn-cerceve min-h-11" onClick={() => setTaksitPos(null)}>Vazgeç</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </FormKarti>

      <FormKarti ust="YÖNLENDİRME" baslik="Kart → POS kuralları" aksiyon={<button type="button" className="btn-turuncu min-h-11" onClick={() => setKural({ id: null, oncelik: (kurallar.at(-1)?.oncelik ?? 0) + 10, ad: '', taksitMin: null, taksitMax: null, kartBankasi: null, kartAilesi: null, kartTipi: null, posId: poslar[0]?.id ?? 0, aktif: true })}>+ Kural</button>}>
        <p className="text-sm text-metin-2">Ödemede kurallar öncelik sırasıyla denenir; kartın bankası / ailesi / tipi ve seçilen taksite ilk uyan kuralın POS&apos;u kullanılır. En sona koşulsuz bir kural koyun.</p>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead><tr>{['Öncelik', 'Kural', 'Taksit', 'Kart', 'POS', 'Durum', ''].map((h, i) => <th key={i} scope="col" className="border-b border-cizgi bg-zemin px-3 py-2 font-extrabold text-metin-2">{h || <span className="sr-only">İşlem</span>}</th>)}</tr></thead>
            <tbody>
              {kurallar.map((k) => (
                <tr key={k.id}>
                  <td className="border-b border-[#EEF0F3] px-3 py-2 font-bold">{k.oncelik}</td>
                  <td className="border-b border-[#EEF0F3] px-3 py-2">{k.ad}</td>
                  <td className="border-b border-[#EEF0F3] px-3 py-2">{k.taksitMin == null && k.taksitMax == null ? 'Hepsi' : `${k.taksitMin ?? 1}–${k.taksitMax ?? 12}`}</td>
                  <td className="border-b border-[#EEF0F3] px-3 py-2">{[k.kartBankasi, k.kartAilesi, k.kartTipi].filter(Boolean).join(' · ') || 'Tüm kartlar'}</td>
                  <td className="border-b border-[#EEF0F3] px-3 py-2">{k.posAd}</td>
                  <td className="border-b border-[#EEF0F3] px-3 py-2">{k.aktif ? 'Aktif' : 'Pasif'}</td>
                  <td className="border-b border-[#EEF0F3] px-3 py-2 text-right whitespace-nowrap">
                    <button type="button" className="mr-3 font-bold" onClick={() => setKural({ ...k })}>Düzenle</button>
                    <button type="button" className="font-bold text-kirmizi" onClick={() => kuralSil(k)}>Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {kural && (
          <form onSubmit={kuralKaydet} className="flex flex-col gap-3 rounded-xl border-2 border-lacivert p-4">
            <div className="flex flex-wrap gap-3 [&>label]:flex-[1_1_150px]">
              <label className="flex flex-col gap-1"><span className="etiket">Öncelik</span><input type="number" className="girdi" value={kural.oncelik} onChange={(e) => setKural({ ...kural, oncelik: Number(e.target.value) || 1 })} /></label>
              <label className="flex flex-[2_1_260px] flex-col gap-1"><span className="etiket">Kural adı</span><input className="girdi" value={kural.ad} onChange={(e) => setKural({ ...kural, ad: e.target.value })} placeholder="World kartlar taksit → Yapı Kredi" /></label>
              <label className="flex flex-col gap-1"><span className="etiket">POS</span>
                <select className="girdi" value={kural.posId} onChange={(e) => setKural({ ...kural, posId: Number(e.target.value) })}>{poslar.map((p) => <option key={p.id} value={p.id}>{p.ad}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap gap-3 [&>label]:flex-[1_1_140px]">
              <label className="flex flex-col gap-1"><span className="etiket">En az taksit</span><input type="number" min={1} max={12} className="girdi" value={kural.taksitMin ?? ''} onChange={(e) => setKural({ ...kural, taksitMin: sayiN(e.target.value) })} /></label>
              <label className="flex flex-col gap-1"><span className="etiket">En çok taksit</span><input type="number" min={1} max={12} className="girdi" value={kural.taksitMax ?? ''} onChange={(e) => setKural({ ...kural, taksitMax: sayiN(e.target.value) })} /></label>
              <label className="flex flex-col gap-1"><span className="etiket">Kart bankası</span><input className="girdi" value={kural.kartBankasi ?? ''} onChange={(e) => setKural({ ...kural, kartBankasi: e.target.value || null })} placeholder="Boş = hepsi" /></label>
              <label className="flex flex-col gap-1"><span className="etiket">Kart ailesi</span><input className="girdi" value={kural.kartAilesi ?? ''} onChange={(e) => setKural({ ...kural, kartAilesi: e.target.value || null })} placeholder="World, Bonus…" /></label>
              <label className="flex flex-col gap-1"><span className="etiket">Kart tipi</span>
                <select className="girdi" value={kural.kartTipi ?? ''} onChange={(e) => setKural({ ...kural, kartTipi: (e.target.value || null) as PosKurali['kartTipi'] })}><option value="">Hepsi</option><option value="Kredi">Kredi</option><option value="Banka">Banka</option></select></label>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 font-bold"><input type="checkbox" checked={kural.aktif} onChange={(e) => setKural({ ...kural, aktif: e.target.checked })} className="size-5 accent-lacivert" />Aktif</label>
            <div className="flex gap-2.5"><button type="submit" disabled={bekliyor} className="btn-koyu">Kaydet</button><button type="button" className="btn-cerceve" onClick={() => setKural(null)}>Vazgeç</button></div>
          </form>
        )}
      </FormKarti>
    </>
  );
}
