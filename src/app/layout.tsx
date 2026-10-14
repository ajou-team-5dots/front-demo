import type { Metadata } from 'next';
import { appFont } from '@/lib/fonts';

import './globals.css';

export const metadata: Metadata = {
  title: '5dots 행동 데이터 데모',
  description: 'Akkadia 플레이어의 콘텐츠 실행 직후 행동 분석',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className={`${appFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
