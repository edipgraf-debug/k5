import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ticaretRepo } from '@/lib/data/ticaret';
import { oturumAl } from '@/lib/auth';
import { anaSayfa } from '@/lib/session';
import { sabitTel, siteBilgisi } from '@/lib/site';
import IcerikMetni from '@/components/IcerikMetni';

async function getir(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const s = await (await ticaretRepo()).sayfa(slug);
  return s?.yayinda ? s : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const s = await getir((await params).slug);
  return { title: s?.baslik ?? 'Sayfa' };
}

/** Kurumsal sayfalar ve sözleşmeler (herkese açık; yönetimden düzenlenir) */
export default async function KurumsalSayfa({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getir(slug);
  if (!s) notFound();
  const o = await oturumAl();
  const b = slug === 'iletisim' ? await siteBilgisi() : null;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-12">
      <Link href={o ? anaSayfa(o.rol) : '/giris'} className="font-bold">← {o ? 'Ana sayfaya dön' : 'Giriş sayfasına dön'}</Link>
      <h1 className="font-baslik text-3xl font-extrabold">{s.baslik}</h1>
      {b && (
        <div className="kart flex flex-col gap-1.5 p-5 text-[15px]">
          <strong>{b.firma.unvan}</strong>
          {b.firma.adres && <span>{b.firma.adres}</span>}
          {b.firma.telefon && <span>Telefon: {sabitTel(b.firma.telefon)}</span>}
          {b.firma.eposta && <span>E-posta: <a href={`mailto:${b.firma.eposta}`}>{b.firma.eposta}</a></span>}
          {b.firma.calismaSaatleri && <span>Çalışma saatleri: {b.firma.calismaSaatleri}</span>}
          {b.whatsapp.aktif && <span>WhatsApp destek: <Link href="/destek">destek sayfası</Link></span>}
        </div>
      )}
      <IcerikMetni metin={s.icerik} />
      <span className="text-[13px] text-metin-3">Son güncelleme: {new Date(s.guncelleme).toLocaleDateString('tr-TR')}</span>
    </main>
  );
}
