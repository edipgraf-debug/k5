'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SepetOzeti } from '@/lib/panel';
import { hedefMetni, sepetDurumu, tl } from '@/lib/bicim';
import { Bolum, Bos, SepetRozeti } from './Ortak';

const TIP: Record<string, string> = { Ogretmen: 'Öğretmen', Okul: 'Okul yönetimi', Yonetim: 'Kitabevi', Plasiyer: 'Plasiyer' };

/** Ana sayfadaki tavsiye sepetleri: sınıf ve hazırlayana göre süzme, sepet içeriği (açılır), açılma ve sipariş durumu */
export default function SepetKartlari({ sepetler, rolOnek, ogretmen, yeniHref }: { sepetler: SepetOzeti[]; rolOnek: string; ogretmen: boolean; yeniHref: string }) {
  const [sinif, setSinif] = useState('');
  const [kim, setKim] = useState('');
  const [durum, setDurum] = useState<'' | 'yayinda' | 'taslak'>('');
  const siniflar = useMemo(() => [...new Set(sepetler.map((s) => s.liste.kapsamAd.split('-')[0].replace(/\. sınıf.*/, '')))].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })), [sepetler]);
  const kimler = useMemo(() => [...new Set(sepetler.map((s) => s.hazirlayanTip).filter(Boolean))], [sepetler]);
  const gorunen = sepetler.filter((s) => (!sinif || s.liste.kapsamAd.split('-')[0].replace(/\. sınıf.*/, '') === sinif) && (!kim || s.hazirlayanTip === kim)
    && (!durum || (durum === 'yayinda' ? s.liste.yayinda : !s.liste.yayinda)));
  const cip = (on: boolean) => `min-h-10 cursor-pointer rounded-[10px] border-2 px-3 text-sm font-bold ${on ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`;

  return (
    <Bolum id="sepetler" ust="TAVSİYE SEPETLERİ" baslik={ogretmen ? 'Sepetlerim' : 'Okulun sepetleri (öğretmenlerinkiler dahil)'}
      aksiyon={<Link href={yeniHref} className="btn-turuncu min-h-11">+ Yeni tavsiye sepeti</Link>}>
      {sepetler.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0F3] px-5 py-3">
          <div role="group" aria-label="Sınıf" className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={!sinif} onClick={() => setSinif('')} className={cip(!sinif)}>Tüm sınıflar</button>
            {siniflar.map((x) => <button key={x} type="button" aria-pressed={sinif === x} onClick={() => setSinif(x)} className={cip(sinif === x)}>{x}. sınıf</button>)}
          </div>
          {!ogretmen && kimler.length > 1 && (
            <div role="group" aria-label="Hazırlayan" className="flex flex-wrap gap-1.5">
              <button type="button" aria-pressed={!kim} onClick={() => setKim('')} className={cip(!kim)}>Herkes</button>
              {kimler.map((x) => <button key={x} type="button" aria-pressed={kim === x} onClick={() => setKim(x)} className={cip(kim === x)}>{TIP[x] ?? x}</button>)}
            </div>
          )}
          <div role="group" aria-label="Durum" className="flex flex-wrap gap-1.5">
            {([['', 'Hepsi'], ['yayinda', 'Yayında'], ['taslak', 'Taslak']] as const).map(([id, ad]) => <button key={id || 'h'} type="button" aria-pressed={durum === id} onClick={() => setDurum(id)} className={cip(durum === id)}>{ad}</button>)}
          </div>
        </div>
      )}
      {gorunen.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 p-5">
          {gorunen.map((s) => (
            <article key={s.liste.id} className="flex flex-col gap-2 rounded-2xl border-2 border-cizgi bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`${rolOnek}/listeler/${s.liste.id}`} className="font-baslik text-base font-extrabold">{s.liste.ad}</Link>
                <SepetRozeti durum={sepetDurumu(s.liste)} />
              </div>
              <span className="text-sm text-metin-2">{s.liste.kapsamAd} · {s.liste.satirlar.length} kalem · {hedefMetni(s.liste)}</span>
              {!ogretmen && <span className="text-[13px] text-metin-3">Hazırlayan: {s.hazirlayan}{s.hazirlayanTip ? ` (${TIP[s.hazirlayanTip] ?? s.hazirlayanTip})` : ''}</span>}
              <details className="rounded-xl bg-zemin px-3 py-2">
                <summary className="cursor-pointer text-sm font-bold">Sepet içeriği · zorunlu toplam {tl(s.zorunluToplam)}</summary>
                <ul className="mt-2 flex flex-col gap-1 text-[13px]">
                  {s.kalemler.map((k, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{k.tur === 'set' && <b className="mr-1 text-kiremit">SET</b>}{k.adet > 1 ? `${k.adet}× ` : ''}{k.ad}{!k.zorunlu && <span className="text-metin-3"> (isteğe bağlı)</span>}</span>
                      <span className="whitespace-nowrap font-bold">{tl(k.fiyat * k.adet)}</span>
                    </li>
                  ))}
                  {!s.kalemler.length && <li className="text-metin-3">Sepet boş.</li>}
                </ul>
              </details>
              {s.liste.yayinda && (
                <div className="mt-1 flex flex-col gap-1.5">
                  <div className="h-2 overflow-hidden rounded-full bg-[#EEF0F3]" aria-hidden="true">
                    <div className="h-full rounded-full bg-turuncu" style={{ width: `${s.acik ? Math.round((s.acan / s.acik) * 100) : 0}%` }} />
                  </div>
                  <span className="text-[13px] text-metin-3">{s.acan} / {s.acik} veli açtı · {s.siparis} sipariş{s.ulasmayan ? ` · ${s.ulasmayan} SMS ulaşmadı` : ''}</span>
                </div>
              )}
              <Link href={`${rolOnek}/listeler/${s.liste.id}`} className="mt-auto text-sm font-bold text-kiremit">Takip ve detay →</Link>
            </article>
          ))}
        </div>
      ) : <Bos>{sepetler.length ? 'Bu süzgece uyan sepet yok.' : 'Henüz sepet yok. "+ Yeni tavsiye sepeti" ile başlayın.'}</Bos>}
    </Bolum>
  );
}
