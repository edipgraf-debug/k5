import SinifOgrenciSayfasi from '@/components/panel/SinifOgrenciSayfasi';

export const metadata = { title: 'Öğrencilerim' };

export default async function Sayfa({ searchParams }: { searchParams: Promise<{ sube?: string }> }) {
  return <SinifOgrenciSayfasi rol="ogretmen" sp={await searchParams} />;
}
