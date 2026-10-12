import OgrenciDetaySayfasi from '@/components/panel/OgrenciDetaySayfasi';

export const metadata = { title: 'Öğrenci' };

export default async function Sayfa({ params }: { params: Promise<{ id: string }> }) {
  return <OgrenciDetaySayfasi rol="ogretmen" id={Number((await params).id)} />;
}
