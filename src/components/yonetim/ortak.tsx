'use client';

import { useCallback, useState, type ReactNode } from 'react';
import KopyalaButonu from '@/components/panel/KopyalaButonu';

export type Durum = { tip: 'ok' | 'hata'; m: string } | null;

/** JSON isteği + durum mesajı. Hata olursa null döner ve mesajı gösterir. */
export function useIstek() {
  const [durum, setDurum] = useState<Durum>(null);
  const [bekliyor, setBekliyor] = useState(false);
  const gonder = useCallback(async <T,>(url: string, method: string, govde?: unknown, basari?: string): Promise<T | null> => {
    setDurum(null); setBekliyor(true);
    try {
      const r = await fetch(url, { method, headers: govde === undefined ? undefined : { 'Content-Type': 'application/json' }, body: govde === undefined ? undefined : JSON.stringify(govde) });
      const v = await r.json().catch(() => ({}));
      if (!r.ok) { setDurum({ tip: 'hata', m: v.hata ?? 'İşlem yapılamadı' }); return null; }
      if (basari) setDurum({ tip: 'ok', m: basari });
      return v as T;
    } catch {
      setDurum({ tip: 'hata', m: 'Bağlantı hatası, tekrar deneyin' });
      return null;
    } finally { setBekliyor(false); }
  }, []);
  return { durum, setDurum, bekliyor, gonder };
}

export function DurumMesaji({ durum }: { durum: Durum }) {
  if (!durum) return null;
  return durum.tip === 'ok'
    ? <p role="status" className="rounded-xl bg-yesil-zemin px-4 py-3 text-sm font-bold text-yesil">✓ {durum.m}</p>
    : <p role="alert" className="rounded-xl bg-kirmizi-zemin px-4 py-3 text-sm font-semibold text-kirmizi">{durum.m}</p>;
}

export function Alan({ id, etiket, ipucu, zorunlu, children, genis }: { id: string; etiket: string; ipucu?: string; zorunlu?: boolean; children: ReactNode; genis?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${genis ? 'genis' : ''}`}>
      <label htmlFor={id} className="etiket">{etiket}{zorunlu && <span className="text-kiremit" aria-hidden="true"> *</span>}</label>
      {children}
      {ipucu && <span id={`${id}-ipucu`} className="text-[13px] text-metin-3">{ipucu}</span>}
    </div>
  );
}

export function Satir({ children }: { children: ReactNode }) {
  // genişlik yalnız yan yana dizilen alanlarda verilir (sütun içinde yükseklik olarak uygulanmasın)
  return <div className="flex flex-wrap gap-4 [&>*]:flex-[1_1_220px] [&>.genis]:flex-[2_1_360px]">{children}</div>;
}

export function Secenekler<T extends string | number>({ etiket, secenekler, deger, degistir, coklu }:
  { etiket: string; secenekler: { id: T; ad: string; alt?: string }[]; deger: T | T[]; degistir: (v: T) => void; coklu?: boolean }) {
  const secili = (id: T) => (Array.isArray(deger) ? deger.includes(id) : deger === id);
  return (
    <div role="group" aria-label={etiket} className="flex flex-wrap gap-2">
      {secenekler.map((s) => (
        <button key={String(s.id)} type="button" aria-pressed={secili(s.id)} onClick={() => degistir(s.id)}
          className={`flex min-h-11 cursor-pointer flex-col items-start justify-center rounded-[10px] border-2 px-3.5 py-1.5 text-left text-sm font-bold ${secili(s.id) ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white'}`}>
          <span>{coklu && secili(s.id) ? '✓ ' : ''}{s.ad}</span>
          {s.alt && <span className={`text-xs font-semibold ${secili(s.id) ? 'text-[#C9D1DC]' : 'text-metin-3'}`}>{s.alt}</span>}
        </button>
      ))}
    </div>
  );
}

export function Anahtar({ etiket, deger, degistir, aciklama }: { etiket: string; deger: boolean; degistir: (v: boolean) => void; aciklama?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3">
      <input type="checkbox" role="switch" checked={deger} onChange={(e) => degistir(e.target.checked)} className="size-5 accent-lacivert" />
      <span className="flex flex-col"><span className="font-bold">{etiket}</span>{aciklama && <span className="text-[13px] text-metin-3">{aciklama}</span>}</span>
    </label>
  );
}

/** Geçici şifre yalnız bir kez gösterilir. */
export function GeciciSifreKutusu({ sifre, eposta, epostaGitti, kapat }: { sifre: string; eposta: string; epostaGitti: boolean; kapat?: () => void }) {
  return (
    <div role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-turuncu bg-[#FFF7EA] p-5">
      <span className="font-baslik text-base font-extrabold">Geçici şifre oluşturuldu</span>
      <div className="flex flex-wrap items-center gap-3">
        <code className="rounded-lg bg-white px-3.5 py-2 font-mono text-lg font-bold tracking-wide">{sifre}</code>
        <KopyalaButonu metin={sifre} etiket="Şifreyi kopyala" />
      </div>
      <span className="text-sm leading-relaxed text-metin-2">
        {epostaGitti ? <>Giriş bilgileri <strong>{eposta}</strong> adresine e-postayla gönderildi. </> : <>E-posta gönderilmedi; şifreyi kullanıcıya siz iletin. </>}
        Bu şifre bir daha gösterilmez. Kullanıcı ilk girişte kendi şifresini belirleyecek.
      </span>
      {kapat && <button type="button" onClick={kapat} className="btn-cerceve min-h-11 self-start">Tamam</button>}
    </div>
  );
}

export function FormKarti({ baslik, ust, children, aksiyon }: { baslik: string; ust?: string; children: ReactNode; aksiyon?: ReactNode }) {
  return (
    <section className="kart flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          {ust && <span className="text-xs font-extrabold tracking-wider text-kiremit">{ust}</span>}
          <h2 className="font-baslik text-lg font-extrabold">{baslik}</h2>
        </div>
        {aksiyon}
      </div>
      {children}
    </section>
  );
}
