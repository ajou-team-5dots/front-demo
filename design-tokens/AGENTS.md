# design-tokens/AGENTS.md

디자인 변경(색, 불투명도, 글자 크기, 선 두께, 점·막대 크기, 모서리, 간격, 모션)을 맡은 AI 에이전트(Claude, Codex)용 작업 지침입니다. 사람용 설명과 토큰 → 화면 위치 표는 `docs/DESIGN_TOKENS.md`에 있습니다.

## 0. 처음 시작할 때와 작업 흐름

- 처음: 저장소 루트에 `.env.local`을 만들고 **`DATA_SOURCE=fixture` 한 줄만** 넣습니다. DB 접속 정보나 AWS 자격 증명은 필요 없습니다(녹화해 둔 예시 데이터로 화면이 뜹니다). 그다음 `pnpm install` → `pnpm dev` → `/dev/tokens`와 아래 예시 화면을 엽니다. Node 24.22.2, pnpm만.
- 예시 화면 목록 (스크린샷 비교는 이 화면으로 합니다)
  - `/` 개요: 위험 목록, 산점도, 교전 흐름
  - `/?heavy=exclude` 고활동 제외 개요
  - `/?lv=1~19` 교전 흐름에서 레벨 첫 칸을 고른 상태(선택 강조, 조건 칩)
  - `/?m=elderroot_stage_1` 보스: 보스 기술 2초·5초, 점검 신호, 패치 패널
  - `/?m=small_zombie` 일반 몬스터
  - `/?m=rift_stalker_strong` 비교군 확인 필요 배지, 넓은 범위
  - `/?m=iron_guardian_weak` 중간보스, 표본 부족
  - `/?period=all&m=elderroot_stage_1` "현재 수치 기준" 칩
  - 다른 몬스터와 기간·고활동 필터도 뜹니다. 흐름 칸을 고른 상세는 위 4종의 레벨 1~19만 녹화되어 있고, 그 밖의 칸을 고르면 "디자인 예시 데이터에는 없는 화면입니다"가 나옵니다(정상).
- 흐름: 이슈 → 브랜치 → 커밋 → PR. 규칙은 `docs/ISSUE_PR_GUIDE.md`와 저장소 루트 `AGENTS.md`가 기준입니다.
  - 브랜치는 `dev`에서 `<type>/<이슈번호>-<설명>`. type은 Conventional Commits 값만(`design/`은 없음). 색·크기 변경은 `style/41-warm-tone`처럼.
  - PR은 `dev`로, 본문 첫 줄 `Closes #<이슈번호>`, 리뷰어는 작성자가 아닌 사람 1명 이상.
  - CI(`.github/workflows/pr-rules.yml`)가 아래 세 가지를 더 검사합니다. 하나라도 어기면 PR 검사가 실패합니다.
    - **이슈에 담당자(assignee)가 있어야 합니다.** `gh issue create --assignee @me`로 만들거나 나중에 지정합니다.
    - **브랜치 설명은 소문자 `[a-z0-9-]`만 씁니다.** 한글·대문자·밑줄은 안 됩니다(`style/41-warm-tone` 통과, `style/41-Warm_tone` 실패).
    - **PR 제목은 커밋 형식을 따릅니다.** `<type>(<scope>): <요약>`, scope도 소문자 `[a-z0-9-]`, 요약 72자 이내(예: `style(tokens): 전체 톤을 따뜻하게 조정`).
- **색 값을 바꾸면 [`docs/COLOR_RATIONALE.md`](../docs/COLOR_RATIONALE.md)의 hex와 이유도 같이 고칩니다.** hex가 토큰과 다르면 `pnpm tokens:doc`(`pnpm check`에 포함)가 실패합니다. 이 문서는 사람이 쓴 글이라, 이유 문장을 바꿔야 할 때는 바꾸기 전에 사람에게 묻습니다.
- 요청 하나 = PR 하나. PR 본문에 바꾼 토큰을 `경로: 이전 → 이후`로 모두 적고, 세 화면의 바꾸기 전·후 스크린샷을 붙입니다.
- `pnpm tokens:contrast`가 실패하면 규칙이 아니라 색을 고칩니다. 통과하는 값이 없으면 멈추고 사람에게 묻습니다(3장, 6장).
- 이슈·커밋·push·PR은 사람이 요청할 때만 합니다(8장 "하지 말 것"의 마지막 줄과 같은 규칙).

## 1. 고칠 파일은 하나

- **`design-tokens/tokens.json`만 고칩니다.**
- `src/styles/tokens.css`, `src/styles/tokens.ts`는 생성물입니다. 직접 고치지 않습니다. 고쳐도 다음 `pnpm tokens`에서 덮어써지고, `pnpm tokens:check`가 실패합니다.
- 토큰마다 `$description`에 "화면에서 쓰이는 곳. 제약: …"이 적혀 있습니다. 고치기 전에 그 토큰의 `$description`과 `$extensions`를 먼저 읽습니다.

