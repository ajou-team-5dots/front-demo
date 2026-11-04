import { redirect } from 'next/navigation';
import { Suspense } from 'react';

type Props = PageProps<'/monsters/[id]'>;

// The detail now opens on the board itself (/?m=<monster>). next.config.ts redirects old links
// with a 307 before this page runs; this stays as a fallback, keeping filters and picks.
async function Redirect({ params, searchParams }: Props): Promise<null> {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const p = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (k === 'm') return;
    (Array.isArray(v) ? v : [v]).forEach((x) => {
      if (x !== undefined) p.append(k, x);
    });
  });
  p.set('m', decodeURIComponent(id));
  redirect(`/?${p.toString()}`);
}

export default function MonsterPage(props: Props) {
  return (
    <Suspense>
      <Redirect {...props} />
    </Suspense>
  );
}
