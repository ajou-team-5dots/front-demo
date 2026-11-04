# 디자인 토큰

보드의 색, 불투명도, 글자 크기, 선 두께, 점과 막대 크기, 모서리, 간격, 모션 값은 모두 한 파일에서 나옵니다.

- 원본: `design-tokens/tokens.json` (W3C Design Tokens, DTCG 형식)
- 생성물: `src/styles/tokens.css` (CSS 변수), `src/styles/tokens.ts` (차트 코드용 숫자와 `var()` 문자열). 직접 고치지 않습니다
- 미리보기: `pnpm dev` 후 `/dev/tokens`. 모든 토큰 견본, 실제로 칠해진 색의 대비, 작은 차트 예시가 있습니다 (개발 서버에서만 열림)

## 바꾸는 방법

1. `design-tokens/tokens.json`에서 `$value`를 고칩니다. 설명은 `$description`에 씁니다
2. `pnpm tokens`를 실행합니다. `tokens.css`, `tokens.ts`가 다시 만들어집니다
3. `/dev/tokens`에서 견본과 대비를 확인하고, `/`, `/?m=elderroot_stage_1`, `/?m=small_zombie`를 봅니다
4. `pnpm check`를 통과시키고 `tokens.json`과 생성 파일 두 개를 함께 커밋합니다

`pnpm tokens:check`는 생성 파일이 `tokens.json`과 맞지 않으면 실패합니다. `pnpm tokens:contrast`는 아래 대비 기준을 계산해 미달이면 실패합니다. 둘 다 `pnpm check`에 들어 있습니다.

AI 에이전트(Claude, Codex)로 고칠 때의 작업 지침은 `design-tokens/AGENTS.md`에 있습니다. 토큰마다 `$description`에 화면 위치와 제약이 적혀 있습니다.

### 값 적는 법

| 종류                           | 예                                                                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 색                             | `"#d64a5f"`                                                                                                                                                                                                 |
| 다른 토큰 참조                 | `"{color.chart.death}"` → CSS에서 `var(--chart-death)`                                                                                                                                                      |
| 섞은 색                        | `$value`가 바탕 색, `$extensions."org.5dots.mix"`에 `with`(섞을 색)와 `amount`(바탕 색 비율 0–1). CSS `color-mix(in oklab, 바탕 amount%, with)`로 바뀝니다. `with`에 `"transparent"`를 쓰면 반투명이 됩니다 |
| 불투명도                       | `0.35`                                                                                                                                                                                                      |
| 크기(글자, 선, 점, 막대, 간격) | `"12px"`                                                                                                                                                                                                    |
| 시간                           | `"200ms"`                                                                                                                                                                                                   |
| 가속                           | `[0.2, 0.7, 0.2, 1]`                                                                                                                                                                                        |

### CSS 변수 이름 규칙

| JSON 경로              | CSS 변수              | 예                                         |
| ---------------------- | --------------------- | ------------------------------------------ |
| `color.base.<이름>`    | `--<이름>`            | `color.base.gray-1` → `--gray-1`           |
| `color.<묶음>.<이름>`  | `--<묶음>-<이름>`     | `color.sankey.lv.1` → `--sankey-lv-1`      |
| `radius.<이름>`        | `--corner-<이름>`     | `radius.panel` → `--corner-panel`          |
| `motion.<묶음>.<이름>` | `--<묶음>-<이름>`     | `motion.duration.slow` → `--duration-slow` |
| 그 밖                  | `--<경로를 -로 이음>` | `opacity.band.dim` → `--opacity-band-dim`  |

`radius`만 `--corner-`로 바뀌는 까닭: `--radius-*`는 Tailwind `@theme`이 `rounded-*` 클래스를 만들 때 쓰는 이름이라, 같은 이름을 쓰면 서로를 가리키게 됩니다.

### 코드에서 쓰는 법

- Tailwind 색 클래스: `globals.css`의 `@theme inline`이 토큰을 이어 줍니다. 예 `bg-status-danger-soft`, `bg-state-row-hover`, `rounded-panel`
- 글자 크기, 간격, 막대 크기 클래스: `text-(length:--font-size-label)`, `gap-(--space-panel-gap)`, `h-(--size-bar-skill)`. `text-label` 같은 이름 클래스를 만들지 않은 까닭: `cn()`(tailwind-merge 계열)이 모르는 `text-*`를 글자색으로 보고 `text-ink`와 겹치면 하나를 지웁니다
- SVG 차트: `import { COLOR, OPACITY, STROKE } from '@/styles/tokens'` 후 `strokeWidth={STROKE.width.regular}`, `opacity={OPACITY.band.dim}`, `fill={COLOR.scatter.high}`

