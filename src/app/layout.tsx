/**
 * Root Layout
 * Main layout for the Next.js app
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tota Tola Small Canning Factory',
  description:
    'A 3D small beverage-factory digital twin with configurable canning-line simulation and production reporting.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
