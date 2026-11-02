# 백엔드 가이드: EC2 game_events 직접 조회

Next.js를 처음 쓰는 백엔드 개발자가 EC2의 ClickHouse에 연결해 실제 게임 로그(`default.game_events`)를 조회하는 데이터 함수를 확인하고, 화면에서 쓰는 법까지 따라 할 수 있게 정리했다.

## 0. 먼저 알아 둘 것

- 이 저장소에는 **API 서버가 따로 없다.** 페이지(Server Component)가 `src/server/data/game-events.ts`의 함수를 직접 부른다. 이 함수들이 곧 API다.
- `/api/dev/*`는 개발 모드에서 curl로 결과를 보기 위한 창일 뿐이다. 화면은 이 주소를 부르지 않는다. 프로덕션에서는 404다.
- **`actorId`, `payload.sourceActor`에는 지갑 주소(`g1`로 시작하는 40자)가 그대로 있다.** 조인·필터 안에서만 쓰고 SELECT 결과로 절대 내보내지 않는다. 채팅 원문(`payload.msg`)도 내보내지 않는다.
- **운영 계정은 모든 쿼리에서 뺀다.** 채팅이 `/su`로 시작한 계정을 서브쿼리로 찾아 제외한다 (`game-events.ts`의 `BASE_CTES`).
- 판정 문구(맞음/틀림)는 내려주지 않는다. 숫자만 내려주고, 문구는 화면이 정한다.

| 파일                              | 역할                                                           |
| --------------------------------- | -------------------------------------------------------------- |
| `src/server/env.ts`               | 환경 변수 읽기 (`process.env`는 `src/server/` 안에서만 읽는다) |
| `src/server/db/clickhouse.ts`     | ClickHouse 클라이언트 1개, `queryRows()`                       |
| `src/server/data/game-events.ts`  | 화면용 데이터 함수 5개                                         |
| `src/types/game-events.ts`        | 반환 타입                                                      |
| `src/app/api/dev/[fn]/route.ts`   | 개발용 curl 확인 창                                            |
| `src/app/api/revalidate/route.ts` | 캐시 비우기                                                    |

## 1. 설치

```bash
fnm install         # .nvmrc의 Node 24 LTS(24.22.2)로 맞춘다. Windows·nvm은 README "Node 버전" 참고
pnpm install        # npm, yarn 쓰지 않는다
```

## 2. 접속 정보 넣기

```bash
cp .env.example .env.local
```

`.env.local`에 받은 값을 채운다. 이 파일은 git이 무시한다. **실제 값을 커밋하거나 이슈·PR·채팅에 붙이지 않는다.**

| 변수                  | 값                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `CLICKHOUSE_URL`      | `http://<ec2-host>:8123`. `http://`로 시작하고 URL에 사용자 이름(`ec2-user@` 등)을 넣지 않는다 |
| `CLICKHOUSE_USER`     | `api` (읽기 전용 계정)                                                                         |
| `CLICKHOUSE_PASSWORD` | 받은 비밀번호                                                                                  |
| `CLICKHOUSE_DB`       | `default`                                                                                      |
| `REVALIDATE_TOKEN`    | `openssl rand -hex 32`로 만든 값                                                               |

값에 공백이나 `<>`가 있으면 따옴표로 감싸거나 실제 값으로 바꾼다.

접속이 되는지 먼저 확인한다.

```bash
set -a; source .env.local; set +a
curl -sS --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD" "$CLICKHOUSE_URL/?query=SELECT%20version()"
```

## 3. 개발 서버와 curl 확인

```bash
pnpm dev            # http://localhost:3000
```

```bash
curl 'http://localhost:3000/api/dev/raw-range'                           # 행 수와 기간
curl 'http://localhost:3000/api/dev/raw-monsters'                        # 몬스터별 스폰·제거·처치·플레이어 사망
curl 'http://localhost:3000/api/dev/raw-deaths'                          # 플레이어 사망을 몬스터·원인별로
curl 'http://localhost:3000/api/dev/raw-daily?id=small_zombie'           # 일별 추이 (UTC)
curl 'http://localhost:3000/api/dev/raw-abilities?id=elderroot_stage_1'  # 기술별 사용·단계 수
curl 'http://localhost:3000/api/dev/help'                                # 없는 이름이면 사용법을 돌려준다
```

| 주소                | 함수                   | 결과                                                                    |
| ------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `raw-range`         | `getGameDataRange()`   | 행 수, 첫·마지막 이벤트 시각                                            |
| `raw-monsters`      | `getMonsterOverview()` | 몬스터별 스폰, 제거(사망·그 외), 처치, 그 몬스터가 원인인 플레이어 사망 |
| `raw-deaths`        | `getDeathsByMonster()` | 플레이어 사망을 원인 몬스터·원인별로. 추락·용암 등은 `monsterId: null`  |
| `raw-daily?id=`     | `getMonsterDaily(id)`  | 일별 스폰, 처치, 플레이어 사망                                          |
| `raw-abilities?id=` | `getBossAbilities(id)` | 기술별 행동 수, execute·recover 단계 수                                 |

