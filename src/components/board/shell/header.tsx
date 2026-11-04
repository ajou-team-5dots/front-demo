import Link from 'next/link';

// Figma 14:4. Wordmark, a 21px divider, then the product name.
export function BoardHeader() {
  return (
    <header className="flex h-[60px] items-center">
      <Link href="/" className="flex items-center rounded-control focus-visible:outline-2">
        <span className="text-(length:--font-size-heading) leading-none font-semibold tracking-[2.6px] text-brand">
          AKKADIA
        </span>
        <span aria-hidden className="mr-[9px] ml-2 h-[21px] w-0.5 bg-gray-2" />
        <span className="text-(length:--font-size-heading) leading-none font-semibold text-gray-1">
          몬스터 밸런스 보드
        </span>
      </Link>
    </header>
  );
}
