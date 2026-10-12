import Link from 'next/link';
import { notFound } from 'next/navigation';

const SAYFALAR: Record<string, string> = {
  kvkk: 'KVKK Aydınlatma Metni',
  'mesafeli-satis': 'Mesafeli Satış Sözleşmesi',
  'iptal-iade': 'İptal ve İade Koşulları',
  iletisim: 'İletişim',
};

export default async function YasalSayfa({ params }: { params: Promise<{ sayfa: string }> }) {
  const { sayfa } = await params;
  const baslik = SAYFALAR[sayfa];
  if (!baslik) notFound();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-12">
      <Link href="/giris" className="font-bold">← Giriş sayfasına dön</Link>
      <h1 className="font-baslik text-3xl font-extrabold">{baslik}</h1>
      <p className="text-metin-2">[Metin hukuk biriminden gelecek.]</p>
    </main>
  );
}