차트 안 배치 숫자(차트 너비·높이, 여백, 눈금 간격, 점선 간격)는 토큰이 아니고 각 차트 파일의 상수입니다.

## 대비 기준

- **글자: 바탕과 4.5:1 이상** (WCAG AA). 보드 바탕은 패널 흰색(`--panel`)과 페이지·hover 행 회색(`--gray-3`) 두 가지이므로 둘 다 확인합니다
- **그래픽(점, 선, 막대, 칸): 3:1 이상**. 3:1이 안 되는 색은 그 자리에 글자나 모양을 함께 둡니다 (예: 흐름도 `accent` 칸은 칸마다 이름이 붙음, `chart.neutral` 점은 1배 미만이라는 범례 글자와 함께)
- 상태색(`color.status`)은 색만으로 뜻을 전하지 않고 항상 글자 배지로 씁니다
- `/dev/tokens`의 대비 숫자는 브라우저가 실제로 칠한 색을 재서 계산합니다. 섞은 색도 그대로 확인됩니다
- 자동 검사 `pnpm tokens:contrast`: 규칙은 `tokens.json` 안 각 토큰의 `$extensions["org.5dots.contrast"]`(바탕과 최소 대비)와 `color.sankey`의 `$extensions["org.5dots.distinct"]`(열 안 색 사이 OKLab 거리, 정상 0.10 이상, 색약 시뮬레이션 0.05 이상)에 있습니다. 섞은 색은 브라우저처럼 OKLab으로 섞어 계산하므로 `/dev/tokens` 숫자와 같습니다
- 색약 구분 하한 0.05는 지금 팔레트에서 가장 가까운 쌍(몬스터 집단 열 일반·약함 파랑과 중간보스 보라, 적색맹 시뮬레이션 0.054) 바로 아래로 잡았습니다. 지금보다 나빠지는 것을 막는 하한입니다
- 흐름도 칸 색(`color.sankey`)은 한 칸(열) 안에서 색약 구분 검사를 통과한 조합입니다. 순서를 바꾸거나 새 색을 넣으면 같은 칸 안에서 이웃 색과 구분되는지 다시 확인합니다

2026-11-04 측정값 (흰 바탕 / gray-3 바탕). 바탕이나 색을 바꾸면 달라지므로 최신 값은 `pnpm tokens:contrast`로 봅니다:

| 토큰                    | 색      | 흰 바탕 | gray-3   | 쓰임                   |
| ----------------------- | ------- | ------- | -------- | ---------------------- |
| `color.base.ink`        | #0b1220 | 18.72   | 16.06    | 글자                   |
| `color.base.gray-1`     | #4f5b6e | 6.88    | 5.90     | 보조 글자              |
| `color.text-scale.flag` | #b44356 | 5.42    | 4.65     | 2배 이상 숫자          |
| `color.text-scale.sub`  | #4b576a | 7.32    | 6.28     | 목록 보조 줄           |
| `color.chart.death`     | #d64a5f | 4.20    | 3.60     | 그래픽만               |
| `color.chart.accent`    | #c0850f | 3.18    | 3:1 미만 | 그래픽, 글자 동반      |
| `color.chart.neutral`   | #9ca6b6 | 2.46    | 2.11     | 1배 미만 점, 범례 동반 |

## 토큰 → 화면 위치

### 색

