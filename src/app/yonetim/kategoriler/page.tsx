import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { ticaretRepo } from '@/lib/data/ticaret';
import KategoriYonetimi from '@/components/yonetim/KategoriYonetimi';
import { Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Kategori ağacı' };

export default async function Kategoriler({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const kategoriler = await (await ticaretRepo()).kategoriler();
  return (
    <Sayfa>
      <SayfaBasligi baslik="Kategori ağacı" alt="Katalog menüsündeki kategorileri oluşturun; hızlı aramayla ürünleri listeleyip toplu olarak kategoriye ekleyin. Bir ürün birden çok kategoride olabilir." />
      <KategoriYonetimi kategoriler={kategoriler} baslangic={Number((await searchParams).id) || null} />
    </Sayfa>
  );
}
