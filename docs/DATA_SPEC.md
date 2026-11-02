# 데이터 명세: 몬스터 밸런스 보드 (11/2)

화면: 메인 B(산점도), 상세 C(목록+상세), 보스 상세 (디자이너 확정 11/2).
가설: 노션 「최종 가설 확정(11.1)」 H1~H3 + 보조 1·2.
계산 규칙 원문: 분석 허브 아티팩트 「계산 명세」(x_api) 페이지, 원문 `DataSet/beta_analysis/explore/API_SPEC.md`. 이하 **계산 명세**. 장·절 번호는 계산 명세 기준이다.
코드 사용법은 `docs/BACKEND_GUIDE.md`, 이 문서는 **어떤 값을 어디서 어떻게 만드는지**를 정한다.

## 0. 구조 한눈에

```
[적재]  로그 파일 ──(사람이 실행)──▶ ClickHouse game_events
                                          │
[기초 표] ClickHouse SQL (적재 직후 1회) ──┤
   └─ 교전·사망·기술 표 ─────────────────▶ ClickHouse encounters / player_deaths / ability_events
[미리 계산] Python 배치 (기초 표 다음)
   └─ 통계 모형 결과 ────────────────────▶ JSON (로컬 폴더 또는 S3)
   └─ 끝나면 POST /api/revalidate (캐시 비우기)

[화면 요청]
   Next 서버 data 함수
   ├─ query(sql, params) ─▶ (로컬) ClickHouse 직접 / (배포) Vercel OIDC → Lambda 5dots-query → ClickHouse
   └─ readPrecomputed(name) ─▶ JSON
```

- **가벼운 값**(건수, 비율, H1·H3·보조, 메인 표 신호)은 요청 때 `query()`로 계산한다. 기준값(`criteria.ts`)이나 필터가 바뀌어도 바로 다시 계산된다.
- **무거운 값**(H2 같은 조건 배수, 기대 대비 위험, 오각형)은 회귀·부스팅이라 SQL로 못 만든다. 미리 계산한 JSON을 읽는다.
- 화면 결과를 화면별로 미리 만들어 두는 표는 **쓰지 않는다.** 미리 만드는 표는 교전 단위의 기초 표 3개뿐이다.

## 1. 원칙

- 지갑 주소(`actorId`, `playerId`, `sourceActor`), 채팅 원문, 트랜잭션 해시는 응답에 넣지 않는다. 미리 만드는 표에도 넣지 않는다(계정은 순번 `player_seq`로).
- 운영 계정(/su)은 계산 단계에서 뺀다.
- 판정 문구(맞음/틀림)는 내려주지 않는다. 숫자와 상태 코드(`yes/no/unk`, `signal/none/sample_short` 등)만.
- 비율에는 분자·분모 건수를 함께 내려준다.
- 모든 값은 고활동 계정 포함·제외 두 벌(`heavy = include | exclude`).
- 기준값은 `src/server/config/criteria.ts`에서만 읽는다. SQL과 Python에 숫자를 박지 않는다.

## 2. 화면 영역 → 함수 → 값 출처

| 화면 영역                               | 함수 (`src/server/data/monsters.ts`) | 실시간 `query()`                                                           | 미리 계산 JSON                                        |
| --------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------- |
| 메인 B 산점도·위험 높은 순, 상세 C 목록 | `getMonsterList(heavy)`              | enc, deaths, deathsPer100, signal(3-1), h3State·h3State2·h3CriterionEffect | riskVsExpected, pentagonRank, h2State·h2IntentCheck   |
| 상세 C 헤더                             | `getMonsterDetail(monster, heavy)`   | enc, deaths                                                                | riskVsExpected                                        |
| 오각형                                  | 〃                                   |                                                                            | pentagon(축 값, 묶음 중앙값, z, 순위)                 |
| H1 준비 조건 (덤벨)                     | 〃                                   | H1_readiness 4조건(3-2)                                                    |                                                       |
| 보조 1 반격 못 한 사망                  | 〃                                   | 3-5                                                                        |                                                       |
| 보조 2 한 번에 큰 피해                  | 〃 (보스)                            | 3-6                                                                        |                                                       |
| H2 패치 전후 (추이 + 패치 선택)         | `getPatchRisk(monster, heavy)`       | 전·후 enc·deaths·near·risk100, sampleOk, 비교군 찾기, 일별 추이            | sameCondition(or, lo, hi), netOfComparator, 패치 목록 |
| H3 기술 후 사망 + 2초/5초 슬라이더      | `getBossSkills(monster, heavy)`      | 5초·2초 둘 다(3-4)                                                         |                                                       |
| 생키 (레벨→무기→방어구→집단)            | (추가 예정) `getFlow(heavy)`         | encounters 묶음 집계                                                       |                                                       |