| 토큰                                              | CSS 변수                | 화면 위치                                                                   |
| ------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| `color.base.brand`                                | `--brand`               | 머리글 AKKADIA                                                              |
| `color.base.ink`                                  | `--ink`                 | 모든 본문 글자, 초점 고리, 1배 기준선                                       |
| `color.base.gray-1`                               | `--gray-1`              | 보조 글자, 축 눈금, 중앙값 점선                                             |
| `color.base.gray-2`                               | `--gray-2`              | 선택 상자 테두리, 산점도 0 기준선                                           |
| `color.base.gray-3`                               | `--gray-3`              | 페이지 바탕, 세그먼트 바탕, 칩, 열린 목록 행                                |
| `color.base.panel`                                | `--panel`               | 패널 바탕, 차트 글자 뒤 테두리                                              |
| `color.base.primary-strong/-soft`, `success-soft` | 같은 이름               | shadcn 부품 (보드 화면에서는 거의 안 씀)                                    |
| `color.base.skeleton-shine`                       | `--skeleton-shine`      | 로딩 뼈대 반짝임                                                            |
| `color.chart.actual`                              | `--chart-actual`        | 오각형 고른 몬스터 선·면, 패치 추이 선과 점, 위험 배수 점                   |
| `color.chart.comparison`                          | `--chart-comparison`    | 오각형 비교 고리, 평균 점선, 범위 막대                                      |
| `color.chart.death`                               | `--chart-death`         | 사망 막대, 사망 점, 산점도 2배 선                                           |
| `color.chart.survival`                            | `--chart-survival`      | 생존 막대, 처치 점                                                          |
| `color.chart.track`                               | `--chart-track`         | 격자, 기준선                                                                |
| `color.chart.track-bar`                           | `--chart-track-bar`     | 비율·기술 막대의 빈 부분 (track 80%, 조금 옅게)                             |
| `color.chart.guide`                               | `--chart-guide`         | 준비 조건 공유 눈금의 세로 격자선 (패널 대비 1.15:1 이상)                   |
| `color.chart.dumbbell-line`                       | `--chart-dumbbell-line` | 준비 조건 덤벨 가운데 연결선 (지금 `chart.accent` 참조, 패널 대비 3:1 이상) |
| `color.chart.accent/earth/violet`                 | `--chart-accent` 등     | 흐름도 칸 색의 재료. `accent`는 덤벨 연결선도 따라 바뀜                     |
| `color.chart.neutral`                             | `--chart-neutral`       | 산점도 1배 미만 점, 흐름도 순서 밖 칸                                       |
| `color.status.*`                                  | `--status-*`            | 배지 글자 (점검 신호, 표본 부족, 가설 지지)                                 |
| `color.status.*-soft`                             | `--status-*-soft`       | 배지 바탕 (상태색 10%)                                                      |
| `color.sankey.lv.1–4`                             | `--sankey-lv-1` …       | 흐름도 1열 레벨 칸 (값 순서대로)                                            |
| `color.sankey.wp.1–4`                             | `--sankey-wp-1` …       | 흐름도 2열 무기 칸                                                          |
| `color.sankey.ar.1–3`                             | `--sankey-ar-1` …       | 흐름도 3열 방어구 칸                                                        |
| `color.sankey.grp.1–5`                            | `--sankey-grp-1` …      | 흐름도 4열 몬스터 집단 칸                                                   |
| `color.sankey.neutral`                            | `--sankey-neutral`      | 정해진 순서 밖의 칸                                                         |
| `color.scatter.high/mid/below`                    | `--scatter-*`           | 산점도 점 색 (2배 이상 / 1~2배 / 1배 미만)과 범례                           |
| `color.scatter.zone`                              | `--scatter-zone`        | 산점도 우선 점검 구역 바탕 (사망색 8%)                                      |
| `color.text-scale.flag`                           | `--text-scale-flag`     | 위험 목록 2배 이상 숫자                                                     |
| `color.text-scale.sub`                            | `--text-scale-sub`      | 위험 목록 "N단계 · 역할" 줄, 값 없는 숫자                                   |
| `color.state.row-hover`                           | `--state-row-hover`     | 차트에서 가리킨 몬스터의 목록 행 바탕                                       |
| `color.state.chip-hover`                          | `--state-chip-hover`    | 흐름 칩 hover 바탕                                                          |

### 불투명도

