import { oturumAl } from '@/lib/auth';
import UstCubuk from '@/components/UstCubuk';

/** Kitabevi oturumu varken tüm /yonetim sayfalarının üst çubuğu ve menü bandı burada bir kez çizilir (giriş sayfası hariç). */
export default async function YonetimDuzeni({ children }: { children: React.ReactNode }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') return <>{children}</>;
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} kabuk />
      {children}
    </>
  );
}
