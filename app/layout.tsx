import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Neumáticos el 32 | Historial de Mantenimientos y Tickets Digitales',
  description: 'Consultá el historial digital y servicios de tu vehículo en Neumáticos el 32 Quilmes.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0b0d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`dark ${inter.variable}`}>
      <body className="bg-[#0a0b0d] text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-[#d31a24] selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
