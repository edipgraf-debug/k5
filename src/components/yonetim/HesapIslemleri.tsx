'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PersonelKaydi } from '@/lib/data/yonetim';
import { tarihSaat } from '@/lib/bicim';
import { Rozet } from '@/components/panel/Ortak';
import { DurumMesaji, FormKarti, GeciciSifreKutusu, useIstek } from './ortak';

/** Kullanıcının giriş durumu ve şifre / kilit işlemleri */
export default function HesapIslemleri({ kullanici, benim }: { kullanici: PersonelKaydi; benim: boolean }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [epostaGonder, setEpostaGonder] = useState(true);
  const [sifre, setSifre] = useState<{ sifre: string; gitti: boolean } | null>(null);

  async function geciciSifre() {
    if (!window.confirm(`${kullanici.adSoyad} için yeni geçici şifre oluşturulsun mu? Mevcut şifresi geçersiz olur.`)) return;
    const r = await gonder<{ geciciSifre: string; epostaGonderildi: boolean }>(`/api/yonetim/kullanicilar/${kullanici.id}/islem`, 'POST', { islem: 'geciciSifre', epostaGonder });
    if (r) { setSifre({ sifre: r.geciciSifre, gitti: r.epostaGonderildi }); router.refresh(); }
  }
  async function kilitAc() {
    if (await gonder(`/api/yonetim/kullanicilar/${kullanici.id}/islem`, 'POST', { islem: 'kilitAc' }, 'Giriş kilidi açıldı')) router.refresh();
  }

  return (
    <FormKarti ust="GİRİŞ" baslik="Hesap ve şifre">
      <div className="flex flex-wrap gap-2">
        {kullanici.aktif ? <Rozet ton="yesil">Aktif</Rozet> : <Rozet ton="kirmizi">Pasif</Rozet>}
        {kullanici.kilitli && <Rozet ton="kirmizi">Giriş kilitli (hatalı deneme)</Rozet>}
        {kullanici.sifreDegistirmeli && <Rozet ton="sari">Geçici şifrede · ilk girişte değiştirecek</Rozet>}
      </div>
      <span className="text-sm text-metin-2">Son giriş: {kullanici.sonGiris ? tarihSaat(kullanici.sonGiris) : 'henüz giriş yapmadı'}</span>
      <DurumMesaji durum={durum} />
      {sifre && <GeciciSifreKutusu sifre={sifre.sifre} eposta={kullanici.eposta} epostaGitti={sifre.gitti} kapat={() => setSifre(null)} />}
      {benim ? (
        <a href="/sifre-degistir" className="btn-cerceve self-start">Şifremi değiştir</a>
      ) : !sifre && (
        <div className="flex flex-col gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-bold">
            <input type="checkbox" checked={epostaGonder} onChange={(e) => setEpostaGonder(e.target.checked)} className="size-5 accent-lacivert" />
            Geçici şifreyi {kullanici.eposta} adresine e-postayla gönder
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={geciciSifre} disabled={bekliyor} className="btn-turuncu min-h-11">Geçici şifre oluştur</button>
            {kullanici.kilitli && <button type="button" onClick={kilitAc} disabled={bekliyor} className="btn-cerceve min-h-11">Kilidi aç</button>}
          </div>
          <span className="text-[13px] text-metin-3">Şifreler kimseye gösterilmez ve kaydedilmez; unutulan şifre için yeni geçici şifre oluşturun.</span>
        </div>
      )}
    </FormKarti>
  );
}