## 2. 고친 뒤 실행할 명령 (이 순서)

```bash
pnpm tokens            # tokens.json → src/styles/tokens.css, tokens.ts 생성
pnpm tokens:check      # 생성물이 tokens.json과 같은지 (실패하면 pnpm tokens를 안 돌린 것)
pnpm tokens:contrast   # 대비·구분 규칙 검사. 실패한 규칙을 FAIL 줄로 보여 줌
pnpm check             # lint + format + typecheck + 위 두 검사. 반드시 통과
```

Node 26.13.0(`fnm use 26.13.0`), pnpm만 씁니다.

## 3. 값 형식

| 종류               | `$type`(그룹에서 상속) | 쓰는 법                                                         |
| ------------------ | ---------------------- | --------------------------------------------------------------- |
| 색                 | `color`                | 6자리 hex 문자열 `"#d64a5f"`. 이름 색, rgb(), oklch() 쓰지 않음 |
| 다른 토큰 참조     | 같은 종류              | `"{color.chart.death}"` (점으로 이은 전체 경로)                 |
| 섞은 색            | `color`                | 아래 "섞은 색" 참고                                             |
| 불투명도           | `number`               | `0`–`1` 숫자 `0.35`                                             |
| 크기, 간격, 반지름 | `dimension`            | `"12px"` (px만)                                                 |
| 시간               | `duration`             | `"200ms"` (ms만)                                                |
| 가속 곡선          | `cubicBezier`          | `[0.2, 0.7, 0.2, 1]`                                            |

### 섞은 색 (`org.5dots.mix`)

```json
"zone": {
  "$value": "{color.chart.death}",
  "$extensions": { "org.5dots.mix": { "with": "{color.base.panel}", "amount": 0.08 } }
}
```

- 생성 결과: `color-mix(in oklab, var(--chart-death) 8%, var(--panel))`
- `$value`는 바탕이 되는 색, `amount`는 그 색의 비율(0–1), 나머지는 `with` 색입니다.
- `with`에 `"transparent"`를 쓰면 반투명 색이 됩니다. 반투명 색은 칠해지는 값이 바탕마다 달라 대비를 잴 수 없습니다. 그래서 대비·구분 규칙이 붙은 색(또는 그 바탕)을 반투명으로 만들면 `pnpm tokens:contrast`가 `see-through` FAIL을 냅니다. 반투명은 규칙이 없는 `color.state.*`에만 씁니다.
- 섞은 색을 고칠 때는 보통 `amount`만 바꿉니다. 바탕 색을 바꾸려면 `$value`의 참조를 바꿉니다.

### 대비·구분 규칙 (`org.5dots.contrast`, `org.5dots.distinct`)

```json
"$extensions": {
  "org.5dots.contrast": [
    { "on": "{color.base.panel}", "min": 4.5 },
    { "on": "{color.base.gray-3}", "min": 4.5 }
  ]
}
```

- 토큰에 붙은 `org.5dots.contrast`는 "이 색은 `on` 바탕 위에서 WCAG 대비 `min` 이상"이라는 규칙입니다. `pnpm tokens:contrast`가 검사합니다.
- `color.sankey`에 붙은 `org.5dots.distinct` `{ "min": 0.1, "cvdMin": 0.05 }`는 각 열(lv, wp, ar, grp) 안의 모든 색 쌍이 OKLab 거리 0.1 이상(정상 시각), 0.05 이상(적색맹·녹색맹·청색맹 시뮬레이션)이어야 한다는 규칙입니다.
- **규칙을 지우거나 `min`을 낮춰서 검사를 통과시키지 않습니다.** 색을 고쳐서 통과시킵니다. 규칙 자체를 바꿔야 한다고 판단하면 고치지 말고 이유와 함께 사람에게 묻습니다.

## 4. 이름 규칙

| JSON 경로              | CSS 변수              | 코드에서                                                                              |
| ---------------------- | --------------------- | ------------------------------------------------------------------------------------- |
| `color.base.<이름>`    | `--<이름>`            | Tailwind `bg-ink`, `text-gray-1` 등, SVG `var(--ink)`                                 |
| `color.<묶음>.<이름>`  | `--<묶음>-<이름>`     | `COLOR.<묶음>.<이름>` (`tokens.ts`)                                                   |
| `radius.<이름>`        | `--corner-<이름>`     | `rounded-panel`, `rounded-control`, `rounded-pill`, `rounded-mark`, SVG `RADIUS.mark` |
| `motion.<묶음>.<이름>` | `--<묶음>-<이름>`     | `--ease-board`, `--duration-slow`                                                     |
| 그 밖                  | `--<경로를 -로 이음>` | `OPACITY.band.dim`, `text-(length:--font-size-label)`                                 |

