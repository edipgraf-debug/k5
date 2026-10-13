'use client';

import { useEffect, useState } from 'react';
import type { SinifKaydi } from '@/lib/data/yonetim';

/** Seçili okulun şubeleri (öğrenci ve öğretmen formlarında) */
export function useSubeler(okulId: number | null, baslangic?: SinifKaydi[]) {
  const [siniflar, setSiniflar] = useState<SinifKaydi[]>(baslangic ?? []);
  const [yukleniyor, setYukleniyor] = useState(false);
  useEffect(() => {
    if (!okulId) { setSiniflar([]); return; }
    if (baslangic) return;
    let iptal = false;
    setYukleniyor(true);
    fetch(`/api/yonetim/okullar/${okulId}/siniflar`).then((r) => r.json()).then((v) => { if (!iptal) setSiniflar(v.siniflar ?? []); })
      .catch(() => undefined).finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [okulId]);
  const subeler = siniflar.flatMap((s) => s.subeler.map((b) => ({ id: b.id, ad: `${s.seviye}-${b.ad}`, alt: `${b.ogrenci} öğrenci` })));
  return { siniflar, subeler, yukleniyor };
}