- 슬라이더는 5초·2초를 한 번에 받아 화면에서 바꾼다(재조회 없음).
- 기간 필터 "현재 수치 / 전체": 현재 수치 = 수치가 바뀐 몬스터의 패치 전 개체를 뺀 값(계산 명세 2-2 마지막 문단). `encounters.pre_patch_entity`로 거른다. H2는 항상 패치 전 개체를 포함한다.

## 3. 실시간 조회가 읽는 표 (ClickHouse)

### game_events (원본)

- `payload`, `context`는 **String**으로 저장한다(JSON 타입은 4GB 서버에서 적재 중 메모리 초과). 값은 `JSONExtractString(payload, 'monsterId')`처럼 꺼낸다.
- 엔진 ReplacingMergeTree, `ORDER BY (eventType, eventTime, eventId)`로 중복 eventId를 합친다.
- 적재: `async_insert=0`, 하루치 파일을 한 번에, 날짜 하나씩 순서대로, `max_threads=2`.

### 미리 만드는 기초 표 (적재 직후 SQL로 매번 다시 만든다)

교전 나누기(30초 간격), 피해 붙이기(±5초), 당시 레벨·장비 찾기는 요청마다 하기엔 무겁고 모든 가설이 이것에서 출발한다. 그래서 적재 직후 ClickHouse SQL(`INSERT … SELECT` → `_new` → `EXCHANGE TABLES`)로 한 번 만들어 둔다. SQL과 대조 결과는 [`docs/CALC_SQL.md`](CALC_SQL.md)에 있고, 받은 피해 붙이기(`died` 일부, `near20`, `danger`, `n_taken` 등)는 아직 확인 대기다. **화면 결과가 아니라 교전 단위 원재료**라서, 기준값이나 필터가 바뀌어도 다시 만들 필요가 없다.

`encounters` (교전 1행 = 플레이어 1명 × 몬스터 개체 1마리, 계산 명세 2-2)

| 열                                             | 설명                                            |
| ---------------------------------------------- | ----------------------------------------------- |
| enc_id, player_seq                             | 교전 번호, 계정 순번(지갑 주소 대신)            |
| entity_id, monster_id, role, grade, stage      | 개체, 종류, boss/midboss/mob, 등급, 던전 단계   |
| start_ts, end_ts                               | 첫 타격, 끝(처치 시각 또는 마지막 타격)         |
| killed, died, near20, danger                   | 처치, 사망, 빈사, 위험(사망 또는 빈사)          |
| n_taken, max_hit_taken, p_max_hp, min_hp_after | 받은 피해 수, 한 번 최대 피해, 최대 HP, 최저 HP |
| level, weapon_tier, armor_count, party         | 교전 시작 시점 상태                             |
| pre_patch_entity, heavy_account                | 패치 전 개체 여부, 고활동 계정 여부             |

`player_deaths` (몬스터에게 죽은 사망 1행, 2-3)

| 열                              | 설명                                  |
| ------------------------------- | ------------------------------------- |
| death_id, player_seq, ts        |                                       |
| monster_id, entity_id, stage    | 죽인 몬스터                           |
| answered                        | 그 개체를 한 번이라도 쳤는지 (보조 1) |
| level, weapon_tier, armor_count | 사망 시점 상태 (H1)                   |
| pre_patch_entity, heavy_account |                                       |