- **새 토큰을 추가하거나 이름을 바꾸면 컴포넌트가 그 이름을 써야 하므로 디자인 변경만으로 끝나지 않습니다.** 값만 바꾸는 일이면 이름은 건드리지 않습니다.
- `color.sankey.<열>.<번호>`의 번호는 그 열 값 순서입니다(아래 표). 번호를 늘리거나 줄이지 않습니다.

## 4-1. 모서리 규칙 (요소 종류 → 토큰)

| 요소 종류         | 토큰                 | 클래스 / SVG                                   | 예                                                                                                                                            |
| ----------------- | -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 패널              | `radius.panel` 10px  | `rounded-panel`                                | 패널, 사이드바, KPI 상자, 필터 바, 로딩 패널                                                                                                  |
| 컨트롤(입력·조작) | `radius.control` 6px | `rounded-control`                              | 선택 상자와 그 목록·항목, 검색 입력, 세그먼트(기간, 고활동 계정, 2초·5초) 바깥과 안 단추, 단추, ⓘ 단추, 목록 행, 패널 안 보조 상자(흐름 요약) |
| 툴팁              | `radius.control` 6px | `rounded-control`                              | 차트 툴팁, ⓘ 설명 (떠 있는 상자는 선택 목록과 같은 값)                                                                                        |
| 칩·배지           | `radius.pill` 4px    | `rounded-pill`                                 | 점검 신호, 표본 부족, 수치 미변경, 비교군 확인 필요, 현재 수치 기준, 흐름 조건 칩                                                             |
| 막대              | `radius.mark` 2px    | `rounded-mark`, SVG `rx={RADIUS.mark}`         | 비율 막대와 트랙, 기술 막대와 트랙, 0 표시, 범위 막대, 흐름도 칸, 산점도 네모(중간보스), 막대 범례 견본. 트랙과 채움은 항상 같은 값           |
| 점                | 원                   | `rounded-full`, SVG `<circle>`                 | 산점도 원, 오각형 꼭짓점, 추이 점, 범례 동그라미, 준비 조건 점                                                                                |
| 선                | 둥근 끝              | `strokeLinecap="round"`, 연결선 `rounded-full` | 데이터 선(추이 선, 오각형 바깥선, 실선 범례 견본), 준비 조건 연결선. 점선 기준선(1배, 평균, 중앙값 고리)은 끝을 둥글게 하지 않음              |
| 초점 고리         | 감싸는 요소의 값     | 요소와 같은 클래스, 흐름도 칸은 `RADIUS.mark`  | 단추·입력은 control, 흐름도 칸은 mark                                                                                                         |

- 새 요소는 이 표에서 종류를 골라 그 토큰을 씁니다. `rounded-lg`, `rounded-md`, `rounded`, `rounded-[…]`, `rounded-none`처럼 토큰이 아닌 클래스는 쓰지 않습니다(`src/components/ui/*` 포함). 원은 `rounded-full`만 씁니다.
- 확인: `grep -rnoE "rounded(-[a-z0-9]+|-\[[^]]+\])?" src/components src/app | grep -vE "rounded-(panel|control|pill|mark|full)$"` 가 아무것도 내지 않아야 합니다(주석의 낱말 제외).

## 4-2. 보드 정리(2026-11)에서 추가·바꾼 토큰 (화면 위치)

값은 `tokens.json`이 기준입니다. 아래는 어디에 쓰이는지와 바꿀 때 볼 곳입니다.

