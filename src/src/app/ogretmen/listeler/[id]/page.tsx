import SepetDetaySayfasi from '@/components/panel/SepetDetaySayfasi';

export const metadata = { title: 'Tavsiye sepeti' };

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  return <SepetDetaySayfasi rol="ogretmen" id={Number((await params).id)} />;
}
