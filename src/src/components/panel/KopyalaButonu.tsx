'use client';

import { useState } from 'react';

export default function KopyalaButonu({ metin, etiket = 'Bağlantıyı kopyala' }: { metin: string; etiket?: string }) {
  const [tamam, setTamam] = useState(false);
  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin);
      setTamam(true);
      setTimeout(() => setTamam(false), 2000);
    } catch { /* pano izni yok */ }
  }
  return (
    <button type="button" onClick={kopyala} aria-label={`${etiket}: ${metin}`}
      className="min-h-9 cursor-pointer rounded-lg border-2 border-kenar bg-white px-2.5 text-[13px] font-bold">
      <span aria-live="polite">{tamam ? 'Kopyalandı ✓' : 'Kopyala'}</span>
    </button>
  );
}
