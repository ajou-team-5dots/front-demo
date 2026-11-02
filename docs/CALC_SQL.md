# 계산 SQL: 확인된 것과 확인 대기 (11/2)

백엔드가 계산 명세의 기초 표와 지표를 ClickHouse SQL로 만들 때 쓰는 문서다. **SQL은 그대로 실행되는 형태**이고, 숫자는 모두 실제로 돌린 결과다.

- 계산 명세: 분석 허브 아티팩트 x_api 페이지 (원문 `DataSet/beta_analysis/explore/API_SPEC.md`). 이하 "명세", 절 번호는 명세 기준
- 데이터 흐름과 미리 계산 JSON: [`docs/DATA_SPEC.md`](DATA_SPEC.md), 개발 순서: [`docs/BACKEND_GUIDE.md`](BACKEND_GUIDE.md)

## 0. 이 문서의 기준

- **명세 6장 기대값과 SQL 결과가 맞은 것만 "확인됨"으로 적는다.** 나머지는 "확인 대기"다.
- 대조 데이터: 원본 로그 2026-10-12 ~ 10-22, 필요한 이벤트 1,651만 행(중복 제거 후)
- 대조 환경: 로컬 ClickHouse 컨테이너 `ch-calc`(2장 숫자는 25.3과 26.8.36.3(EC2와 같은 버전) 모두 같음), EC2와 같은 스키마(`payload` String, ReplacingMergeTree)
- EC2(ClickHouse 26.8)에도 아래 SQL이 쓰는 함수가 모두 있다 (4장)
- 기준값은 SQL에 숫자로 적었고, 주석에 `src/server/config/criteria.ts`의 이름을 달았다. 백엔드 코드에서는 상수를 params로 넘긴다

## 1. 로컬 대조 환경 만들기

> **이 로컬 컨테이너는 필수가 아니다.** SQL 결과를 기대값과 대조해 보고 싶을 때만 쓴다. 개발과 실행은 EC2 ClickHouse로 충분하다(로컬 개발은 Lambda 또는 허용 IP에서 직접 연결, [`docs/BACKEND_GUIDE.md`](BACKEND_GUIDE.md)).

원본은 **읽기 전용**으로 붙이고, 원본 폴더 안에는 파일을 만들지 않는다.

```bash
# 이미지 기본 동작은 데이터 폴더 전체의 소유자를 바꾸는데, 읽기 전용 마운트라 실패한다 → CLICKHOUSE_DO_NOT_CHOWN=1
docker run -d --name ch-calc -p 18123:8123 \
  -e CLICKHOUSE_USER=calc -e CLICKHOUSE_PASSWORD=calc \
  -e CLICKHOUSE_DEFAULT_ACCESS_MANAGEMENT=1 -e CLICKHOUSE_DO_NOT_CHOWN=1 \
  --ulimit nofile=262144:262144 \
  -v <분석 저장소>/Akkadia_dataset/telemetry:/var/lib/clickhouse/user_files/telemetry:ro \
  clickhouse/clickhouse-server:26.8.36.3

curl -u calc:calc 'http://localhost:18123/' --data-binary @query.sql   # SQL 실행
```

원본 `telemetry/2026_10_12 ~ 2026_10_22/*.jsonl.gz`(1,803개, 3,377만 줄)에서 명세가 쓰는 이벤트만 넣는다.

```sql
CREATE TABLE game_events
(
    eventId String,
    eventType LowCardinality(String),
    occurredAt Int64,
    eventTime DateTime64(3, 'UTC') MATERIALIZED fromUnixTimestamp64Milli(occurredAt, 'UTC'),
    producer LowCardinality(String),
    actorId Nullable(String),
    context String,
    payload String
)
ENGINE = ReplacingMergeTree ORDER BY (eventType, occurredAt, eventId);

INSERT INTO game_events (eventId, eventType, occurredAt, producer, actorId, context, payload)
SELECT JSONExtractString(line, 'eventId'), JSONExtractString(line, 'eventType'), JSONExtractInt(line, 'occurredAt'),
       JSONExtractString(line, 'producer'), nullIf(JSONExtractString(line, 'actorId'), ''),
       JSONExtractRaw(line, 'context'), JSONExtractRaw(line, 'payload')
FROM file('telemetry/*/*.jsonl.gz', 'LineAsString')
WHERE JSONExtractString(line, 'eventType') IN ('monster_spawned', 'monster_removed', 'damage_applied', 'character_died',
    'monster_action', 'monster_ability_phase_changed', 'progression_changed', 'item_flow', 'chat_send', 'move');

OPTIMIZE TABLE game_events FINAL;   -- eventId 중복 제거 (2-1)
```

