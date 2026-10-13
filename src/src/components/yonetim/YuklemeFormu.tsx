'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { DurumMesaji, useIstek } from './ortak';

interface OkulSecenek { id: number; kod: string; ad: string }

/** Excel ile öğrenci yükleme: şablon → okul → dosya → kontrol (henüz kaydetmez) */
export default function YuklemeFormu({ okullar, okulId: ilkOkul }: { okullar: OkulSecenek[]; okulId: number | null }) {
  const router = useRouter();
  const { durum, setDurum } = useIstek();
  const [okulId, setOkulId] = useState<string>(ilkOkul ? String(ilkOkul) : '');
  const [subeAc, setSubeAc] = useState(true);
  const [dosya, setDosya] = useState<File | null>(null);
  const [surukle, setSurukle] = useState(false);
  const [bekliyor, setBekliyor] = useState(false);
  const girdi = useRef<HTMLInputElement>(null);

  function sec(f: File | undefined | null) {
    setDurum(null);
    if (!f) return;
    if (!/\.(xlsx|csv|txt)$/i.test(f.name)) {
      setDurum({ tip: 'hata', m: /\.xls$/i.test(f.name) ? 'Eski Excel biçimi (.xls): Excel\'de "Farklı Kaydet → .xlsx" ile kaydedip yükleyin.' : 'Excel (.xlsx) ya da CSV dosyası seçin' });
      return;
    }
    if (f.size > 5 * 1024 * 1024) { setDurum({ tip: 'hata', m: 'Dosya en fazla 5 MB olabilir' }); return; }
    setDosya(f);
  }

  async function kontrol() {
    if (!dosya) { setDurum({ tip: 'hata', m: 'Dosya seçin' }); return; }
    if (!okulId) { setDurum({ tip: 'hata', m: 'Okul seçin (ya da "Dosyada Okul Kodu kolonu var" seçeneğini işaretleyin)' }); return; }
    setBekliyor(true); setDurum(null);
    const fd = new FormData();
    fd.append('dosya', dosya);
    if (okulId !== 'dosya') fd.append('okulId', okulId);
    fd.append('subeOtomatikAc', subeAc ? '1' : '0');
    try {
      const r = await fetch('/api/yonetim/yukleme', { method: 'POST', body: fd });
      const v = await r.json().catch(() => ({}));
      if (!r.ok) { setDurum({ tip: 'hata', m: v.hata ?? 'Dosya kontrol edilemedi' }); return; }
      router.push(`/yonetim/ogrenciler/yukle/${v.id}`);
    } catch { setDurum({ tip: 'hata', m: 'Bağlantı hatası' }); } finally { setBekliyor(false); }
  }

  const Adim = ({ n, baslik, children }: { n: number; baslik: string; children: React.ReactNode }) => (
    <div className="flex gap-4 border-b border-[#EEF0F3] py-5 last:border-0">
      <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-full bg-lacivert font-baslik font-extrabold text-white">{n}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 className="font-baslik text-[17px] font-extrabold">{baslik}</h2>
        {children}
      </div>
    </div>
  );

  return (
    <section className="kart px-6 py-2">
      <Adim n={1} baslik="Listeyi hazırlayın">
        <p className="text-[15px] leading-relaxed text-metin-2">
          Şablonu indirip doldurun ya da okulun kendi listesini (e-Okul çıktısı dahil) kullanın. Gerekli kolonlar: <strong>Okul No, Ad, Soyad, Sınıf, Şube, Veli Telefon</strong>.
          Kolon sırası önemli değil; &quot;5-A&quot;, &quot;5. Sınıf / A Şubesi&quot; gibi yazımlar tanınır.
        </p>
        <a href="/api/yonetim/yukleme/sablon" className="btn-cerceve min-h-11 self-start" download>Şablonu indir (.xlsx)</a>
      </Adim>
      <Adim n={2} baslik="Okulu seçin">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="y-okul" className="etiket">Okul</label>
          <select id="y-okul" className="girdi max-w-[520px]" value={okulId} onChange={(e) => setOkulId(e.target.value)}>
            <option value="">Okul seçin</option>
            {okullar.map((o) => <option key={o.id} value={o.id}>{o.kod} · {o.ad}</option>)}
            <option value="dosya">Dosyada &quot;Okul Kodu&quot; kolonu var (birden çok okul)</option>
          </select>
        </div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input type="checkbox" checked={subeAc} onChange={(e) => setSubeAc(e.target.checked)} className="mt-0.5 size-5 accent-lacivert" />
          <span className="flex flex-col"><span className="font-bold">Okulda olmayan sınıf ve şubeleri otomatik aç</span>
            <span className="text-[13px] text-metin-3">Kapalıysa listede olup okulda açılmamış şubedeki öğrenciler hatalı sayılır.</span></span>
        </label>
      </Adim>
      <Adim n={3} baslik="Dosyayı yükleyin">
        <div
          onDragOver={(e) => { e.preventDefault(); setSurukle(true); }}
          onDragLeave={() => setSurukle(false)}
          onDrop={(e) => { e.preventDefault(); setSurukle(false); sec(e.dataTransfer.files?.[0]); }}
          className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center ${surukle ? 'border-turuncu bg-[#FFF7EA]' : 'border-kenar bg-zemin'}`}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#172334" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13l2 2 4-4" />
          </svg>
          {dosya ? (
            <span className="font-bold">{dosya.name} <span className="font-normal text-metin-3">· {(dosya.size / 1024).toFixed(0)} KB</span></span>
          ) : <span className="font-baslik font-bold">Excel dosyasını buraya bırakın</span>}
          <button type="button" onClick={() => girdi.current?.click()} className="btn-cerceve min-h-11">{dosya ? 'Başka dosya seç' : 'Dosya seç'}</button>
          <input ref={girdi} type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only"
            aria-label="Excel dosyası seç" onChange={(e) => { sec(e.target.files?.[0]); e.target.value = ''; }} />
          <span className="text-[13px] text-metin-3">.xlsx ya da .csv · en fazla 5 MB, 5.000 öğrenci</span>
        </div>
        <DurumMesaji durum={durum} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={kontrol} disabled={bekliyor || !dosya} className="btn-turuncu">{bekliyor ? 'Kontrol ediliyor…' : 'Kontrol et'}</button>
          <span className="text-sm text-metin-3">Bu adımda hiçbir kayıt yapılmaz; önce sonucu görürsünüz.</span>
        </div>
      </Adim>
    </section>
  );
}
