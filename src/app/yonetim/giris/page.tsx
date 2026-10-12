import YonetimGirisFormu from './YonetimGirisFormu';

export const metadata = { title: 'Yönetim girişi' };

export default function YonetimGiris() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lacivert px-6 py-12">
      <div className="flex w-full max-w-[440px] flex-col gap-5 rounded-[20px] bg-white p-8">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="" className="h-10 w-auto" />
          <span className="font-baslik text-xl font-extrabold">KARDELEN <span className="font-medium text-kiremit">OKUL</span></span>
        </div>
        <span className="self-start rounded-md bg-kiremit px-2.5 py-1 text-xs font-extrabold tracking-wider text-white">YÖNETİM</span>
        <h1 className="font-baslik text-2xl font-extrabold">Yönetim girişi</h1>
        <YonetimGirisFormu />
        <span className="border-t border-cizgi pt-3.5 text-[13px] leading-relaxed text-metin-3">Bu sayfa yalnızca Kardelen Okul personeli içindir ve sitenin genel giriş sayfasında bağlantısı yoktur.</span>
      </div>
    </div>
  );
}
