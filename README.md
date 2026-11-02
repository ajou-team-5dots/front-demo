# 5dots front demo

팀 5dots 정보디자인 프로젝트의 프론트엔드 데모. 주제: 플레이어의 콘텐츠 실행 직후 행동 분석.

## 시작하기

```bash
fnm install              # Node 버전 맞추기 (.nvmrc의 24 LTS). 아래 "Node 버전" 참고
corepack enable          # pnpm 버전 고정 (package.json의 packageManager)
pnpm install
git config commit.template .gitmessage   # 커밋 메시지 양식 (선택)
pnpm dev                 # http://localhost:3000
```

### Node 버전

`.nvmrc`의 Node 24 LTS를 쓴다. 운영체제와 상관없이 [fnm](https://github.com/Schniz/fnm)을 권장한다 (`.nvmrc`를 읽는다).

| 환경                      | 설치                        | 버전 맞추기                                                                            |
| ------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| Windows                   | `winget install Schniz.fnm` | `fnm install` → `fnm use`                                                              |
| macOS                     | `brew install fnm`          | `fnm install` → `fnm use`                                                              |
| nvm 사용 중 (macOS·Linux) |                             | `nvm install` → `nvm use`                                                              |
| nvm-windows 사용 중       |                             | `.nvmrc`를 못 읽을 수 있어 버전을 직접 적음: `nvm install 24.22.2` → `nvm use 24.22.2` |

fnm은 셸 설정에 한 줄을 더해야 한다 (PowerShell, bash, zsh별 방법은 fnm README). `node -v`가 `v24.22.2`면 끝이다.

## 브랜치

`dev`(기본)로 PR → 모아서 `dev` → `main` 릴리스 PR로 배포. 자세한 내용은 [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md)

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
