---
name: create-pr
description: 이 저장소 규칙에 맞게 PR을 작성하고 리뷰어를 지정한다. PR 생성, 작업 마무리 요청에 사용.
---

`docs/ISSUE_PR_GUIDE.md`를 먼저 읽고 그대로 따른다.

1. 연결할 이슈 번호를 확인한다 (브랜치 이름 또는 사용자에게 질문). 이슈에 담당자가 없으면 먼저 지정한다
2. `pnpm check`와 `pnpm build`를 실행한다. 실패하면 PR을 만들지 말고 보고한다
3. `.github/PULL_REQUEST_TEMPLATE.md`를 복사해 채운다. 체크리스트는 실제로 통과한 항목만 `[x]`
4. 제목은 커밋 메시지 형식 (`feat(scope): 제목`)
5. 리뷰어를 정한다. 사용자가 지정하지 않았으면 `gh api repos/{owner}/{repo}/collaborators --jq '.[].login'`로 후보를 보여 주고 고르게 한다. 본인은 리뷰어가 될 수 없다
6. 제목, 리뷰어, 본문을 사용자에게 보여 주고 확인받는다
7. `git push -u origin <브랜치>` 후 `gh pr create --title ... --body-file ... --reviewer <id> --assignee @me --label <라벨>`
8. PR URL과 `pr-rules` CI 결과를 보고한다