| 토큰                                                                             | 화면 위치                                                      | 바꿀 때                                                                                                                                                                                            |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `font-size.title`                                                                | 모든 패널 제목(공통 머리 줄 `shell/panel-header.tsx`)          | `size.panel-header` 안에 들어가야 함                                                                                                                                                               |
| `font-size.kpi` / `font-size.kpi-unit`                                           | 상세 오른쪽 위 KPI 숫자 / 뒤 단위(건, 배)                      | `size.kpi-box` 한 칸(1/3)에 "4,429건"이 들어가야 함                                                                                                                                                |
| `size.kpi-box.w` / `.h`                                                          | 상세 제목 줄 오른쪽 KPI 상자                                   | `h`가 상세 제목 줄 높이. 라벨·숫자는 cap·기준선으로 잘라 가운데 정렬                                                                                                                               |
| `size.panel-header`                                                              | 모든 패널 머리 줄(제목 · 보조 수치 · ⓘ · 범례 · 칩 · 컨트롤)   | 컨트롤 30px이 들어가야 함. 패널 내용 시작 위치가 함께 바뀜                                                                                                                                         |
| `size.detail-row`                                                                | 상세 첫 줄(전투 양상 + 준비 조건별 비중) 높이                  | 두 패널 내용 + `space.panel-bottom`이 들어가야 함                                                                                                                                                  |
| `size.patch-panel`                                                               | 패치 전후 위험 패널 최소 높이                                  | 창이 남으면 이 패널이 늘어남(추이 높이는 패널에서 계산)                                                                                                                                            |
| `size.ratio-axis.w` / `.h-min` / `.h-max`                                        | 패치 전후 위험 오른쪽 "같은 조건 위험 배수" 범위 축            | 패널이 높아지면 `h-min`에서 `h-max`까지 커짐                                                                                                                                                       |
| `size.bar.skill` / `size.bar.share` / `size.bar.interval` / `size.bar.zero-stub` | 보스 기술 막대 / 준비 패널 비율 막대 / 범위 막대 / 값 0 표시   | 막대 끝은 `radius.mark`                                                                                                                                                                            |
| `size.dumbbell.line`                                                             | 준비 조건 처치자→사망자 연결선                                 | `size.dumbbell.dot`보다 훨씬 가늘게                                                                                                                                                                |
| `size.icon.info` / `size.icon.search`                                            | 패널 제목 옆 ⓘ 아이콘 / 필터 바 검색 돋보기                    | 색은 `gray-1`                                                                                                                                                                                      |
| `space.page-bottom`                                                              | 보드 아래 끝 ↔ 창 아래 끝(짧은 화면은 보드가 여기까지 늘어남)  | 레이아웃 변경                                                                                                                                                                                      |
| `space.panel-bottom`                                                             | 상세 첫 줄 두 패널의 아래 여백                                 | 제목 위 여백과 같게                                                                                                                                                                                |
| `space.dumbbell-gap`                                                             | 준비 조건 행의 칸 사이(100% 눈금 ↔ 오른쪽 수치)                | 12–16px                                                                                                                                                                                            |
| `space.patch-body-top` / `-bottom`                                               | 패치 전후 위험 머리 줄 ↔ 추이, 추이 ↔ 패널 아래                | 추이 높이가 함께 바뀜                                                                                                                                                                              |
| `space.search-inset` / `space.search-icon-gap`                                   | 검색 입력 안쪽 여백 / 돋보기 ↔ 글자                            | 입력 너비 244px 안                                                                                                                                                                                 |
| `color.chart.track-bar`                                                          | 비율·기술 막대의 빈 부분(트랙)                                 | 값 막대보다 눈에 띄지 않게                                                                                                                                                                         |
| `color.chart.guide`                                                              | 준비 조건 공유 눈금(0–100%) 세로 격자선                        | 패널 대비 1.15:1 이상(검사 있음)                                                                                                                                                                   |
| `size.select.group` / `.stage` / `.patch`                                        | 필터 바 "역할·등급" / "던전 단계" 선택 상자, 패치 선택 상자 폭 | 고정 폭(값을 바꿔도 필터 바가 출렁이지 않게). 가장 긴 옵션("일반·medium", "일반·strong")이 안 잘리게, 1440에서 필터 바 한 줄(검색칸 244px과 안 겹치게). 목록은 상자보다 넓어질 수 있어 잘리지 않음 |
| `size.chip` / `size.icon.chip-close`                                             | 전체 교전 흐름 아래 흐름 칩 높이 / X 아이콘                    | 칩 너비는 글자 길이에 맞춤. 칩 전체가 조건 풀기 단추                                                                                                                                               |
| `space.chip-inset` / `-part-gap` / `-close-gap` / `space.chip-gap`               | 칩 안 좌우 여백 / 열 이름 ↔ 값 / 값 ↔ X / 칩끼리               | 조건은 모두 AND라 칩 사이에 화살표를 두지 않음                                                                                                                                                     |
| `color.state.chip-close`                                                         | 흐름 칩 X 아이콘 기본색(hover 때 ink)                          | 칩 안 열 이름(gray-1)보다 진하게, gray-3 대비 3:1(검사 있음)                                                                                                                                       |
| `color.chart.dumbbell-line`                                                      | 준비 조건 덤벨의 가운데 연결선(처치 교전 점 ↔ 사망자 점)       | 지금 `{color.chart.accent}` 참조. 다른 색은 hex로 직접 넣음. 점 두 색(`survival`, `death`)과 같은 색 금지, 패널 대비 3:1(검사 있음)                                                                |
| `font-weight.risk-value`                                                         | 위험 높은 순 목록 오른쪽 배수 숫자                             | 이름(500, 선택 행 600)보다 굵게. 72px 칸 안에서 "12.34배"가 줄바꿈 없이                                                                                                                            |
| `stroke.width.bold`, `stroke.point.*`                                            | 데이터 선 굵기, 산점도·오각형·추이 점                          | `bold`가 가장 굵게, 점 크기 순서 유지                                                                                                                                                              |
| `radius.*`                                                                       | 4-1 모서리 규칙                                                | 요소 종류로 고름                                                                                                                                                                                   |

