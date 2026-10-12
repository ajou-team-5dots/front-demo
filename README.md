# 5dots front demo

팀 5dots 정보디자인 프로젝트의 프론트엔드 데모. 주제: 플레이어의 콘텐츠 실행 직후 행동 분석.

## 시작하기

```bash
corepack enable          # pnpm 버전 고정 (package.json의 packageManager)
pnpm install
git config commit.template .gitmessage   # 커밋 메시지 양식 (선택)
pnpm dev                 # http://localhost:3000
```

## 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui

## 문서

| 문서                                             | 내용                                                |
| ------------------------------------------------ | --------------------------------------------------- |
| [docs/CONVENTION.md](docs/CONVENTION.md)         | 코드 컨벤션 (Airbnb 기반), 폴더 구조, shadcn 사용법 |
| [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)     | 브랜치, 커밋 메시지, 이슈, PR 규칙                  |
| [docs/ISSUE_PR_GUIDE.md](docs/ISSUE_PR_GUIDE.md) | 이슈/PR 작성법, 예시, AI 에이전트 규칙              |
| [AGENTS.md](AGENTS.md)                           | Codex 등 AI 에이전트용 규칙                         |
| [CLAUDE.md](CLAUDE.md)                           | Claude Code용 규칙 (AGENTS.md를 불러옴)             |

## 주요 명령어

| 명령                                | 설명                                      |
| ----------------------------------- | ----------------------------------------- |
| `pnpm check`                        | lint + 포맷 검사 + 타입 검사 (PR 전 필수) |
| `pnpm build`                        | 프로덕션 빌드                             |
| `pnpm dlx shadcn@latest add <name>` | shadcn 컴포넌트 추가                      |
