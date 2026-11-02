import {
  getBossAbilities,
  getDeathsByMonster,
  getGameDataRange,
  getMonsterDaily,
  getMonsterOverview,
} from '@/server/data/game-events';
import { isDevelopment } from '@/server/env';

// Development-only window onto the data functions, for checking results with curl:
//   curl 'http://localhost:3000/api/dev/raw-monsters'
// Screens must NOT fetch this. They call src/server/data functions directly.
// In production this route answers 404 for every path.

const badRequest = (message: string) => Response.json({ error: message }, { status: 400 });

const HELP = {
  usage: '/api/dev/<fn>[?id=<monsterId>]',
  fn: {
    'raw-range': 'game_events 행 수와 기간',
    'raw-monsters': '몬스터별 스폰·제거·처치·플레이어 사망',
    'raw-deaths': '플레이어 사망을 몬스터·원인별로',
    'raw-daily': '몬스터 일별 추이, id 필요',
    'raw-abilities': '몬스터 기술별 사용·단계 수, id 필요',
  },
};

export async function GET(request: Request, { params }: RouteContext<'/api/dev/[fn]'>) {
  if (!isDevelopment()) {
    return new Response('Not Found', { status: 404 });
  }

  const { fn } = await params;
  const id = new URL(request.url).searchParams.get('id');

  try {
    switch (fn) {
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
