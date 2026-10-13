'use client';

export default function CikisButonu({ koyu = false }: { koyu?: boolean }) {
  async function cik() {
    const r = await fetch('/api/auth/cikis', { method: 'POST' });
    const v = await r.json().catch(() => ({}));
    window.location.href = koyu ? '/yonetim/giris' : (typeof v.yonlendir === 'string' && v.yonlendir.startsWith('/') && !v.yonlendir.startsWith('//') ? v.yonlendir : '/giris');
  }
  return (
    <button type="button" onClick={cik} className={`min-h-11 font-semibold ${koyu ? 'text-[#9AA9BC]' : 'text-metin-3'} hover:underline`}>
      Çıkış
    </button>
  );
}
