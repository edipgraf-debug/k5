import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { anaSayfa } from '@/lib/session';
import { repo } from '@/lib/data/repo';
import { slugGecerli } from '@/lib/slug';
import GirisSablonu from '@/components/giris/GirisSablonu';
import OkulHatirla from '@/components/giris/OkulHatirla';

type Props = { params: Promise<{ okul: string }> };

async function okulBul(slug: string) {
  if (!slugGecerli(slug)) return null;
  return (await repo()).okulSlugla(slug);
}

export async function generateMetadata({ params }: Props) {
  const okul = await okulBul((await params).okul);
  return { title: okul ? `${okul.ad} girişi` : 'Sayfa bulunamadı' };
}

/** Okula özel giriş: kardelenokul.com/{okul-adi}. Logo, Kardelen yönetim ekranından açılıp kapatılır. */
export default async function OkulGirisSayfasi({ params }: Props) {
  const slug = (await params).okul;
  const okul = await okulBul(slug);
  if (!okul?.slug) notFound();
  const o = await oturumAl();
  if (o) redirect(anaSayfa(o.rol));
  return (
    <>
      <OkulHatirla slug={okul.slug} />
      <GirisSablonu okul={{ ad: okul.ad, ilce: okul.ilce, slug: okul.slug, logoUrl: okul.logoGoster && okul.logoDosya ? `/api/okul-logo/${okul.slug}` : null }} />
    </>
  );
}