| eventType                     | 행 수      |
| ----------------------------- | ---------- |
| move                          | 13,862,670 |
| item_flow                     | 698,041    |
| monster_spawned               | 395,484    |
| monster_removed               | 394,985    |
| damage_applied                | 348,290    |
| monster_action                | 296,458    |
| monster_ability_phase_changed | 274,475    |
| progression_changed           | 175,736    |
| character_died                | 58,555     |
| chat_send                     | 6,706      |
| 합계 (eventId 중복 없음)      | 16,511,400 |

## 2. 확인됨

### 2-1. 공통: 운영 계정, 몬스터 개체, 패치 전 개체 (명세 2-1, 2-2)

- 운영 계정 = 채팅을 `/su`로 시작한 계정. **이 데이터에는 `/su` 채팅이 0건이라 대상 0명**이다. SQL은 넣었지만 효과는 확인하지 못했다
- `monster_spawned`의 `entityId`(`monster:<번호>`) → `monsterId`. 플레이어 사망의 `sourceActor`도 같은 형식이라 그대로 조인한다
- **실행 순서:** 아래 `patched` 표(패치 대상 17종)를 먼저 만든 뒤 이 SQL을 돌린다. `prepatch_entities`가 그 표를 읽는다

```sql
-- 2-1·2-2 공통: 운영 계정, 몬스터 개체, 패치 전 개체
CREATE OR REPLACE VIEW ops_accounts AS
SELECT DISTINCT assumeNotNull(actorId) AS a
FROM game_events
WHERE eventType = 'chat_send' AND startsWith(JSONExtractString(payload, 'msg'), '/su') AND actorId IS NOT NULL;

CREATE OR REPLACE VIEW mon AS
SELECT JSONExtractString(payload, 'entityId') AS entityId,
       any(JSONExtractString(payload, 'monsterId')) AS monsterId,
       min(eventTime) AS spawnTs
FROM game_events
WHERE eventType = 'monster_spawned'
GROUP BY entityId;

CREATE OR REPLACE VIEW prepatch_entities AS
SELECT entityId
FROM mon
WHERE monsterId IN (SELECT monsterId FROM patched)
  AND spawnTs < toDateTime64('2026-10-14 05:40:00', 3, 'UTC');
```

**패치 대상 17종과 시각: 데이터에서 찾음, 분석 확인 대기.** 패치 목록 원본(`rules.py` PATCHES)이 없어서, 맞은 몬스터의 최대 HP(`damage_applied`의 `result.maxHp`)가 바뀐 몬스터를 찾았다. 개수·배율은 분석 기록(medium·등급 없음 9종 HP×1.36, strong 8종 HP×1.86)과 같다. 옛 HP로 마지막 스폰된 시각은 10/14 05:21 UTC이고, 패치 시각은 분석 추정(10/14 14:40 KST = 05:40 UTC)을 쓴다. 피해 배율(×1.5, ×2)은 아직 대조하지 않았다.

