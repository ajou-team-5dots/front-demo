# 백엔드 가이드: ClickHouse mart 연결

Next.js를 처음 쓰는 백엔드 개발자가 EC2의 ClickHouse에 연결해 데이터 함수를 확인하고, 화면에서 쓰는 법까지 따라 할 수 있게 정리했다.
테이블과 반환 형태는 분석 저장소 `docs/backend/api_spec.md`(11/2)가 기준이다.

## 0. 먼저 알아 둘 것

- 화면은 **mart 테이블만 읽는다.** 원본 `events`는 화면에서 집계하지 않는다.
- 이 저장소에는 **API 서버가 따로 없다.** 페이지(Server Component)가 `src/server/data/monsters.ts`의 함수를 직접 부른다. 이 함수들이 곧 API다.
- `/api/dev/*`는 개발 모드에서 curl로 결과를 보기 위한 창일 뿐이다. 화면은 이 주소를 부르지 않는다. 프로덕션에서는 404다.
- 반환값에 지갑 주소, playerId, actorId, 채팅 원문, 판정 문구(맞음/틀림)를 넣지 않는다. 숫자와 상태 코드만 내려준다.

| 파일                              | 역할                                                           |
| --------------------------------- | -------------------------------------------------------------- |
| `src/server/env.ts`               | 환경 변수 읽기 (`process.env`는 `src/server/` 안에서만 읽는다) |
| `src/server/db/clickhouse.ts`     | ClickHouse 클라이언트 1개, `queryRows()`                       |
| `src/server/data/monsters.ts`     | 화면용 데이터 함수 7개                                         |
| `src/types/monsters.ts`           | 반환 타입                                                      |
| `src/app/api/dev/[fn]/route.ts`   | 개발용 curl 확인 창                                            |
| `src/app/api/revalidate/route.ts` | 적재 후 캐시 비우기                                            |
| `scripts/db/mart_schema.sql`      | mart 테이블 DDL (명세 2장)                                     |
| `scripts/db/load_mart.sh`         | CSV → mart 적재 (`_new`에 넣고 `EXCHANGE TABLES`)              |

## 1. 설치

```bash
pnpm install        # npm, yarn 쓰지 않는다
```

## 2. 접속 정보 넣기

```bash
cp .env.example .env.local
```

`.env.local`에 받은 값을 채운다. 이 파일은 git이 무시한다. **실제 값을 커밋하거나 이슈·PR·채팅에 붙이지 않는다.**

| 변수                                     | 예                                         |
| ---------------------------------------- | ------------------------------------------ |
| `CLICKHOUSE_URL`                         | `http://<ec2-host>:8123` (HTTP 인터페이스) |
| `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD` | 읽기 전용 계정을 권장                      |
| `CLICKHOUSE_DB`                          | mart가 들어 있는 DB                        |
| `REVALIDATE_TOKEN`                       | `openssl rand -hex 32`로 만든 값           |

접속이 되는지 먼저 확인한다.

```bash
set -a; source .env.local; set +a
curl -sS --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD" "$CLICKHOUSE_URL/?query=SELECT%20version()"
curl -sS --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD" "$CLICKHOUSE_URL/?database=$CLICKHOUSE_DB&query=SHOW%20TABLES"
```

## 3. mart 테이블이 있어야 한다

11/2 기준 EC2에는 원본 테이블만 있고 mart는 아직 없다. mart가 없으면 데이터 함수는 `Unknown table` 오류를 낸다.
테이블 만들기와 적재는 분석·백엔드 담당이 합의한 뒤 진행한다.

```bash
# 테이블 만들기 (한 번). HTTP 인터페이스는 한 번에 문장 하나만 받아서 clickhouse-client를 쓴다
clickhouse-client --host <ec2-host> --user "$CLICKHOUSE_USER" --password "$CLICKHOUSE_PASSWORD" \
  --database "$CLICKHOUSE_DB" --multiquery < scripts/db/mart_schema.sql

# 분석이 낸 CSV 적재 (파일 이름 = 테이블 이름, 첫 줄 = 열 이름, NULL은 \N)
scripts/db/load_mart.sh path/to/data/export/mart
```

`load_mart.sh`는 테이블마다 `<table>_new`에 넣은 뒤 `EXCHANGE TABLES`로 한 번에 바꾼다. 적재 중에도 화면은 이전 데이터를 끝까지 읽는다. `REVALIDATE_URL`과 `REVALIDATE_TOKEN`이 있으면 끝에 캐시도 비운다(6장).

## 4. 개발 서버와 curl 확인

```bash
pnpm dev            # http://localhost:3000
```

```bash
curl 'http://localhost:3000/api/dev/filters'
curl 'http://localhost:3000/api/dev/monsters?period=current&heavy=incl'
curl 'http://localhost:3000/api/dev/monsters?heavy=excl&role=boss'
curl 'http://localhost:3000/api/dev/monster?id=small_zombie'
curl 'http://localhost:3000/api/dev/flow'
curl 'http://localhost:3000/api/dev/patch?id=small_zombie&patch=2026-10-14-monster'
curl 'http://localhost:3000/api/dev/boss-skills?id=elderroot_stage_1'
curl 'http://localhost:3000/api/dev/boss-timeline?id=elderroot_stage_1&window=2'
curl 'http://localhost:3000/api/dev/help'     # 없는 이름이면 사용법을 돌려준다
```

