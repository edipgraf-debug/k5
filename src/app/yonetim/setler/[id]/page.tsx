import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import { yonetimRepo } from '@/lib/data/yonetim';
import { idParam } from '@/lib/yonetim-api';
import SetFormu from '@/components/yonetim/SetFormu';
import IslemGecmisi from '@/components/yonetim/IslemGecmisi';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Set' };

export default async function SetSayfasi({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ yeni?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const id = idParam((await params).id);
  const s = id ? await (await ticaretRepo()).setKaydi(id) : null;
  if (!s) notFound();
  const islemler = await (await yonetimRepo()).islemler('Set', s.id);
  return (
    <Sayfa>
      <SayfaBasligi geri={{ href: '/yonetim/setler', ad: 'Setler' }} baslik={s.ad} alt={`Barkod ${s.barkod} · ${s.listeSayisi} tavsiye sepetinde`}>
        <Link href={`/katalog/set/${s.id}`} className="btn-cerceve min-h-11">Katalogda gör</Link>
      </SayfaBasligi>
      {(await searchParams).yeni && <p role="status" className="rounded-xl bg-yesil-zemin px-4 py-3 font-bold text-yesil">✓ Set oluşturuldu. Tavsiye sepeti kataloğunda &quot;SET&quot; olarak görünür.</p>}
      <SetFormu set={s} />
      <IslemGecmisi islemler={islemler} />
    </Sayfa>
  );
}