```sql
-- 최대 HP 값이 둘 이상인 몬스터 (0은 죽는 순간 기록이라 무시)
WITH h AS (
    SELECT mon.monsterId AS m, JSONExtractFloat(g.payload, 'result', 'maxHp') AS mx
    FROM game_events AS g
    INNER JOIN mon ON mon.entityId = JSONExtractString(g.payload, 'input', 'entityId')
    WHERE g.eventType = 'damage_applied' AND JSONExtractString(g.payload, 'input', 'entityId') != ''
)
SELECT m, groupUniqArray(mx) AS hps FROM h GROUP BY m HAVING length(hps) > 1 ORDER BY m;

CREATE TABLE patched (monsterId String, lowHp Float64, highHp Float64) ENGINE = Memory;
INSERT INTO patched VALUES
    ('abyss_beast_medium', 335, 453), ('blink_imp', 42, 57), ('iron_guardian_medium', 315, 426),
    ('melee_zombie', 53, 72), ('ranged_zombie', 42, 57), ('relic_battery_medium', 63, 86),
    ('rootwalker_medium', 63, 86), ('rush_imp', 53, 72), ('volatile_imp', 21, 29),
    ('abyss_colossus', 670, 1240), ('cragling_strong', 106, 197), ('effigy_javelineer_strong', 84, 156),
    ('relic_battery_strong', 126, 234), ('rift_stalker_strong', 84, 156), ('rootwalker_strong', 126, 234),
    ('sporepod_strong', 42, 78), ('stone_effigy_strong', 95, 176);
```

| 배율      | 몬스터                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HP × 1.36 | abyss_beast_medium, blink_imp, iron_guardian_medium, melee_zombie, ranged_zombie, relic_battery_medium, rootwalker_medium, rush_imp, volatile_imp             |
| HP × 1.86 | abyss_colossus, cragling_strong, effigy_javelineer_strong, relic_battery_strong, rift_stalker_strong, rootwalker_strong, sporepod_strong, stone_effigy_strong |

### 2-2. 교전 나누기 (명세 2-2)

플레이어 → 몬스터 타격은 `damage_applied` 중 `input.cause`가 비어 있고 `input.entityId`가 몬스터인 것(29만 4,297건)이다. 표는 `_new`에 만들고 `EXCHANGE TABLES`로 바꾼다.

```sql
-- 2-2 교전 나누기. ENC_GAP_S = 30 (30000 ms)
DROP TABLE IF EXISTS encounters_new;
CREATE TABLE encounters_new
(
    a String, e String, monsterId String,
    startMs Int64, lastHitMs Int64, nHits UInt32,
    killed UInt8, endMs Int64, deathMs Nullable(Int64), worldId String
)
ENGINE = MergeTree ORDER BY (monsterId, a, e, startMs);

INSERT INTO encounters_new
WITH hits AS (
    SELECT assumeNotNull(actorId) AS a,
           JSONExtractString(payload, 'input', 'entityId') AS e,
           occurredAt AS t,
           JSONExtractString(payload, 'input', 'worldId') AS w
    FROM game_events
    WHERE eventType = 'damage_applied'
      AND JSONExtractString(payload, 'input', 'entityId') != ''
      AND NOT JSONExtractBool(payload, 'result', 'duplicate')
      AND actorId IS NOT NULL
      AND actorId NOT IN (SELECT a FROM ops_accounts)
),
marked AS (
    SELECT a, e, t, w,
           if(t - lagInFrame(t, 1, toInt64(0)) OVER (PARTITION BY a, e ORDER BY t ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) > 30000, 1, 0) AS isNew
    FROM hits
),
numbered AS (
    SELECT a, e, t, w,
           sum(isNew) OVER (PARTITION BY a, e ORDER BY t ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS encIdx
    FROM marked
),
grp AS (
    SELECT a, e, min(t) AS startMs, max(t) AS lastHitMs, toUInt32(count()) AS nHits, any(w) AS w
    FROM numbered GROUP BY a, e, encIdx
),
mdeath AS (
    SELECT JSONExtractString(payload, 'entityId') AS e, min(occurredAt) AS deathMs
    FROM game_events
    WHERE eventType = 'character_died' AND JSONExtractString(payload, 'kind') = 'monster'
    GROUP BY e
)
SELECT g.a, g.e, m.monsterId, g.startMs, g.lastHitMs, g.nHits,
       toUInt8(d.deathMs IS NOT NULL AND d.deathMs >= g.startMs AND d.deathMs <= g.lastHitMs + 30000) AS killed,
       if(killed, greatest(assumeNotNull(d.deathMs), g.lastHitMs), g.lastHitMs) AS endMs,
       d.deathMs, g.w
FROM grp g
LEFT JOIN mon m ON m.entityId = g.e
LEFT JOIN mdeath d ON d.e = g.e
SETTINGS join_use_nulls = 1;

-- 처음 실행할 때는 encounters가 없어 EXCHANGE가 실패하므로 빈 표를 먼저 만든다
CREATE TABLE IF NOT EXISTS encounters AS encounters_new;
EXCHANGE TABLES encounters_new AND encounters;
DROP TABLE encounters_new;
```

