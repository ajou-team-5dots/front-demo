# 백엔드 가이드: 데이터 함수 작성

**백엔드는 `src/server/data/`의 SQL과 로직만 쓴다. 연결(`query()`, `readPrecomputed()`)은 건드리지 않는다.**

현재 화면 함수 4개는 구현되어 있다. `monsters.ts`가 응답을 조합하고,
`monster-counts.ts`는 집계·H1, `monster-skills.ts`는 H3,
`monster-patches.ts`는 H2를 기초 표에서 계산한다. Materialized View는 사용하지 않는다.

`pnpm test`는 `.env.local`의 실제 DB와 JSON으로 기대값을 검증한다(Node 24 필요).
Node 테스트에서만 Next의 서버 경계·캐시 메타데이터 호출을 대체하며, DB 조회와 JSON 읽기는 대체하지 않는다.
통합 테스트는 한 프로세스에서 실행해 `.env.local`과 DB 연결을 공유한다.
상세 오각형의 순위는 몬스터 단위 `pentagonRank`이며, 축의 결측 값은 JSON 그대로 `null`이다.
H2 `groupReference`는 제공된 명세·JSON에 계산 정의가 없어 `null`을 반환한다.
Next.js를 처음 쓰는 백엔드 개발자가 로컬에서 EC2 ClickHouse에 붙어 데이터 함수를 만들고, curl로 확인하고, 화면에서 쓰는 법까지 따라 할 수 있게 정리했다.

## 0. 구조

```
화면 (Server Component)
  └─ src/server/data/*.ts            ← 백엔드가 쓰는 곳: SQL, 계산 로직
       ├─ query(sql, params)          src/server/db/query.ts      ClickHouse 조회
       │    ├─ DATA_SOURCE=direct     로컬: @clickhouse/client로 EC2에 직접
       │    └─ DATA_SOURCE=lambda     배포: Vercel OIDC → AWS IAM 역할 → 조회 Lambda(VPC) → ClickHouse
       └─ readPrecomputed(name)       src/server/data/precomputed.ts  Python이 미리 계산한 JSON
            ├─ PRECOMPUTED_SOURCE=local   저장소 data/precomputed (기본)
            └─ PRECOMPUTED_SOURCE=s3      S3 (OIDC로 GetObject)
```

- **가벼운 조회**(건수, 비율, 상태)는 `query()`로 SQL을 돌린다.
- **무거운 값**(H2 같은 조건 배수, 기대 대비 위험, 오각형)은 적재 후 Python 배치가 계산한 JSON을 `readPrecomputed()`로 읽는다 (계산 명세 4장).
- 기준값은 `src/server/config/criteria.ts`의 상수로 쓴다. SQL에 숫자를 박지 않는다. 기획이 기준을 바꾸면 이 파일만 바뀐다.
- 값마다 실시간 조회인지 미리 계산인지, 미리 계산 배치를 어떻게 돌리는지는 `docs/DATA_SPEC.md`에 있다.
- 기초 표는 분석 배치가 만든다. 그 규칙을 SQL로 대조한 결과(SQL로 재현되는 것 / 분석 배치가 맡는 것)는 [`docs/CALC_SQL.md`](CALC_SQL.md)에 있다.
- 계산 명세 원문: 분석 담당 저장소 `DataSet/beta_analysis/explore/API_SPEC.md` (팀 사본: 분석 저장소 `information-design-5dots/DataSet/beta_analysis/explore/API_SPEC.md`). 분석 허브 아티팩트 **x_api 페이지**에도 있다. 이하 "계산 명세".

| 파일                                                                     | 누가      | 역할                                                                          |
| ------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------- |
| `src/server/data/monsters.ts`                                            | 백엔드    | 화면 함수 4개 (getMonsterList, getMonsterDetail, getBossSkills, getPatchRisk) |
| `src/server/data/game-events.ts`                                         | 백엔드    | 원본 `game_events` 조회 예시 함수 5개 (참고용, 동작함)                        |
| `src/types/monsters.ts`                                                  | 백엔드    | 반환 타입 (계산 명세 5장·3장 이름 그대로)                                     |
| `src/server/config/criteria.ts`                                          | 기획·분석 | 기준값 (계산 명세 1장)                                                        |
| `tests/expected.test.ts`                                                 | 백엔드    | 실제 기초 표·JSON을 읽는 기대값 검증 (계산 명세 6장)                          |
| `src/server/db/*`, `src/server/data/precomputed.ts`, `src/server/env.ts` | 프론트    | 연결. 건드리지 않는다                                                         |

## 1. 꼭 지킬 것

