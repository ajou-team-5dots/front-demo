# CLAUDE.md

Claude Code용 진입 파일. 공통 규칙은 AGENTS.md 하나에서 관리한다 (Codex와 Claude가 같은 규칙을 보도록).

@AGENTS.md

## Claude Code 전용

- 답변과 문서, 커밋 메시지 제목은 한국어로 작성한다
- 코드 수정 후 `pnpm check`를 직접 실행해 결과를 확인하고 보고한다. 실패하면 실패했다고 말한다
- shadcn 컴포넌트가 필요하면 직접 작성하지 말고 `pnpm dlx shadcn@latest add`를 쓴다
- Next.js API가 확실하지 않으면 `node_modules/next/dist/docs/`를 먼저 읽는다
- 규칙을 바꾸는 변경(ESLint 예외 추가 등)은 `docs/CONVENTION.md`의 예외 표도 함께 갱신한다
- 이슈 생성/맡기는 `create-issue` 스킬, PR 생성은 `create-pr` 스킬을 쓴다
