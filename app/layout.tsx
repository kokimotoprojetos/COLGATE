import type {Metadata} from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Colgate Investimentos | Sorriso Financeiro',
  description: 'A maior plataforma de fidelização e investimentos em cuidados bucais da Colgate. Invista em planos e receba rendimentos diários instantâneos.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-slate-50 text-slate-800 font-sans min-h-screen antialiased selection:bg-red-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
