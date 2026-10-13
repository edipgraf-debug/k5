import Link from 'next/link';

export default function Sekmeler({ sekmeler, aktif }: { sekmeler: { id: string; ad: string; href: string; sayi?: number }[]; aktif: string }) {
  return (
    <nav aria-label="Bölümler" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b-2 border-cizgi">
        {sekmeler.map((s) => {
          const on = s.id === aktif;
          return (
            <li key={s.id}>
              <Link href={s.href} aria-current={on ? 'page' : undefined}
                className={`-mb-0.5 inline-flex min-h-12 items-center gap-2 border-b-[3px] px-4 font-baslik text-[15px] font-bold no-underline ${on ? 'border-turuncu text-lacivert' : 'border-transparent text-metin-2 hover:text-lacivert'}`}>
                {s.ad}
                {s.sayi != null && <span className="rounded-md bg-[#EEF0F3] px-1.5 py-0.5 text-xs text-metin-2">{s.sayi}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
