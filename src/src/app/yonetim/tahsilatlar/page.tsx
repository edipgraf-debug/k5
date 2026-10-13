import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import type { TahsilatSP } from '@/lib/raporlar';
import TahsilatRaporu from '@/components/rapor/TahsilatRaporu';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Tahsilatlar' };

export default async function Tahsilatlar({ searchParams }: { searchParams: Promise<TahsilatSP> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  return (
    <Sayfa>
      <SayfaBasligi baslik="Tahsilat listesi" alt="Kart ve havale ödemeleri. Havale hesaba geçince buradan onaylayın; sipariş “Ödendi” olur ve hazırlığa düşer." />
      <TahsilatRaporu sp={await searchParams} okulIdleri={null} temel="/yonetim/tahsilatlar" onay />
    </Sayfa>
  );
}