## 5. 그룹별 영향 범위

| 그룹               | 바꾸면 달라지는 곳                                                                  | 위험                                                     |
| ------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| (색 묶음 전체)     | `docs/COLOR_RATIONALE.md`의 hex와 색을 쓴 이유                                      | hex가 토큰과 다르면 `pnpm tokens:doc` 실패               |
| `color.base`       | 모든 화면의 글자, 바탕, 테두리. `panel`, `gray-3`은 모든 대비 검사의 바탕           | 바탕을 바꾸면 모든 글자 대비가 같이 바뀜                 |
| `color.chart`      | 모든 차트의 의미색. `sankey`, `scatter`, `text-scale`, `status-soft`가 이 색을 참조 | 한 색이 여러 묶음으로 퍼짐 (참조를 따라가 확인)          |
| `color.status`     | 배지 글자와 바탕                                                                    | 글자와 `-soft` 바탕 대비                                 |
| `color.sankey`     | 메인 화면 "전체 교전 흐름" 칸과 띠                                                  | 같은 열 안 색 구분                                       |
| `color.scatter`    | 메인 화면 "사망 수 × 기대 대비 위험" 점, 범례, 구역 바탕                            | 2배 이상(high)은 위험 의미                               |
| `color.text-scale` | 왼쪽 위험 목록의 2배 이상 숫자, 보조 줄                                             | 작은 글자(11–13px) 대비 4.5:1                            |
| `color.state`      | 목록 행·칩 hover 바탕, 칩 X 아이콘                                                  | 거의 없음                                                |
| `opacity`          | 흐름도 띠, 흐린 점·칸, 기준선, 오각형 면                                            | `band` 네 단계 순서(dim < default < hover < picked)      |
| `font-size`        | 해당 크기의 모든 글자                                                               | **레이아웃이 밀리거나 글자가 잘림.** 고정 높이 칸이 많음 |
| `font-weight`      | 토큰이 붙은 글자만 (지금은 목록 배수 숫자)                                          | 굵게 하면 글자 폭이 늘어 고정 폭 칸에서 잘릴 수 있음     |
| `stroke`           | 차트 선 두께, 점 반지름                                                             | 굵기 위계(bold가 가장 굵게)                              |
| `size`             | 막대 높이, 준비 조건 점, 흐름도 칸 폭                                               | 일부는 레이아웃 계산에 쓰임                              |
| `radius`           | 모서리                                                                              | 거의 없음                                                |
| `space`            | 패널 간격, 패널 안 여백                                                             | **레이아웃 변경.** 요청이 명시하지 않으면 바꾸지 않음    |
| `motion`           | 모든 움직임                                                                         | 거의 없음 (줄인 움직임 설정이면 꺼짐)                    |

흐름도 열 값 순서 (`color.sankey.<열>.<번호>`):

| 열    | 1         | 2           | 3           | 4         | 5         |
| ----- | --------- | ----------- | ----------- | --------- | --------- |
| `lv`  | 1~19      | 20~39       | 40~69       | 70+       |           |
| `wp`  | 없음·나무 | 돌          | 철          | 금·다이아 |           |
| `ar`  | 없음      | 일부        | 6부위       |           |           |
| `grp` | 일반·약함 | 일반·medium | 일반·strong | 중간보스  | 던전 보스 |

## 6. 지켜야 할 제약

1. **글자: 바탕과 4.5:1 이상.** 바탕은 패널 흰색(`color.base.panel`)과 페이지·hover 행 회색(`color.base.gray-3`) 두 가지입니다. 머리글 로고(`brand`)만 큰 글자라 3:1.
2. **그래픽(점, 선, 막대, 칸): 패널 바탕과 3:1 이상.** 예외는 `chart.neutral`(2.2:1 하한)뿐이고, 이 색은 항상 범례 글자와 함께 씁니다.
3. **흐름도 같은 열 안의 색끼리 구분.** `org.5dots.distinct` 규칙. 한 색을 바꾸면 같은 열의 다른 색과 가까워지지 않았는지 `pnpm tokens:contrast` 출력의 `closest` 줄을 봅니다.
4. **사망 색(`color.chart.death`)은 사망·위험 의미에만.** 흐름도 칸 색이나 일반 범주에 쓰지 않습니다. 위험 표시는 `scatter.high`, `scatter.zone`, `text-scale.flag`가 이 색을 참조합니다.
5. **상태색은 항상 글자와 함께.** 색만으로 뜻을 전하는 표시를 만들지 않습니다.
6. 비교 파랑(`chart.comparison`)과 가설 지지(`status.supported`), 고른 몬스터(`chart.actual`)는 서로 구분되어야 합니다.
7. `opacity.band`는 `dim < default < hover < picked` 순서를 지킵니다.