| 토큰                     | 값   | 화면 위치                                |
| ------------------------ | ---- | ---------------------------------------- |
| `opacity.band.default`   | 0.35 | 흐름도 띠, 아무것도 고르지 않았을 때     |
| `opacity.band.hover`     | 0.75 | 흐름도 띠, 가리킨 레벨 갈래              |
| `opacity.band.picked`    | 0.85 | 흐름도 띠, 고른 칸을 지나는 띠           |
| `opacity.band.dim`       | 0.08 | 흐름도 띠, 물러난 띠                     |
| `opacity.dim.node`       | 0.35 | 흐름도 칸, 맞는 흐름이 없을 때           |
| `opacity.dim.mark`       | 0.4  | 산점도 점, 다른 점을 가리킬 때           |
| `opacity.dim.label`      | 0.45 | 오각형 축 이름, 다른 축을 가리킬 때      |
| `opacity.dim.line`       | 0.35 | 패치 추이 선, 교전이 적은 날이 섞였을 때 |
| `opacity.line.grid`      | 0.7  | 패치 추이 가로 격자, 오각형 바큇살       |
| `opacity.line.ring`      | 0.8  | 오각형 눈금 고리                         |
| `opacity.line.reference` | 0.7  | 산점도 "기대 = 1배" 점선                 |
| `opacity.line.flag`      | 0.55 | 산점도 2배 선                            |
| `opacity.line.median`    | 0.6  | 산점도 사망 수 중앙값 점선               |
| `opacity.fill.area`      | 0.18 | 오각형 안쪽 면                           |
| `opacity.point.thin`     | 0.6  | 패치 추이 빈 점 테두리                   |
| `opacity.pending`        | 0.6  | 필터를 바꾸는 동안 내용                  |

### 글자 크기 (`text-(length:--font-size-…)`, SVG는 `FONT_SIZE.…`)

| 토큰                 | 값  | 화면 위치                                              |
| -------------------- | --- | ------------------------------------------------------ |
| `font-size.micro`    | 10  | 오각형 눈금 숫자                                       |
| `font-size.caption`  | 11  | 패널 설명, 축 눈금, 배지, 목록 보조 줄, 산점도 점 이름 |
| `font-size.label`    | 12  | 필터 라벨, 컨트롤, 범례, 툴팁, 흐름도 칸 이름          |
| `font-size.body-sm`  | 13  | 목록 위험 배수, 준비 조건 수치                         |
| `font-size.body`     | 14  | 목록 몬스터 이름, 준비 조건 이름, 기술 이름            |
| `font-size.subtitle` | 16  | 패널 안 소제목, 상세 단계·역할, 흐름 요약 숫자         |
| `font-size.title`    | 20  | 패널 제목 (공통 머리 줄 `shell/panel-header.tsx`)      |
| `font-size.heading`  | 20  | 머리글, 같은 조건 위험 배수                            |
| `font-size.kpi`      | 32  | KPI 숫자 (사망, 교전, 기대 대비 위험)                  |
| `font-size.kpi-unit` | 16  | KPI 숫자 뒤 단위 (건, 배)                              |
| `font-size.display`  | 24  | 상세 몬스터 이름                                       |

줄 높이(`leading-[…]`)는 아직 토큰이 아닙니다.

### 글자 굵기 (`font-(weight:--font-weight-…)`, SVG는 `FONT_WEIGHT.…`)

| 토큰                     | 값  | 화면 위치                                                       |
| ------------------------ | --- | --------------------------------------------------------------- |
| `font-weight.risk-value` | 700 | 위험 높은 순 목록 오른쪽 배수 숫자 (이름 500, 선택 행 이름 600) |

- 다른 글자 굵기는 아직 클래스(`font-medium`, `font-semibold`, `font-bold`)로 둡니다. 디자이너가 바꾸고 싶은 굵기가 생기면 이 묶음에 토큰을 더합니다.

### 선 두께와 점 크기 (`STROKE.width.…`, `STROKE.point.…`, 점은 반지름)

