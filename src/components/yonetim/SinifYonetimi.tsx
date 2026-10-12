'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SinifKaydi } from '@/lib/data/yonetim';
import { DurumMesaji, FormKarti, useIstek } from './ortak';

const SEVIYELER = Array.from({ length: 13 }, (_, i) => i);
const ad = (s: number) => (s === 0 ? 'Anasınıfı' : `${s}. sınıf`);

/** Bu sezonun sınıf seviyeleri ve şubeleri */
export default function SinifYonetimi({ okulId, baslangic }: { okulId: number; baslangic: SinifKaydi[] }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [siniflar, setSiniflarYerel] = useState(baslangic);
  // sekmelerdeki sayılar da güncellensin
  const setSiniflar = (l: SinifKaydi[]) => { setSiniflarYerel(l); router.refresh(); };
  const [seviye, setSeviye] = useState<number | null>(null);
  const [subeSayisi, setSubeSayisi] = useState(2);
  const [yeniSube, setYeniSube] = useState<Record<number, string>>({});
  const mevcut = new Set(siniflar.map((s) => s.seviye));

  async function sinifEkle() {
    if (seviye == null) return;
    const subeler = Array.from({ length: subeSayisi }, (_, i) => String.fromCharCode(65 + i));
    const r = await gonder<{ siniflar: SinifKaydi[] }>(`/api/yonetim/okullar/${okulId}/siniflar`, 'POST', { seviye, subeler }, `${ad(seviye)} eklendi (${subeler.join(', ')} şubeleri)`);
    if (r) { setSiniflar(r.siniflar); setSeviye(null); }
  }
  async function subeEkle(sinifId: number) {
    const a = (yeniSube[sinifId] ?? '').trim();
    if (!a) return;
    const r = await gonder<{ siniflar: SinifKaydi[] }>(`/api/yonetim/siniflar/${sinifId}/subeler`, 'POST', { ad: a }, `${a.toLocaleUpperCase('tr')} şubesi eklendi`);
    if (r) { setSiniflar(r.siniflar); setYeniSube({ ...yeniSube, [sinifId]: '' }); }
  }
  async function subeSil(id: number, adi: string) {
    if (!window.confirm(`${adi} şubesi silinsin mi?`)) return;
    const r = await gonder<{ siniflar: SinifKaydi[] }>(`/api/yonetim/subeler/${id}`, 'DELETE', undefined, `${adi} şubesi silindi`);
    if (r) setSiniflar(r.siniflar);
  }

  return (
    <div className="flex flex-col gap-6">
      <FormKarti ust="BU SEZON" baslik="Sınıflar ve şubeler">
        <DurumMesaji durum={durum} />
        {siniflar.length ? (
          <ul className="flex flex-col">
            {siniflar.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 border-b border-[#EEF0F3] py-3.5 last:border-0">
                <span className="w-28 flex-none font-baslik font-extrabold">{s.ad}</span>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {s.subeler.map((b) => (
                    <span key={b.id} className="inline-flex min-h-10 items-center gap-2 rounded-[10px] border-2 border-cizgi bg-white pl-3 pr-1 text-sm">
                      <strong>{s.seviye}-{b.ad}</strong>
                      <span className="text-metin-3">{b.ogrenci} öğr.{b.ogretmen ? ` · ${b.ogretmen} öğrt.` : ''}</span>
                      {b.ogrenci === 0 ? (
                        <button type="button" onClick={() => subeSil(b.id, `${s.seviye}-${b.ad}`)} disabled={bekliyor}
                          aria-label={`${s.seviye}-${b.ad} şubesini sil`} className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-kirmizi hover:bg-kirmizi-zemin">✕</button>
                      ) : <span className="w-2" />}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1.5">
                    <label htmlFor={`sube-${s.id}`} className="sr-only">{s.ad} için yeni şube</label>
                    <input id={`sube-${s.id}`} className="girdi h-10 w-20 px-2.5 text-sm" placeholder="C" maxLength={20} value={yeniSube[s.id] ?? ''}
                      onChange={(e) => setYeniSube({ ...yeniSube, [s.id]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); subeEkle(s.id); } }} />
                    <button type="button" onClick={() => subeEkle(s.id)} disabled={bekliyor || !(yeniSube[s.id] ?? '').trim()} className="btn-cerceve min-h-10 px-3 text-sm">+ Şube</button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-metin-2">Bu sezon için henüz sınıf açılmamış. Aşağıdan ekleyin.</p>}
        <p className="text-[13px] text-metin-3">Öğrencisi olan şube silinemez; önce öğrencileri başka şubeye taşıyın.</p>
      </FormKarti>

      <FormKarti ust="EKLE" baslik="Sınıf seviyesi ekle">
        <div role="group" aria-label="Seviye" className="flex flex-wrap gap-2">
          {SEVIYELER.map((x) => (
            <button key={x} type="button" disabled={mevcut.has(x)} aria-pressed={seviye === x} onClick={() => setSeviye(x)}
              className={`min-h-11 min-w-12 cursor-pointer rounded-[10px] border-2 px-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40 ${seviye === x ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`}>
              {x === 0 ? 'Ana' : x}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sube-sayisi" className="etiket">Şube sayısı</label>
            <select id="sube-sayisi" className="girdi w-36" value={subeSayisi} onChange={(e) => setSubeSayisi(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} ({Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i)).join(', ')})</option>)}
            </select>
          </div>
          <button type="button" onClick={sinifEkle} disabled={bekliyor || seviye == null} className="btn-koyu">
            {seviye == null ? 'Seviye seçin' : `${ad(seviye)} ekle`}
          </button>
        </div>
      </FormKarti>
    </div>
  );
}
