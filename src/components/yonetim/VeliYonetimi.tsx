'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { OgrenciKaydi, VeliKaydi } from '@/lib/data/yonetim';
import { tarihSaat } from '@/lib/bicim';
import { Rozet } from '@/components/panel/Ortak';
import { Alan, Anahtar, DurumMesaji, FormKarti, Satir, useIstek } from './ortak';

const tel = (t: string) => `0${t.slice(0, 3)} ${t.slice(3, 6)} ${t.slice(6, 8)} ${t.slice(8)}`;

function VeliKarti({ veli, ogrenciId, sonra }: { veli: VeliKaydi; ogrenciId: number; sonra: () => void }) {
  const { durum, bekliyor, gonder } = useIstek();
  const [duzenle, setDuzenle] = useState(false);
  const [v, setV] = useState({ telefon: tel(veli.telefon), adSoyad: veli.adSoyad ?? '', eposta: veli.eposta ?? '', aktif: veli.aktif });
  const kardesler = veli.ogrenciler.filter((o) => o.id !== ogrenciId);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (await gonder(`/api/yonetim/veliler/${veli.id}`, 'PUT', v, 'Veli bilgileri kaydedildi')) { setDuzenle(false); sonra(); }
  }
  async function islem(i: 'sifreSifirla' | 'kilitAc') {
    if (i === 'sifreSifirla' && !window.confirm('Velinin şifresi sıfırlansın mı? Veli bir sonraki girişte SMS koduyla yeni şifre belirleyecek.')) return;
    if (await gonder(`/api/yonetim/veliler/${veli.id}/islem`, 'POST', { islem: i }, i === 'kilitAc' ? 'Giriş kilidi açıldı' : 'Şifre sıfırlandı; veli "İlk giriş: SMS kodu gönder" ile yeni şifre belirleyecek')) sonra();
  }
  async function ayir() {
    if (!window.confirm(`${veli.adSoyad ?? tel(veli.telefon)} bu öğrenciden ayrılsın mı? Veli hesabı silinmez.`)) return;
    if (await gonder(`/api/yonetim/ogrenciler/${ogrenciId}/veliler?veliId=${veli.id}`, 'DELETE', undefined, 'Veli ayrıldı')) sonra();
  }

  return (
    <li className="flex flex-col gap-3 border-b border-[#EEF0F3] px-6 py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-baslik font-extrabold">{veli.adSoyad ?? 'Ad girilmemiş'}{veli.yakinlik && <span className="font-sans text-sm font-semibold text-metin-3"> · {veli.yakinlik}</span>}</span>
          <span className="text-[15px]">{tel(veli.telefon)}</span>
          <span className="text-sm text-metin-2">{veli.eposta ?? <span className="text-sari">E-posta yok · yalnız SMS alır</span>}</span>
          {kardesler.length > 0 && <span className="text-[13px] text-metin-3">Diğer çocukları: {kardesler.map((k, i) => <span key={k.id}>{i ? ', ' : ''}<Link href={`/yonetim/ogrenciler/${k.id}`}>{k.ad}</Link> ({k.sinifSube})</span>)}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!veli.aktif && <Rozet ton="kirmizi">Pasif</Rozet>}
          {veli.kilitli && <Rozet ton="kirmizi">Giriş kilitli</Rozet>}
          {veli.sifreVar ? <Rozet ton="yesil">Şifre belirlemiş</Rozet> : <Rozet ton="sari">Henüz giriş yapmadı</Rozet>}
        </div>
      </div>
      <span className="text-[13px] text-metin-3">Son giriş: {veli.sonGiris ? tarihSaat(veli.sonGiris) : '—'}</span>
      <DurumMesaji durum={durum} />
      {duzenle ? (
        <form onSubmit={kaydet} className="flex flex-col gap-4 rounded-xl bg-zemin p-4" noValidate>
          <Satir>
            <Alan id={`v${veli.id}-tel`} etiket="Cep telefonu" zorunlu ipucu="Değişirse veli yeni numarayla, aynı şifreyle girer"><input id={`v${veli.id}-tel`} className="girdi" inputMode="tel" value={v.telefon} onChange={(e) => setV({ ...v, telefon: e.target.value })} /></Alan>
            <Alan id={`v${veli.id}-ad`} etiket="Ad soyad"><input id={`v${veli.id}-ad`} className="girdi" value={v.adSoyad} onChange={(e) => setV({ ...v, adSoyad: e.target.value })} /></Alan>
            <Alan id={`v${veli.id}-ep`} etiket="E-posta"><input id={`v${veli.id}-ep`} className="girdi" type="email" value={v.eposta} onChange={(e) => setV({ ...v, eposta: e.target.value })} /></Alan>
          </Satir>
          <Anahtar etiket="Veli hesabı aktif" aciklama="Pasif veli giriş yapamaz ve bildirim almaz." deger={v.aktif} degistir={(x) => setV({ ...v, aktif: x })} />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={bekliyor} className="btn-koyu min-h-11">Kaydet</button>
            <button type="button" onClick={() => setDuzenle(false)} className="btn-cerceve min-h-11 border-kenar">Vazgeç</button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setV({ telefon: tel(veli.telefon), adSoyad: veli.adSoyad ?? '', eposta: veli.eposta ?? '', aktif: veli.aktif }); setDuzenle(true); }} className="btn-cerceve min-h-10 px-3.5 text-sm">Düzenle</button>
          {veli.sifreVar && <button type="button" onClick={() => islem('sifreSifirla')} disabled={bekliyor} className="btn-cerceve min-h-10 border-kenar px-3.5 text-sm">Şifreyi sıfırla</button>}
          {veli.kilitli && <button type="button" onClick={() => islem('kilitAc')} disabled={bekliyor} className="btn-cerceve min-h-10 border-kenar px-3.5 text-sm">Kilidi aç</button>}
          <button type="button" onClick={ayir} disabled={bekliyor} className="btn-cerceve min-h-10 border-kenar px-3.5 text-sm text-kirmizi">Bu öğrenciden ayır</button>
        </div>
      )}
    </li>
  );
}

