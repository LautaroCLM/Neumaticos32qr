import type { Metadata, Viewport } from 'next';
import { Archivo } from 'next/font/google';
import './globals.css';

// Archivo variable: el eje de ancho da los títulos expandidos de la marca.
const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  axes: ['wdth'],
  variable: '--font-archivo',
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
  themeColor: '#0d0d0e',
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
    <html lang="es" className={`dark ${archivo.variable}`}>
      <body className="bg-[#0d0d0e] text-[#f2f2ef] min-h-screen flex flex-col antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
