import {
  getBossAbilities,
  getDeathsByMonster,
  getGameDataRange,
  getMonsterDaily,
  getMonsterOverview,
} from '@/server/data/game-events';
import { getDataRange, getFlow, getMonsterTrend, getPatches } from '@/server/data/board';
import { isDevelopment } from '@/server/env';
import {
  getBossSkills,
  getMonsterDetail,
  getMonsterList,
  getPatchRisk,
} from '@/server/data/monsters';

// Development-only window onto the data functions, for checking results with curl:
//   curl 'http://localhost:3000/api/dev/raw-monsters'
// Screens must NOT fetch this. They call src/server/data functions directly.
// In production this route answers 404 for every path.

const FLOW_KEYS = ['lv', 'wp', 'ar', 'grp'] as const;

const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });

const HELP = {
  usage:
    '/api/dev/<fn>[?id=<monsterId>&heavy=include|exclude&period=current|all&lv=..&wp=..&ar=..&grp=..]',
  fn: {
    'raw-range': 'game_events 행 수와 기간',
    'raw-monsters': '몬스터별 스폰·제거·처치·플레이어 사망',
    'raw-deaths': '플레이어 사망을 몬스터·원인별로',
    'raw-daily': '몬스터 일별 추이, id 필요',
    'raw-abilities': '몬스터 기술별 사용·단계 수, id 필요',
    monsters: '몬스터 목록·신호',
    'monster-detail': '몬스터 상세, id 필요',
    'boss-skills': '보스 기술별 5초·2초 비교, id 필요',
    'patch-risk': '패치 전후 위험, id 필요',
    flow: '레벨·무기·방어구·몬스터 집단 흐름',
    trend: '몬스터 일별 추이(패치 전 개체 포함), id 필요, lv·wp·ar·grp로 좁힘',
    patches: '몬스터 패치 목록',
    'data-range': '배치 데이터 기간',
  },
};

export async function GET(request: Request, { params }: RouteContext<'/api/dev/[fn]'>) {
  if (!isDevelopment()) {
    return new Response('Not Found', { status: 404 });
  }

  const { fn } = await params;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const heavy = searchParams.get('heavy') ?? 'include';
  if (heavy !== 'include' && heavy !== 'exclude') {
    return badRequest('heavy는 include 또는 exclude여야 합니다');
  }
  const period = searchParams.get('period') ?? 'current';
  if (period !== 'current' && period !== 'all') {
    return badRequest('period는 current 또는 all이어야 합니다');
  }

  try {
    switch (fn) {
      case 'monsters':
        return Response.json(await getMonsterList(heavy, period));
      case 'monster-detail':
        if (!id) return badRequest('id가 필요합니다');
        return Response.json(await getMonsterDetail(id, heavy, period));
      case 'boss-skills':
        if (!id) return badRequest('id가 필요합니다');
        return Response.json(await getBossSkills(id, heavy, period));
      case 'patch-risk':
        if (!id) return badRequest('id가 필요합니다');
        return Response.json(await getPatchRisk(id, heavy));
      case 'flow':
        return Response.json(await getFlow(heavy, period));
      case 'trend': {
        if (!id) return badRequest('id가 필요합니다');
        const pick = Object.fromEntries(
          FLOW_KEYS.flatMap((key) => {
            const value = searchParams.get(key);
            return value ? [[key, value]] : [];
          }),
        );
        return Response.json(await getMonsterTrend(id, heavy, pick));
      }
      case 'patches':
        return Response.json(await getPatches());
      case 'data-range':
        return Response.json(await getDataRange());
      case 'raw-range':
        return Response.json(await getGameDataRange());
      case 'raw-monsters':
        return Response.json(await getMonsterOverview());
      case 'raw-deaths':
        return Response.json(await getDeathsByMonster());
      case 'raw-daily':
        if (!id) return badRequest('id가 필요합니다');
        return Response.json(await getMonsterDaily(id));
      case 'raw-abilities':
        if (!id) return badRequest('id가 필요합니다');
        return Response.json(await getBossAbilities(id));
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
