import type {Metadata} from 'next';
import {Chakra_Petch, Plus_Jakarta_Sans, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Campus: Last Stand — 3D Campus Zombie Survival',
  description:
    '3D third-person campus zombie & titan survival game built on the 180m x 160m Campus 3D Visual Atlas with 7 zombie classes, 3 Titan bosses, co-op squad AI, weapon upgrades, and Gemini tactical intelligence.',
  openGraph: {
    title: 'Campus: Last Stand — 3D Campus Zombie Survival',
    description:
      '3D third-person campus zombie & titan survival game built on the 180m x 160m Campus 3D Visual Atlas with 7 zombie classes, 3 Titan bosses, co-op squad AI, weapon upgrades, and Gemini tactical intelligence.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campus: Last Stand — 3D Campus Zombie Survival',
    description:
      '3D third-person campus zombie & titan survival game built on the 180m x 160m Campus 3D Visual Atlas with 7 zombie classes, 3 Titan bosses, co-op squad AI, weapon upgrades, and Gemini tactical intelligence.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html
      lang="en"
      className={`${chakraPetch.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-stone-950 text-stone-100 antialiased selection:bg-amber-500 selection:text-stone-950 overflow-hidden select-none"
      >
        {children}
      </body>
    </html>
  );
}
