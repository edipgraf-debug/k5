import Link from 'next/link';
import { oturumAl } from '@/lib/auth';
import { anaSayfa } from '@/lib/session';
import { sabitTel, siteBilgisi, whatsappAdresi } from '@/lib/site';
import { WhatsappIkonu } from '@/components/SiteAltBilgi';

export const metadata = { title: 'Destek' };

/** WhatsApp destek sayfası (herkese açık) */
export default async function Destek() {
  const [b, o] = await Promise.all([siteBilgisi(), oturumAl()]);
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-12">
      <Link href={o ? anaSayfa(o.rol) : '/giris'} className="font-bold">← {o ? 'Ana sayfaya dön' : 'Giriş sayfasına dön'}</Link>
      <h1 className="font-baslik text-3xl font-extrabold">Destek</h1>
      <p className="text-metin-2">Sipariş, teslimat, ödeme ya da giriş sorunlarında bize ulaşın. Mesajınızda öğrencinin adını ve okulunu yazmanız işimizi hızlandırır; şifre ya da kart bilgisi paylaşmayın.</p>
      {b.whatsapp.aktif ? (
        <section className="kart flex flex-col items-start gap-3 p-6">
          <h2 className="font-baslik text-xl font-extrabold">WhatsApp destek hattı</h2>
          <span className="text-metin-2">+{b.whatsapp.numara}{b.whatsapp.saatler ? ` · ${b.whatsapp.saatler}` : ''}</span>
          <a href={whatsappAdresi(b.whatsapp.numara, b.whatsapp.mesaj)} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2.5 rounded-xl bg-[#25D366] px-5 font-baslik font-extrabold text-[#0B3B1F] no-underline">
            <WhatsappIkonu boyut={24} /> WhatsApp&apos;tan yazın
          </a>
        </section>
      ) : <p className="kart p-6 text-metin-2">WhatsApp destek hattı şu an kapalı. Aşağıdaki iletişim bilgilerinden ulaşabilirsiniz.</p>}
      <section className="kart flex flex-col gap-1.5 p-6 text-[15px]">
        <h2 className="font-baslik text-lg font-extrabold">{b.firma.unvan}</h2>
        {b.firma.telefon && <span>Telefon: {sabitTel(b.firma.telefon)}</span>}
        {b.firma.eposta && <span>E-posta: <a href={`mailto:${b.firma.eposta}`}>{b.firma.eposta}</a></span>}
        {b.firma.calismaSaatleri && <span>{b.firma.calismaSaatleri}</span>}
        <Link href="/sayfa/sss" className="mt-2 font-bold">Sıkça sorulan sorular →</Link>
      </section>
    </main>
  );
}
