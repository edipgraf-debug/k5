'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KategoriKaydi } from '@/lib/data/ticaret';
import { DurumMesaji, useIstek } from './ortak';

interface UrunSatiri { id: number; ad: string; barkod: string | null; yayinevi: string | null; fiyat: number; kategoriIdleri: number[]; aktif: boolean }
const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';

/**
 * Kategori ağacı: ekle / düzenle / taşı / sil; seçili kategorinin ürünleri;
 * hızlı arama ile ürünleri listeleyip toplu seçerek kategoriye ekleme (ör. "2. Sınıf" → "2. Sınıf Yardımcı Kaynak Kitapları").
 */
export default function KategoriYonetimi({ kategoriler, baslangic }: { kategoriler: KategoriKaydi[]; baslangic: number | null }) {
  const router = useRouter();
  const { durum, setDurum, bekliyor, gonder } = useIstek();
  const [seciliId, setSeciliId] = useState<number | null>(baslangic ?? kategoriler.find((k) => !k.ustId)?.id ?? null);
  const secili = kategoriler.find((k) => k.id === seciliId) ?? null;
  // düzenleme formu
  const [form, setForm] = useState<{ id: number | null; ustId: number | null; ad: string; slug: string; sira: number; aktif: boolean } | null>(null);
  // kategorinin ürünleri ve arama
  const [urunler, setUrunler] = useState<UrunSatiri[]>([]);
  const [cikar, setCikar] = useState<number[]>([]);
  const [q, setQ] = useState('');
  const [sonuc, setSonuc] = useState<UrunSatiri[]>([]);
  const [secim, setSecim] = useState<number[]>([]);
  const [araniyor, setAraniyor] = useState(false);

  const urunleriYukle = useCallback(async (id: number) => {
    const r = await fetch(`/api/yonetim/urunler?kategoriId=${id}&boy=300`);
    if (r.ok) setUrunler((await r.json()).urunler);
  }, []);
  useEffect(() => { if (seciliId) urunleriYukle(seciliId); else setUrunler([]); setCikar([]); setSecim([]); }, [seciliId, urunleriYukle]);

  async function ara(e?: React.FormEvent) {
    e?.preventDefault();
    if (q.trim().length < 2) { setSonuc([]); return; }
    setAraniyor(true);
    try {
      const r = await fetch(`/api/yonetim/urunler?q=${encodeURIComponent(q.trim())}&boy=300`);
      if (r.ok) { const l: UrunSatiri[] = (await r.json()).urunler; setSonuc(l); setSecim(l.filter((u) => !u.kategoriIdleri.includes(seciliId ?? 0)).map((u) => u.id)); }
    } finally { setAraniyor(false); }
  }

  const eklenebilir = useMemo(() => sonuc.filter((u) => !u.kategoriIdleri.includes(seciliId ?? 0)), [sonuc, seciliId]);

  async function topluEkle() {
    if (!secili || !secim.length) return;
    const r = await gonder<{ eklenen: number }>(`/api/yonetim/kategoriler/${secili.id}/urunler`, 'POST', { ekle: secim });
    if (r) {
      setDurum({ tip: 'ok', m: `${r.eklenen} ürün "${secili.ad}" kategorisine eklendi` });
      setSonuc(sonuc.map((u) => (secim.includes(u.id) ? { ...u, kategoriIdleri: [...u.kategoriIdleri, secili.id] } : u)));
      setSecim([]); urunleriYukle(secili.id); router.refresh();
    }
  }
  async function cikart() {
    if (!secili || !cikar.length) return;
    const r = await gonder(`/api/yonetim/kategoriler/${secili.id}/urunler`, 'POST', { cikar }, `${cikar.length} ürün kategoriden çıkarıldı`);
    if (r) { setCikar([]); urunleriYukle(secili.id); router.refresh(); }
  }
  async function formKaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const govde = { ustId: form.ustId, ad: form.ad, slug: form.slug, sira: form.sira, aktif: form.aktif };
    const r = form.id ? await gonder(`/api/yonetim/kategoriler/${form.id}`, 'PUT', govde, 'Kategori kaydedildi')
      : await gonder<{ id: number }>('/api/yonetim/kategoriler', 'POST', govde, 'Kategori eklendi');
    if (r) { if (!form.id && typeof r === 'object' && 'id' in r) setSeciliId((r as { id: number }).id); setForm(null); router.refresh(); }
  }
  async function sil(k: KategoriKaydi) {
    if (!window.confirm(`"${k.ad}" silinsin mi? Ürünler silinmez, yalnız bu kategoriden çıkar.`)) return;
    if (await gonder(`/api/yonetim/kategoriler/${k.id}`, 'DELETE', undefined, 'Kategori silindi')) { setSeciliId(null); router.refresh(); }
  }

  // ağaç sırası (girintili)
  const agac: { k: KategoriKaydi; d: number }[] = [];
  const gez = (ust: number | null, d: number) => { for (const k of kategoriler.filter((x) => x.ustId === ust)) { agac.push({ k, d }); if (d < 8) gez(k.id, d + 1); } };
  gez(null, 0);
  const altlari = (id: number): number[] => { const o = [id]; for (let i = 0; i < o.length; i++) for (const k of kategoriler) if (k.ustId === o[i]) o.push(k.id); return o; };

  return (
    <div className="flex flex-col gap-4">
      <DurumMesaji durum={durum} />
      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Kategori ağacı" className="kart flex min-w-0 flex-[1_1_300px] flex-col gap-2 p-4 lg:max-w-[380px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold tracking-wider text-kiremit">KATEGORİ AĞACI</span>
            <button type="button" className="btn-turuncu min-h-10 px-3 text-sm" onClick={() => setForm({ id: null, ustId: null, ad: '', slug: '', sira: (kategoriler.length + 1) * 10, aktif: true })}>+ Ana kategori</button>
          </div>
          <ul className="flex flex-col">
            {agac.map(({ k, d }) => (
              <li key={k.id} style={{ paddingLeft: d * 16 }}>
                <button type="button" onClick={() => setSeciliId(k.id)} aria-current={seciliId === k.id ? 'true' : undefined}
                  className={`flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 text-left text-sm ${seciliId === k.id ? 'bg-lacivert font-bold text-white' : 'font-semibold hover:bg-zemin'}`}>
                  <span>{d > 0 && <span aria-hidden="true" className="mr-1 opacity-60">└</span>}{k.ad}{!k.aktif && <span className="ml-1 text-xs">(kapalı)</span>}</span>
                  <span className={seciliId === k.id ? 'text-[#C9D1DC]' : 'text-metin-3'}>{k.urunSayisi}</span>
                </button>
              </li>
            ))}
            {!agac.length && <li className="py-2 text-sm text-metin-2">Henüz kategori yok.</li>}
          </ul>
        </section>

        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
          {form && (
            <form onSubmit={formKaydet} className="kart flex flex-col gap-4 border-2 border-lacivert p-5">
              <h2 className="font-baslik text-lg font-extrabold">{form.id ? 'Kategoriyi düzenle' : 'Yeni kategori'}</h2>
              <div className="flex flex-wrap gap-4 [&>*]:flex-[1_1_220px]">
                <label className="flex flex-col gap-1.5"><span className="etiket">Ad</span>
                  <input className="girdi" value={form.ad} onChange={(e) => setForm({ ...form, ad: e.target.value })} placeholder="Ör. 2. Sınıf Yardımcı Kaynak Kitapları" required /></label>
                <label className="flex flex-col gap-1.5"><span className="etiket">Üst kategori</span>
                  <select className="girdi" value={form.ustId ?? ''} onChange={(e) => setForm({ ...form, ustId: Number(e.target.value) || null })}>
                    <option value="">— Ana kategori —</option>
                    {agac.filter(({ k }) => !form.id || !altlari(form.id).includes(k.id)).map(({ k, d }) => <option key={k.id} value={k.id}>{'— '.repeat(d)}{k.ad}</option>)}
                  </select></label>
              </div>
              <div className="flex flex-wrap gap-4 [&>*]:flex-[1_1_180px]">
                <label className="flex flex-col gap-1.5"><span className="etiket">Adres (boşsa addan)</span>
                  <input className="girdi" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="2-sinif-yardimci-kaynak" /></label>
                <label className="flex flex-col gap-1.5"><span className="etiket">Sıra</span>
                  <input type="number" className="girdi" value={form.sira} onChange={(e) => setForm({ ...form, sira: Number(e.target.value) || 0 })} /></label>
                <label className="flex min-h-12 cursor-pointer items-center gap-2 self-end text-sm font-bold">
                  <input type="checkbox" checked={form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked })} className="size-5 accent-lacivert" />Menüde göster</label>
              </div>
              <div className="flex gap-2.5"><button type="submit" disabled={bekliyor} className="btn-koyu">Kaydet</button><button type="button" onClick={() => setForm(null)} className="btn-cerceve">Vazgeç</button></div>
            </form>
          )}

          {secili ? (
            <>
              <section className="kart flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold tracking-wider text-kiremit">SEÇİLİ KATEGORİ</span>
                    <h2 className="font-baslik text-xl font-extrabold">{secili.ad}</h2>
                    <span className="text-sm text-metin-2">/katalog?kategori={secili.slug} · {urunler.length} ürün doğrudan bu kategoride{secili.urunSayisi !== urunler.length ? ` · alt kategorilerle ${secili.urunSayisi}` : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-cerceve min-h-11" onClick={() => setForm({ id: null, ustId: secili.id, ad: '', slug: '', sira: 10, aktif: true })}>+ Alt kategori</button>
                    <button type="button" className="btn-cerceve min-h-11" onClick={() => setForm({ id: secili.id, ustId: secili.ustId, ad: secili.ad, slug: secili.slug, sira: secili.sira, aktif: secili.aktif })}>Düzenle</button>
                    <button type="button" className="min-h-11 cursor-pointer rounded-xl border-2 border-kirmizi-zemin px-4 font-bold text-kirmizi" onClick={() => sil(secili)}>Sil</button>
                  </div>
                </div>
              </section>

              <section className="kart flex flex-col gap-3 p-5">
                <span className="text-xs font-extrabold tracking-wider text-kiremit">HIZLI ARAMA İLE TOPLU EKLE</span>
                <form onSubmit={ara} className="flex flex-wrap gap-2">
                  <label htmlFor="kq" className="sr-only">Ürün ara</label>
                  <input id="kq" type="search" className="girdi min-w-0 flex-[1_1_260px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder='Ör. "2. Sınıf", yayınevi ya da yazar' />
                  <button type="submit" className="btn-koyu min-h-12">{araniyor ? 'Aranıyor…' : 'Listele'}</button>
                </form>
                {sonuc.length > 0 && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold">
                        <input type="checkbox" className="size-5 accent-lacivert" checked={eklenebilir.length > 0 && eklenebilir.every((u) => secim.includes(u.id))}
                          onChange={(e) => setSecim(e.target.checked ? eklenebilir.map((u) => u.id) : [])} />
                        Tümünü seç ({sonuc.length} sonuç, {eklenebilir.length} eklenebilir)
                      </label>
                      <button type="button" onClick={topluEkle} disabled={!secim.length || bekliyor} className="btn-turuncu min-h-11">Seçilen {secim.length} ürünü &quot;{secili.ad}&quot; kategorisine ekle</button>
                    </div>
                    <ul className="flex max-h-[420px] flex-col overflow-y-auto rounded-xl border border-cizgi">
                      {sonuc.map((u) => {
                        const zaten = u.kategoriIdleri.includes(secili.id);
                        return (
                          <li key={u.id} className="border-b border-[#EEF0F3] last:border-0">
                            <label className={`flex min-h-12 items-center gap-3 px-3 py-2 ${zaten ? 'opacity-60' : 'cursor-pointer'}`}>
                              <input type="checkbox" disabled={zaten} checked={zaten || secim.includes(u.id)} className="size-5 accent-lacivert"
                                onChange={() => setSecim(secim.includes(u.id) ? secim.filter((x) => x !== u.id) : [...secim, u.id])} />
                              <span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-bold">{u.ad}</span>
                                <span className="text-[12.5px] text-metin-3">{[u.yayinevi, u.barkod].filter(Boolean).join(' · ')} · {tl(u.fiyat)}</span></span>
                              {zaten && <span className="text-[12px] font-bold text-yesil">zaten bu kategoride</span>}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </section>

              <section className="kart flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold tracking-wider text-kiremit">BU KATEGORİDEKİ ÜRÜNLER ({urunler.length})</span>
                  {cikar.length > 0 && <button type="button" onClick={cikart} className="min-h-10 cursor-pointer rounded-xl border-2 border-kirmizi-zemin px-3 text-sm font-bold text-kirmizi">Seçilen {cikar.length} ürünü çıkar</button>}
                </div>
                {urunler.length ? (
                  <ul className="flex max-h-[420px] flex-col overflow-y-auto rounded-xl border border-cizgi">
                    {urunler.map((u) => (
                      <li key={u.id} className="border-b border-[#EEF0F3] last:border-0">
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2">
                          <input type="checkbox" checked={cikar.includes(u.id)} className="size-5 accent-kirmizi"
                            onChange={() => setCikar(cikar.includes(u.id) ? cikar.filter((x) => x !== u.id) : [...cikar, u.id])} aria-label={`${u.ad} çıkarmak için seç`} />
                          <span className="flex min-w-0 flex-1 flex-col"><span className="text-sm font-bold">{u.ad}{!u.aktif && <span className="ml-1 text-xs text-kirmizi">(satışta değil)</span>}</span>
                            <span className="text-[12.5px] text-metin-3">{[u.yayinevi, u.barkod].filter(Boolean).join(' · ')}</span></span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-metin-2">Bu kategoride doğrudan ürün yok. Yukarıdan arayıp ekleyin.</p>}
              </section>
            </>
          ) : <p className="kart p-6 text-metin-2">Soldan bir kategori seçin ya da &quot;+ Ana kategori&quot; ile başlayın.</p>}
        </div>
      </div>
    </div>
  );
}
