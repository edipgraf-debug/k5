'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { YETKILER_LISTESI } from './yetkiler';
import type { PersonelKaydi, PersonelTipi, SinifKaydi } from '@/lib/data/yonetim';
import { Alan, Anahtar, DurumMesaji, FormKarti, GeciciSifreKutusu, Satir, Secenekler, useIstek } from './ortak';
import { useSubeler } from './useSubeler';

interface OkulSecenek { id: number; kod: string; ad: string }

const TIPLER: { id: PersonelTipi; ad: string; alt: string }[] = [
  { id: 'Ogretmen', ad: 'Öğretmen', alt: 'Kendi şubelerine sepet hazırlar' },
  { id: 'Okul', ad: 'Okul yetkilisi', alt: 'Okulun tamamını yönetir' },
  { id: 'Yonetim', ad: 'Kitabevi (Kardelen)', alt: 'Tüm okullar ve bu panel' },
];
const VARSAYILAN_YETKI = ['KitapListe', 'TopluSiparis', 'TedarikRapor', 'SiparisRapor', 'Hakedis', 'OgrenciYonetim'];

/** Yeni kullanıcı ya da kullanıcı bilgileri / rol / şubeler / yetkiler */
export default function KullaniciFormu({ kullanici, okullar, varsayilan, siniflar, benim }:
  { kullanici?: PersonelKaydi; okullar: OkulSecenek[]; varsayilan?: { tip?: PersonelTipi; okulId?: number | null }; siniflar?: SinifKaydi[]; benim?: boolean }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [v, setV] = useState({
    tip: kullanici?.tip ?? varsayilan?.tip ?? 'Ogretmen' as PersonelTipi,
    okulId: kullanici?.okulId ?? varsayilan?.okulId ?? null as number | null,
    adSoyad: kullanici?.adSoyad ?? '', eposta: kullanici?.eposta ?? '', telefon: kullanici?.telefon ?? '',
    aktif: kullanici?.aktif ?? true,
    yetkiler: kullanici ? kullanici.yetkiler : VARSAYILAN_YETKI,
    subeIdleri: kullanici?.subeler.map((s) => s.id) ?? [],
  });
  const [epostaGonder, setEpostaGonder] = useState(true);
  const [sifre, setSifre] = useState<{ sifre: string; gitti: boolean; id: number } | null>(null);
  const okulGerekli = v.tip !== 'Yonetim';
  const { subeler, yukleniyor } = useSubeler(okulGerekli ? v.okulId : null, kullanici && kullanici.okulId === v.okulId ? siniflar : varsayilan?.okulId === v.okulId ? siniflar : undefined);

  const coklu = <T,>(l: T[], x: T) => (l.includes(x) ? l.filter((y) => y !== x) : [...l, x]);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    const govde = { ...v, okulId: okulGerekli ? v.okulId : null };
    if (kullanici) {
      if (await gonder(`/api/yonetim/kullanicilar/${kullanici.id}`, 'PUT', govde, 'Kullanıcı kaydedildi')) router.refresh();
      return;
    }
    const r = await gonder<{ id: number; geciciSifre: string; epostaGonderildi: boolean }>('/api/yonetim/kullanicilar', 'POST', { ...govde, epostaGonder });
    if (r) setSifre({ sifre: r.geciciSifre, gitti: r.epostaGonderildi, id: r.id });
  }

  if (sifre) {
    return (
      <FormKarti ust="KULLANICI" baslik={`${v.adSoyad} eklendi`}>
        <GeciciSifreKutusu sifre={sifre.sifre} eposta={v.eposta} epostaGitti={sifre.gitti} />
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={() => router.push(`/yonetim/kullanicilar/${sifre.id}`)} className="btn-koyu">Kullanıcıya git</button>
          <button type="button" onClick={() => { setSifre(null); setV({ ...v, adSoyad: '', eposta: '', telefon: '', subeIdleri: [] }); }} className="btn-cerceve">Bir kullanıcı daha ekle</button>
        </div>
      </FormKarti>
    );
  }

  return (
    <form onSubmit={kaydet} noValidate>
      <FormKarti ust="KULLANICI" baslik={kullanici ? 'Kullanıcı bilgileri' : 'Yeni kullanıcı'}>
        <DurumMesaji durum={durum} />
        <div className="flex flex-col gap-1.5">
          <span className="etiket">Rol</span>
          {benim ? <span className="text-sm text-metin-2">Kendi rolünüzü değiştiremezsiniz.</span>
            : <Secenekler etiket="Rol" secenekler={TIPLER} deger={v.tip} degistir={(t) => setV({ ...v, tip: t })} />}
        </div>
        {okulGerekli && (
          <Alan id="k-okul" etiket="Okul" zorunlu>
            <select id="k-okul" className="girdi" value={v.okulId ?? ''} onChange={(e) => setV({ ...v, okulId: Number(e.target.value) || null, subeIdleri: [] })}>
              <option value="">Okul seçin</option>
              {okullar.map((o) => <option key={o.id} value={o.id}>{o.kod} · {o.ad}</option>)}
            </select>
          </Alan>
        )}
        <Satir>
          <Alan id="k-ad" etiket="Ad soyad" zorunlu><input id="k-ad" className="girdi" value={v.adSoyad} onChange={(e) => setV({ ...v, adSoyad: e.target.value })} /></Alan>
          <Alan id="k-ep" etiket="E-posta" zorunlu ipucu="Giriş kullanıcı adı"><input id="k-ep" className="girdi" type="email" autoComplete="off" value={v.eposta} onChange={(e) => setV({ ...v, eposta: e.target.value })} /></Alan>
          <Alan id="k-tel" etiket="Cep telefonu"><input id="k-tel" className="girdi" inputMode="tel" placeholder="5XX XXX XX XX" value={v.telefon} onChange={(e) => setV({ ...v, telefon: e.target.value })} /></Alan>
        </Satir>

        {v.tip === 'Ogretmen' && (
          <div className="flex flex-col gap-1.5">
            <span className="etiket">Sorumlu olduğu şubeler</span>
            {!v.okulId ? <span className="text-sm text-metin-3">Önce okul seçin.</span>
              : subeler.length ? <Secenekler etiket="Şubeler" coklu secenekler={subeler} deger={v.subeIdleri} degistir={(id) => setV({ ...v, subeIdleri: coklu(v.subeIdleri, id) })} />
              : <span className="text-sm text-metin-2">{yukleniyor ? 'Şubeler yükleniyor…' : 'Bu okulda şube yok; önce okulun Sınıflar bölümünden açın.'}</span>}
            <span className="text-[13px] text-metin-3">Öğretmen yalnız bu şubelerin öğrencilerini görür ve onlara sepet yayınlar.</span>
          </div>
        )}
        {v.tip === 'Okul' && (
          <fieldset className="flex flex-col gap-1">
            <legend className="etiket mb-1.5">Yetkiler</legend>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-x-4">
              {YETKILER_LISTESI.map((y) => (
                <label key={y.kod} className="flex min-h-11 cursor-pointer items-center gap-2.5">
                  <input type="checkbox" checked={v.yetkiler.includes(y.kod)} onChange={() => setV({ ...v, yetkiler: coklu(v.yetkiler, y.kod) })} className="size-5 accent-lacivert" />
                  <span className="text-[15px]">{y.ad}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {kullanici && !benim && <Anahtar etiket="Hesap aktif" aciklama="Pasif kullanıcı giriş yapamaz." deger={v.aktif} degistir={(x) => setV({ ...v, aktif: x })} />}
        {!kullanici && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 font-bold">
            <input type="checkbox" checked={epostaGonder} onChange={(e) => setEpostaGonder(e.target.checked)} className="size-5 accent-lacivert" />
            Giriş bilgilerini ve geçici şifreyi e-postayla gönder
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={bekliyor} className="btn-koyu">{bekliyor ? 'Kaydediliyor…' : kullanici ? 'Kaydet' : 'Kullanıcıyı oluştur'}</button>
          {!kullanici && <span className="text-sm text-metin-3">Geçici şifre üretilir; kullanıcı ilk girişte kendi şifresini belirler.</span>}
        </div>
      </FormKarti>
    </form>
  );
}
