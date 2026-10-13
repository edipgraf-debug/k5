import Link from 'next/link';
import type { ReactNode } from 'react';
import type { BildirimDurumu } from '@/lib/types';
import type { SepetDurumKodu } from '@/lib/bicim';

const TON = {
  gri: 'bg-[#EEF0F3] text-metin-2',
  yesil: 'bg-yesil-zemin text-yesil',
  sari: 'bg-sari-zemin text-sari',
  kirmizi: 'bg-kirmizi-zemin text-kirmizi',
  lacivert: 'bg-lacivert text-white',
} as const;
export type Ton = keyof typeof TON;

export function Rozet({ ton = 'gri', children }: { ton?: Ton; children: ReactNode }) {
  return <span className={`inline-flex items-center self-start whitespace-nowrap rounded-lg px-2.5 py-1 text-[13px] font-extrabold ${TON[ton]}`}>{children}</span>;
}

export function SepetRozeti({ durum }: { durum: SepetDurumKodu }) {
  if (durum === 'taslak') return <Rozet>Taslak</Rozet>;
  if (durum === 'degisti') return <Rozet ton="sari">Yayında · değişiklik var</Rozet>;
  return <Rozet ton="yesil">Yayında</Rozet>;
}

export function BildirimRozeti({ durum, kanal }: { durum: BildirimDurumu | null; kanal: string }) {
  if (!durum) return <span className="text-sm text-metin-3">—</span>;
  if (durum === 'Gonderildi') return <Rozet ton="yesil">{kanal} ✓</Rozet>;
  if (durum === 'Hata') return <Rozet ton="kirmizi">{kanal} ulaşmadı</Rozet>;
  return <Rozet ton="sari">{kanal} kuyrukta</Rozet>;
}

export function Kpi({ ad, deger, alt, ton }: { ad: string; deger: ReactNode; alt?: string; ton?: 'uyari' }) {
  return (
    <div className={`kart flex min-w-0 flex-col gap-1 p-5 ${ton === 'uyari' ? 'border-turuncu' : ''}`}>
      <span className="text-sm font-bold text-metin-2">{ad}</span>
      <strong className="font-baslik text-[28px] font-extrabold leading-tight">{deger}</strong>
      {alt && <span className="text-[13px] text-metin-3">{alt}</span>}
    </div>
  );
}

export function KpiSatiri({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">{children}</div>;
}

export function Bolum({ baslik, ust, aksiyon, children, id }: { baslik: string; ust?: string; aksiyon?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="kart overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-6 py-4">
        <div className="flex flex-col gap-0.5">
          {ust && <span className="text-xs font-extrabold tracking-wider text-kiremit">{ust}</span>}
          <h2 id={id} className="font-baslik text-lg font-extrabold">{baslik}</h2>
        </div>
        {aksiyon}
      </div>
      {children}
    </section>
  );
}

export function SayfaBasligi({ baslik, alt, children, geri }: { baslik: string; alt?: ReactNode; children?: ReactNode; geri?: { href: string; ad: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {geri && <Link href={geri.href} className="text-sm font-bold text-metin-2 no-underline hover:underline">← {geri.ad}</Link>}
        <h1 className="font-baslik text-[28px] font-extrabold leading-tight">{baslik}</h1>
        {alt && <span className="text-[15px] text-metin-2">{alt}</span>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2.5">{children}</div>}
    </div>
  );
}

export function Bos({ children }: { children: ReactNode }) {
  return <p className="px-6 py-5 text-metin-2">{children}</p>;
}

export const TABLO = {
  sar: 'relative overflow-x-auto',
  tablo: 'w-full min-w-[640px] border-collapse text-left text-[15px]',
  th: 'border-b border-cizgi bg-zemin px-4 py-3 text-[13px] font-extrabold text-metin-2',
  td: 'border-b border-[#EEF0F3] px-4 py-3 align-middle',
};

export function Sayfa({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-16 pt-7 sm:px-6">{children}</main>;
}
