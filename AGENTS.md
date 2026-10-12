# AGENTS.md

AI 코딩 에이전트(Codex 등)를 위한 작업 규칙. 사람용 상세 규칙은 `docs/CONVENTION.md`, `docs/GIT_WORKFLOW.md`에 있고, 이 파일은 그 요약이다. 둘이 다르면 docs가 기준이다.

## 프로젝트

- 팀 5dots의 정보디자인 프로젝트 프론트 데모
- 주제: 플레이어의 콘텐츠 실행 직후 행동 분석 (첫 사례: Akkadia 블루프린트)
- 사용자: 게임 회사의 여러 역할 (기획, 레벨 디자인, 엔지니어, 라이브 운영). 관리자 한 명용 화면으로 만들지 않는다

## 스택

- Next.js 16 (App Router, `src/`), React 19, TypeScript strict
- Tailwind CSS v4, shadcn/ui (`components.json`, style `base-nova`), lucide 아이콘
- 패키지 매니저: **pnpm만 사용** (npm, yarn 금지)

## 명령어

```bash
pnpm dev            # 개발 서버
pnpm check          # lint + format:check + typecheck. 작업 끝나면 반드시 실행
pnpm build          # 프로덕션 빌드
pnpm lint:fix       # ESLint 자동 수정
pnpm format         # Prettier 적용
pnpm dlx shadcn@latest add <component>   # shadcn 컴포넌트 추가
```

## 코드 규칙 (Airbnb 기반)

1. ESLint(`eslint-config-airbnb-extended`)와 Prettier 설정을 따른다. 규칙을 끄는 `eslint-disable` 주석은 이유 없이 쓰지 않는다
2. 작은따옴표, 세미콜론, trailing comma, 2칸 들여쓰기, 100자
3. `const` 우선, `var` 금지, `===` 사용, 콜백은 화살표 함수
4. named export 사용. default export는 `page.tsx`, `layout.tsx` 등 Next.js 특수 파일만
5. 파일명 kebab-case, 컴포넌트 PascalCase, 훅 `useXxx`, 상수 UPPER_SNAKE_CASE
6. 기본은 Server Component. 필요할 때만 `'use client'`
7. UI 부품은 먼저 shadcn/ui에서 가져온다. `src/components/ui/`는 직접 수정하지 말고 감싸서 확장
8. 클래스 조합은 `cn()`, 색은 CSS 변수 토큰만 (`bg-[#hex]` 금지)

## 데이터 가져오기 (상세: `docs/CONVENTION.md` 7장)

1. **읽기는 Server Component에서 `src/server/data/` 함수를 직접 호출.** 우리 화면용 `app/api` route를 만들지 않는다
2. **쓰기는 Server Action** (`src/server/actions/`, `'use server'`)
3. **Route Handler(`app/api/**/route.ts`)는 외부 호출, 웹훅, 클라이언트 폴링, 파일 다운로드일 때만**
4. DB/파일/외부 API 접근과 `process.env`는 `src/server/` 안에서만. data 파일은 `import 'server-only';`로 시작
5. data 함수는 화면에 필요한 필드만 반환 (지갑 주소, 채팅 원문 금지)

## 폴더

```
src/app/              라우트 파일만
src/components/ui/    shadcn 생성 코드
src/components/<기능>/ 기능 컴포넌트
src/server/data/      데이터 읽기 ('server-only')
src/server/actions/   데이터 쓰기 ('use server')
src/hooks/  src/lib/  src/types/
```

## 데이터 규칙 (반드시 지킬 것)

- 운영자 계정(`/su` 사용 계정)은 기본 제외
- 채팅 원문, 지갑 주소(playerId, targetAddress)를 화면, 코드, 커밋, 로그에 노출하지 않는다
- 이탈률/리텐션 지표를 만들지 않는다

## Git

- 커밋: Conventional Commits, `<type>(<scope>): <제목>`. type은 feat fix docs style refactor perf test build ci chore revert
- 브랜치: `dev`(기본, 통합)에서 `<type>/<이슈번호>-<설명>`을 만들고 PR은 `dev`로. `main`은 배포 브랜치이고 `dev` → `main` 릴리스 PR 또는 `hotfix/*`만 받는다
- `main`, `dev` 직접 push 금지
- 사람이 요청하지 않으면 커밋/푸시/이슈/PR 생성을 하지 않는다

## 이슈와 PR (상세: `docs/ISSUE_PR_GUIDE.md`)

1. **작업 시작 전에 이슈 담당자 지정**: `gh issue edit <번호> --add-assignee @me` (새 이슈는 `--assignee @me`로 생성)
2. 이슈 본문은 `.github/agent-templates/issue-{feature,bug,task}.md`, PR 본문은 `.github/PULL_REQUEST_TEMPLATE.md`를 복사해 채운다
3. 템플릿의 제목 구조는 유지, 안내 주석은 지우고, 모르는 것은 지어내지 말고 "확인 필요"
4. **PR은 `dev`로, 리뷰어를 지정해서 연다**: `gh pr create --base dev --reviewer <id> --body-file <파일>`. 본문에 `Closes #번호` 필수
5. 체크리스트는 실제로 실행해 통과한 것만 체크
6. 위 규칙은 CI `pr-rules`가 검사한다 (제목 형식, 브랜치 방향, 이슈 연결, 이슈 담당자, 리뷰어)
7. 릴리스(`dev` → `main`)는 사용자가 요청할 때만, `.github/agent-templates/release.md`로

## 작업 완료 기준

1. `pnpm check` 통과
2. UI 변경이면 `pnpm build` 통과
3. 새 의존성을 추가했다면 이유를 PR 본문에 적는다

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
