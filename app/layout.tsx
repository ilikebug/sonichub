import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SonicHub - Music Discovery & Streaming',
  description: 'Discover and stream music from Spotify with YouTube audio',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
