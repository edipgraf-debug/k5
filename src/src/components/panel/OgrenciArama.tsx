'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TABLO } from './Ortak';

export interface OgrenciAramaSatiri { id: number; ad: string; okulNo: string; sinifSube: string; veliSayisi: number; acikSepet: number; acilan: number }

const kucuk = (s: string) => s.toLocaleLowerCase('tr');

/** Ana sayfadaki öğrenci arama ve listesi (ad, okul no veya sınıf). */
export default function OgrenciArama({ satirlar, rolOnek }: { satirlar: OgrenciAramaSatiri[]; rolOnek: string }) {
  const [q, setQ] = useState('');
  const [sube, setSube] = useState('');
  const subeler = useMemo(() => [...new Set(satirlar.map((s) => s.sinifSube))], [satirlar]);
  const gorunen = useMemo(() => {
    const s = kucuk(q.trim());
    return satirlar.filter((x) => (!sube || x.sinifSube === sube) && (!s || kucuk(`${x.ad} ${x.okulNo} ${x.sinifSube}`).includes(s)));
  }, [satirlar, q, sube]);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-[#EEF0F3] px-6 py-4">
        <label htmlFor="ogr-ara" className="sr-only">Öğrenci ara</label>
        <input id="ogr-ara" type="search" className="girdi max-w-[360px] flex-[1_1_240px]" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Öğrenci adı veya okul no" />
        {subeler.length > 1 && (
          <div role="group" aria-label="Şube" className="flex flex-wrap gap-1.5">
            {['', ...subeler].map((s) => (
              <button key={s || 'tum'} type="button" aria-pressed={sube === s} onClick={() => setSube(s)}
                className={`min-h-11 cursor-pointer rounded-[10px] border-2 px-3 text-sm font-bold ${sube === s ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`}>
                {s || 'Tümü'}
              </button>
            ))}
          </div>
        )}
        <span className="ml-auto text-sm text-metin-3">{gorunen.length} öğrenci</span>
      </div>
      <div className={TABLO.sar}>
        <table className={TABLO.tablo}>
          <thead>
            <tr>
              <th scope="col" className={TABLO.th}>Öğrenci</th>
              <th scope="col" className={TABLO.th}>No</th>
              <th scope="col" className={TABLO.th}>Sınıf</th>
              <th scope="col" className={TABLO.th}>Veli</th>
              <th scope="col" className={TABLO.th}>Açık sepet</th>
              <th scope="col" className={TABLO.th}>Veli açtı</th>
              <th scope="col" className={TABLO.th}><span className="sr-only">Detay</span></th>
            </tr>
          </thead>
          <tbody>
            {gorunen.slice(0, 200).map((x) => (
              <tr key={x.id}>
                <td className={`${TABLO.td} font-bold`}>{x.ad}</td>
                <td className={TABLO.td}>{x.okulNo}</td>
                <td className={TABLO.td}>{x.sinifSube}</td>
                <td className={TABLO.td}>{x.veliSayisi ? x.veliSayisi : <span className="font-bold text-kirmizi">Kayıtlı veli yok</span>}</td>
                <td className={TABLO.td}>{x.acikSepet}</td>
                <td className={TABLO.td}>{x.acilan ? `${x.acilan} sepet` : '—'}</td>
                <td className={`${TABLO.td} text-right`}><Link href={`${rolOnek}/ogrenciler/${x.id}`} className="font-bold">Detay →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!gorunen.length && <p className="px-6 py-5 text-metin-2">Aramaya uyan öğrenci yok.</p>}
      {gorunen.length > 200 && <p className="px-6 py-3 text-sm text-metin-3">İlk 200 öğrenci gösteriliyor; aramayı daraltın.</p>}
    </div>
  );
}