공통 쿼리: `period=current|all`(기본 current), `heavy=incl|excl`(기본 incl), `role`, `stage`.
SQL 오류는 개발 모드에서만 응답 본문에 그대로 보인다.

| 주소                        | 함수                             | 결과                                         |
| --------------------------- | -------------------------------- | -------------------------------------------- |
| `filters`                   | `getFilterOptions()`             | 역할·등급·단계 선택지                        |
| `monsters`                  | `getMonsterList(f)`              | 위험 순위 순 목록 (산점도·목록)              |
| `monster?id=`               | `getMonsterDetail(id, f)`        | 헤더 + 오각형 + H1 + 보조 1·2, 없으면 `null` |
| `flow`                      | `getFlow(f)`                     | 생키 전체 행                                 |
| `patch?id=&patch=`          | `getPatchRisk(id, patchId, f)`   | H2 전후 + 일별 추이, 없으면 `null`           |
| `boss-skills?id=`           | `getBossSkills(id, f)`           | H3 기술별 5초·2초 (한 번에)                  |
| `boss-timeline?id=&window=` | `getBossTimeline(id, window, f)` | 사망 직전 기술 (window 2 또는 5)             |

## 5. 화면에서 쓰는 법

페이지는 서버에서 실행되는 컴포넌트(Server Component)다. `fetch('/api/...')` 없이 데이터 함수를 바로 `await`한다. 필터는 URL 쿼리에 둔다(공유·뒤로 가기가 되고 캐시 키가 된다).

지금 `src/app/page.tsx`는 새 디자인을 기다리는 빈 자리 표시 페이지다. 데이터가 화면까지 오는지 보려면 이 파일을 잠시 아래처럼 바꾸고 `http://localhost:3000/?heavy=excl`을 열어 본다. **확인용이니 커밋하지 않는다.** 실제 화면은 디자인 시안에 맞춰 따로 만든다.

```tsx
// src/app/page.tsx (확인용 예시)
import { Suspense } from 'react';

import { getMonsterList } from '@/server/data/monsters';
import type { Heavy, Period } from '@/types/monsters';

async function MonsterList({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; heavy?: string }>;
}) {
  const query = await searchParams;
  // URL 쿼리는 아무 값이나 올 수 있어서 허용한 값만 고른다.
  const period: Period = query.period === 'all' ? 'all' : 'current';
  const heavy: Heavy = query.heavy === 'excl' ? 'excl' : 'incl';
  const monsters = await getMonsterList({ period, heavy });

  return (
    <ul>
      {monsters.map((monster) => (
        <li key={monster.id}>
          {monster.id} · 사망 {monster.deaths} · 위험 {monster.riskRatio}배
        </li>
      ))}
    </ul>
  );
}

export default function Home({ searchParams }: PageProps<'/'>) {
  // URL 쿼리를 읽는 부분은 요청마다 달라서 Suspense 안에 둔다 (cacheComponents 규칙).
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Suspense fallback={<p>불러오는 중...</p>}>
        <MonsterList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
```

화면에서 바뀌는 상호작용(정렬, 생키 좁히기, 2초/5초 슬라이더)은 받은 데이터로 클라이언트 컴포넌트에서 처리한다. 다시 조회하지 않는다.

## 6. 캐시

- 데이터 함수는 모두 `'use cache'` + `cacheTag('mart')` + `cacheLife('hours')`다. 인자(필터)가 캐시 키라 조합마다 따로 저장된다.
- mart를 다시 적재하면 캐시를 비워야 새 값이 보인다.

```bash
curl -X POST -H "x-revalidate-token: $REVALIDATE_TOKEN" http://localhost:3000/api/revalidate
# → {"revalidated":true,"tag":"mart"}, 토큰이 없거나 틀리면 401, 서버에 토큰이 없으면 503
```

다음 요청부터 새 mart를 읽는다(`revalidateTag('mart', { expire: 0 })`).

## 7. 새 데이터 함수를 더할 때

1. 반환 타입을 `src/types/monsters.ts`에 `interface`로 적는다 (`any` 금지)
2. `src/server/data/monsters.ts`에 함수를 만든다. 첫 줄은 `'use cache'`, `cacheTag('mart')`, `cacheLife('hours')`
3. 값은 반드시 `queryRows(sql, { name: value })`의 파라미터(`{name:Type}`)로 넘긴다. 문자열을 이어 붙이면 SQL 인젝션이 된다
4. 열 이름은 SQL에서 `AS camelCase`로 바꿔 화면 타입과 맞춘다. 집계 결과(`sum`, `count`)는 UInt64라 JSON에서 문자열로 오므로 `toUInt32()`로 감싼다
5. `src/app/api/dev/[fn]/route.ts`의 `switch`에 한 줄 더해 curl로 확인한다
6. `pnpm check` 통과 확인

## 주의

- ClickHouse HTTP 포트(8123)를 인터넷에 그대로 열지 않는다. 보안 그룹으로 접근 IP를 막고, 화면용은 읽기 전용 계정을 쓴다.
- `pnpm build`는 DB에 접속하지 않는다. 데이터 함수는 요청이 올 때 실행된다.
