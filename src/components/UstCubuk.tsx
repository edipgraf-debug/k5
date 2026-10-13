import Link from 'next/link';
import type { Rol } from '@/lib/types';
import { anaSayfa } from '@/lib/session';
import { ticaretRepo } from '@/lib/data/ticaret';
import CikisButonu from './CikisButonu';
import MenuBandi from './MenuBandi';
import AramaCubugu from './AramaCubugu';
import { ROL_ROZETI } from './menu';

export function EvIkonu({ renk = '#172334' }: { renk?: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={renk} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11 12 4l9 7" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </svg>
  );
}

/**
 * Tüm oturumlu sayfaların üst yapısı: en solda ana sayfa ikonu, logo, canlı arama, kullanıcı;
 * logonun altında rolün menü bandı (katalog kategori ağacıyla açılır).
 * Kitabevi sayfalarında yönetim düzeni (src/app/yonetim/layout.tsx) "kabuk" ile bir kez çizer; sayfaların kendi çağrısı boş döner.
 */
export default async function UstCubuk({ rol, ad, kabuk }: { rol: Rol; ad: string; aktif?: string; children?: React.ReactNode; kabuk?: boolean }) {
  if (rol === 'yonetim' && !kabuk) return null;
  const koyu = rol === 'yonetim' || rol === 'plasiyer';
  let kategoriler: { id: number; ustId: number | null; ad: string; slug: string }[] = [];
  try {
    kategoriler = (await (await ticaretRepo()).kategoriler(false)).map((k) => ({ id: k.id, ustId: k.ustId, ad: k.ad, slug: k.slug }));
  } catch { /* kategori menüsü boş kalır */ }
  const ev = anaSayfa(rol);
  return (
    <header className={koyu ? 'bg-lacivert text-white' : 'border-b border-cizgi bg-white'}>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <Link href={ev} aria-label="Ana sayfa" title="Ana sayfa"
          className={`order-first inline-flex size-11 flex-none items-center justify-center rounded-xl ${koyu ? 'bg-lacivert-2' : 'bg-zemin'}`}>
          <EvIkonu renk={koyu ? '#F89C0E' : '#172334'} />
        </Link>
        <Link href={ev} className="flex flex-none items-center gap-3 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-9 w-auto" />
          <span className={`font-baslik text-xl font-extrabold ${koyu ? 'text-white' : 'text-lacivert'}`}>
            KARDELEN <span className="font-medium text-turuncu">OKUL</span>
          </span>
        </Link>
        {ROL_ROZETI[rol] && <span className="hidden flex-none rounded-md bg-kiremit px-2.5 py-1 text-xs font-extrabold tracking-wider text-white md:inline">{ROL_ROZETI[rol]}</span>}
        <div className="order-last min-w-0 basis-full md:order-none md:flex-1 md:basis-auto"><AramaCubugu koyu={koyu} /></div>
        <div className="ml-auto flex flex-none items-center gap-4 font-baslik text-[15px] font-semibold md:ml-0">
          {rol === 'veli' ? <span className="text-metin-2">{ad}</span> : (
            <Link href="/sifre-degistir" title="Şifremi değiştir" className={`no-underline hover:underline ${koyu ? 'text-[#C9D1DC]' : 'text-metin-2'}`}>
              {ad}<span className="sr-only"> · şifremi değiştir</span>
            </Link>
          )}
          <CikisButonu koyu={koyu} />
        </div>
      </div>
      <MenuBandi rol={rol} koyu={koyu} kategoriler={kategoriler} />
    </header>
  );
}