검사 방법:

- `pnpm tokens:contrast`: 위 1–3을 계산합니다. 섞은 색도 브라우저처럼 OKLab으로 섞고 8비트로 반올림해 계산합니다. `/dev/tokens` 화면의 숫자와 같습니다.
- 4–7은 자동 검사가 없습니다. 이 문서와 각 토큰의 `$description`을 보고 지킵니다.

## 7. 시각 확인

```bash
pnpm dev
```

- `http://localhost:3000/dev/tokens`: 모든 토큰 견본, 실제로 칠해진 색과 대비, 작은 차트 예시 (개발 서버에서만 열림)
- 세 화면: `/`(메인), `/?m=elderroot_stage_1`(보스 상세), `/?m=small_zombie`(일반 상세)
- 브라우저 도구가 있으면 1440px, 1920px 폭에서 스크린샷을 찍어 바꾸기 전과 비교합니다. 의도한 곳만 달라졌는지 봅니다.

## 8. 하지 말 것

- 컴포넌트(`src/components/**`, `src/app/**`)에 색 리터럴(`#hex`, `rgb()`, `color-mix(...)`), 불투명도·두께 숫자를 새로 넣지 않습니다. 필요한 값이 토큰에 없으면 사람에게 묻습니다.
- `src/styles/tokens.css`, `src/styles/tokens.ts`를 직접 고치지 않습니다.
- `src/server/**`(데이터 계산)를 고치지 않습니다.
- 레이아웃(패널 크기, 위치, 차트 너비·높이·여백, `space` 토큰)을 바꾸지 않습니다. 요청이 레이아웃 변경을 명시할 때만 하고, 그때도 세 화면을 1440·1920에서 확인합니다.
- 대비 규칙(`org.5dots.contrast`, `org.5dots.distinct`)을 지우거나 낮추지 않습니다.
- 커밋, push, PR은 사람이 요청할 때만 합니다. 요청받았을 때의 절차는 0장.

## 9. 자주 하는 요청

### "전체 톤을 따뜻하게"

- 바꿀 토큰: `color.base.gray-1`, `gray-2`, `gray-3`, `ink`(살짝), 필요하면 `color.chart.track`(막대 트랙 `track-bar`가 이 색을 섞어 쓰므로 함께 바뀜), `color.chart.guide`, `color.base.skeleton-shine`
- 방법: 회색들의 파란 기운을 줄이고 노란·붉은 기운을 조금 더합니다. **OKLab 밝기 L은 그대로 둡니다.**
- 예시 값 (네 개를 함께 넣었을 때 `pnpm tokens:contrast` 전체 통과를 확인한 조합):
  - `gray-3`: `#e9eef5` → `#f0eee9` (L 0.947 → 0.949)
  - `ink`: `#0b1220` → `#14110d` (L 0.183 → 0.180)
  - `gray-1`: `#4f5b6e` → `#5e5952` (L 0.468 → 0.467, 패널 6.94:1, gray-3 5.98:1)
  - `gray-2`: `#bfc8d6` → `#cdc7bd` (L 0.830 → 0.832)
- **`#efece6`은 밝기가 조금 낮아집니다**(L 0.947 → 0.944). 따뜻한 방향은 맞지만 "밝기 그대로"는 아니어서 gray-3 위 빠듯한 규칙(`text-scale.flag`, `brand`)의 여유가 먼저 줄어듭니다. 밝기를 지키려면 `#f0eee9`를 씁니다.
- **`color.chart.neutral`은 고치지 않아도 함께 따뜻해집니다.** gray-2를 gray-1 쪽으로 30% 섞어 만든 색이라, 위 예시면 `#9ca6b6` → `#aaa49b`가 됩니다(패널 2.47:1, 기준 2.2:1). 산점도 1배 미만 점과 흐름도 순서 밖 칸이 이 색입니다.
- 확인: `gray-3`이 바탕이라 `ink`, `gray-1`, `text-scale.*`의 gray-3 대비가 같이 바뀝니다. `pnpm tokens:contrast`.
- 그 밖의 차트 의미색(`color.chart.*`)은 톤 요청이라도 바꾸지 않는 것이 기본입니다. 바꾸면 흐름도 구분 검사가 깨지기 쉽습니다.

### "위험 빨강을 더 진하게"

