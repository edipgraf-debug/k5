import { plasiyerOturumu } from '@/lib/plasiyer-sayfa';
import { plasiyerOkulIdleri } from '@/lib/plasiyer';
import type { TahsilatSP } from '@/lib/raporlar';
import UstCubuk from '@/components/UstCubuk';
import TahsilatRaporu from '@/components/rapor/TahsilatRaporu';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Tahsilatlar' };

export default async function PlasiyerTahsilat({ searchParams }: { searchParams: Promise<TahsilatSP> }) {
  const o = await plasiyerOturumu();
  return (
    <>
      <UstCubuk rol="plasiyer" ad={o.ad} />
      <Sayfa>
        <SayfaBasligi baslik="Tahsilatlar" alt="Okullarınızdaki veli ödemeleri. Havale onayı kitabevi yönetimindedir." />
        <TahsilatRaporu sp={await searchParams} okulIdleri={await plasiyerOkulIdleri(o.sub)} temel="/plasiyer/tahsilatlar" onay={false} />
      </Sayfa>
    </>
  );
}