```sql
-- 확인 1: 교전 전체 / 패치 후 개체 / 계정
SELECT count() AS encounters,
       countIf(e NOT IN (SELECT entityId FROM prepatch_entities)) AS post_patch_entity_encounters,
       uniqExact(a) AS accounts
FROM encounters;
```

| 항목                  | 기대값 | SQL 결과 |
| --------------------- | ------ | -------- |
| 교전 전체             | 61,759 | 61,759   |
| 교전 (패치 후 개체만) | 59,113 | 59,113   |
| 계정 수               | 68     | 68       |

### 2-3. 고활동 계정 (명세 2-2)

```sql
-- 확인 2: 고활동 계정. HEAVY_Q = 0.99, 패치 후 교전 수 기준
WITH per AS (
    SELECT a, count() AS n FROM encounters
    WHERE startMs >= toUnixTimestamp64Milli(toDateTime64('2026-10-14 05:40:00', 3, 'UTC'))
    GROUP BY a
)
SELECT countIf(n >= (SELECT quantile(0.99)(n) FROM per)) AS heavy_accounts
FROM per;
```

| 항목        | 기대값 | SQL 결과 |
| ----------- | ------ | -------- |
| 고활동 계정 | 1      | 1        |

### 2-4. 플레이어 사망과 answered (명세 2-3, 3-5)

```sql
-- 2-3 플레이어 사망 (몬스터가 죽인 것만). sourceActor가 곧 몬스터 entityId ('monster:<번호>')
CREATE OR REPLACE VIEW pdeaths AS
SELECT assumeNotNull(actorId) AS a, occurredAt AS t, JSONExtractString(payload, 'sourceActor') AS e
FROM game_events
WHERE eventType = 'character_died'
  AND JSONExtractString(payload, 'kind') = 'player'
  AND startsWith(JSONExtractString(payload, 'sourceActor'), 'monster:')
  AND actorId IS NOT NULL
  AND actorId NOT IN (SELECT a FROM ops_accounts);
```

```sql
-- 확인 3: 몬스터가 죽인 플레이어 사망 (패치 후 개체)
SELECT count() AS deaths_by_monster,
       countIf(e NOT IN (SELECT entityId FROM prepatch_entities)) AS post_patch_entity_deaths
FROM pdeaths;
```

```sql
-- 확인 4: 몬스터별 교전·사망 (패치 후 개체)
SELECT m AS monsterId, enc, deaths
FROM (
    SELECT monsterId AS m, count() AS enc FROM encounters
    WHERE e NOT IN (SELECT entityId FROM prepatch_entities) GROUP BY monsterId
) AS x
LEFT JOIN (
    SELECT mon.monsterId AS m, count() AS deaths FROM pdeaths
    INNER JOIN mon ON mon.entityId = pdeaths.e
    WHERE pdeaths.e NOT IN (SELECT entityId FROM prepatch_entities) GROUP BY mon.monsterId
) AS y USING (m)
WHERE m IN ('small_zombie', 'elderroot_stage_1')
ORDER BY m;
```

```sql
-- 확인 5: 보조 1 반격 못 한 사망 (3-5). answered = 그 개체와 교전이 하나라도 있음
SELECT countIf((d.a, d.e) NOT IN (SELECT a, e FROM encounters)) AS unanswered, count() AS deaths
FROM pdeaths AS d
INNER JOIN mon ON mon.entityId = d.e
WHERE mon.monsterId = 'elderroot_stage_1' AND d.e NOT IN (SELECT entityId FROM prepatch_entities);
```

