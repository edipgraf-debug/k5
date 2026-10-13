import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { oturumAl } from '@/lib/auth';
import { repo } from '@/lib/data/repo';
import { yonetimRepo } from '@/lib/data/yonetim';
import { panelVerisi } from '@/lib/panel';
import { siteUrl } from '@/lib/listeler';
import UstCubuk from '@/components/UstCubuk';
import OkulPaneli from '@/components/panel/OkulPaneli';
import OkulSayfasiAyar from '@/components/panel/OkulSayfasiAyar';
import { Bolum, Bos, Rozet, Sayfa, SayfaBasligi, TABLO } from '@/components/panel/Ortak';
import Sekmeler from '@/components/yonetim/Sekmeler';
import OkulFormu from '@/components/yonetim/OkulFormu';
import { plasiyerSecenekleri } from '@/lib/yonetim';
import SinifYonetimi from '@/components/yonetim/SinifYonetimi';
import IslemGecmisi from '@/components/yonetim/IslemGecmisi';
import { TIP_ADI, telGoster } from '@/components/yonetim/etiketler';

export const metadata = { title: 'Okul' };

const SEKMELER = ['ozet', 'bilgiler', 'siniflar', 'ogrenciler', 'kullanicilar', 'giris'] as const;
type Sekme = (typeof SEKMELER)[number];

