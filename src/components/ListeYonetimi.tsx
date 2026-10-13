'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Kalem, KitapListesi, ListeSatiri, OkulBilgi, SinifSecenegi, TakipSatiri } from '@/lib/types';
import { satirAnahtari, satirFiyati, zorunluToplam } from '@/lib/kalem-ortak';
import { hedefMetni } from '@/lib/bicim';

type Rol = 'ogretmen' | 'okul' | 'yonetim';
interface Veri { okulId: number | null; okullar: OkulBilgi[]; secenekler: SinifSecenegi[]; listeler: KitapListesi[]; kalemler: Record<string, Kalem> }
interface AliciOzet { ogrenciSayisi: number; velisizOgrenci?: number; veliSayisi: number; epostaSayisi: number; epostasiOlmayan: number; smsOrnek: string | null }

const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const tarih = (d: string | Date | null) => (d ? new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '');

async function istek<T>(url: string, secenek?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...secenek, headers: { 'Content-Type': 'application/json', ...(secenek?.headers ?? {}) } });
  const v = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(v.hata ?? 'İşlem yapılamadı');
  return v as T;
}

function durum(l: KitapListesi) {
  if (!l.yayinda) return { ad: 'Taslak', cls: 'bg-[#EEF0F3] text-metin-2', yayinlanabilir: true };
  const degisti = l.guncelleme && l.yayinTarihi && new Date(l.guncelleme).getTime() - new Date(l.yayinTarihi).getTime() > 1000;
  return degisti
    ? { ad: 'Yayında · değişiklik var', cls: 'bg-sari-zemin text-sari', yayinlanabilir: true }
    : { ad: 'Yayında', cls: 'bg-yesil-zemin text-yesil', yayinlanabilir: false };
}