`ability_events` (보스 기술 1행, 3-4)

| 열                              | 설명                                                                |
| ------------------------------- | ------------------------------------------------------------------- |
| boss_id, entity_id, ability, ts | `monster_action`과 `monster_ability_phase_changed`(phase = execute) |

- 표는 `_new`에 만들고 `EXCHANGE TABLES`로 한 번에 바꾼다. 바꾸는 중에도 화면은 이전 표를 읽는다.
- 계산 명세 6장 기대값과 비교: 교전 61,759 / 패치 후 개체 59,113, 몬스터가 죽인 사망 698, 계정 68 / 고활동 1. 교전 수가 1% 넘게 다르면 2-2 규칙부터 확인한다.

## 4. 미리 계산 로직

### 언제, 누가, 어디서

- **언제:** 사람이 로그를 적재한 직후 한 번. 주기 실행(cron)은 하지 않는다.
- **무엇으로:** 분석의 Python 스크립트(`explore/x1_units.py` 교전 규칙, `x10_revised.py` 기대 대비 위험·오각형, `x11_confirmed.py` H2)를 배치로 묶어 쓴다. 검증된 코드라 다시 짜지 않는다.
- **어디서:** 데모(11/5)까지는 적재한 사람의 컴퓨터. 이후 같은 코드를 계산 Lambda(Python 컨테이너, VPC 안)로 옮겨, 적재 스크립트 마지막 줄이 그 Lambda를 부르게 한다.
- **진입점:** `scripts/precompute`(추가 예정) 하나로 아래 1~5단계를 순서대로 실행한다.

### 단계

1. **읽기:** ClickHouse `game_events`에서 계산 명세 2-1 이벤트만 꺼낸다(eventId 중복 제거, 운영 계정 제외).
2. **기초 표 만들기 (SQL):** 2-2, 2-3 규칙을 [`docs/CALC_SQL.md`](CALC_SQL.md)의 SQL로 실행해 `encounters`, `player_deaths`, `ability_events`를 만들고 ClickHouse에 `_new` → `EXCHANGE TABLES`. 계정 주소는 이 단계에서 `player_seq` 순번으로 바꾸고 주소↔순번 대응표는 저장하지 않는다.
3. **통계 모형 (계산 명세 4장):**

| 값                | 방법                                                                                                                                                                                    | 입력                                         | 출력                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| H2 같은 조건 배수 | 로지스틱 회귀(statsmodels Logit, maxiter 200). `danger ~ 상수 + post + 던전 단계 더미 + level(결측은 중앙값) + wlow(무기 none·wooden) + a0(방어구 0) + party2`. 값이 하나뿐인 열은 뺀다 | 몬스터·패치별 전·후 교전 (`sampleOk`일 때만) | `or = exp(β_post)`, `lo/hi = exp(β ± 1.96·SE)`. 수렴 실패 또는 SE > 5면 null. 비교군이 있으면 `netOfComparator` |
| 기대 대비 위험    | 교전마다 위험 확률 예측(그래디언트 부스팅, 계정 단위 5겹 교차 검증, 입력 level·weaponDmg·armor·armorDef·party·potions·encIdx·isDungeon·tier·stage) → 몬스터별 Σ관측 위험 ÷ Σ예측        | 패치 후 교전                                 | `riskVsExpected`                                                                                                |
| 오각형 5축        | 몬스터별 축 값 → 같은 역할·등급 안에서 중앙값·MAD로 표준화                                                                                                                              | 패치 후 교전·개체                            | 축 값, 묶음 중앙값, z, 순위                                                                                     |

- 모두 `heavy = include`, `exclude` 두 벌로 계산한다.
- 난수가 들어가는 단계(교차 검증 분할, 부스팅)는 시드를 고정한다.

4. **JSON 쓰기:** 5장 형식으로 `PRECOMPUTED_DIR`(로컬) 또는 S3 `PRECOMPUTED_BUCKET/PRECOMPUTED_PREFIX`에 쓴다. `meta.json`을 **마지막에** 써서, 중간에 실패하면 이전 결과가 그대로 남게 한다.
5. **캐시 비우기:** `curl -X POST -H "x-revalidate-token: $REVALIDATE_TOKEN" https://<배포 주소>/api/revalidate`

