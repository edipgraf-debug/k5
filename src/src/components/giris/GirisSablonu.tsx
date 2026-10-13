import GirisKapisi from '@/app/giris/GirisKapisi';

const MADDELER = [
  'Veliler yalnızca öğrencisine önerilen tavsiye sepetini görür',
  'Öğretmenler tavsiye sepetini sınıfa ya da öğrenciye yayınlar',
  'Okul yönetimi toplu alım, tedarik ve hakedişi izler',
];

export interface GirisOkulu {
  ad: string;
  ilce: string;
  slug: string;
  logoUrl: string | null;   // null: logo yok ya da gösterimi kapalı
}

/** Genel giriş (/giris) ve okula özel giriş (/{okul-adi}) aynı düzeni kullanır. */
export default function GirisSablonu({ okul }: { okul?: GirisOkulu }) {
  return (
    <div className="flex min-h-[calc(100vh-40px)] flex-col">
      <div className="flex flex-1 flex-wrap">
        <section className="flex min-w-0 flex-[1_1_440px] flex-col justify-between gap-12 bg-lacivert px-8 py-12 text-white sm:px-12">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="" className="h-12 w-auto" />
            <span className="font-baslik text-[26px] font-extrabold tracking-wide">KARDELEN <span className="font-medium text-turuncu">OKUL</span></span>
          </div>
          <div className="flex max-w-[480px] flex-col gap-5">
            {okul && (
              <div className="flex flex-col gap-3">
                <span className="self-start rounded-lg bg-lacivert-2 px-3 py-1.5 font-baslik text-sm font-semibold text-[#C9D1DC]">
                  kardelenokul.com/<span className="text-white">{okul.slug}</span>
                </span>
                <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 text-lacivert">
                  {okul.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={okul.logoUrl} alt={`${okul.ad} logosu`} className="size-16 flex-none object-contain" />
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-baslik text-xl font-extrabold">{okul.ad}</span>
                    <span className="text-sm text-metin-2">{okul.ilce} · kitap ve materyal tedariği Kardelen Okul ile</span>
                  </div>
                </div>
              </div>
            )}
            <h1 className="font-baslik text-4xl font-extrabold leading-tight sm:text-[42px]">
              {okul ? 'Okulunuzun tavsiye sepeti burada.' : 'Okulunuza özel kitap ve eğitim materyali tedariği.'}
            </h1>
            <p className="text-[17px] leading-relaxed text-[#C9D1DC]">Bu site yalnızca anlaşmalı okulların yöneticileri, öğretmenleri ve velileri içindir. Hesabınız okulunuz aracılığıyla tanımlanır.</p>
            <ul className="mt-2 flex flex-col gap-3">
              {MADDELER.map((m) => (
                <li key={m} className="flex items-center gap-3 text-[15px] text-[#E4E8EE]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F89C0E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                  {m}
                </li>
              ))}
            </ul>
          </div>
          <span className="font-baslik text-sm font-bold tracking-[4px] text-turuncu">BİLMEYE CESARET ET!</span>
        </section>
        <section className="flex min-w-0 flex-[1_1_520px] items-center justify-center px-4 py-12">
          <GirisKapisi baslik={okul ? `${okul.ad} girişi` : 'Giriş yap'} />
        </section>
      </div>
    </div>
  );
}
