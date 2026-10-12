'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

export interface VeliSatir { listeId: number; listeAd: string; urunId: number; ad: string; yayinevi: string; barkod: string; fiyat: number; zorunlu: boolean }
export interface OgrenciGorunumu { id: number; ad: string; okul: string; sinif: string; no: string; satirlar: VeliSatir[] }

const tl = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
const kucuk = (s: string) => s.toLocaleLowerCase('tr');
const SEPET_ANAHTARI = 'ko_sepet_secimleri';

export default function VeliListe({ ogrenciler, veliAd }: { ogrenciler: OgrenciGorunumu[]; veliAd: string }) {
  const [secili, setSecili] = useState(ogrenciler[0]?.id ?? 0);
  const [arama, setArama] = useState('');
  // isteğe bağlı ürün seçimleri: { ogrenciId: [urunId, ...] }
  const [istege, setIstege] = useState<Record<number, number[]>>({});

  useEffect(() => {
    try { const k = localStorage.getItem(SEPET_ANAHTARI); if (k) setIstege(JSON.parse(k)); } catch { /* tarayıcı depolaması yok */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(SEPET_ANAHTARI, JSON.stringify(istege)); } catch { /* yok say */ }
  }, [istege]);

  // velinin sepeti açtığını kaydet (öğretmen / okul sepet takibinde "veli açtı")
  useEffect(() => {
    if (!secili) return;
    fetch('/api/veli/goruntule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ogrenciId: secili }) }).catch(() => undefined);
  }, [secili]);

  const og = ogrenciler.find((o) => o.id === secili);
  const secilenler = istege[secili] ?? [];
  const satirlar = og?.satirlar ?? [];
  const gorunen = useMemo(() => {
    const q = kucuk(arama.trim());
    return q ? satirlar.filter((s) => kucuk(`${s.ad} ${s.yayinevi} ${s.barkod}`).includes(q)) : satirlar;
  }, [satirlar, arama]);
  const sepette = satirlar.filter((s) => s.zorunlu || secilenler.includes(s.urunId));
  const toplam = sepette.reduce((a, s) => a + s.fiyat, 0);

  function degistir(urunId: number) {
    setIstege((m) => {
      const l = m[secili] ?? [];
      return { ...m, [secili]: l.includes(urunId) ? l.filter((x) => x !== urunId) : [...l, urunId] };
    });
  }

  if (!ogrenciler.length) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="kart p-8">
          <h1 className="font-baslik text-2xl font-extrabold">Hoş geldiniz, {veliAd}</h1>
          <p className="mt-3 text-metin-2">Hesabınıza bağlı öğrenci bulunamadı. Okulunuz öğrenci bilgilerini yüklediğinde listeniz burada görünecek.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-16 pt-8 sm:px-6">
      <section aria-label="Öğrenci seçimi" className="flex flex-col gap-3">
        <h1 className="font-baslik text-2xl font-extrabold sm:text-[28px]">Merhaba, hangi öğrenciniz için alışveriş yapıyorsunuz?</h1>
        <div className="flex flex-wrap gap-3">
          {ogrenciler.map((o) => {
            const on = o.id === secili;
            const bas = o.ad.split(' ').map((x) => x[0]).join('').slice(0, 2);
            return (
              <button key={o.id} type="button" aria-pressed={on} onClick={() => { setSecili(o.id); setArama(''); }}
                className={`flex min-h-[72px] cursor-pointer items-center gap-3.5 rounded-2xl border-2 bg-white px-4 py-3 text-left ${on ? 'border-turuncu shadow-[0_6px_18px_rgba(23,35,52,0.08)]' : 'border-cizgi'}`}>
                <span className={`inline-flex size-11 items-center justify-center rounded-full font-baslik text-[15px] font-extrabold ${on ? 'bg-lacivert text-turuncu' : 'bg-[#EEF0F3] text-metin-2'}`}>{bas}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-baslik text-base font-bold">{o.ad}</span>
                  <span className="text-sm text-metin-2">{o.okul} · {o.sinif} · No {o.no}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Tavsiye sepeti" className="kart min-w-0 flex-[999_1_560px] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-6 py-5">
            <div className="flex flex-col gap-1">
              <h2 className="font-baslik text-xl font-extrabold">{og?.sinif} Kitap Listesi</h2>
              <span className="text-sm text-metin-2">{og?.okul} · {[...new Set(satirlar.map((s) => s.listeAd))].join(', ') || 'Henüz yayınlanmış liste yok'}</span>
            </div>
            <form role="search" onSubmit={(e) => e.preventDefault()} className="flex min-w-0 flex-[1_1_240px] items-center gap-2 rounded-xl border-2 border-kenar bg-white px-3.5 sm:max-w-[320px]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A6575" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <label htmlFor="vq" className="sr-only">Listede ara</label>
              <input id="vq" type="search" value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Öğrencimin listesinde ara" className="h-11 min-w-0 flex-1 text-[15px] outline-none" />
            </form>
          </div>

          {gorunen.map((s) => {
            const sepetteMi = s.zorunlu || secilenler.includes(s.urunId);
            return (
              <div key={`${s.listeId}-${s.urunId}`} className="flex flex-wrap items-center gap-4 border-b border-[#EEF0F3] px-6 py-4">
                <div aria-hidden="true" className="flex h-[76px] w-14 flex-none items-center justify-center rounded-md bg-[#E9ECF1]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9AA3B0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" /><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" /></svg>
                </div>
                <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-1">
                  <span className="font-baslik text-base font-bold">{s.ad}</span>
                  <span className="text-sm text-metin-2">{s.yayinevi}{s.barkod ? ` · Barkod ${s.barkod}` : ''}</span>
                  <span className={`self-start rounded-md px-2 py-0.5 text-xs font-bold ${s.zorunlu ? 'bg-[#EEF0F3] text-metin-2' : 'bg-[#FBEBDD] text-[#8A4413]'}`}>{s.zorunlu ? 'Zorunlu' : 'İsteğe bağlı'}</span>
                </div>
                <span className="min-w-24 text-right font-baslik text-[17px] font-bold">{tl(s.fiyat)}</span>
                {s.zorunlu ? (
                  <span className="inline-flex min-h-11 min-w-28 items-center justify-center gap-1.5 text-sm font-bold text-yesil">✓ Listede</span>
                ) : (
                  <button type="button" aria-pressed={sepetteMi} onClick={() => degistir(s.urunId)}
                    className={`min-h-11 min-w-28 cursor-pointer rounded-[10px] border-2 border-lacivert font-baslik text-sm font-bold ${sepetteMi ? 'bg-white text-lacivert' : 'bg-lacivert text-white'}`}>
                    {sepetteMi ? 'Çıkar' : 'Ekle'}
                  </button>
                )}
              </div>
            );
          })}
          {arama && !gorunen.length && (
            <p className="border-b border-[#EEF0F3] px-6 py-5 text-[15px] text-metin-2">&quot;{arama}&quot; bu öğrencinin listesinde yok. Veli olarak yalnızca öğrencinize tanımlı kitapları görebilirsiniz.</p>
          )}
          {!satirlar.length && <p className="px-6 py-6 text-metin-2">Bu öğrenci için henüz yayınlanmış bir kitap listesi yok. Liste yayınlandığında SMS ve e-posta ile bilgilendirileceksiniz.</p>}
          {!!satirlar.length && <p className="px-6 py-4 text-sm text-metin-2">Zorunlu kitaplar öğretmen tarafından belirlenmiştir. İsteğe bağlı kitapları dilediğiniz gibi ekleyip çıkarabilirsiniz.</p>}
        </section>

        <aside aria-label="Sipariş özeti" className="kart flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-6">
          <h2 className="font-baslik text-xl font-extrabold">Sipariş özeti</h2>
          <div className="flex justify-between gap-3 text-[15px]"><span className="text-metin-2">Kitaplar ({sepette.length} adet)</span><span className="font-bold">{tl(toplam)}</span></div>
          <div className="flex justify-between gap-3 text-[15px]"><span className="text-metin-2">Moto kurye</span><span className="font-bold">Adrese göre</span></div>
          <div className="flex items-baseline justify-between gap-3 border-t border-[#EEF0F3] pt-3.5">
            <span className="font-bold">Toplam (KDV dahil)</span>
            <span className="font-baslik text-[26px] font-extrabold">{tl(toplam)}</span>
          </div>
          <Link href={`/veli/sepet?ogrenci=${secili}`} aria-disabled={!sepette.length} className={`btn-turuncu ${!sepette.length ? 'pointer-events-none opacity-60' : ''}`}>Sepete git ve tamamla</Link>
          <span className="text-[13px] leading-relaxed text-metin-3">Faturanız sizin adınıza e-Arşiv olarak kesilir ve e-posta adresinize gönderilir.</span>
        </aside>
      </div>
    </main>
  );
}
