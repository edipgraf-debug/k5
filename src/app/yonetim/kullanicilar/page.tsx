import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo, type PersonelTipi } from '@/lib/data/yonetim';
import { tarihSaat } from '@/lib/bicim';
import UstCubuk from '@/components/UstCubuk';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';
import { TIP_ADI } from '@/components/yonetim/etiketler';

export const metadata = { title: 'Kullanıcılar' };

const TIPLER: (PersonelTipi | '')[] = ['', 'Ogretmen', 'Okul', 'Yonetim'];

export default async function Kullanicilar({ searchParams }: { searchParams: Promise<{ q?: string; tip?: string; okulId?: string; pasif?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const tip = (['Ogretmen', 'Okul', 'Yonetim'] as const).find((t) => t === sp.tip) ?? null;
  const okulId = Number(sp.okulId) || null;
  const pasif = sp.pasif === '1';
  const y = await yonetimRepo();
  const [okullar, liste] = await Promise.all([y.okulListesi(), y.personelListesi({ q, tip, okulId, pasifDahil: pasif })]);
  const sorgu = (t: string) => { const u = new URLSearchParams(); if (q) u.set('q', q); if (t) u.set('tip', t); if (okulId) u.set('okulId', String(okulId)); if (pasif) u.set('pasif', '1'); return `/yonetim/kullanicilar${u.size ? `?${u}` : ''}`; };

  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/kullanicilar" />
      <Sayfa>
        <SayfaBasligi baslik="Kullanıcılar" alt="Öğretmen, okul yetkilisi ve kitabevi hesapları. Hesaplar geçici şifreyle açılır; kullanıcı ilk girişte kendi şifresini belirler.">
          <Link href={`/yonetim/kullanicilar/yeni?tip=${tip ?? 'Ogretmen'}${okulId ? `&okulId=${okulId}` : ''}`} className="btn-turuncu">+ Yeni kullanıcı</Link>
        </SayfaBasligi>

        <nav aria-label="Rol" className="flex flex-wrap gap-2">
          {TIPLER.map((t) => (
            <Link key={t || 'tum'} href={sorgu(t)} aria-current={(tip ?? '') === t ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-[10px] border-2 px-3.5 text-sm font-bold no-underline ${(tip ?? '') === t ? 'border-lacivert bg-lacivert text-white' : 'border-kenar bg-white text-lacivert'}`}>
              {t ? TIP_ADI[t] : 'Tümü'}
            </Link>
          ))}
        </nav>

        <form method="get" role="search" className="kart flex flex-wrap items-end gap-3 p-5">
          {tip && <input type="hidden" name="tip" value={tip} />}
          <div className="flex min-w-0 flex-[2_1_260px] flex-col gap-1.5">
            <label htmlFor="k-q" className="etiket">Ara</label>
            <input id="k-q" name="q" type="search" defaultValue={q} className="girdi" placeholder="Ad soyad, e-posta veya telefon" />
          </div>
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
            <label htmlFor="k-okul" className="etiket">Okul</label>
            <select id="k-okul" name="okulId" defaultValue={okulId ?? ''} className="girdi">
              <option value="">Tüm okullar</option>
              {okullar.map((x) => <option key={x.id} value={x.id}>{x.kod} · {x.ad}</option>)}
            </select>
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="pasif" value="1" defaultChecked={pasif} className="size-5 accent-lacivert" />Pasifleri de göster
          </label>
          <button type="submit" className="btn-koyu">Listele</button>
        </form>

        <Bolum id="kul-liste" baslik={`${liste.length} kullanıcı`}>
          {liste.length ? (
            <div className={TABLO.sar}>
              <table className={`${TABLO.tablo} min-w-[860px]`}>
                <thead><tr>
                  <th scope="col" className={TABLO.th}>Ad soyad</th><th scope="col" className={TABLO.th}>Rol</th><th scope="col" className={TABLO.th}>Okul / şubeler</th>
                  <th scope="col" className={TABLO.th}>E-posta</th><th scope="col" className={TABLO.th}>Son giriş</th><th scope="col" className={TABLO.th}>Durum</th>
                </tr></thead>
                <tbody>
                  {liste.map((k) => (
                    <tr key={k.id}>
                      <td className={TABLO.td}><Link href={`/yonetim/kullanicilar/${k.id}`} className="font-bold">{k.adSoyad}</Link>{k.id === o.sub && <span className="text-sm text-metin-3"> (siz)</span>}</td>
                      <td className={TABLO.td}>{TIP_ADI[k.tip]}</td>
                      <td className={TABLO.td}>
                        {k.okulAd ?? '—'}
                        {k.tip === 'Ogretmen' && <span className="block text-[13px] text-metin-3">{k.subeler.map((s) => s.ad).join(', ') || 'şube atanmamış'}</span>}
                      </td>
                      <td className={TABLO.td}>{k.eposta}</td>
                      <td className={TABLO.td}>{k.sonGiris ? tarihSaat(k.sonGiris) : '—'}</td>
                      <td className={TABLO.td}>
                        <div className="flex flex-wrap gap-1">
                          {!k.aktif ? <Rozet ton="kirmizi">Pasif</Rozet> : k.sifreDegistirmeli ? <Rozet ton="sari">İlk giriş bekleniyor</Rozet> : <Rozet ton="yesil">Aktif</Rozet>}
                          {k.kilitli && <Rozet ton="kirmizi">Kilitli</Rozet>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Bos>Kullanıcı bulunamadı.</Bos>}
        </Bolum>
      </Sayfa>
    </>
  );
}