- 바꿀 토큰: `color.chart.death` 하나. `scatter.high`, `scatter.zone`, `text-scale.flag`, 사망 막대가 따라 바뀝니다.
- 상태 배지 빨강을 뜻하면 `color.status.danger`입니다. 둘이 다르니 요청이 어느 쪽인지 확인합니다(차트·목록 숫자 = `chart.death`, "점검 신호" 배지 = `status.danger`).
- "조금" 진하게의 기준: 색상(a, b)은 두고 **OKLab 밝기 L만 0.03–0.06 낮춥니다.** 지금 `#d64a5f`는 L 0.607입니다.
  - L −0.03: `#cb4056` (흰 바탕 4.77:1)
  - L −0.045: `#c63b52` (5.06:1)
  - L −0.06: `#c1354e` (5.40:1)
  - "많이"라고 하지 않으면 −0.06을 넘기지 않습니다. 더 낮추면 배지 빨강(`status.danger`, L 0.547)보다 어두워져 차트 빨강이 배지보다 무거워집니다.
- **L −0.06 근처에서는 `status.danger`(`#c2334f`)와 거의 같아집니다**(OKLab 거리 0.004, 지금은 0.060). 둘 다 "위험" 뜻이고 배지는 항상 글자와 함께 나오므로 같아져도 의미 충돌은 없습니다. 다만 디자이너가 차트 빨강과 배지 빨강을 일부러 구분해 두었을 수 있으니, −0.05보다 더 내릴 때는 "배지 빨강과 같아져도 되는지"를 사람에게 한 번 묻습니다.
- `text-scale.flag`는 `death`를 ink 쪽으로 15% 섞은 색이라 함께 진해집니다. 빨강으로 읽히려면 **ink(`#0b1220`)와 OKLab 거리 0.25 이상**을 지킵니다(지금 0.393, death L −0.06일 때 0.348). 0.25 아래로 가면 `text-scale.flag`의 `amount`를 올려(ink를 덜 섞어) 되돌립니다. 이때도 4.5:1은 `pnpm tokens:contrast`가 확인합니다.
- `chart.death`를 진하게 하면 대비는 올라가므로 대비 검사는 실패하지 않습니다. 흐름도에는 쓰이지 않아 구분 검사와도 무관합니다.

### "바탕만 따뜻하게"

- 바꿀 토큰: `color.base.gray-3`(페이지 바탕, 세그먼트, 칩, 열린 목록 행) 하나가 기본입니다. **`color.base.panel`(패널 흰색)은 그대로 둡니다.** 흰 패널과 따뜻한 바탕의 대비가 화면 구조를 만듭니다.
- 방법: 밝기는 거의 그대로 두고 파란 기운을 빼고 노란 기운을 조금 넣습니다. 지금 `#e9eef5`.
  - 통과: `#efece6`, `#f2efe9`
  - 실패: `#ece8e1`, `#e8e3da` (조금만 어두워도 실패)
- **gray-3 위에서 가장 빠듯한 규칙 두 개**를 먼저 봅니다.
  - `color.text-scale.flag` 4.5:1 (지금 4.65, `#efece6`이면 4.59, `#ece8e1`이면 4.43으로 실패)
  - `color.base.brand` 3:1 (지금 3.25, `#efece6`이면 3.22)
  - 바탕을 어둡게 할수록 이 둘이 먼저 깨집니다. 따뜻하게 하면서 밝기를 지금보다 낮추지 않습니다.
- 함께 바꿀지 정할 것 (요청에 없으면 사람에게 묻습니다):
  - `color.base.skeleton-shine`(`#f8fafc`, 로딩 중 반짝임): gray-3만 따뜻해지면 로딩 상자만 푸르게 보입니다. 같은 방향으로 옮기는 것을 권합니다.
  - `color.chart.track`(`#e7ecf3`, 격자·기준선, 막대 빈 부분 `track-bar`의 바탕색)과 `color.chart.guide`(`#e4e9f0`, 준비 조건 눈금선): 패널 위에 그려지므로 바탕과 직접 겹치지는 않지만, 나란히 보면 푸른 회색으로 튑니다. 바꾸면 차트 인상이 함께 따뜻해집니다.
- 어울림 확인: `gray-1`(`#4f5b6e`)과 `ink`는 푸른 기운이 있는 회색입니다. 바탕만 따뜻해지면 글자가 차갑게 떠 보일 수 있습니다. `/dev/tokens`와 세 화면에서 보고, 어색하면 `gray-1`을 같은 방향으로 조금 옮기는 안을 사람에게 제안합니다(이건 "바탕만" 범위를 넘음).

### "흐름도 레벨 색 바꾸기" (예: "1~19 칸을 초록으로")

