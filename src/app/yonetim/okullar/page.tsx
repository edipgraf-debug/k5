import { redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import Link from 'next/link';
import { okulTablosu } from '@/lib/yonetim';
import { yonetimRepo } from '@/lib/data/yonetim';
import { siteUrl } from '@/lib/listeler';
import UstCubuk from '@/components/UstCubuk';
import OkulTablosu from '@/components/panel/OkulTablosu';
import { Bolum, Bos, Sayfa, SayfaBasligi } from '@/components/panel/Ortak';

export const metadata = { title: 'Okullar' };

export default async function Okullar() {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const okullar = await okulTablosu();
  const pasifler = (await (await yonetimRepo()).okulListesi(true)).filter((x) => !x.aktif);
  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/okullar" />
      <Sayfa>
        <SayfaBasligi baslik="Okullar" alt="Okul bilgileri, sınıf ve şubeler, öğrenciler, kullanıcılar ve giriş sayfası okulun sayfasından yönetilir.">
          <Link href="/yonetim/okullar/yeni" className="btn-turuncu">+ Yeni okul</Link>
        </SayfaBasligi>
        <Bolum id="okul-listesi" baslik={`${okullar.length} okul`}>
          {okullar.length ? <OkulTablosu okullar={okullar} site={siteUrl()} /> : <Bos>Kayıtlı okul yok.</Bos>}
        </Bolum>
        {pasifler.length > 0 && (
          <Bolum id="pasif" ust="PASİF" baslik={`${pasifler.length} pasif okul`}>
            <ul className="flex flex-col">
              {pasifler.map((x) => (
                <li key={x.id} className="border-b border-[#EEF0F3] px-6 py-3 last:border-0"><Link href={`/yonetim/okullar/${x.id}?sekme=bilgiler`} className="font-bold">{x.kod} · {x.ad}</Link></li>
              ))}
            </ul>
          </Bolum>
        )}
      </Sayfa>
    </>
  );
}