SQL 오류는 개발 모드에서만 응답 본문에 그대로 보인다. 원본을 매번 훑어서 첫 호출은 1초 안팎, 캐시 뒤에는 10ms 이하다.

## 4. game_events를 읽을 때 주의

- 이벤트 종류는 `eventType`, 내용은 JSON 열 `payload`에 있다. 경로는 `toString(payload.a.b)`로 읽는다. 어떤 경로가 있는지는 먼저 확인한다.
  ```sql
  SELECT groupUniqArrayArray(JSONAllPaths(payload)) FROM game_events WHERE eventType = 'monster_spawned'
  ```
- `eventTime`은 MATERIALIZED 열이라 `SELECT *`에 나오지 않는다. 쓸 열 이름을 직접 적는다.
- 몬스터 행동(`monster_ability_phase_changed`)과 플레이어 사망(`character_died`의 `sourceActor`)에는 `monsterId`가 없다. `monster_spawned`의 `entityId → monsterId`로 이어 붙인다.
- `count()`는 UInt64라 JSON에서 문자열로 온다. `toUInt32()`로 감싼다.
- 값은 반드시 `queryRows(sql, { name: value })`의 파라미터(`{name:Type}`)로 넘긴다. 문자열을 이어 붙이면 SQL 인젝션이 된다.

## 5. 화면에서 쓰는 법

페이지는 서버에서 실행되는 컴포넌트(Server Component)다. `fetch('/api/...')` 없이 데이터 함수를 바로 `await`한다.

지금 `src/app/page.tsx`는 새 디자인을 기다리는 빈 자리 표시 페이지다. 데이터가 화면까지 오는지 보려면 이 파일을 잠시 아래처럼 바꾸고 `http://localhost:3000`을 열어 본다. **확인용이니 커밋하지 않는다.** 실제 화면은 디자인 시안에 맞춰 따로 만든다.

```tsx
// src/app/page.tsx (확인용 예시)
import { Suspense } from 'react';

import { getMonsterOverview } from '@/server/data/game-events';

async function MonsterList() {
  const monsters = await getMonsterOverview();
  return (
    <ul>
      {monsters.map((monster) => (
        <li key={monster.monsterId}>
          {monster.monsterId} · 스폰 {monster.spawns} · 처치 {monster.kills} · 플레이어 사망{' '}
          {monster.playerDeaths}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  // 데이터를 기다리는 부분은 Suspense 안에 둔다 (cacheComponents 규칙).
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Suspense fallback={<p>불러오는 중...</p>}>
        <MonsterList />
      </Suspense>
    </main>
  );
}
```

정렬, 좁히기 같은 상호작용은 받은 데이터로 클라이언트 컴포넌트에서 처리한다. 다시 조회하지 않는다.

## 6. 캐시

- 데이터 함수는 모두 `'use cache'` + `cacheTag('game-events')` + `cacheLife('hours')`다. 인자(`id`)가 캐시 키라 몬스터마다 따로 저장된다.
- EC2에 새 로그가 쌓였는데 바로 보고 싶으면 캐시를 비운다.

```bash
curl -X POST -H "x-revalidate-token: $REVALIDATE_TOKEN" http://localhost:3000/api/revalidate
# → {"revalidated":true,"tag":"game-events"}, 토큰이 없거나 틀리면 401, 서버에 토큰이 없으면 503
```

## 7. 새 데이터 함수를 더할 때

1. 반환 타입을 `src/types/game-events.ts`에 `interface`로 적는다 (`any` 금지)
2. `src/server/data/game-events.ts`에 함수를 만든다. 첫 줄은 `'use cache'`, `cacheTag(GAME_EVENTS_TAG)`, `cacheLife('hours')`
3. 쿼리는 `WITH ${BASE_CTES}`로 시작해 `events`(운영 계정 제외)와 `monsters`(entityId → monsterId)를 쓴다. `game_events`를 직접 읽지 않는다
4. SELECT에 `actorId`, `sourceActor`, `payload.msg`를 넣지 않는다
5. `src/app/api/dev/[fn]/route.ts`의 `switch`에 한 줄 더해 curl로 확인한다
6. `pnpm check` 통과 확인

## 주의

- ClickHouse HTTP 포트(8123)를 인터넷에 그대로 열지 않는다. 보안 그룹으로 접근 IP를 막고, 화면용은 읽기 전용 계정을 쓴다.
- `pnpm build`는 DB에 접속하지 않는다. 데이터 함수는 요청이 올 때 실행된다.
- EC2에는 2026-10-12 09:39 ~ 10-13 15:17(UTC) 로그만 있다. 기간이 다른 분석 결과와 숫자가 다른 것은 정상이다.