- 바꿀 토큰: `color.sankey.lv.1`–`lv.4`. 지금은 `lv.1` 호박(`chart.accent`), `lv.2` 청록(`chart.survival`), `lv.3` 파랑(`chart.comparison`), `lv.4` 갈색(`chart.earth`) 참조입니다.
- **hex로 직접 넣습니다.** `"{color.chart.survival}"`처럼 같은 열의 다른 칸이 이미 쓰는 토큰을 참조하면 두 칸이 같은 색이 됩니다. 어떤 hex든 칸마다 패널 대비 3:1 규칙이 붙어 있어 검사됩니다.
- **바꾼 칸만 바뀝니다.** `lv.1`을 hex로 바꿔도 다른 열의 호박색(`wp.4` 금·다이아, `ar.1` 없음, `grp.3` 일반·strong)은 `chart.accent`를 그대로 따릅니다. 반대로 `chart.accent` 자체를 바꾸면 이 네 칸이 모두 바뀝니다.
- **초록은 대부분 걸립니다.** `lv.2`가 청록이라 순한 초록은 청록과 가깝고(특히 청색맹 시뮬레이션 `tritan`), `lv.4`가 갈색이라 녹색맹 시뮬레이션(`deutan`)에서 갈색과 겹칩니다. 시험 결과:
  - 통과: `#6f9a10`(황록, 대비 3.33:1), `#7a9400`, `#869a00`
  - 실패: `#3f9a3a`·`#2e9a52`(청록과 tritan 0.029·0.024), `#5a9e2a`(tritan 0.044), `#4c8f1c`(갈색과 deutan 0.038)
  - 시작 후보는 `#6f9a10`입니다. 노란 쪽으로 기운 초록이 통과하기 쉽습니다.
- 후보 시험 방법: `lv.1`에 후보 hex를 넣고 `pnpm tokens:contrast`를 돌린 뒤 아래 다섯 줄을 봅니다.
  - `color.sankey.lv.1 … on color.base.panel` (3:1 이상)
  - `color.sankey.lv normal|protan|deutan|tritan: closest <쌍> ΔE …`. `closest`가 어느 두 칸이 가장 가까운지 알려 줍니다(`1·2`면 lv.1과 lv.2). 실패한 줄의 쌍을 보고 그 칸 색에서 멀어지는 쪽으로 hex를 옮겨 다시 돌립니다.
- `color.chart.death` 계열 빨강은 쓰지 않습니다(위험 의미).
- **통과하는 색을 찾지 못하면** 기준을 낮추지 말고 멈춥니다. 시험한 후보와 실패한 줄을 사람에게 보여 주고, 대안으로 `lv.2`(청록)나 `lv.4`(갈색)를 다른 색으로 바꾸는 안을 제안합니다. 다른 칸을 바꾸는 것은 요청 범위를 넘으므로 사람이 정합니다.

### "KPI 숫자 조금 작게"

- 바꿀 토큰: `font-size.kpi`(상세 KPI 숫자, 지금 32px)와 `font-size.kpi-unit`(뒤 단위 건·배, 지금 16px).
- **"조금" = 한 단계 = 2~4px.** 32px이면 28~30px. "많이"라고 하지 않으면 한 번에 4px을 넘기지 않습니다.
- **`kpi-unit`은 숫자의 약 절반으로 맞춥니다.** `kpi` 28px이면 `kpi-unit` 14px. 숫자만 줄이고 단위를 두면 단위가 숫자만큼 커 보입니다.
- `font-size.display`(24px, 상세 화면 몬스터 이름)보다 작아지면 KPI가 이름보다 약해 보입니다. 24px 아래로 내려야 하면 사람에게 묻습니다.
- 확인: KPI 상자(`size.kpi-box`) 한 칸에 "4,429건"이 한 줄로 들어가는지 `/?m=small_zombie`에서 봅니다. 레이아웃 토큰(`size.kpi-box` 등)은 같이 바꾸지 않습니다.

### "눈금선 진하게"

- **어느 선인지 먼저 확인합니다.** 두 토큰이 영향 범위가 다릅니다.
  - **세로 눈금 = `color.chart.guide`**(지금 `#e4e9f0`): 준비 조건별 비중의 공유 눈금(0·25·50·75·100%) 세로선에만 쓰입니다. 바꿔도 다른 차트는 그대로입니다.
  - **행 기준선·격자 = `color.chart.track`**(지금 `#e7ecf3`): 모든 차트가 함께 씁니다. 준비 조건 행 기준선, 오각형 격자, 패치 위험 기준선, 산점도 격자, 그리고 막대 빈 부분(`track-bar`가 track을 섞어 만든 색)이 함께 진해집니다.
- 요청이 "준비 조건 눈금"이면 `guide`만, "차트 격자 전체"면 `track`입니다. 애매하면 사람에게 묻습니다.
- 방법: 색상은 두고 밝기만 낮춥니다. 예: `guide` `#e4e9f0`(패널 1.22:1) → `#d8dee7`(1.35:1). `track`도 같은 방향으로 `#dbe1ea`(1.31:1) 정도까지.
- 상한: `color.base.gray-2`(`#bfc8d6`, 컨트롤 테두리)보다 진하게 하지 않습니다. 눈금선이 점·연결선·값 막대보다 눈에 띄면 안 됩니다.
