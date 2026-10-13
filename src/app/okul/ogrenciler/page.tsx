import SinifOgrenciSayfasi from '@/components/panel/SinifOgrenciSayfasi';

export const metadata = { title: 'Sınıflar ve öğrenciler' };

export default async function Sayfa({ searchParams }: { searchParams: Promise<{ sube?: string }> }) {
  return <SinifOgrenciSayfasi rol="okul" sp={await searchParams} />;
}