export default async function YonetimOkul({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sekme?: string; yeni?: string }> }) {
  const o = await oturumAl();
  if (!o || o.rol !== 'yonetim') redirect('/yonetim/giris');
  const id = Number((await params).id);
  const sp = await searchParams;
  const sekme: Sekme = (SEKMELER as readonly string[]).includes(sp.sekme ?? '') ? (sp.sekme as Sekme) : 'ozet';
  if (!Number.isInteger(id) || id <= 0) notFound();
  const y = await yonetimRepo();
  const kayit = await y.okulKaydi(id);
  if (!kayit) notFound();
  const [siniflar, kullanicilar] = await Promise.all([y.okulSiniflari(id), y.personelListesi({ okulId: id, pasifDahil: true })]);
  const ogrSayisi = siniflar.reduce((a, s) => a + s.subeler.reduce((b, x) => b + x.ogrenci, 0), 0);
  const yol = (s: Sekme) => `/yonetim/okullar/${id}?sekme=${s}`;

  return (
    <>
      <UstCubuk rol="yonetim" ad={o.ad} aktif="/yonetim/okullar" />
      <Sayfa>
        <SayfaBasligi baslik={kayit.ad} alt={<>{kayit.kod} · {kayit.ilce} / {kayit.il}{kayit.slug ? <> · <a href={`/${kayit.slug}`} target="_blank" rel="noopener">kardelenokul.com/{kayit.slug}</a></> : ''}</>}
          geri={{ href: '/yonetim/okullar', ad: 'Okullar' }}>
          {!kayit.aktif && <Rozet ton="kirmizi">Pasif okul</Rozet>}
        </SayfaBasligi>
        {sp.yeni && <p role="status" className="rounded-xl bg-yesil-zemin px-4 py-3 text-sm font-bold text-yesil">✓ Okul oluşturuldu. Şimdi sınıf ve şubeleri açın; ardından öğrenci ve kullanıcı ekleyin.</p>}
        <Sekmeler aktif={sekme} sekmeler={[
          { id: 'ozet', ad: 'Özet', href: yol('ozet') },
          { id: 'bilgiler', ad: 'Bilgiler', href: yol('bilgiler') },
          { id: 'siniflar', ad: 'Sınıflar', href: yol('siniflar'), sayi: siniflar.reduce((a, s) => a + s.subeler.length, 0) },
          { id: 'ogrenciler', ad: 'Öğrenciler', href: yol('ogrenciler'), sayi: ogrSayisi },
          { id: 'kullanicilar', ad: 'Kullanıcılar', href: yol('kullanicilar'), sayi: kullanicilar.length },
          { id: 'giris', ad: 'Giriş sayfası', href: yol('giris') },
        ]} />

        {sekme === 'ozet' && <OkulPaneli veri={await panelVerisi(o, id, null)} rolOnek="/yonetim" okulId={id} />}
        {sekme === 'bilgiler' && (
          <div className="flex flex-wrap items-start gap-6">
            <div className="min-w-0 flex-[999_1_560px]"><OkulFormu okul={kayit} plasiyerler={await plasiyerSecenekleri()} /></div>
            <div className="min-w-0 flex-[1_1_300px]"><IslemGecmisi islemler={await y.islemler('Okul', id)} /></div>
          </div>
        )}
        {sekme === 'siniflar' && <SinifYonetimi okulId={id} baslangic={siniflar} />}
        {sekme === 'ogrenciler' && (
          <Bolum id="okul-ogr" ust="ÖĞRENCİLER" baslik="Şube bazında öğrenciler"
            aksiyon={<div className="flex flex-wrap gap-2"><Link href={`/yonetim/ogrenciler?okulId=${id}`} className="btn-cerceve min-h-11">Ara ve düzenle</Link><Link href={`/yonetim/ogrenciler/yukle?okulId=${id}`} className="btn-cerceve min-h-11">Excel ile yükle</Link><Link href={`/yonetim/ogrenciler/yeni?okulId=${id}`} className="btn-turuncu min-h-11">+ Öğrenci ekle</Link></div>}>
            {siniflar.some((s) => s.subeler.length) ? (
              <div className={TABLO.sar}>
                <table className={`${TABLO.tablo} min-w-[520px]`}>
                  <thead><tr><th scope="col" className={TABLO.th}>Şube</th><th scope="col" className={TABLO.th}>Öğrenci</th><th scope="col" className={TABLO.th}>Öğretmen</th><th scope="col" className={TABLO.th}><span className="sr-only">Liste</span></th></tr></thead>
                  <tbody>
                    {siniflar.flatMap((s) => s.subeler.map((b) => (
                      <tr key={b.id}>
                        <td className={`${TABLO.td} font-bold`}>{s.seviye}-{b.ad}</td>
                        <td className={TABLO.td}>{b.ogrenci}</td>
                        <td className={TABLO.td}>{b.ogretmen || <span className="text-sari font-bold">Atanmamış</span>}</td>
                        <td className={`${TABLO.td} text-right`}><Link href={`/yonetim/ogrenciler?okulId=${id}&subeId=${b.id}`} className="font-bold">Öğrenciler →</Link></td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            ) : <Bos>Önce <Link href={yol('siniflar')} className="font-bold">sınıf ve şube</Link> açın.</Bos>}
          </Bolum>
        )}
        {sekme === 'kullanicilar' && (
          <Bolum id="okul-kul" ust="KULLANICILAR" baslik="Öğretmenler ve okul yetkilileri"
            aksiyon={<div className="flex flex-wrap gap-2"><Link href={`/yonetim/kullanicilar/yeni?tip=Ogretmen&okulId=${id}`} className="btn-turuncu min-h-11">+ Öğretmen</Link><Link href={`/yonetim/kullanicilar/yeni?tip=Okul&okulId=${id}`} className="btn-cerceve min-h-11">+ Okul yetkilisi</Link></div>}>
            {kullanicilar.length ? (
              <div className={TABLO.sar}>
                <table className={TABLO.tablo}>
                  <thead><tr><th scope="col" className={TABLO.th}>Ad soyad</th><th scope="col" className={TABLO.th}>Rol</th><th scope="col" className={TABLO.th}>Şubeler</th><th scope="col" className={TABLO.th}>İletişim</th><th scope="col" className={TABLO.th}>Durum</th></tr></thead>
                  <tbody>
                    {kullanicilar.map((k) => (
                      <tr key={k.id}>
                        <td className={TABLO.td}><Link href={`/yonetim/kullanicilar/${k.id}`} className="font-bold">{k.adSoyad}</Link></td>
                        <td className={TABLO.td}>{TIP_ADI[k.tip]}</td>
                        <td className={TABLO.td}>{k.tip === 'Ogretmen' ? (k.subeler.map((s) => s.ad).join(', ') || <span className="font-bold text-sari">Şube yok</span>) : '—'}</td>
                        <td className={TABLO.td}><div className="flex flex-col text-sm"><span>{k.eposta}</span>{k.telefon && <span className="text-metin-3">{telGoster(k.telefon)}</span>}</div></td>
                        <td className={TABLO.td}><div className="flex flex-wrap gap-1">{!k.aktif ? <Rozet ton="kirmizi">Pasif</Rozet> : k.sifreDegistirmeli ? <Rozet ton="sari">İlk giriş bekleniyor</Rozet> : <Rozet ton="yesil">Aktif</Rozet>}{k.kilitli && <Rozet ton="kirmizi">Kilitli</Rozet>}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Bos>Bu okulda henüz kullanıcı yok.</Bos>}
          </Bolum>
        )}
        {sekme === 'giris' && <OkulSayfasiAyar baslangic={(await (await repo()).okul(id))!} site={siteUrl()} />}
      </Sayfa>
    </>
  );
}
