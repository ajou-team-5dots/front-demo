# design-tokens/AGENTS.md

디자인 변경(색, 불투명도, 글자 크기, 선 두께, 점·막대 크기, 모서리, 간격, 모션)을 맡은 AI 에이전트(Claude, Codex)용 작업 지침입니다. 사람용 설명과 토큰 → 화면 위치 표는 `docs/DESIGN_TOKENS.md`에 있습니다.

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

Node 24.22.2(`fnm use 24.22.2`), pnpm만 씁니다.

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
- `with`에 `"transparent"`를 쓰면 반투명 색이 됩니다. 반투명 색은 대비 검사 대상이 아닙니다.
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

| JSON 경로              | CSS 변수              | 코드에서                                                              |
| ---------------------- | --------------------- | --------------------------------------------------------------------- |
| `color.base.<이름>`    | `--<이름>`            | Tailwind `bg-ink`, `text-gray-1` 등, SVG `var(--ink)`                 |
| `color.<묶음>.<이름>`  | `--<묶음>-<이름>`     | `COLOR.<묶음>.<이름>` (`tokens.ts`)                                   |
| `radius.<이름>`        | `--corner-<이름>`     | `rounded-panel`, `rounded-control`, `rounded-pill`, SVG `RADIUS.mark` |
| `motion.<묶음>.<이름>` | `--<묶음>-<이름>`     | `--ease-board`, `--duration-slow`                                     |
| 그 밖                  | `--<경로를 -로 이음>` | `OPACITY.band.dim`, `text-(length:--font-size-label)`                 |

- **새 토큰을 추가하거나 이름을 바꾸면 컴포넌트가 그 이름을 써야 하므로 디자인 변경만으로 끝나지 않습니다.** 값만 바꾸는 일이면 이름은 건드리지 않습니다.
- `color.sankey.<열>.<번호>`의 번호는 그 열 값 순서입니다(아래 표). 번호를 늘리거나 줄이지 않습니다.

## 5. 그룹별 영향 범위

| 그룹               | 바꾸면 달라지는 곳                                                                  | 위험                                                     |
| ------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `color.base`       | 모든 화면의 글자, 바탕, 테두리. `panel`, `gray-3`은 모든 대비 검사의 바탕           | 바탕을 바꾸면 모든 글자 대비가 같이 바뀜                 |
| `color.chart`      | 모든 차트의 의미색. `sankey`, `scatter`, `text-scale`, `status-soft`가 이 색을 참조 | 한 색이 여러 묶음으로 퍼짐 (참조를 따라가 확인)          |
| `color.status`     | 배지 글자와 바탕                                                                    | 글자와 `-soft` 바탕 대비                                 |
| `color.sankey`     | 메인 화면 "전체 교전 흐름" 칸과 띠                                                  | 같은 열 안 색 구분                                       |
| `color.scatter`    | 메인 화면 "사망 수 × 기대 대비 위험" 점, 범례, 구역 바탕                            | 2배 이상(high)은 위험 의미                               |
| `color.text-scale` | 왼쪽 위험 목록의 2배 이상 숫자, 보조 줄                                             | 작은 글자(11–13px) 대비 4.5:1                            |
| `color.state`      | 목록 행·칩 hover 바탕                                                               | 거의 없음                                                |
| `opacity`          | 흐름도 띠, 흐린 점·칸, 기준선, 오각형 면                                            | `band` 네 단계 순서(dim < default < hover < picked)      |
| `font-size`        | 해당 크기의 모든 글자                                                               | **레이아웃이 밀리거나 글자가 잘림.** 고정 높이 칸이 많음 |
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
- 커밋, push, PR은 사람이 요청할 때만 합니다.

## 9. 자주 하는 요청

### "전체 톤을 따뜻하게"

- 바꿀 토큰: `color.base.gray-1`, `gray-2`, `gray-3`, `ink`(살짝), 필요하면 `color.chart.track`, `color.base.skeleton-shine`
- 방법: 회색들의 파란 기운을 줄이고 노란·붉은 기운을 조금 더합니다(예: `#e9eef5` → `#efece6` 방향). 밝기는 그대로 둡니다.
- 확인: `gray-3`이 바탕이라 `ink`, `gray-1`, `text-scale.*`의 gray-3 대비가 같이 바뀝니다. `pnpm tokens:contrast`.
- 차트 의미색(`color.chart.*`)은 톤 요청이라도 바꾸지 않는 것이 기본입니다. 바꾸면 흐름도 구분 검사가 깨지기 쉽습니다.

### "위험 빨강을 더 진하게"

- 바꿀 토큰: `color.chart.death` 하나. `scatter.high`, `scatter.zone`, `text-scale.flag`, 사망 막대가 따라 바뀝니다.
- 상태 배지 빨강을 뜻하면 `color.status.danger`입니다. 둘이 다르니 요청이 어느 쪽인지 확인합니다(차트·목록 숫자 = `chart.death`, "점검 신호" 배지 = `status.danger`).
- 확인: `text-scale.flag`는 `death`를 ink 쪽으로 섞은 색이라 death가 진해지면 더 진해집니다. 너무 진해져 ink와 구분이 안 되면 `text-scale.flag`의 `amount`를 올립니다(ink를 덜 섞음). 4.5:1은 유지.

### "흐름도 레벨 색 바꾸기"

- 바꿀 토큰: `color.sankey.lv.1`–`lv.4`. 지금은 `color.chart.*` 참조입니다.
- 방법: 다른 차트 색 참조(`"{color.chart.survival}"` 등)로 바꾸거나 hex를 직접 넣습니다. 어느 쪽이든 칸 색마다 패널 대비 3:1 규칙이 붙어 있어 `pnpm tokens:contrast`가 검사합니다.
- `color.chart.death`는 쓰지 않습니다(위험 의미).
- 확인: `pnpm tokens:contrast`에서 `color.sankey.lv.1`–`lv.4`의 대비 줄과 `color.sankey.lv`의 구분 네 줄(normal, protan, deutan, tritan)이 모두 ok인지.