/** Öğrencinin velileri: ekle (telefon kayıtlıysa kardeş olarak bağlanır), düzenle, şifre sıfırla, kilit aç, ayır */
export default function VeliYonetimi({ ogrenci }: { ogrenci: OgrenciKaydi }) {
  const router = useRouter();
  const { durum, bekliyor, gonder } = useIstek();
  const [acik, setAcik] = useState(ogrenci.veliler.length === 0);
  const [v, setV] = useState({ telefon: '', adSoyad: '', eposta: '', yakinlik: '' });
  const [kayitli, setKayitli] = useState<VeliKaydi | null>(null);

  // yazılan numara kayıtlı bir veliye mi ait?
  useEffect(() => {
    const rakam = v.telefon.replace(/\D/g, '');
    if (rakam.length < 10) { setKayitli(null); return; }
    const t = setTimeout(() => {
      fetch(`/api/yonetim/veliler?telefon=${encodeURIComponent(v.telefon)}`).then((r) => r.json()).then((x) => setKayitli(x.veli ?? null)).catch(() => undefined);
    }, 300);
    return () => clearTimeout(t);
  }, [v.telefon]);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    const r = await gonder<{ yeni: boolean }>(`/api/yonetim/ogrenciler/${ogrenci.id}/veliler`, 'POST', v);
    if (r) { setV({ telefon: '', adSoyad: '', eposta: '', yakinlik: '' }); setAcik(false); router.refresh(); }
  }

  return (
    <section className="kart overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F3] px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-extrabold tracking-wider text-kiremit">VELİLER</span>
          <h2 className="font-baslik text-lg font-extrabold">{ogrenci.veliler.length ? `${ogrenci.veliler.length} veli` : 'Kayıtlı veli yok'}</h2>
        </div>
        {!acik && <button type="button" onClick={() => setAcik(true)} className="btn-turuncu min-h-11">+ Veli ekle</button>}
      </div>
      {ogrenci.veliler.length > 0 && (
        <ul className="flex flex-col">
          {ogrenci.veliler.map((x) => <VeliKarti key={x.id} veli={x} ogrenciId={ogrenci.id} sonra={() => router.refresh()} />)}
        </ul>
      )}
      {acik && (
        <form onSubmit={ekle} className="border-t border-[#EEF0F3] p-6" noValidate>
          <FormKarti baslik="Veli ekle" aksiyon={ogrenci.veliler.length > 0 ? <button type="button" onClick={() => setAcik(false)} className="text-sm font-bold underline">Kapat</button> : undefined}>
            <DurumMesaji durum={durum} />
            <Satir>
              <Alan id="yv-tel" etiket="Cep telefonu" zorunlu ipucu="Veli bu numarayla giriş yapar"><input id="yv-tel" className="girdi" inputMode="tel" placeholder="5XX XXX XX XX" value={v.telefon} onChange={(e) => setV({ ...v, telefon: e.target.value })} /></Alan>
              <Alan id="yv-ad" etiket="Ad soyad"><input id="yv-ad" className="girdi" value={v.adSoyad} onChange={(e) => setV({ ...v, adSoyad: e.target.value })} /></Alan>
            </Satir>
            {kayitli && (
              <p role="status" className="rounded-xl bg-sari-zemin px-4 py-3 text-sm text-sari">
                Bu numara kayıtlı: <strong>{kayitli.adSoyad ?? 'adı girilmemiş veli'}</strong>
                {kayitli.ogrenciler.length ? ` (${kayitli.ogrenciler.map((o) => `${o.ad}, ${o.okulAd}`).join('; ')})` : ''}. Kaydedince bu veli kardeş olarak bağlanır; ayrı hesap açılmaz.
              </p>
            )}
            <Satir>
              <Alan id="yv-ep" etiket="E-posta"><input id="yv-ep" className="girdi" type="email" value={v.eposta} onChange={(e) => setV({ ...v, eposta: e.target.value })} /></Alan>
              <Alan id="yv-yak" etiket="Yakınlık"><input id="yv-yak" className="girdi" placeholder="Anne, Baba…" value={v.yakinlik} onChange={(e) => setV({ ...v, yakinlik: e.target.value })} /></Alan>
            </Satir>
            <button type="submit" disabled={bekliyor} className="btn-koyu self-start">{kayitli ? 'Kayıtlı veliyi bağla' : 'Veliyi ekle'}</button>
          </FormKarti>
        </form>
      )}
    </section>
  );
}