export default function ListeYonetimi({ rol }: { rol: Rol }) {
  const [veri, setVeri] = useState<Veri | null>(null);
  const [okulId, setOkulId] = useState<number | null>(null);
  const [seciliId, setSeciliId] = useState<number | null>(null);
  const [kalemler, setKalemler] = useState<Record<string, Kalem>>({});
  const [hata, setHata] = useState('');
  const [mesaj, setMesaj] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);
  // yeni liste
  const [yeniAcik, setYeniAcik] = useState(false);
  const [yeniAd, setYeniAd] = useState('');
  const [yeniSecim, setYeniSecim] = useState<string>('');
  // katalog
  const [q, setQ] = useState('');
  const [sonuclar, setSonuclar] = useState<Kalem[]>([]);
  // yayın
  const [modal, setModal] = useState<AliciOzet | null>(null);
  const [hedef, setHedef] = useState<'toplu' | 'secili'>('toplu');
  const [kadro, setKadro] = useState<TakipSatiri[]>([]);
  const [seciliOgr, setSeciliOgr] = useState<number[]>([]);
  const [smsGonder, setSmsGonder] = useState(true);
  const [epostaGonder, setEpostaGonder] = useState(true);
  const [yayinlaniyor, setYayinlaniyor] = useState(false);

  const yukle = useCallback(async (oid?: number | null) => {
    setHata('');
    try {
      const v = await istek<Veri>(`/api/listeler${oid ? `?okulId=${oid}` : ''}`);
      setVeri(v);
      setOkulId(v.okulId);
      setKalemler((m) => ({ ...m, ...v.kalemler }));
      const istenen = Number(new URLSearchParams(window.location.search).get('liste'));
      setSeciliId((s) => (s && v.listeler.some((l) => l.id === s) ? s : v.listeler.some((l) => l.id === istenen) ? istenen : v.listeler[0]?.id ?? null));
    } catch (e) { setHata((e as Error).message); }
  }, []);

  // ?okulId= (Kardelen, okul sayfasından), ?yeni=1 (ana sayfadaki "+ Yeni tavsiye sepeti")
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    yukle(Number(p.get('okulId')) || null);
    if (p.get('yeni')) setYeniAcik(true);
  }, [yukle]);

  // katalog arama (gecikmeli)
  const zamanlayici = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    zamanlayici.current = setTimeout(async () => {
      try {
        const v = await istek<{ kalemler: Kalem[] }>(`/api/katalog?q=${encodeURIComponent(q)}`);
        setSonuclar(v.kalemler);
        setKalemler((m) => ({ ...m, ...Object.fromEntries(v.kalemler.map((k) => [k.anahtar, k])) }));
      } catch { /* yok say */ }
    }, 250);
  }, [q]);

  const liste = useMemo(() => veri?.listeler.find((l) => l.id === seciliId) ?? null, [veri, seciliId]);
  const d = liste ? durum(liste) : null;

  async function satirlariKaydet(satirlar: KitapListesi['satirlar']) {
    if (!liste || !veri) return;
    setKaydediliyor(true); setHata(''); setMesaj('');
    const once = veri;
    setVeri({ ...veri, listeler: veri.listeler.map((l) => (l.id === liste.id ? { ...l, satirlar } : l)) });
    try {
      const v = await istek<{ liste: KitapListesi }>(`/api/listeler/${liste.id}`, { method: 'PUT', body: JSON.stringify({ satirlar }) });
      setVeri((cur) => cur && { ...cur, listeler: cur.listeler.map((l) => (l.id === v.liste.id ? v.liste : l)) });
    } catch (e) { setVeri(once); setHata((e as Error).message); } finally { setKaydediliyor(false); }
  }

  async function listeOlustur() {
    const [kapsam, id] = yeniSecim.split(':');
    if (!kapsam) { setHata('Sınıf veya şube seçin'); return; }
    const secenek = veri?.secenekler.find((s) => s.kapsam === kapsam && s.id === Number(id));
    try {
      const v = await istek<{ liste: KitapListesi }>('/api/listeler', {
        method: 'POST', body: JSON.stringify({ okulId: okulId ?? undefined, ad: yeniAd.trim() || `${secenek?.ad ?? ''} tavsiye sepeti`, kapsam, id: Number(id) }),
      });
      setVeri((cur) => cur && { ...cur, listeler: [...cur.listeler, v.liste] });
      setSeciliId(v.liste.id); setYeniAcik(false); setYeniAd(''); setYeniSecim(''); setMesaj('');
    } catch (e) { setHata((e as Error).message); }
  }

  async function yayinPenceresi() {
    if (!liste) return;
    setHata('');
    try {
      const [ozet, t] = await Promise.all([
        istek<AliciOzet>(`/api/listeler/${liste.id}/alicilar`),
        istek<{ takip: TakipSatiri[] }>(`/api/listeler/${liste.id}/takip`),
      ]);
      setKadro(t.takip);
      setSeciliOgr([]);
      // tüm sınıfa açık sepette değişikliği yine tüm sınıfa yayınla; seçili yayınlanmış sepette yeni öğrenci eklemeye başla
      setHedef(liste.yayinda && liste.hedefTipi === 'Secili' ? 'secili' : 'toplu');
      setModal(ozet);
    } catch (e) { setHata((e as Error).message); }
  }

  // seçili öğrenciler değişince alıcı sayıları
  useEffect(() => {
    if (!modal || !liste || hedef !== 'secili') return;
    const t = setTimeout(async () => {
      try {
        const o = await istek<AliciOzet>(`/api/listeler/${liste.id}/alicilar?ogrenciler=${seciliOgr.join(',')}`);
        setModal((m) => m && { ...o, smsOrnek: o.smsOrnek ?? m.smsOrnek });
      } catch { /* yok say */ }
    }, 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seciliOgr, hedef]);

  async function hedefSec(h: 'toplu' | 'secili') {
    setHedef(h);
    if (h === 'toplu' && liste) {
      try { setModal(await istek<AliciOzet>(`/api/listeler/${liste.id}/alicilar`)); } catch { /* yok say */ }
    }
  }

  async function yayinla() {
    if (!liste) return;
    if (hedef === 'secili' && !seciliOgr.length) { setHata('En az bir öğrenci seçin'); return; }
    setYayinlaniyor(true); setHata('');
    try {
      const v = await istek<{ sonuc: { smsSayisi: number; epostaSayisi: number; ogrenciSayisi: number; tarih: string; hedefTipi: string }; liste: KitapListesi }>(
        `/api/listeler/${liste.id}/yayinla`, { method: 'POST', body: JSON.stringify({ sms: smsGonder, eposta: epostaGonder, hedef, ogrenciIdleri: hedef === 'secili' ? seciliOgr : undefined }) });
      setVeri((cur) => cur && { ...cur, listeler: cur.listeler.map((l) => (l.id === v.liste.id ? v.liste : l)) });
      const parca = [v.sonuc.smsSayisi ? `${v.sonuc.smsSayisi} veliye SMS` : '', v.sonuc.epostaSayisi ? `${v.sonuc.epostaSayisi} e-posta` : ''].filter(Boolean);
      const kime = hedef === 'toplu' ? `tüm sınıf (${v.sonuc.ogrenciSayisi} öğrenci)` : `${v.sonuc.ogrenciSayisi} seçili öğrenci`;
      setMesaj(`"${liste.ad}" yayınlandı · ${kime} · ${parca.length ? parca.join(' ve ') + ' gönderildi' : 'bildirim gönderilmedi'} · ${tarih(v.sonuc.tarih)}`);
      setModal(null);
    } catch (e) { setHata((e as Error).message); } finally { setYayinlaniyor(false); }
  }

  const secilebilir = kadro.filter((k) => !k.gorebilir);
  const hepsiSecili = secilebilir.length > 0 && secilebilir.every((k) => seciliOgr.includes(k.ogrenciId));

  if (!veri) return <main className="mx-auto max-w-[1280px] px-6 py-10 text-metin-2">{hata || 'Yükleniyor…'}</main>;

  const kim = rol === 'ogretmen' ? 'Yalnız size atanmış şubeler' : rol === 'okul' ? 'Okulunuzun tüm sınıf ve şubeleri' : 'Kitabevi olarak seçilen okul adına, tüm sınıf ve şubeler';
  const toplam = liste ? zorunluToplam(liste.satirlar, kalemler) : 0;

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 pb-16 pt-7 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-baslik text-[28px] font-extrabold">Tavsiye sepetleri</h1>
          <span className="text-[15px] text-metin-2">{kim}. Sepeti tüm sınıfa toplu ya da seçtiğiniz öğrencilere tek tek yayınlayın; velilere SMS ve e-posta gider.</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {rol === 'yonetim' && (
            <>
              <label htmlFor="okul" className="etiket">Okul</label>
              <select id="okul" className="girdi h-12 w-auto" value={okulId ?? ''} onChange={(e) => { const id = Number(e.target.value); setSeciliId(null); window.history.replaceState(null, '', `?okulId=${id}`); yukle(id); }}>
                {veri.okullar.map((o) => <option key={o.id} value={o.id}>{o.kod} · {o.ad}</option>)}
              </select>
            </>
          )}
          <button type="button" aria-expanded={yeniAcik} onClick={() => setYeniAcik((x) => !x)} className="btn-cerceve">+ Yeni tavsiye sepeti</button>
        </div>
      </div>

      {hata && <p role="alert" className="rounded-xl bg-kirmizi-zemin px-4 py-3 text-sm font-semibold text-kirmizi">{hata}</p>}
      {mesaj && <p role="status" className="rounded-2xl bg-yesil-zemin px-5 py-3.5 text-[15px] font-bold text-yesil">✓ {mesaj}</p>}

      {yeniAcik && (
        <section className="flex flex-wrap items-end gap-3.5 rounded-2xl border-2 border-lacivert bg-white p-5">
          <div className="flex flex-[2_1_260px] flex-col gap-1.5">
            <label htmlFor="lad" className="etiket">Sepet adı</label>
            <input id="lad" className="girdi" value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} placeholder="Ör. 5-B Yaz Okuma Sepeti" />
          </div>
          <div className="flex flex-[3_1_320px] flex-col gap-1.5">
            <span className="etiket">Sınıf / şube</span>
            <div role="group" aria-label="Sınıf / şube" className="flex flex-wrap gap-2">
              {veri.secenekler.map((s) => {
                const k = `${s.kapsam}:${s.id}`;
                return (
                  <button key={k} type="button" aria-pressed={yeniSecim === k} onClick={() => setYeniSecim(k)}
                    className={`min-h-11 cursor-pointer rounded-[10px] border-2 px-3.5 text-sm font-bold ${yeniSecim === k ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`}>{s.ad}</button>
                );
              })}
              {!veri.secenekler.length && <span className="text-sm text-metin-2">Size atanmış şube yok.</span>}
            </div>
          </div>
          <button type="button" onClick={listeOlustur} className="btn-koyu">Taslak oluştur</button>
        </section>
      )}

      <div role="tablist" aria-label="Sepetler" className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {veri.listeler.map((l) => {
          const on = l.id === seciliId;
          const dd = durum(l);
          return (
            <button key={l.id} type="button" role="tab" aria-selected={on} onClick={() => { setSeciliId(l.id); setMesaj(''); }}
              className={`flex min-h-[100px] cursor-pointer flex-col gap-1.5 rounded-2xl border-2 bg-white p-4 text-left ${on ? 'border-turuncu shadow-[0_6px_18px_rgba(23,35,52,0.08)]' : 'border-cizgi'}`}>
              <span className="font-baslik text-base font-extrabold">{l.ad}</span>
              <span className="text-sm text-metin-2">{l.kapsamAd} · {l.satirlar.length} kalem</span>
              <span className="text-[13px] text-metin-3">{hedefMetni(l)}</span>
              <span className={`self-start rounded-lg px-2.5 py-1 text-[13px] font-extrabold ${dd.cls}`}>{dd.ad}</span>
            </button>
          );
        })}
        {!veri.listeler.length && <p className="text-metin-2">Henüz sepet yok. &quot;+ Yeni tavsiye sepeti&quot; ile başlayın.</p>}
      </div>

      {liste && d && (
        <div className="flex flex-wrap items-start gap-6">
          <section aria-label="Seçili sepet" className="kart min-w-0 flex-[999_1_560px] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-6 py-5">
              <div className="flex flex-col gap-1">
                <h2 className="font-baslik text-xl font-extrabold">{liste.ad}</h2>
                <span className="text-sm text-metin-2">{liste.kapsamAd} · {hedefMetni(liste)} · {liste.yayinTarihi ? `son yayın: ${tarih(liste.yayinTarihi)}` : 'henüz yayınlanmadı'}{kaydediliyor ? ' · kaydediliyor…' : ''}</span>
                <Link href={`/${rol}/listeler/${liste.id}`} className="text-sm font-bold text-kiremit">Takip ve detay →</Link>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-sm font-bold text-metin-2">Veliye: {tl(toplam)}</span>
                {/* seçili öğrencilere yayınlanmış sepet her zaman yeni öğrencilere açılabilir */}
                {(() => {
                  const ekle = liste.yayinda && liste.hedefTipi === 'Secili' && !d.yayinlanabilir;
                  const aktif = d.yayinlanabilir || ekle;
                  return (
                    <button type="button" onClick={yayinPenceresi} disabled={!aktif || !liste.satirlar.length || kaydediliyor}
                      className={aktif ? 'btn-turuncu min-h-11' : 'inline-flex min-h-11 items-center rounded-[10px] bg-yesil-zemin px-4 font-baslik text-sm font-extrabold text-yesil'}>
                      {!liste.yayinda ? 'Yayınla' : d.yayinlanabilir ? 'Değişikliği yayınla' : ekle ? 'Öğrenci ekle ve yayınla' : 'Tüm sınıfa yayında'}
                    </button>
                  );
                })()}
              </div>
            </div>
            {liste.satirlar.map((s, i) => {
              const k = kalemler[satirAnahtari(s)];
              return (
                <div key={satirAnahtari(s)} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-[#EEF0F3] px-6 py-3.5">
                  <div aria-hidden="true" className={`flex h-[54px] w-10 flex-none items-center justify-center rounded-md text-[11px] font-extrabold ${k?.tur === 'set' ? 'bg-lacivert text-turuncu' : 'bg-[#E9ECF1]'}`}>{k?.tur === 'set' ? 'SET' : ''}</div>
                  <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
                    <span className="font-baslik text-[15px] font-bold">{k?.ad ?? (s.setId ? `Set #${s.setId}` : `Ürün #${s.urunId}`)}</span>
                    <span className="text-[13px] text-metin-2">{k?.alt ? `${k.alt} · ` : ''}{tl(satirFiyati(s, k))}</span>
                    {k?.icerik && <span className="text-[13px] text-metin-3">{k.icerik.map((x) => (x.adet > 1 ? `${x.adet}× ${x.ad}` : x.ad)).join(', ')}</span>}
                  </div>
                  <div role="group" aria-label="Tür" className="flex gap-1.5">
                    {[true, false].map((z) => (
                      <button key={String(z)} type="button" aria-pressed={s.zorunlu === z}
                        onClick={() => satirlariKaydet(liste.satirlar.map((x, j) => (j === i ? { ...x, zorunlu: z } : x)))}
                        className={`min-h-10 cursor-pointer rounded-[10px] border-2 px-3 text-[13px] font-bold ${s.zorunlu === z ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`}>
                        {z ? 'Zorunlu' : 'İsteğe bağlı'}
                      </button>
                    ))}
                  </div>
                  <button type="button" aria-label="Sepetten çıkar" onClick={() => satirlariKaydet(liste.satirlar.filter((_, j) => j !== i))}
                    className="inline-flex size-11 cursor-pointer items-center justify-center rounded-[10px] border-2 border-kenar bg-white text-kirmizi">✕</button>
                </div>
              );
            })}
            {!liste.satirlar.length && <p className="p-6 text-metin-2">Bu sepet boş. Sağdaki katalogdan kitap ya da set ekleyin.</p>}
          </section>

          <aside aria-label="Katalog" className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
            <div className="kart flex flex-col gap-3.5 p-5">
              <span className="text-xs font-extrabold tracking-wider text-kiremit">KATALOG</span>
              <label htmlFor="kq" className="font-baslik text-[17px] font-extrabold">Kitap ya da set ekle</label>
              <input id="kq" type="search" className="girdi" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kitap, set, yazar, yayınevi veya barkod" />
              <div className="flex flex-col">
                {sonuclar.map((u) => {
                  const var_ = liste.satirlar.some((s) => satirAnahtari(s) === u.anahtar);
                  const yeni: ListeSatiri = u.tur === 'set' ? { urunId: null, setId: u.id, adet: 1, zorunlu: true, satisFiyati: null } : { urunId: u.id, setId: null, adet: 1, zorunlu: true, satisFiyati: null };
                  return (
                    <div key={u.anahtar} className="flex items-center gap-3 border-b border-[#EEF0F3] py-2.5">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-sm font-bold">{u.tur === 'set' && <span className="mr-1.5 rounded bg-lacivert px-1.5 py-0.5 text-[11px] font-extrabold text-turuncu">SET</span>}{u.ad}</span>
                        <span className="text-[13px] text-metin-2">{u.alt ? `${u.alt} · ` : ''}{tl(u.fiyat)}</span>
                      </div>
                      <button type="button" aria-pressed={var_}
                        aria-label={var_ ? `${u.ad} sepetten çıkar` : `${u.ad} sepete ekle`}
                        onClick={() => satirlariKaydet(var_ ? liste.satirlar.filter((s) => satirAnahtari(s) !== u.anahtar) : [...liste.satirlar, yeni])}
                        className={`min-h-10 min-w-[84px] cursor-pointer rounded-[10px] border-2 text-[13px] font-bold ${var_ ? 'border-yesil-zemin bg-yesil-zemin text-yesil' : 'border-lacivert bg-lacivert text-white'}`}>
                        {var_ ? 'Sepette' : 'Ekle'}
                      </button>
                    </div>
                  );
                })}
                {!sonuclar.length && <span className="py-2 text-sm text-metin-2">Sonuç yok.</span>}
              </div>
            </div>
            <div className="flex flex-col gap-2.5 rounded-[18px] bg-lacivert p-5 text-white">
              <span className="font-baslik text-base font-extrabold">Yayınlanınca ne olur?</span>
              <span className="text-sm leading-relaxed text-[#C9D1DC]">Toplu yayında sepet sınıftaki tüm öğrencilerin velilerine açılır; tek tek yayında yalnız seçtiğiniz öğrencilere. Her veliye kayıtlı cep telefonuna SMS, kayıtlı e-posta adresine e-posta gider; bağlantı okulun giriş adresidir. Gönderimler kayıt altına alınır.</span>
            </div>
          </aside>
        </div>
      )}

      {modal && liste && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-[rgba(15,24,38,0.6)] p-6">
          <div role="dialog" aria-modal="true" aria-label="Tavsiye sepetini yayınla" className="flex max-h-[90vh] w-full max-w-[620px] flex-col gap-4 overflow-y-auto rounded-[20px] bg-white p-7">
            <h2 className="font-baslik text-[22px] font-extrabold">&quot;{liste.ad}&quot; kime yayınlansın?</h2>
            <div role="radiogroup" aria-label="Yayın hedefi" className="grid grid-cols-2 gap-2.5">
              {([['toplu', 'Tüm sınıfa (toplu)', `${liste.kapsamAd} · ${kadro.length} öğrenci`], ['secili', 'Seçili öğrencilere (tek tek)', 'Öğrencileri aşağıdan seçin']] as const).map(([id, ad, alt]) => (
                <button key={id} type="button" role="radio" aria-checked={hedef === id} onClick={() => hedefSec(id)}
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-xl border-2 p-3.5 text-left ${hedef === id ? 'border-turuncu bg-[#FFF7EA]' : 'border-kenar bg-white'}`}>
                  <span className="font-baslik text-[15px] font-extrabold">{ad}</span>
                  <span className="text-[13px] text-metin-2">{alt}</span>
                </button>
              ))}
            </div>
            {hedef === 'secili' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="etiket">{seciliOgr.length} / {secilebilir.length} öğrenci seçili</span>
                  {secilebilir.length > 0 && (
                    <button type="button" onClick={() => setSeciliOgr(hepsiSecili ? [] : secilebilir.map((k) => k.ogrenciId))} className="min-h-10 cursor-pointer text-sm font-bold underline">
                      {hepsiSecili ? 'Seçimi kaldır' : 'Tümünü seç'}
                    </button>
                  )}
                </div>
                <div className="flex max-h-[240px] flex-col overflow-y-auto rounded-xl border border-cizgi">
                  {kadro.map((k) => (
                    <label key={k.ogrenciId} className={`flex min-h-11 items-center gap-3 border-b border-[#EEF0F3] px-3.5 py-2 ${k.gorebilir ? 'text-metin-3' : 'cursor-pointer'}`}>
                      <input type="checkbox" disabled={k.gorebilir} checked={k.gorebilir || seciliOgr.includes(k.ogrenciId)}
                        onChange={() => setSeciliOgr((m) => (m.includes(k.ogrenciId) ? m.filter((x) => x !== k.ogrenciId) : [...m, k.ogrenciId]))} className="size-5 accent-lacivert" />
                      <span className="flex-1 font-bold">{k.ad}</span>
                      <span className="text-[13px] text-metin-3">{k.gorebilir ? 'sepet zaten açık' : k.veliSayisi ? `No ${k.okulNo}` : 'kayıtlı veli yok'}</span>
                    </label>
                  ))}
                  {!kadro.length && <span className="p-3.5 text-sm text-metin-2">Bu sınıfta kayıtlı öğrenci yok.</span>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2.5">
              {[['Öğrenci', hedef === 'secili' ? seciliOgr.length : modal.ogrenciSayisi], ['SMS (veli)', modal.veliSayisi], ['E-posta', modal.epostaSayisi]].map(([a, n]) => (
                <div key={String(a)} className="flex flex-col gap-0.5 rounded-xl bg-zemin p-3">
                  <span className="text-xs font-bold text-metin-2">{a}</span>
                  <strong className="font-baslik text-[22px]">{n}</strong>
                </div>
              ))}
            </div>
            {(modal.velisizOgrenci ?? 0) > 0 && <span className="text-[13px] font-bold text-sari">{modal.velisizOgrenci} öğrencinin kayıtlı velisi yok; sepet açılır ama bildirim gitmez.</span>}
            {modal.epostasiOlmayan > 0 && <span className="text-[13px] font-bold text-sari">{modal.epostasiOlmayan} velinin kayıtlı e-postası yok; bu veliler yalnız SMS alır.</span>}
            {hedef === 'toplu' && kadro.length === 0 && <span className="text-[13px] font-bold text-kirmizi">Bu sınıfta kayıtlı öğrenci yok; sepet yayınlanır ama bildirim gönderilmez.</span>}
            <label className="flex min-h-10 cursor-pointer items-center gap-2.5 font-bold"><input type="checkbox" checked={smsGonder} onChange={(e) => setSmsGonder(e.target.checked)} className="size-5 accent-lacivert" />Velilere SMS gönder</label>
            <label className="flex min-h-10 cursor-pointer items-center gap-2.5 font-bold"><input type="checkbox" checked={epostaGonder} onChange={(e) => setEpostaGonder(e.target.checked)} className="size-5 accent-lacivert" />Kayıtlı e-posta adreslerine e-posta gönder</label>
            {modal.smsOrnek && (
              <div className="flex flex-col gap-1.5">
                <span className="etiket">SMS önizleme</span>
                <div className="rounded-xl bg-zemin px-3.5 py-3 text-sm leading-relaxed">{modal.smsOrnek}</div>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2.5">
              <button type="button" onClick={() => setModal(null)} className="btn-cerceve border-kenar">Vazgeç</button>
              <button type="button" onClick={yayinla} disabled={yayinlaniyor || (hedef === 'secili' && !seciliOgr.length)} className="btn-turuncu">
                {yayinlaniyor ? 'Gönderiliyor…' : hedef === 'toplu' ? 'Tüm sınıfa yayınla ve bildir' : `${seciliOgr.length} öğrenciye yayınla ve bildir`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