| 토큰                           | 값   | 화면 위치                                                |
| ------------------------------ | ---- | -------------------------------------------------------- |
| `stroke.width.hairline`        | 0.75 | 산점도 격자                                              |
| `stroke.width.thin`            | 1    | 0 기준선, 2배 선, 중앙값 점선, 격자, 오각형 고리         |
| `stroke.width.ring`            | 1.25 | 오각형: 축 끝(±3)을 넘은 값의 점선 고리                  |
| `stroke.width.regular`         | 1.5  | 비교 고리, 평균 점선, 1배 기준선, 패치 날짜선, 초점 고리 |
| `stroke.width.bold`            | 2.5  | 오각형 고른 몬스터 선, 패치 추이 선, 범례 선             |
| `stroke.width.focus`           | 2    | 흐름도 칸 키보드 초점 고리                               |
| `stroke.width.halo`            | 3    | 차트 글자 뒤 패널색 테두리                               |
| `stroke.point.mark`            | 8    | 산점도 점                                                |
| `stroke.point.mark-hover-grow` | 1.5  | 산점도 가리킨 점이 커지는 양                             |
| `stroke.point.legend`          | 6    | 산점도 범례 점                                           |
| `stroke.point.vertex`          | 6    | 오각형 꼭짓점                                            |
| `stroke.point.vertex-hover`    | 7.5  | 오각형 가리킨 꼭짓점                                     |
| `stroke.point.vertex-ring`     | 10   | 오각형 축 끝을 넘은 값 고리                              |
| `stroke.point.trend`           | 5.5  | 패치 추이 점                                             |
| `stroke.point.trend-thin`      | 4.5  | 패치 추이 빈 점 (교전 적은 날)                           |
| `stroke.point.estimate`        | 8    | 같은 조건 위험 배수 점                                   |

### 크기, 모서리, 간격

| 토큰                                             | 값      | 화면 위치                                                      |
| ------------------------------------------------ | ------- | -------------------------------------------------------------- |
| `size.bar.skill`                                 | 15      | 보스 기술 막대 높이                                            |
| `size.bar.share`                                 | 16      | 준비 패널 비율 막대 높이                                       |
| `size.bar.interval`                              | 6       | 같은 조건 위험 배수 범위 막대 높이                             |
| `size.bar.zero-stub`                             | 3       | 값이 0인 막대 자리의 짧은 표시 (빈 트랙 대신)                  |
| `size.dumbbell.line`                             | 3       | 준비 조건 처치자→사망자 선                                     |
| `size.dumbbell.dot`                              | 14      | 준비 조건 점 지름                                              |
| `size.legend.dot`                                | 10      | 준비 패널 범례 동그라미                                        |
| `size.legend.swatch-w`                           | 16      | 보스 기술 범례 견본 너비                                       |
| `size.icon.info`                                 | 15      | 패널 제목 줄 ⓘ 설명 단추 아이콘                                |
| `size.icon.search`                               | 14      | 필터 바 몬스터 검색 돋보기 아이콘                              |
| `size.panel-header`                              | 30      | 모든 패널 머리 줄 높이                                         |
| `size.kpi-box.w`                                 | 420     | 상세 KPI 상자 너비                                             |
| `size.kpi-box.h`                                 | 72      | 상세 KPI 상자 높이 = 제목 줄 높이                              |
| `size.detail-row`                                | 364     | 상세 첫 줄(전투 양상 + 준비 조건) 높이                         |
| `size.patch-panel`                               | 288     | 패치 전후 위험 패널 최소 높이 (창이 남으면 늘어남)             |
| `size.ratio-axis.w`                              | 330     | 같은 조건 위험 배수 범위 축 너비                               |
| `size.ratio-axis.h-min`, `size.ratio-axis.h-max` | 58 / 96 | 범위 축 높이 (패널이 높아지면 이 범위에서 커짐)                |
| `size.sankey.node-width`                         | 14      | 흐름도 칸 너비                                                 |
| `size.sankey.node-min`                           | 18      | 흐름도 칸 최소 높이                                            |
| `size.sankey.pick-grow`                          | 4       | 고른 칸이 넓어지는 양                                          |
| `radius.panel`                                   | 10      | 패널, 사이드바, KPI 상자 (`rounded-panel`)                     |
| `radius.control`                                 | 6       | 입력·조작 요소, 목록 행, 툴팁 (`rounded-control`)              |
| `radius.pill`                                    | 4       | 칩, 배지 (`rounded-pill`)                                      |
| `radius.mark`                                    | 2       | 모든 막대·트랙, 흐름도 칸, 산점도 네모 (`rounded-mark`)        |
| `space.panel-gap`                                | 14      | 패널 사이                                                      |
| `space.panel-inset`                              | 16      | 패널 안쪽 좌우                                                 |
| `space.panel-top`                                | 12      | 패널 위 (제목 위)                                              |
| `space.segment-inset`                            | 3       | 기간, 2초·5초 세그먼트 안쪽                                    |
| `space.page-bottom`                              | 20      | 보드 아래 끝 ↔ 창 아래 끝 (짧은 화면은 보드가 여기까지 늘어남) |
| `space.panel-bottom`                             | 20      | 상세 첫 줄 패널의 아래 여백 (제목 위 여백과 같게)              |
| `space.dumbbell-gap`                             | 14      | 준비 조건 행의 칸 사이 간격                                    |
| `space.patch-body-top`                           | 12      | 패치 전후 위험 머리 줄 ↔ 추이 차트                             |
| `space.patch-body-bottom`                        | 16      | 패치 전후 위험 추이 차트 ↔ 패널 아래                           |
| `space.search-inset`                             | 9       | 검색 입력 좌우 안쪽 여백                                       |
| `space.search-icon-gap`                          | 6       | 검색 돋보기 ↔ 글자                                             |