- **`actorId`, `payload.sourceActor`에는 지갑 주소(`g1`로 시작하는 40자)가 그대로 있다.** 조인·필터 안에서만 쓰고 SELECT 결과로 내보내지 않는다. 채팅 원문(`payload.msg`)도 내보내지 않는다.
- **운영 계정은 모든 쿼리에서 뺀다.** 채팅이 `/su`로 시작한 계정을 서브쿼리로 찾아 제외한다 (`game-events.ts`의 `BASE_CTES` 참고).
- **값은 반드시 params로 넘긴다.** `query('... WHERE monster = {id:String}', { id })`. 문자열을 이어 붙이면 SQL 인젝션이 된다. Lambda도 같은 `{name:Type}` 자리 표시자를 쓴다.
- 판정 문구(맞음/틀림)는 내려주지 않는다. 숫자와 상태 코드(`yes/no/unk`, `signal/none/sample_short` 등)만 내려준다.
- 비율에는 분자와 분모를 함께 내려준다.
- Lambda 응답은 6MB까지다. 원본 행을 끌어오지 말고 SQL에서 집계해서 받는다.

## 2. 설치와 접속 정보

```bash
fnm install         # .nvmrc의 Node 24 LTS(24.22.2). Windows·nvm은 README "Node 버전" 참고
pnpm install
cp .env.example .env.local
```

로컬 개발은 `DATA_SOURCE=direct`로 EC2 ClickHouse에 직접 붙는다.

| 변수                                      | 값                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `DATA_SOURCE`                             | `direct`                                                                                       |
| `CLICKHOUSE_URL`                          | `http://<ec2-host>:8123`. `http://`로 시작하고 URL에 사용자 이름(`ec2-user@` 등)을 넣지 않는다 |
| `CLICKHOUSE_USER` / `CLICKHOUSE_PASSWORD` | `api`(읽기 전용) / 받은 비밀번호                                                               |
| `CLICKHOUSE_DB`                           | `default`                                                                                      |
| `PRECOMPUTED_SOURCE` / `PRECOMPUTED_DIR`  | `local` / 비우면 저장소 `data/precomputed`. 다른 폴더를 쓸 때만 경로를 적는다                  |
| `REVALIDATE_TOKEN`                        | `openssl rand -hex 32`                                                                         |

조회 Lambda(`5dots-query`)로 바꿔 시험하거나 배포할 때:

| 어디서 | 설정                                                                                                             | 자격 증명                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 로컬   | `DATA_SOURCE=lambda`, `QUERY_LAMBDA_NAME=5dots-query`, `AWS_PROFILE=5dots-dev`, `AWS_ROLE_ARN` 비움 → `pnpm dev` | AWS SDK 기본 체인(`AWS_PROFILE`). `next dev`에서만 허용               |
| 배포   | `DATA_SOURCE=lambda`, `QUERY_LAMBDA_NAME`, `AWS_ROLE_ARN`에 Vercel OIDC 역할                                     | Vercel OIDC로 그 역할을 assume. 배포에서 `AWS_ROLE_ARN`이 없으면 에러 |

로컬에서 OIDC로 시험하려면 `vercel env pull .env.local`로 토큰(`VERCEL_OIDC_TOKEN`, 약 12시간)을 받고 `AWS_ROLE_ARN`을 채운다. `vercel env pull`은 `.env.local`을 통째로 덮어쓰므로 직접 넣은 값은 `.env.development.local`에 두면 안전하다. S3(`PRECOMPUTED_SOURCE=s3`)도 같은 규칙으로 자격 증명을 고른다.

### 조회 Lambda 계약 (Lambda는 백엔드가 만든다)

```jsonc
// 요청
{ "sql": "SELECT ... WHERE monster = {id:String}", "params": { "id": "small_zombie" } }
// 성공
{ "rows": [ { ... } ], "elapsedMs": 120 }
// 실패
{ "error": { "code": "BAD_QUERY", "message": "..." } }
```

리전은 `ap-northeast-2`로 고정했다. 실패는 `QueryError(code, message)`로 던져진다.

Lambda는 `SELECT`/`WITH` 한 문장만 받고, SQL 텍스트 어디에든(주석 포함) `SETTINGS`가 있으면 거부한다. 그래서 `join_use_nulls` 같은 설정은 쓸 수 없고 LEFT JOIN의 기본값(`0`, `''`)으로 처리한다. 자세한 내용은 [`docs/CALC_SQL.md`](CALC_SQL.md) 6장.

## 3. 함수 만들기

