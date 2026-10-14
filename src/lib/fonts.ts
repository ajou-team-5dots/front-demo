import localFont from 'next/font/local';

// The one place the app font is defined. To switch fonts later, change only this file;
// globals.css reads the --font-app variable.
export const appFont = localFont({
  src: '../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
  variable: '--font-app',
  weight: '45 920',
  display: 'swap',
});
