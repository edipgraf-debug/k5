import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { anaSayfa } from '@/lib/session';
import GirisSablonu from '@/components/giris/GirisSablonu';

export const metadata = { title: 'Giriş' };

export default async function GirisSayfasi() {
  const o = await oturumAl();
  if (o) redirect(anaSayfa(o.rol));
  return <GirisSablonu />;
}