| 항목                                         | 기대값 | SQL 결과 |
| -------------------------------------------- | ------ | -------- |
| 몬스터가 죽인 플레이어 사망 (패치 후 개체)   | 698    | 698      |
| small_zombie 교전                            | 4,429  | 4,429    |
| small_zombie 사망                            | 40     | 40       |
| elderroot_stage_1 사망                       | 28     | 28       |
| elderroot_stage_1 보조 1 (unanswered/deaths) | 0/28   | 0/28     |

### 2-5. H3 사망 쪽 (명세 3-4)

기술 이벤트 = `monster_action` + `monster_ability_phase_changed`(phase = execute).

```sql
-- 확인 6: H3 사망 쪽 (3-4). H3_WINDOWS = [5, 2]
WITH abil AS (
    SELECT JSONExtractString(payload, 'entityId') AS e,
           groupArray((JSONExtractString(payload, 'abilityId'), occurredAt)) AS arr
    FROM game_events
    WHERE eventType = 'monster_action'
       OR (eventType = 'monster_ability_phase_changed' AND JSONExtractString(payload, 'phase') = 'execute')
    GROUP BY e
),
bd AS (
    SELECT d.e, d.t FROM pdeaths AS d
    INNER JOIN mon ON mon.entityId = d.e
    WHERE mon.monsterId = 'elderroot_stage_1' AND d.e NOT IN (SELECT entityId FROM prepatch_entities)
)
SELECT count() AS deathsTotal,
       countIf(arrayExists(x -> x.1 = 'elderroot_stage_1_bloom' AND x.2 >= bd.t - 5000 AND x.2 <= bd.t, ab.arr)) AS deathsWithAbility_5,
       countIf(arrayExists(x -> x.1 = 'elderroot_stage_1_bloom' AND x.2 >= bd.t - 2000 AND x.2 <= bd.t, ab.arr)) AS deathsWithAbility_2
FROM bd
LEFT JOIN abil AS ab ON ab.e = bd.e;
```

| 항목                                | 기대값 | SQL 결과 |
| ----------------------------------- | ------ | -------- |
| elderroot_stage_1 bloom 사망 쪽 5초 | 10/28  | 10/28    |
| elderroot_stage_1 bloom 사망 쪽 2초 | 4/28   | 4/28     |

## 3. 확인 대기 (규칙이 분석과 다를 수 있음)

### 3-1. 받은 피해 붙이기 (명세 2-2)

명세는 몬스터 → 플레이어 피해를 "같은 플레이어·같은 몬스터 종류의 교전 중 [start − ENC_PAD_S, end + ENC_PAD_S] 안, 여럿이면 중심 시각이 가장 가까운 교전"에 붙이라고 한다. 그런데 **원본 `damage_applied`(cause `MONSTER_*`)의 `payload.input`에는 `amount`, `cause`, `defense`, `identityId`, `nowMs`, `sourceAmount`, `worldId`뿐이라 어느 몬스터인지가 없다.** 그래서 "같은 몬스터 종류" 조건을 그대로 걸 수 없다.

시험한 가설: 후보 = 같은 플레이어·[start − 5초, end + 5초] 교전, 그중 피해 직전 W ms 안에 그 개체의 `monster_action`이 있는 교전(가장 최근 행동). 없으면 중심 시각이 가장 가까운 교전(fallback). 몬스터 피해 5만 968건 중 4만 1,395건이 붙었다.

| 설정                              | small_zombie 위험 (기대 38) | elderroot 보조 2 (기대 21/131) | bloom 생존 5초·2초 (기대 5/106·3/106) |
| --------------------------------- | --------------------------- | ------------------------------ | ------------------------------------- |
| 행동 조건 없음 (가장 가까운 교전) | 45                          | 12/101                         | 6/82 · 3/82                           |
| W 3초, fallback 있음              | 46                          | 22/137                         | 6/111 · 4/111                         |
| W 3초, fallback 없음              | 44                          | 22/137                         | 4/111 · 3/111                         |
| W 2초·1초, fallback 있음          | 46                          | 21/135                         | 5/110 · 3/110                         |