### 모서리 규칙 (요소 종류 → 토큰)

새 요소도 이 표를 따릅니다. AI 작업 지침은 `design-tokens/AGENTS.md` 4-1.

| 요소 종류         | 토큰                 | 클래스 / SVG                                   | 예                                                                                                                                            |
| ----------------- | -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 패널              | `radius.panel` 10px  | `rounded-panel`                                | 패널, 사이드바, KPI 상자, 필터 바, 로딩 패널                                                                                                  |
| 컨트롤(입력·조작) | `radius.control` 6px | `rounded-control`                              | 선택 상자와 그 목록·항목, 검색 입력, 세그먼트(기간, 고활동 계정, 2초·5초) 바깥과 안 단추, 단추, ⓘ 단추, 목록 행, 패널 안 보조 상자(흐름 요약) |
| 툴팁              | `radius.control` 6px | `rounded-control`                              | 차트 툴팁, ⓘ 설명 (떠 있는 상자는 선택 목록과 같은 값)                                                                                        |
| 칩·배지           | `radius.pill` 4px    | `rounded-pill`                                 | 점검 신호, 표본 부족, 수치 미변경, 비교군 확인 필요, 현재 수치 기준, 선택한 흐름 기준, 흐름 조건 칩                                           |
| 막대              | `radius.mark` 2px    | `rounded-mark`, SVG `rx={RADIUS.mark}`         | 비율 막대와 트랙, 기술 막대와 트랙, 0 표시, 범위 막대, 흐름도 칸, 산점도 네모(중간보스), 막대 범례 견본. 트랙과 채움은 항상 같은 값           |
| 점                | 원                   | `rounded-full`, SVG `<circle>`                 | 산점도 원, 오각형 꼭짓점, 추이 점, 범례 동그라미, 준비 조건 점                                                                                |
| 선                | 둥근 끝              | `strokeLinecap="round"`, 연결선 `rounded-full` | 데이터 선(추이 선, 오각형 바깥선, 실선 범례 견본), 준비 조건 연결선. 점선 기준선(1배, 평균, 중앙값 고리)은 끝을 둥글게 하지 않음              |
| 초점 고리         | 감싸는 요소의 값     | 요소와 같은 클래스, 흐름도 칸은 `RADIUS.mark`  | 단추·입력은 control, 흐름도 칸은 mark                                                                                                         |

- 새 요소는 이 표에서 종류를 골라 그 토큰을 씁니다. `rounded-lg`, `rounded-md`, `rounded`, `rounded-[…]`, `rounded-none`처럼 토큰이 아닌 클래스는 쓰지 않습니다(`src/components/ui/*` 포함). 원은 `rounded-full`만 씁니다.
- 확인: `grep -rnoE "rounded(-[a-z0-9]+|-\[[^]]+\])?" src/components src/app | grep -vE "rounded-(panel|control|pill|mark|full)$"` 가 아무것도 내지 않아야 합니다(주석의 낱말 제외).

### 모션

| 토큰                   | 값               | 화면 위치                              |
| ---------------------- | ---------------- | -------------------------------------- |
| `motion.ease.board`    | 0.2, 0.7, 0.2, 1 | 모든 움직임                            |
| `motion.duration.fast` | 120ms            | 컨트롤 색, 꼭짓점 크기                 |
| `motion.duration.base` | 200ms            | 패널 등장, 흐림, 칩 등장               |
| `motion.duration.slow` | 320ms            | 차트 모양 이동, 목록 재정렬, 상세 열기 |

`prefers-reduced-motion`이면 모두 꺼집니다.
