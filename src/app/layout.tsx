import type { Metadata } from 'next';
import './globals.css';
import { demoModu } from '@/lib/ortam';

export const metadata: Metadata = {
  title: { default: 'Kardelen Okul', template: '%s · Kardelen Okul' },
  description: 'Okullara özel kitap ve eğitim materyali tedariği',
  robots: { index: false, follow: false }, // kapalı site
  icons: { icon: '/logo-mark.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Nunito+Sans:wght@400;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {demoModu() && (
          <div role="note" className="bg-turuncu px-4 py-1.5 text-center text-[13px] font-bold text-lacivert">
            TEST SİTESİ · Örnek verilerle çalışır, gerçek öğrenci ve veli bilgisi girmeyin · Sunucu yeniden başlayınca veriler sıfırlanır
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