- 가장 가까운 설정(W 2초): elderroot 분자(21, 5, 3)는 맞고 분모가 각각 4 많다. small_zombie 위험은 46으로 8 많다
- cause ↔ 행동 종류(`MONSTER_MELEE` ↔ `melee` 등) 조건은 아직 시험하지 않았다

### 3-2. 이것에 기대는 값

받은 피해 붙이기가 확정될 때까지 아래 값도 확인 대기다.

- 위험(`danger`)과 빈사(`near20`), 그리고 교전의 `died` 중 붙은 피해로 정해지는 부분
- H2 전후 위험(`events`, `risk100`, `sampleOk`)
- 보조 2 큰 피해 (`hitEnc`, `bigHit`)
- H3 생존 쪽 (`survEncWithAbility_w`, `survEncTotal`)
- 오각형 HP 소모량(`hpcost_mean`), 전투 열세도(경주비 `race_med`)

교전 시점 레벨·장비(H1 조건)도 SQL(`ASOF JOIN`)로 만들 수 있지만 아직 기대값과 대조하지 않았다.

### 3-3. 분석 담당에게 보낸 질문

1. 몬스터 → 플레이어 `damage_applied`에는 몬스터 정보가 없는데, `x1_units.py`는 그 피해의 몬스터 종류를 무엇으로 정하나
2. 붙이는 후보 교전의 조건(시간 창, 같은 월드 여부)과 `near20`의 HP 기준(피해 후 HP, 최대 HP를 어느 값으로 보는지)은 무엇인가

## 4. SQL로 하지 않는 것

아래는 미리 계산(Python 배치) 그대로 둔다. [`docs/DATA_SPEC.md`](DATA_SPEC.md) 4장.

| 값                                   | 이유                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| H2 같은 조건 배수 (`or`, `lo`, `hi`) | 로지스틱 회귀의 표준오차가 필요하다. ClickHouse `stochasticLogisticRegression`은 계수만 내고 표준오차·신뢰구간이 없다 |
| `netOfComparator`, `intentCheck`     | 위 배수에 기댄다                                                                                                      |
| 기대 대비 위험 (`riskVsExpected`)    | 그래디언트 부스팅 + 계정 단위 교차 검증이라 SQL로 만들 수 없다                                                        |

Mantel-Haenszel 오즈비처럼 SQL로 되는 다른 방법은 숫자가 명세와 달라져서 쓰지 않는다.

EC2(ClickHouse 26.8)에서 확인한 함수: `argMax`, `argMin`, `lagInFrame`, `lgamma`, `median`, `quantileExact`, `stochasticLogisticRegression`, `windowFunnel`, `sequenceMatch`, `extractAll`, `ASOF JOIN`. 포아송 누적확률은 `lgamma`로 계산된다(λ = 10의 95% 지점 → 15). 메인 표 `signal`(명세 3-1)은 이 방식으로 만들 수 있지만 기대값이 없어 대조하지 않았다.

```sql
SELECT arrayFirst(k -> arraySum(arrayMap(i -> exp(i * log(10.0) - 10.0 - lgamma(i + 1)), range(k + 1))) >= 0.95, range(100));
```

## 5. 백엔드가 이 SQL을 쓰는 순서

1. EC2 `game_events`를 `payload`, `context` String으로 다시 적재한다 ([`docs/DATA_SPEC.md`](DATA_SPEC.md) 3장)
2. 2장 SQL로 기초 표(`encounters` 등)를 만든다. 적재 직후 `INSERT … SELECT` → `_new` → `EXCHANGE TABLES`
3. `src/server/data/monsters.ts` 함수에 2장의 집계 SQL을 붙인다. 기준값은 `criteria.ts` 상수를 params로 넘긴다
4. `tests/expected.test.ts`에서 확인됨 항목만 `skip`을 푼다
5. 3장은 분석 담당의 답을 받은 뒤 같은 표로 다시 대조하고 옮긴다

## 6. EC2에서 돌릴 때 주의

