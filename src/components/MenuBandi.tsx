'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Rol } from '@/lib/types';
import { MENULER, type MenuOgesi } from './menu';

type Kat = { id: number; ustId: number | null; ad: string; slug: string };

const hrefler = (m: MenuOgesi): string[] => ('href' in m ? [m.href] : 'grup' in m ? m.grup.map((g) => g.href) : ['/katalog']);

/** Logonun altındaki menü bandı: düz bağlantılar, açılır gruplar ve kategori ağaçlı katalog menüsü */
export default function MenuBandi({ rol, koyu, kategoriler }: { rol: Rol; koyu: boolean; kategoriler: Kat[] }) {
  const yol = usePathname();
  const [acik, setAcik] = useState<string | null>(null);
  const kok = useRef<HTMLElement>(null);
  useEffect(() => { setAcik(null); }, [yol]);
  useEffect(() => {
    const kapat = (e: MouseEvent) => { if (kok.current && !kok.current.contains(e.target as Node)) setAcik(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAcik(null); };
    document.addEventListener('mousedown', kapat);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', kapat); document.removeEventListener('keydown', esc); };
  }, []);

  const menu = MENULER[rol];
  // en uzun eşleşen bağlantı etkin
  const tum = menu.flatMap(hrefler);
  const etkin = tum.filter((h) => yol === h || yol.startsWith(h + '/')).sort((a, b) => b.length - a.length)[0];

  const bant = koyu ? 'bg-lacivert-2' : 'border-t border-cizgi bg-zemin';
  const ogeCls = (on: boolean) => `inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg px-3 font-baslik text-[15px] font-semibold no-underline ${
    on ? (koyu ? 'bg-lacivert text-turuncu' : 'bg-white text-kiremit shadow-[0_1px_0_#DCE1E8]') : koyu ? 'text-[#DCE3EC] hover:bg-lacivert' : 'text-lacivert hover:bg-white'}`;
  const ust = kategoriler.filter((k) => !k.ustId);

  return (
    <nav ref={kok} aria-label="Menü" className={bant}>
      <ul className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-1 px-2 py-1 sm:px-4">
        {menu.map((m) => {
          if ('href' in m) {
            return <li key={m.ad}><Link href={m.href} aria-current={etkin === m.href ? 'page' : undefined} className={ogeCls(etkin === m.href)}>{m.ad}</Link></li>;
          }
          const on = hrefler(m).includes(etkin ?? '');
          return (
            <li key={m.ad} className="relative">
              <button type="button" aria-expanded={acik === m.ad} onClick={() => setAcik(acik === m.ad ? null : m.ad)} className={`${ogeCls(on)} cursor-pointer`}>
                {m.ad}<span aria-hidden="true" className="text-xs">▾</span>
              </button>
              {acik === m.ad && (
                <div className="absolute left-0 top-full z-40 mt-1 max-h-[70vh] min-w-[260px] overflow-y-auto rounded-xl border border-cizgi bg-white p-2 text-lacivert shadow-[0_12px_32px_rgba(23,35,52,0.18)]">
                  {'grup' in m ? (
                    <ul className="flex flex-col">
                      {m.grup.map((g) => (
                        <li key={g.href}><Link href={g.href} aria-current={etkin === g.href ? 'page' : undefined}
                          className={`flex min-h-10 items-center rounded-lg px-3 text-[15px] font-semibold no-underline ${etkin === g.href ? 'bg-lacivert text-white' : 'text-lacivert hover:bg-zemin'}`}>{g.ad}</Link></li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="flex flex-col">
                      <li><Link href="/katalog" className="flex min-h-10 items-center rounded-lg px-3 text-[15px] font-extrabold text-kiremit no-underline hover:bg-zemin">Tüm ürünler</Link></li>
                      {ust.map((k) => (
                        <li key={k.id}>
                          <Link href={`/katalog?kategori=${k.slug}`} className="flex min-h-10 items-center rounded-lg px-3 text-[15px] font-bold text-lacivert no-underline hover:bg-zemin">{k.ad}</Link>
                          <AltKategoriler ustId={k.id} kategoriler={kategoriler} derinlik={1} />
                        </li>
                      ))}
                      {!ust.length && <li className="px-3 py-2 text-sm text-metin-2">Henüz kategori yok.</li>}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AltKategoriler({ ustId, kategoriler, derinlik }: { ustId: number; kategoriler: Kat[]; derinlik: number }) {
  const alt = kategoriler.filter((k) => k.ustId === ustId);
  if (!alt.length || derinlik > 4) return null;
  return (
    <ul className="flex flex-col" style={{ paddingLeft: 14 }}>
      {alt.map((k) => (
        <li key={k.id}>
          <Link href={`/katalog?kategori=${k.slug}`} className="flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-metin-2 no-underline hover:bg-zemin hover:text-lacivert">{k.ad}</Link>
          <AltKategoriler ustId={k.id} kategoriler={kategoriler} derinlik={derinlik + 1} />
        </li>
      ))}
    </ul>
  );
}
