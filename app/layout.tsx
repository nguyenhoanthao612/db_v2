import type {Metadata} from 'next';
import './globals.css'; // Global styles
import F12Blocker from '@/components/F12Blocker';

export const metadata: Metadata = {
  title: 'IC3 GS6 Prep',
  description: 'Hệ thống ôn tập IC3 GS6 hiện đại, đồng bộ Google Sheets, tối ưu Lazy Loading',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  }
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <F12Blocker />
        {children}
      </body>
    </html>
  );
}