- EC2는 메모리 4GB다. 받은 피해 붙이기 조인은 메모리를 많이 쓰니 **날짜(파티션)별로 나눠** `INSERT`한다
- 적재·생성 때 `async_insert = 0`, `max_threads = 2`
- 로컬에서 만든 결과 표를 EC2로 올리는 방법도 있다
- 이 문서의 SQL은 로컬 25.3과 26.8.36.3에서 돌려 같은 결과를 얻었다. EC2에서 처음 돌릴 때도 결과를 2장 표와 비교한다

### 조회 Lambda 제약

화면 조회는 조회 Lambda(`5dots-query`, 읽기 전용 계정)를 거친다. Lambda는 아래 SQL을 거부한다.

- `SELECT` 또는 `WITH`로 시작하는 **한 문장**만 받는다
- **`SETTINGS`라는 단어가 SQL 텍스트 어디에든(주석 포함) 있으면 거부한다.** 읽기 전용 계정이 스스로 제한을 풀지 못하게 하려는 것이다

그래서 화면 조회 SQL에서는 `join_use_nulls` 같은 설정을 쓸 수 없다. LEFT JOIN에서 짝이 없는 행은 기본값(숫자 `0`, 문자열 `''`)으로 오므로 그 값으로 판단한다. 2-2의 `SETTINGS join_use_nulls = 1`은 표를 만드는 **쓰기 작업**(쓰기 계정, Lambda 밖에서 실행)이라 괜찮다.

## 7. 기초 표를 최신으로 유지하는 방법 (뷰)

| 방식                                   | 동작                                   | 데이터 추가 반영 | 판단                                                            |
| -------------------------------------- | -------------------------------------- | ---------------- | --------------------------------------------------------------- |
| 일반 VIEW                              | 저장된 쿼리. 읽을 때마다 다시 계산     | 즉시             | 속도는 원래 쿼리와 같다                                         |
| 일반 Materialized View (INSERT 트리거) | 새로 들어온 묶음만 처리                | 즉시             | **쓰지 않는다.** 교전 나누기처럼 여러 묶음에 걸친 계산이 틀린다 |
| Refreshable Materialized View          | 정해진 때 전체를 다시 계산해 표로 저장 | `REFRESH` 후     | **권장**                                                        |

```sql
-- 형식. AS 뒤에 2-2의 WITH … SELECT를 그대로 넣는다
CREATE MATERIALIZED VIEW encounters_mv
REFRESH EVERY 1 DAY
ENGINE = MergeTree ORDER BY (monsterId, a, e, startMs)
AS <2-2의 WITH … SELECT>;

-- 적재 직후 한 번
SYSTEM REFRESH VIEW encounters_mv;
SYSTEM WAIT VIEW encounters_mv;

-- 상태 확인
SELECT view, status, last_success_time FROM system.view_refreshes;
```

적재 → `SYSTEM REFRESH VIEW` → `SYSTEM WAIT VIEW` → `/api/revalidate` 순서로 실행한다.

로컬 26.8.36.3 실측(원본에서 몬스터별 교전·사망을 계산하는 뷰, 결과 교전 59,113 / 전체 61,759 / 사망 698):

| 방식           | 조회 시간   |
| -------------- | ----------- |
| 일반 VIEW      | 0.18~0.22초 |
| Refreshable MV | 0.002초     |

가짜 데이터를 넣어 시험했을 때 일반 VIEW는 바로 반영됐고, MV는 `REFRESH` 뒤에 반영됐다. 시험 행은 지웠다.

- **권장:** 몬스터별 결과보다 `encounters`(2-2) 자체를 Refreshable MV로 두고, H1·H3·보조는 그 표에서 집계한다. 기준값을 바꿔도 MV를 다시 만들 필요가 없다
- **주의:** MV 안에 패치 목록과 패치 시각이 상수로 들어간다. 목록이 바뀌면 MV를 다시 만든다
- MV는 쓰기 계정(dev 등)으로 백엔드가 EC2에 만든다. **아직 EC2에는 만들지 않았다**