### 실패했을 때

- 2단계 실패: `EXCHANGE` 전이므로 이전 표가 남는다. 원인을 고친 뒤 처음부터 다시.
- 3~4단계 실패: `meta.json`이 바뀌지 않으므로 화면은 이전 JSON을 계속 쓴다. 기초 표만 새것이 되어 실시간 값과 미리 계산 값의 기준 시점이 달라질 수 있으니, `meta.json`의 `dataTo`와 `/api/health`의 행 수를 비교해 확인한다.

## 5. 미리 계산 JSON 형식

파일 이름은 `readPrecomputed(name)`의 `name`이다(소문자, 숫자, `-`, `_`만). 아래 숫자는 형식을 보여 주는 예시다.

`meta.json`

```json
{
  "generatedAt": "2026-11-03T10:00:00Z",
  "dataFrom": "2026-10-12",
  "dataTo": "2026-10-22",
  "rows": 30000000,
  "encounters": 61759,
  "script": "<분석 저장소 커밋 해시>"
}
```

`expected-risk.json`

```json
{ "include": { "small_zombie": 0.5, "elderroot_stage_1": 5.1 }, "exclude": { "...": 0 } }
```

`pentagon.json`

```json
{
  "include": {
    "small_zombie": {
      "rank": 12,
      "axes": [{ "axis": "race_med", "value": 0.21, "peerMedian": 0.27, "z": -0.67 }]
    }
  },
  "exclude": {}
}
```

축 키: `race_med`(전투 열세도), `hits_med`(필요 타격량), `hpcost_mean`(HP 소모량), `escape_rate`(처치 실패도), `avoid_rate`(회피도).

`h2-same-condition.json`

```json
{
  "include": {
    "2026-10-14-monster": {
      "rift_stalker_strong": { "or": 19.21, "lo": 8.29, "hi": 44.54, "netOfComparator": null }
    }
  },
  "exclude": {}
}
```

`sampleOk`가 아니면 그 몬스터 키를 넣지 않는다(화면은 `null` 처리).

`patches.json`

```json
[
  {
    "id": "2026-10-14-monster",
    "ts": "2026-10-14T14:40:00+09:00",
    "kind": "monster",
    "changed": { "rift_stalker_strong": { "hpRatio": 1.86, "dmgRatio": 2.0 } }
  }
]
```

패치 목록은 사람이 관리하는 값이라 배치가 그대로 복사해 둔다. 패치가 추가되면 이 파일에 한 줄 넣고 배치를 다시 돌린다.

## 6. 캐시

- 실시간 값: data 함수에 `'use cache'` + `cacheTag(GAME_EVENTS_TAG)` + `cacheLife('hours')`.
- 미리 계산 JSON: `readPrecomputed()`가 `cacheTag('precomputed')`로 캐시한다.
- 적재·배치 후 `/api/revalidate` 한 번으로 둘 다 비운다.
- 필터는 URL 쿼리(`?heavy=exclude&period=all`)에 둔다. 서버 캐시 키가 되고 공유·뒤로가기가 된다.
- 캐시 없이 Lambda 경유 조회는 0.6~1.5초, 캐시 후 수 ms(11/2 실측). 배포에서 인스턴스마다 캐시가 따로인지(`'use cache: remote'` 필요 여부)는 확인 필요.

## 7. 정해지지 않은 것

- 상세 응답의 일부 칸 이름: 분석의 `out/screen_data/schema.md`, `detail_<monster>.json`을 받아 `src/types/monsters.ts`의 TODO를 맞춘다.
- `grade` 값 목록, `pentagonRank` 기준, `signal`의 "없음" 값 이름.
- 미리 계산 JSON을 둘 S3 버킷 이름(만든 뒤 Vercel OIDC 역할에 그 버킷 `GetObject` 권한 추가).
- 생키용 `getFlow` 반환 형식.
