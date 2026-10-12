import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { anaSayfa } from '@/lib/session';
import SifreDegistirFormu from './SifreDegistirFormu';

export const metadata = { title: 'Şifre değiştir' };

/** Öğretmen, okul ve kitabevi kullanıcıları: geçici şifreden sonra zorunlu, istendiğinde de kullanılabilir. */
export default async function SifreDegistir() {
  const o = await oturumAl();
  if (!o) redirect('/giris');
  if (o.rol === 'veli') redirect(anaSayfa('veli'));
  return (
    <main className="flex min-h-screen items-center justify-center bg-lacivert px-4 py-12">
      <div className="flex w-full max-w-[460px] flex-col gap-5 rounded-[20px] bg-white p-8">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-10 w-auto" />
          <span className="font-baslik text-xl font-extrabold">KARDELEN <span className="font-medium text-turuncu">OKUL</span></span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-baslik text-2xl font-extrabold">{o.sifreDegistir ? 'Kendi şifrenizi belirleyin' : 'Şifremi değiştir'}</h1>
          <p className="text-[15px] leading-relaxed text-metin-2">
            {o.sifreDegistir
              ? `Hoş geldiniz, ${o.ad}. Size verilen geçici şifreyle giriş yaptınız; devam etmek için yeni bir şifre belirleyin.`
              : 'Yeni şifreniz en az 8 karakter olmalı, harf ve rakam içermeli.'}
          </p>
        </div>
        <SifreDegistirFormu zorunlu={!!o.sifreDegistir} geri={anaSayfa(o.rol)} />
      </div>
    </main>
  );
}
