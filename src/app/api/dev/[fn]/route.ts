import {
  getBossSkills,
  getBossTimeline,
  getFilterOptions,
  getFlow,
  getMonsterDetail,
  getMonsterList,
  getPatchRisk,
} from '@/server/data/monsters';
import { isDevelopment } from '@/server/env';
import type { Heavy, MonsterFilter, Period } from '@/types/monsters';

// Development-only window onto the data functions, for checking results with curl:
//   curl 'http://localhost:3000/api/dev/monsters?period=current&heavy=incl'
// Screens must NOT fetch this. They call src/server/data functions directly.
// In production this route answers 404 for every path.

const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });

const isPeriod = (value: string | null): value is Period => value === 'current' || value === 'all';
const isHeavy = (value: string | null): value is Heavy => value === 'incl' || value === 'excl';

function parseFilter(query: URLSearchParams): MonsterFilter | string {
  const period = query.get('period') ?? 'current';
  const heavy = query.get('heavy') ?? 'incl';
  if (!isPeriod(period)) return 'period는 current 또는 all';
  if (!isHeavy(heavy)) return 'heavy는 incl 또는 excl';
  const filter: MonsterFilter = { period, heavy };
  const role = query.get('role');
  if (role) filter.role = role;
  const stage = query.get('stage');
  if (stage !== null) {
    const parsed = Number(stage);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) return 'stage는 0~255 정수';
    filter.stage = parsed;
  }
  return filter;
}

const HELP = {
  usage: '/api/dev/<fn>?period=current|all&heavy=incl|excl[&role=..][&stage=..]',
  fn: {
    filters: '필터 선택지',
    monsters: '몬스터 목록 (산점도·목록)',
    monster: '몬스터 상세, id 필요',
    flow: '생키',
    patch: 'H2 패치 전후, id·patch 필요',
    'boss-skills': 'H3 보스 기술, id 필요',
    'boss-timeline': '보스 사망 직전 타임라인, id 필요, window=2|5 (기본 5)',
  },
};

export async function GET(request: Request, { params }: RouteContext<'/api/dev/[fn]'>) {
  if (!isDevelopment()) {
    return new Response('Not Found', { status: 404 });
  }

  const { fn } = await params;
  const query = new URL(request.url).searchParams;
  const filter = parseFilter(query);
  if (typeof filter === 'string') return badRequest(filter);
  const id = query.get('id');

  try {
    switch (fn) {
      case 'filters':
        return Response.json(await getFilterOptions());
      case 'monsters':
        return Response.json(await getMonsterList(filter));
      case 'flow':
        return Response.json(await getFlow(filter));
      case 'monster':
        if (!id) return badRequest('id가 필요합니다');
        return Response.json(await getMonsterDetail(id, filter));
      case 'patch': {
        const patchId = query.get('patch');
        if (!id || !patchId) return badRequest('id와 patch가 필요합니다');
        return Response.json(await getPatchRisk(id, patchId, filter));
      }
      case 'boss-skills':
        if (!id) return badRequest('id가 필요합니다');
        return Response.json(await getBossSkills(id, filter));
      case 'boss-timeline': {
        if (!id) return badRequest('id가 필요합니다');
        const window = query.get('window') === '2' ? 2 : 5;
        return Response.json(await getBossTimeline(id, window, filter));
      }
      default:
        return Response.json(HELP, { status: 404 });
    }
  } catch (error) {
    // Dev only: surface the ClickHouse error text so SQL mistakes are easy to see.
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
