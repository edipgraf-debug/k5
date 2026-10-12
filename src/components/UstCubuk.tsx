import Link from 'next/link';
import type { Rol } from '@/lib/types';
import { anaSayfa } from '@/lib/session';
import CikisButonu from './CikisButonu';

const MENU: Record<Rol, { ad: string; href: string }[]> = {
  veli: [
    { ad: 'Tavsiye sepeti', href: '/veli' },
    { ad: 'Siparişlerim', href: '/veli/siparisler' },
    { ad: 'Hesabım', href: '/veli/hesap' },
  ],
  ogretmen: [
    { ad: 'Ana sayfa', href: '/ogretmen' },
    { ad: 'Tavsiye sepetleri', href: '/ogretmen/listeler' },
  ],
  okul: [
    { ad: 'Ana sayfa', href: '/okul' },
    { ad: 'Tavsiye sepetleri', href: '/okul/listeler' },
  ],
  yonetim: [
    { ad: 'Ana sayfa', href: '/yonetim' },
    { ad: 'Okullar', href: '/yonetim/okullar' },
    { ad: 'Öğrenci & veli', href: '/yonetim/ogrenciler' },
    { ad: 'Kullanıcılar', href: '/yonetim/kullanicilar' },
    { ad: 'Tavsiye sepetleri', href: '/yonetim/listeler' },
  ],
};

export function EvIkonu({ renk = '#172334' }: { renk?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={renk} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </svg>
  );
}

export default function UstCubuk({ rol, ad, aktif, children }: { rol: Rol; ad: string; aktif?: string; children?: React.ReactNode }) {
  const koyu = rol === 'yonetim';
  return (
    <header className={koyu ? 'bg-lacivert text-white' : 'border-b border-cizgi bg-white'}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href={anaSayfa(rol)}
            aria-label="Ana sayfa"
            title="Ana sayfa"
            className={`inline-flex size-11 items-center justify-center rounded-xl ${koyu ? 'bg-lacivert-2' : 'bg-zemin'}`}
          >
            <EvIkonu renk={koyu ? '#F89C0E' : '#172334'} />
          </Link>
          <Link href={anaSayfa(rol)} className="flex items-center gap-3 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-9 w-auto" />
            <span className={`font-baslik text-xl font-extrabold ${koyu ? 'text-white' : 'text-lacivert'}`}>
              KARDELEN <span className="font-medium text-turuncu">OKUL</span>
            </span>
          </Link>
          {koyu && <span className="rounded-md bg-kiremit px-2.5 py-1 text-xs font-extrabold tracking-wider text-white">KİTABEVİ · YÖNETİM</span>}
        </div>
        {children}
        <nav aria-label="Menü" className="flex flex-wrap items-center gap-5 font-baslik text-[15px] font-semibold">
          {MENU[rol].map((m) => (
            <Link
              key={m.href}
              href={m.href}
              aria-current={aktif === m.href ? 'page' : undefined}
              className={`no-underline ${aktif === m.href ? (koyu ? 'text-turuncu' : 'text-kiremit') : koyu ? 'text-[#C9D1DC]' : 'text-lacivert'}`}
            >
              {m.ad}
            </Link>
          ))}
          {rol === 'veli' ? <span className="text-metin-2">{ad}</span> : (
            <Link href="/sifre-degistir" title="Şifremi değiştir" className={`no-underline hover:underline ${koyu ? 'text-[#C9D1DC]' : 'text-metin-2'}`}>
              {ad}<span className="sr-only"> · şifremi değiştir</span>
            </Link>
          )}
          <CikisButonu koyu={koyu} />
        </nav>
      </div>
    </header>
  );
}
