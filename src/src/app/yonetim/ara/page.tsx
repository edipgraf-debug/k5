import Link from 'next/link';
import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { yonetimRepo } from '@/lib/data/yonetim';
import UstCubuk from '@/components/UstCubuk';
import HizliArama from '@/components/yonetim/HizliArama';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi } from '@/components/panel/Ortak';
import { TIP_ADI, telGoster } from '@/components/yonetim/etiketler';
import { katla as kucuk } from '@/lib/katla';

export const metadata = { title: 'Arama' };


export default async function Ara({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const q = ((await searchParams).q ?? '').trim();
  const y = await yonetimRepo();
  const ara = q.length >= 2;
  const [ogrenciler, kullanicilar, okullar] = ara
    ? await Promise.all([y.ogrenciAra({ q, pasifDahil: true, limit: 50 }), y.personelListesi({ q, pasifDahil: true }), y.okulListesi(true)])
    : [[], [], []];
  const okulSonuc = okullar.filter((x) => kucuk(`${x.ad} ${x.kod} ${x.ilce}`).includes(kucuk(q)));

  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} />
      <Sayfa>
        <SayfaBasligi baslik="Arama" alt={ara ? `"${q}" için ${ogrenciler.length + kullanicilar.length + okulSonuc.length} sonuç` : 'En az 2 karakter yazın.'} />
        <HizliArama q={q} otomatik={!ara} />
        {ara && (
          <>
            <Bolum id="s-ogr" ust="ÖĞRENCİ & VELİ" baslik={`${ogrenciler.length} öğrenci`}>
              {ogrenciler.length ? (
                <ul className="flex flex-col">
                  {ogrenciler.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F3] px-6 py-3 last:border-0">
                      <div className="flex min-w-0 flex-col">
                        <Link href={`/yonetim/ogrenciler/${x.id}`} className="font-bold">{x.ad} {x.soyad}</Link>
                        <span className="text-[13px] text-metin-3">{x.okulAd} · {x.sinifSube ?? 'şube yok'} · no {x.okulNo}{x.veliler.length ? ` · veli: ${x.veliler.map((v) => telGoster(v.telefon)).join(', ')}` : ''}</span>
                      </div>
                      {!x.aktif && <Rozet ton="kirmizi">Pasif</Rozet>}
                    </li>
                  ))}
                </ul>
              ) : <Bos>Öğrenci bulunamadı.</Bos>}
            </Bolum>
            <Bolum id="s-kul" ust="KULLANICILAR" baslik={`${kullanicilar.length} kullanıcı`}>
              {kullanicilar.length ? (
                <ul className="flex flex-col">
                  {kullanicilar.map((k) => (
                    <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F3] px-6 py-3 last:border-0">
                      <div className="flex min-w-0 flex-col">
                        <Link href={`/yonetim/kullanicilar/${k.id}`} className="font-bold">{k.adSoyad}</Link>
                        <span className="text-[13px] text-metin-3">{k.eposta} · {TIP_ADI[k.tip]}{k.okulAd ? ` · ${k.okulAd}` : ''}</span>
                      </div>
                      {!k.aktif && <Rozet ton="kirmizi">Pasif</Rozet>}
                    </li>
                  ))}
                </ul>
              ) : <Bos>Kullanıcı bulunamadı.</Bos>}
            </Bolum>
            <Bolum id="s-okul" ust="OKULLAR" baslik={`${okulSonuc.length} okul`}>
              {okulSonuc.length ? (
                <ul className="flex flex-col">
                  {okulSonuc.map((k) => (
                    <li key={k.id} className="flex items-center justify-between gap-2 border-b border-[#EEF0F3] px-6 py-3 last:border-0">
                      <Link href={`/yonetim/okullar/${k.id}`} className="font-bold">{k.kod} · {k.ad}</Link>
                      {!k.aktif && <Rozet ton="kirmizi">Pasif</Rozet>}
                    </li>
                  ))}
                </ul>
              ) : <Bos>Okul bulunamadı.</Bos>}
            </Bolum>
          </>
        )}
      </Sayfa>
    </>
  );
}
