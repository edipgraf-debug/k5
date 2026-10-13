import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { anaSayfa } from '@/lib/session';

export default async function Kok() {
  const o = await oturumAl();
  redirect(o ? anaSayfa(o.rol) : '/giris');
}
