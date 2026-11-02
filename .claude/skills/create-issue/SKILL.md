---
name: create-issue
description: 이 저장소 규칙에 맞게 GitHub 이슈를 작성하고 담당자를 지정한다. 이슈 생성, 작업 시작, 이슈 맡기 요청에 사용.
---

`docs/ISSUE_PR_GUIDE.md`를 먼저 읽고 그대로 따른다.

1. 요청을 보고 종류(feature, bug, task)를 고른다
2. `.github/agent-templates/issue-<종류>.md`를 복사해 채운다. 제목 구조 유지, 안내 주석 삭제, 모르는 것은 "확인 필요"
3. 제목, 라벨, 담당자, 본문을 사용자에게 보여 주고 확인받는다
4. `gh issue create --title ... --label ... --assignee @me --body-file ...`
5. 기존 이슈를 맡는 경우 `gh issue edit <번호> --add-assignee @me`
6. 작업을 바로 시작하면 `git switch dev && git pull` 후 `<type>/<번호>-<설명>` 브랜치를 만든다
7. 이슈 URL을 보고한다
