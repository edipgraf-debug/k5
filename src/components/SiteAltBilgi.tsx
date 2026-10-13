import Link from 'next/link';
import { KURUMSAL, sabitTel, siteBilgisi, whatsappAdresi } from '@/lib/site';

export function WhatsappIkonu({ boyut = 28 }: { boyut?: number }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 32 32" aria-hidden="true" fill="currentColor">
      <path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3Zm0 23.4c-2.1 0-4.1-.6-5.9-1.7l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.9-3.9-1.9-6.1C4.9 9.8 9.9 4.9 16 4.9s11.1 4.9 11.1 10.9S22.1 26.4 16 26.4Zm6.1-8.2c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.9 5.1 2.9 1.1 3.5.9 4.1.8.6-.1 2-.8 2.3-1.6.3-.8.3-1.4.2-1.6-.1-.1-.3-.2-.7-.4Z" />
    </svg>
  );
}

/** Tüm sayfalarda alt bilgi: firma bilgileri, kurumsal sayfalar, sözleşmeler ve WhatsApp destek düğmesi */
export default async function SiteAltBilgi() {
  const b = await siteBilgisi();
  const altta = b.sayfalar.filter((s) => s.altBilgi);
  const kurumsal = altta.filter((s) => KURUMSAL.includes(s.slug));
  const yasal = altta.filter((s) => !KURUMSAL.includes(s.slug));
  const f = b.firma;
  return (
    <>
      <footer className="mt-10 bg-lacivert text-[#C9D1DC]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-8 px-6 py-10">
          <section aria-labelledby="ab-firma" className="flex flex-col gap-2 text-sm">
            <h2 id="ab-firma" className="font-baslik text-base font-extrabold text-white">{f.unvan}</h2>
            {f.adres && <span>{f.adres}</span>}
            {f.telefon && <a href={`tel:+90${f.telefon}`} className="text-[#C9D1DC] no-underline hover:underline">Tel: {sabitTel(f.telefon)}</a>}
            {f.eposta && <a href={`mailto:${f.eposta}`} className="text-[#C9D1DC] no-underline hover:underline">{f.eposta}</a>}
            {f.calismaSaatleri && <span>{f.calismaSaatleri}</span>}
            {(f.vergiDairesi || f.vergiNo) && <span className="text-[13px] text-[#9AA9BC]">{[f.vergiDairesi && `${f.vergiDairesi} V.D.`, f.vergiNo].filter(Boolean).join(' · ')}</span>}
            {f.mersisNo && <span className="text-[13px] text-[#9AA9BC]">MERSİS: {f.mersisNo}</span>}
          </section>
          <nav aria-labelledby="ab-kurumsal" className="flex flex-col gap-2 text-sm">
            <h2 id="ab-kurumsal" className="font-baslik text-base font-extrabold text-white">Kurumsal</h2>
            {kurumsal.map((s) => <Link key={s.slug} href={`/sayfa/${s.slug}`} className="text-[#C9D1DC] no-underline hover:text-white hover:underline">{s.baslik}</Link>)}
            <Link href="/destek" className="text-[#C9D1DC] no-underline hover:text-white hover:underline">Destek</Link>
          </nav>
          <nav aria-labelledby="ab-yasal" className="flex flex-col gap-2 text-sm">
            <h2 id="ab-yasal" className="font-baslik text-base font-extrabold text-white">Sözleşmeler ve politikalar</h2>
            {yasal.map((s) => <Link key={s.slug} href={`/sayfa/${s.slug}`} className="text-[#C9D1DC] no-underline hover:text-white hover:underline">{s.baslik}</Link>)}
          </nav>
          <section aria-labelledby="ab-destek" className="flex flex-col gap-3 text-sm">
            <h2 id="ab-destek" className="font-baslik text-base font-extrabold text-white">Yardım mı lazım?</h2>
            {b.whatsapp.aktif ? (
              <a href={whatsappAdresi(b.whatsapp.numara, b.whatsapp.mesaj)} target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-[#25D366] px-4 font-baslik font-bold text-[#0B3B1F] no-underline">
                <WhatsappIkonu boyut={22} /> WhatsApp destek
              </a>
            ) : <Link href="/destek" className="text-[#C9D1DC]">Destek sayfası</Link>}
            {b.whatsapp.aktif && b.whatsapp.saatler && <span>{b.whatsapp.saatler}</span>}
            <span className="text-[13px] text-[#9AA9BC]">Kart bilgileriniz sitede saklanmaz; ödemeler bankanın 3D Secure sayfasında alınır.</span>
          </section>
        </div>
        <div className="border-t border-lacivert-2 px-6 py-4 text-center text-[13px] text-[#9AA9BC]">© {new Date().getFullYear()} {f.unvan} · Kardelen Okul</div>
      </footer>
      {b.whatsapp.aktif && (
        <a href={whatsappAdresi(b.whatsapp.numara, b.whatsapp.mesaj)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp ile destek alın"
          className="fixed bottom-5 right-5 z-50 inline-flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
          <WhatsappIkonu />
        </a>
      )}
    </>
  );
}
