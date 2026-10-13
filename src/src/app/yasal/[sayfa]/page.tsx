import { notFound, permanentRedirect } from 'next/navigation';

/** Eski adresler: /yasal/{sayfa} → /sayfa/{sayfa} (içerik yönetimden düzenlenir) */
export default async function YasalSayfa({ params }: { params: Promise<{ sayfa: string }> }) {
  const { sayfa } = await params;
  if (!/^[a-z0-9-]{1,60}$/.test(sayfa)) notFound();
  permanentRedirect(`/sayfa/${sayfa}`);
}
