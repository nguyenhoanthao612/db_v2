import type {Metadata} from 'next';
import './globals.css'; // Global styles
import F12Blocker from '@/components/F12Blocker';

export const metadata: Metadata = {
  title: 'My Google AI Studio App',
  description: 'My Google AI Studio App',
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