1. 계산 명세에서 그 값의 절을 찾는다 (예: H1은 3-2, H3은 3-4)
2. `src/types/monsters.ts`의 반환 타입과 실제 JSON을 확인한다. 오각형 축의 결측 값은 `null`, 순위는 몬스터 단위다
3. 기초 표 집계는 `monster-counts.ts`, H3는 `monster-skills.ts`, H2는 `monster-patches.ts`를 수정하고 `monsters.ts`에서 조합한다
4. 함수 첫 줄에 캐시를 단다

   ```ts
   export async function getMonsterList(heavy: Heavy): Promise<MonsterMainRow[]> {
     'use cache';
     cacheTag(GAME_EVENTS_TAG);
     cacheLife('hours');
     const rows = await query<...>('SELECT ... FROM encounters WHERE ...', { heavy });
     const risk = await readPrecomputed<HeavyResults<number | null>>('expected-risk');
     // risk[heavy][monster]로 SQL 결과와 합친다.
     ...
   }
   ```

5. `tests/expected.test.ts`에서 기대값과 비교한다. 교전 수가 1% 넘게 다르면 조회 필터와 기초 표 생성 규칙(계산 명세 2장)을 확인한다
6. `src/app/api/dev/[fn]/route.ts`의 `switch`에 한 줄 더해 curl로 확인한다
7. `pnpm check`, `pnpm test`

### game_events를 읽을 때

- `payload`는 `JSONExtractString(payload, 'input', 'cause')`처럼 읽는다. 숫자는 `JSONExtractFloat`, `JSONExtractUInt`, 참거짓은 `JSONExtractBool`. String 열로 재적재해도 그대로 동작한다. 어떤 경로가 있는지는 먼저 확인한다.
  ```sql
  -- 지금(JSON 열): 중첩 경로까지
  SELECT groupUniqArrayArray(JSONAllPaths(payload)) FROM game_events WHERE eventType = 'monster_spawned'
  -- String 열로 재적재한 뒤: 맨 위 키만 (JSONExtractKeys는 JSON 열에서는 빈 배열을 돌려준다)
  SELECT groupUniqArrayArray(JSONExtractKeys(payload)) FROM game_events WHERE eventType = 'monster_spawned'
  ```
- `eventTime`은 MATERIALIZED 열이라 `SELECT *`에 나오지 않는다. 쓸 열 이름을 직접 적는다.
- 몬스터 행동(`monster_ability_phase_changed`)과 플레이어 사망(`character_died`의 `sourceActor`)에는 `monsterId`가 없다. `monster_spawned`의 `entityId → monsterId`로 이어 붙인다.
- `count()`는 UInt64라 JSON에서 문자열로 온다. `toUInt32()`로 감싼다.

## 4. curl로 확인

```bash
pnpm dev            # http://localhost:3000
curl 'http://localhost:3000/api/dev/raw-monsters'                        # 예시 함수 (동작함)
curl 'http://localhost:3000/api/dev/raw-abilities?id=elderroot_stage_1'
curl 'http://localhost:3000/api/dev/help'                                # 사용법
curl 'http://localhost:3000/api/dev/monsters?heavy=include&period=all'   # period: current(기본)|all
curl 'http://localhost:3000/api/dev/monster-detail?id=small_zombie'
curl 'http://localhost:3000/api/dev/boss-skills?id=elderroot_stage_1&heavy=exclude'
curl 'http://localhost:3000/api/dev/patch-risk?id=rift_stalker_strong'
```

`/api/dev/*`는 개발 모드 전용이다(프로덕션 404). 화면은 이 주소를 부르지 않는다.

## 5. 화면에서 쓰는 법

페이지는 서버에서 실행되는 컴포넌트(Server Component)다. `fetch('/api/...')` 없이 데이터 함수를 바로 `await`한다.
지금 `src/app/page.tsx`는 빈 자리 표시 페이지다. 확인하려면 잠시 아래처럼 바꾸고 `http://localhost:3000`을 연다. **확인용이니 커밋하지 않는다.**

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

## 6. 캐시

- 데이터 함수는 `'use cache'` + `cacheTag(...)` + `cacheLife('hours')`. 인자가 캐시 키다.
- 적재나 배치가 끝나면 캐시를 비운다 (`game-events`, `precomputed` 태그 둘 다).

```bash
curl -X POST -H "x-revalidate-token: $REVALIDATE_TOKEN" http://localhost:3000/api/revalidate
# → {"revalidated":true,"tags":["game-events","precomputed"]}, 토큰이 없거나 틀리면 401
```

## 주의

- ClickHouse HTTP 포트(8123)를 인터넷에 그대로 열지 않는다. 화면용은 읽기 전용 계정을 쓴다.
- `pnpm build`는 DB·AWS에 접속하지 않는다. 데이터 함수는 요청이 올 때 실행된다.
- EC2 `game_events`에는 11/2 백엔드가 2026-10-12 ~ 10-22 전체 33,753,633행(`payload` String, ReplacingMergeTree, eventId 중복 없음)을 적재했다. 계산 명세 6장 기대값과 같은 기간이다.
