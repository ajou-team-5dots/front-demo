# 몬스터 밸런스 보드 계산 명세 (백엔드·API용, 최종 가설 11/1)

> 근거 · 백엔드·API용 · 최종 가설 11/1
>
> 백엔드가 데이터 서버의 원본 로그로 화면 값을 직접 계산하기 위한 명세입니다. 원문은 `DataSet/beta_analysis/explore/API_SPEC.md`이고, 숫자 기준은 `explore/rules.py`와 같습니다. (분석 허브 아티팩트 x_api 페이지 본문)

백엔드 데이터 서버에 있는 원본 텔레메트리로 화면 값을 직접 계산하기 위한 명세입니다. 분석 스크립트(`explore/x1_units.py`, `x3_features.py`, `x9_planner.py`, `x10_revised.py`, `x11_confirmed.py`)와 같은 규칙입니다. 계산 결과가 맞는지는 맨 아래 [검증용 기대값](#6-검증용-기대값)으로 확인합니다.

- 숫자 기준은 모두 설정값([1장](#1-설정값))으로 두고 코드에 박지 않습니다. 기획이 기준을 바꾸면 설정만 바꿉니다.
- 모든 값은 고활동 계정 포함(기본) / 제외 두 벌로 계산합니다 (`heavy=include|exclude`).
- 비율은 항상 분자와 분모를 함께 응답에 넣습니다. 화면은 비율과 건수를 같이 보여줍니다.

## 목차

1. [설정값](#1-설정값)
2. [원본 이벤트에서 기본 표 만들기](#2-원본-이벤트에서-기본-표-만들기)
3. [지표 계산](#3-지표-계산)
4. [통계 모형이 필요한 값 (배치 계산)](#4-통계-모형이-필요한-값-배치-계산)
5. [API 응답 형식 (제안)](#5-api-응답-형식-제안)
6. [검증용 기대값](#6-검증용-기대값)

---

## 1. 설정값

| 이름                                                                          | 값                                                                | 쓰는 곳                                                                |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `ENC_GAP_S`                                                                   | 30                                                                | 같은 플레이어·같은 몬스터 개체의 타격 간격이 30초를 넘으면 교전을 나눔 |
| `ENC_PAD_S`                                                                   | 5                                                                 | 받은 피해를 교전에 붙일 때 앞뒤 여유(초)                               |
| `NEAR_HP`                                                                     | 0.2                                                               | 빈사 = 최저 HP ÷ 최대 HP ≤ 0.2                                         |
| `HEAVY_Q`                                                                     | 0.99                                                              | 고활동 계정 = 교전 수가 상위 1% 이상인 계정                            |
| `MIN_ENC_MAIN`                                                                | 20                                                                | 메인 표에 올리는 최소 교전 수                                          |
| `MIN_DEATHS`                                                                  | 5                                                                 | H1·H3·보조 1 최소 사망 수                                              |
| `H1_PP`, `H1_RATIO`, `H1_MIN_COND_ENC`, `H1_LEVEL_GAP`                        | 15, 2.0, 10, 10                                                   | H1 신호 기준·표본·저레벨 정의                                          |
| `H2_MIN_ENC`, `H2_MIN_EVENTS`, `H2_STAGE_OVERLAP`                             | 30, 5, 0.5                                                        | H2 표본 기준·비교군 단계 겹침                                          |
| `H3_WINDOWS`, `H3_PP`, `H3_RATIO`, `H3_MIN_SURV_ENC`, `H3_MIN_ABILITY_DEATHS` | [5, 2], 15, 2.0, 10, 3                                            | H3 창(첫 값 = 기본 판정), 신호 기준, 표본                              |
| `AUX2_BIG_HIT`, `AUX2_MIN_HIT_ENC`                                            | 0.5, 100                                                          | 보조 2 큰 피해 기준, 표본                                              |
| `MIDBOSS_PREFIX`                                                              | `iron_guardian`, `iron_colossus`, `abyss_beast`, `abyss_colossus` | 중간 보스 판별                                                         |

---

## 2. 원본 이벤트에서 기본 표 만들기

원본 한 줄 = `{eventId, eventType, actorId, occurredAt(ms), producer, context{worldId, clientSessionId}, payload}`. `eventId`로 중복을 제거합니다.

### 2-1. 사용하는 이벤트

| 표                     | eventType                                                                | 조건                                                                  | 꺼내는 값                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 몬스터 생성            | `monster_spawned`                                                        | `payload.reason != 'checkpoint_restored'`                             | entityId, monsterId, ts, worldId                                                                                    |
| 몬스터 제거            | `monster_removed`                                                        |                                                                       | entityId, monsterId, ts, currentHp                                                                                  |
| 플레이어 → 몬스터 타격 | `damage_applied`                                                         | `payload.input.entityId` 있음, `result.duplicate`가 아님              | actorId(플레이어), entityId, ts, result.amountApplied, result.currentHp, result.maxHp, worldId                      |
| 몬스터 → 플레이어 피해 | `damage_applied`                                                         | `payload.input.cause`가 `MONSTER`로 시작                              | actorId(플레이어), ts, result.amountApplied, result.vitals.currentHp, result.vitals.maxHp, result.died, 몬스터 종류 |
| 몬스터 사망            | `character_died`                                                         | `payload.kind == 'monster'`                                           | entityId, ts                                                                                                        |
| 플레이어 사망          | `character_died`                                                         | `payload.kind == 'player'`, `payload.sourceActor`가 `monster:`로 시작 | actorId, ts, sourceActor(= 죽인 몬스터 개체)                                                                        |
| 보스 기술              | `monster_action`, `monster_ability_phase_changed` (`phase == 'execute'`) |                                                                       | entityId, abilityId, ts                                                                                             |
| 레벨                   | `progression_changed`                                                    | `result.level` 있음                                                   | actorId, ts, level                                                                                                  |
| 장비                   | `item_flow`                                                              | `producer == 'world'`, `slotIndex // 100000 == 3`                     | actorId, ts, slotIndex, itemId(제거면 null)                                                                         |

### 2-2. 교전

**교전** = 플레이어 1명 × 몬스터 개체 1마리의 타격 묶음. 같은 (entityId, 플레이어)의 타격 간격이 `ENC_GAP_S`를 넘으면 새 교전.

| 값        | 정의                                                           |
| --------- | -------------------------------------------------------------- |
| `start`   | 첫 타격                                                        |
| `lastHit` | 마지막 타격                                                    |
| `killed`  | 그 개체의 몬스터 사망 시각이 [start, lastHit + `ENC_GAP_S`] 안 |
| `end`     | killed면 max(몬스터 사망 시각, lastHit), 아니면 lastHit        |
| `party`   | 그 개체를 친 서로 다른 플레이어 수                             |
| `party2`  | party > 1                                                      |

**받은 피해 붙이기:** 몬스터 → 플레이어 피해를 같은 플레이어·같은 몬스터 종류의 교전 중 [start − `ENC_PAD_S`, end + `ENC_PAD_S`] 안에 있는 교전에 붙입니다. 여럿이면 교전 중심 시각이 가장 가까운 교전.

| 값              | 정의                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nTaken`        | 붙은 피해 수                                                                                                                                     |
| `maxHitTaken`   | 한 번에 받은 최대 피해                                                                                                                           |
| `pMaxHp`        | 플레이어 최대 HP (없으면 100)                                                                                                                    |
| `minHpAfter`    | 피해 후 최저 HP                                                                                                                                  |
| `diedHere`      | 붙은 피해 중 died가 있음                                                                                                                         |
| `died`          | diedHere, 또는 플레이어 사망의 sourceActor가 이 교전의 entityId이고 같은 플레이어 (그 플레이어·개체의 교전 중 시작 시각이 가장 가까운 교전 하나) |
| `near20`        | nTaken > 0 이고 died가 아니며 minHpAfter ÷ pMaxHp ≤ `NEAR_HP`                                                                                    |
| `danger` (위험) | died 또는 near20                                                                                                                                 |

**교전 시점 플레이어 상태** (교전 start 기준, 사망은 사망 시각 기준):

- `level` = 그 시각 이전 마지막 레벨
- 장비 = 그 시각까지의 장비 이벤트를 순서대로 적용 (null이면 그 칸 해제)
- `weaponTier` = 주무기(slotId `main_hand`) 아이템 key의 앞부분 (`wooden`·`stone`·`iron`·`golden`·`diamond`), 주무기가 없으면 `none`
- `armor` = 장착한 방어구(equipmentCategory `armor`) 개수

**던전 단계 `stage`:** worldId가 `dungeon:`으로 시작하면, 그 월드에 나온 보스 이름 `*_stage_k`에서 k + 1. 보스가 없는 던전 월드는 1. 던전이 아니면 0(필드).

**역할 `role`:** 이름에 `_stage_`가 있으면 `boss`, `MIDBOSS_PREFIX`로 시작하면 `midboss`, 나머지 `mob`.

**패치 전 개체:** 10/14 패치로 수치가 바뀐 몬스터 중, 패치 시각 전에 생성된 개체. H2를 뺀 모든 계산은 패치 전 개체의 교전·사망을 빼고 계산합니다.

**고활동 계정:** 패치 후 교전 수가 계정 분포의 99% 지점 이상인 계정(현재 데이터 1명). `heavy=exclude`면 이 계정의 교전·사망을 모두 뺍니다.

### 2-3. 사망

몬스터별 사망 수는 플레이어 사망 이벤트(2-1의 sourceActor로 몬스터 개체 → 몬스터 종류)로 셉니다. 교전에 붙지 않은 사망(한 번도 치지 못하고 죽음)도 포함합니다.

- `answered` = 그 플레이어가 그 개체와 교전이 하나라도 있음 (한 번이라도 쳤음)

---

## 3. 지표 계산

### 3-1. 메인 표 (교전 ≥ `MIN_ENC_MAIN`인 몬스터)

- `enc`, `deaths`, `deathsPer100` = deaths ÷ enc × 100
- `expDeathsStage` = Σ(교전마다 [같은 역할·등급 × 같은 던전 단계의 사망 ÷ 교전])
- `signal` = 사망 수가 포아송(기대 = expDeathsStage) 95% 지점 초과면 `signal`, 99.8% 초과면 `strong`
- `riskVsExpected`(기대 대비 위험)와 오각형은 [4장](#4-통계-모형이-필요한-값-배치-계산)의 배치 계산 값입니다.

### 3-2. H1 조건별 준비도 (몬스터 m, 조건 c마다)

| 조건 c         | 정의                                                                          |
| -------------- | ----------------------------------------------------------------------------- |
| `lowLevel`     | level < (그 몬스터 처치 교전(killed, 사망 아님) 레벨 중앙값 − `H1_LEVEL_GAP`) |
| `noWeapon`     | weaponTier == none                                                            |
| `woodenWeapon` | weaponTier == wooden                                                          |
| `noArmor`      | armor == 0                                                                    |

| 값      | 정의                                                                     |
| ------- | ------------------------------------------------------------------------ |
| `dead`  | 사망자 중 c 비율 (사망 시점 상태)                                        |
| `win`   | 처치 교전 중 c 비율                                                      |
| `pp`    | (dead − win) × 100                                                       |
| `ratio` | [c 교전 중 사망 ÷ c 교전 수] ÷ [c가 아닌 교전의 사망 ÷ c가 아닌 교전 수] |
| `encN`  | c 교전 수 (응답에 함께)                                                  |
| `deadN` | c 사망 수 (응답에 함께)                                                  |

**상태:**

1. 사망 < `MIN_DEATHS` 또는 c 교전 < `H1_MIN_COND_ENC` → `unk` (표본 부족)
2. pp ≥ `H1_PP` 그리고 ratio ≥ `H1_RATIO` → `yes`
3. 아니면 `no`

### 3-3. H2 패치 전후 (패치 p, 몬스터 m) — 패치 전 개체 포함

- **패치 목록:** `{id, ts, kind, changed{monster: {hpBefore, hpAfter, hpRatio, dmgRatio}}}`. `kind == 'monster'`만 H2 대상.
- **기간:** 패치 전 = 직전 몬스터 패치(없으면 기록 시작) ~ p.ts, 패치 후 = p.ts ~ 다음 몬스터 패치(없으면 기록 끝). 교전 start 기준.

전·후 각각:

| 값        | 정의               |
| --------- | ------------------ |
| `enc`     | 교전 수            |
| `deaths`  | died 교전          |
| `near`    | near20             |
| `events`  | deaths + near      |
| `risk100` | events ÷ enc × 100 |
| `players` | 플레이어 수        |

- `sampleOk` = 전·후 모두 enc ≥ `H2_MIN_ENC` 그리고 events ≥ `H2_MIN_EVENTS`
- 같은 조건 배수 `sameCondition` = [4장](#4-통계-모형이-필요한-값-배치-계산) 배치 계산 (sampleOk일 때만)
- **비교군** (수치가 바뀐 m만): 같은 role, 이 패치에서 수치 미변경, sampleOk, 던전 단계 교전 분포 겹침 Σ<sub>s</sub> min(p<sub>m</sub>(s), p<sub>c</sub>(s)) ≥ `H2_STAGE_OVERLAP`
- `netOfComparator` = m의 같은 조건 배수 ÷ 비교군(합친 교전)의 같은 조건 배수 (4장)

**상태** (위에서부터 먼저 맞는 것):

1. sampleOk 아님 → `sample_short` (표본 부족)
2. 수치 변경 & 비교군 없음 → `no_comparator` (화면: 비교군 확인 필요)
3. 수치 변경 → `changed_ok`
4. 수치 미변경 → `unchanged_ok`

- `intentCheck` = 수치 변경 & 같은 조건 배수 범위의 아래 끝 > 1 (화면: 의도값 확인 필요)
- 표본 부족인 수치 변경 몬스터는 소속 묶음 값(`groupReference`)을 참고로 함께 보냅니다.

### 3-4. H3 보스 기술 (보스 b, 기술 a, 창 w ∈ `H3_WINDOWS`)

**사망 쪽:** b에게 죽은 플레이어 사망마다, 죽인 개체의 기술 이벤트 중 사망 시각 [t − w초, t] 안에 a가 있으면 1.

- `deathsWithAbility_w` = 그 수
- `deathsTotal` = b에게 죽은 사망 수
- `deathShare_w` = deathsWithAbility_w ÷ deathsTotal

**생존 쪽:** b와의 교전 중 nTaken > 0 이고 died가 아닌 교전마다, 기준 시각 = 그 교전에서 가장 큰 피해를 받은 시각(피해가 없으면 end). 그 개체의 기술 이벤트가 [기준 − w초, 기준] 안에 a를 포함하면 1.

- `survEncWithAbility_w`, `survEncTotal`, `survShare_w`

**비교:**

- `diffPP_w` = (deathShare_w − survShare_w) × 100
- `ratio_w` = deathShare_w ÷ survShare_w (survShare가 0이면 무한대로 보고 통과)

**상태:**

1. deathsTotal < `MIN_DEATHS` 또는 survEncTotal < `H3_MIN_SURV_ENC` 또는 deathsWithAbility_w < `H3_MIN_ABILITY_DEATHS` → `sample_short`
2. diffPP_w ≥ `H3_PP` 그리고 ratio_w ≥ `H3_RATIO` → `signal`
3. 아니면 `none`

- `state` = 첫 창(5초)의 상태, `state2` = 2초 상태, `criterionEffect` = 두 창 중 한쪽에서만 signal
- **보스 상태:** 보스 표본 부족이면 `sample_short`, 신호 기술이 하나라도 있으면 `signal`(+ 의도값 확인 필요), 아니면 `none`
- **기술 이름:** abilityId에서 `<보스 이름>_` 앞부분을 뺀 것. 3초 단계는 `H3_WINDOWS`에 3을 넣으면 됩니다.

### 3-5. 보조 1 반격 못 한 사망 (몬스터 m)

- `unanswered` = m에게 죽은 사망 중 answered가 아닌 수
- `deaths`
- `unansweredShare` = unanswered ÷ deaths
- deaths < `MIN_DEATHS` → `sample_short`. 판정 없음.

### 3-6. 보조 2 한 번에 큰 피해 (몬스터 m, 화면은 보스만)

- `hitEnc` = nTaken > 0 인 교전 수
- `bigHit` = 그중 maxHitTaken ÷ pMaxHp ≥ `AUX2_BIG_HIT`
- `bigHitShare` = bigHit ÷ hitEnc
- hitEnc < `AUX2_MIN_HIT_ENC` → `sample_short`. 판정 없음.

---

## 4. 통계 모형이 필요한 값 (배치 계산)

아래 세 값은 SQL 집계만으로는 나오지 않습니다. 분석 스크립트를 배치 작업으로 돌려 결과 표에 넣고, API는 그 표를 읽습니다. 백엔드가 Python이면 같은 라이브러리로 직접 구현해도 됩니다.

| 값                | 방법                                                                                                                                                                                                          | 입력                        | 출력                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------- |
| H2 같은 조건 배수 | 로지스틱 회귀 (statsmodels Logit, maxiter 200). danger ~ 상수 + post + 던전 단계 더미(첫 단계 기준) + level(결측은 중앙값) + wlow(weaponTier ∈ none, wooden) + a0(armor == 0) + party2. 값이 하나뿐인 열은 뺌 | 그 몬스터의 패치 전·후 교전 | or = exp(β<sub>post</sub>), lo/hi = exp(β ± 1.96·SE). 수렴 실패 또는 SE > 5면 null |
| 기대 대비 위험    | 교전마다 위험 확률 예측 (그래디언트 부스팅, 계정 단위 5겹 교차 검증, 입력: level, weaponDmg, armor, armorDef, party, potions, encIdx, isDungeon, tier, stage) → 몬스터별 Σ관측 위험 ÷ Σ예측                   | 패치 후 교전                | riskVsExpected                                                                     |
| 오각형 5축        | 몬스터별 값 → 같은 역할·등급 안에서 중앙값·MAD로 표준화 (5축은 아래)                                                                                                                                          | 패치 후 교전·개체           | 축 값, 비교 집단 중앙값, z, 순위                                                   |

**오각형 5축:**

1. 전투 열세도 = 맞은 교전의 경주비 중앙값
2. 필요 타격량 = 혼자 처치한 교전의 타격 수 중앙값
3. HP 소모량 = 교전당 잃은 HP 비율 평균
4. 처치 실패도 = 맞고 처치 안 된 개체 비율
5. 회피도 = 스폰 후 60초 안 12블록 안에 플레이어가 있었는데 아무도 안 친 개체 비율

- **배치 주기:** 데이터가 들어올 때 (하루 1회면 충분). 패치가 추가되면 패치 목록에 한 줄 넣고 다시 돌립니다.
- **배치 스크립트:** `explore/x10_revised.py` (기대 대비 위험·오각형·H1), `explore/x11_confirmed.py` (H2·H3·보조). 출력 형식은 `out/screen_data/schema.md`.

---

## 5. API 응답 형식 (제안)

| 엔드포인트                   | 쿼리               | 응답                                                                                                                                                                            |
| ---------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /monsters`              | heavy              | 메인 표 행 목록: monster, role, grade, mainStage, enc, deaths, deathsPer100, riskVsExpected, signal, pentagonRank, h2State, h2IntentCheck, h3State, h3State2, h3CriterionEffect |
| `GET /monsters/{monster}`    | heavy              | 상세: pentagon, H1_readiness(조건 4개), H2_patch(패치별), aux1_unanswered, aux2_bigHit, H3_bossSkill(보스만)                                                                    |
| `GET /patches`               |                    | 패치 목록과 기간                                                                                                                                                                |
| `GET /monsters/{monster}/h3` | heavy, window(5·2) | 기술별 행 (3-4)                                                                                                                                                                 |

상세 응답의 칸 이름과 구조는 `out/screen_data/detail_<monster>.json`과 같게 하면 프론트가 그대로 씁니다. 이 파일들은 API 응답이 맞는지 비교하는 기대값으로 씁니다.

---

## 6. 검증용 기대값

2026-10-12 ~ 10-22 데이터, 고활동 계정 포함.

| 항목                                       | 기대값                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 교전 전체 / 패치 후 개체만                 | 61,759 / 59,113                                                                                                     |
| 몬스터가 죽인 플레이어 사망 (패치 후 개체) | 698                                                                                                                 |
| 계정 수 / 고활동 계정                      | 68 / 1                                                                                                              |
| small_zombie                               | 교전 4,429, 사망 40, 위험 38                                                                                        |
| small_zombie H1                            | 저레벨 yes (사망자 78% 대 처치 27%), 무기 없음 yes (57% 대 2%), 나무 무기 no (18% 대 15%), 방어구 0 yes (75% 대 6%) |
| elderroot_stage_1 H3 bloom                 | 5초: 10/28 대 5/106 → signal, 2초: 4/28 대 3/106 → none, criterionEffect true                                       |
| H3 전체                                    | 5초 신호 기술 9개·보스 7종, 2초 5개·5종 (고활동 제외 시 4종·1종)                                                    |
| rift_stalker_strong H2                     | 패치 전 교전 332·위험 15, 패치 후 4,616·116, 같은 조건 19.21배 (8.29~44.54), no_comparator, intentCheck true        |
| H2 상태 (메인 표 36종)                     | 표본 충분 7종 (수치 미변경 5, 비교군 확인 필요 2), 표본 부족 29종                                                   |
| elderroot_stage_1 보조                     | 보조 1: 0/28, 보조 2: 21/131                                                                                        |

교전 수가 기대값과 1% 넘게 다르면 [2장](#2-원본-이벤트에서-기본-표-만들기)의 교전 나누기·피해 붙이기 규칙부터 확인합니다.
