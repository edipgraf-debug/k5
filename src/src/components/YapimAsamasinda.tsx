import Link from 'next/link';

export default function YapimAsamasinda({ baslik, aciklama, geri }: { baslik: string; aciklama: string; geri: { href: string; ad: string } }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="kart flex flex-col gap-3 p-8">
        <span className="self-start rounded-md bg-sari-zemin px-2.5 py-1 text-xs font-extrabold text-sari">SONRAKİ AŞAMA</span>
        <h1 className="font-baslik text-2xl font-extrabold">{baslik}</h1>
        <p className="text-metin-2">{aciklama}</p>
        <Link href={geri.href} className="btn-cerceve self-start">{geri.ad}</Link>
      </div>
    </main>
  );
}
