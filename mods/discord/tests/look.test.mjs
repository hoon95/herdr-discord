// 디스코드 풍 레이아웃의 순수 함수 테스트. 실행: node --test ~/.config/herdr-app/mods/discord/tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initials, cleanTitle, memberGroups, tabBadge, elapsedText, agentSubtitle, usageText, planLabel,
} from "../look.js";

test("initials: 단어마다 첫 글자, 최대 세 글자", () => {
  assert.equal(initials("web-front"), "wf");
  assert.equal(initials("space-mission-portal"), "smp");
  assert.equal(initials("one two three four"), "ott");
  assert.equal(initials("Frontend"), "F");
  assert.equal(initials("~"), "~");
  assert.equal(initials("프로젝트 열기"), "프열");
  assert.equal(initials("x_go.app"), "xga");
});

test("initials: 비었거나 기호뿐이면 물음표", () => {
  assert.equal(initials(""), "?");
  assert.equal(initials(null), "?");
  assert.equal(initials(" - _ "), "?");
});

test("cleanTitle: Claude 가 붙이는 앞 기호(✳ ◑ 점자 스피너)를 뗀다", () => {
  assert.equal(cleanTitle("✳ 노션 체크리스트"), "노션 체크리스트");
  assert.equal(cleanTitle("◑ fix login"), "fix login");
  assert.equal(cleanTitle("⠂ 작업 중"), "작업 중");
  assert.equal(cleanTitle("~/orca/x"), "~/orca/x");
  assert.equal(cleanTitle("   "), "");
  assert.equal(cleanTitle(undefined), "");
});

const agent = (address, space, tab, status, title = address) => ({ address, space, tab, status, title });

test("memberGroups: 입력 필요 → 작업 중 → 완료 → 대기, 빈 묶음은 뺀다", () => {
  const list = [
    agent("t1", "s1", "a", "idle"), agent("t2", "s1", "a", "working"),
    agent("t3", "s2", "b", "blocked"), agent("t4", "s1", "c", "working"),
  ];
  const groups = memberGroups(list, "s1");
  assert.deepEqual(groups.map((g) => [g.status, g.label, g.items.map((a) => a.address)]), [
    ["working", "작업 중", ["t2", "t4"]],
    ["idle", "대기", ["t1"]],
  ]);
});

test("memberGroups: 스페이스를 안 주면 모든 에이전트", () => {
  const list = [agent("t1", "s1", "a", "done"), agent("t3", "s2", "b", "blocked")];
  assert.deepEqual(memberGroups(list, null).map((g) => g.status), ["blocked", "done"]);
});

test("tabBadge: 입력 필요한 에이전트 수, 작업 중 여부, 안 본 완료", () => {
  const list = [
    agent("t1", "s1", "a", "blocked"), agent("t2", "s1", "a", "blocked"),
    agent("t3", "s1", "a", "working"), agent("t4", "s1", "b", "done"),
  ];
  assert.deepEqual(tabBadge({ id: "a", status: "blocked" }, list), { blocked: 2, working: true, unread: false });
  assert.deepEqual(tabBadge({ id: "b", status: "done" }, list), { blocked: 0, working: false, unread: true });
  assert.deepEqual(tabBadge({ id: "z", status: null }, list), { blocked: 0, working: false, unread: false });
});

test("elapsedText: 방금 / N분째 / N시간 M분째, 모르면 빈 글자", () => {
  const now = 10_000_000;
  assert.equal(elapsedText(now - 20_000, now), "방금 시작");
  assert.equal(elapsedText(now - 3 * 60_000, now), "3분째");
  assert.equal(elapsedText(now - (60 + 5) * 60_000, now), "1시간 5분째");
  assert.equal(elapsedText(now - 2 * 3_600_000, now), "2시간째");
  assert.equal(elapsedText(null, now), "");
  assert.equal(elapsedText(now + 60_000, now), "방금 시작");
});

test("agentSubtitle: 상태마다 한 줄 설명", () => {
  const now = 10_000_000;
  assert.equal(agentSubtitle("working", now - 5 * 60_000, now), "작업 중 · 5분째");
  assert.equal(agentSubtitle("working", null, now), "작업 중");
  assert.equal(agentSubtitle("blocked", null, now), "입력을 기다려요");
  assert.equal(agentSubtitle("done", null, now), "끝났어요 · 확인 전");
  assert.equal(agentSubtitle("idle", null, now), "대기 중");
});

test("usageText: 5시간·주간 %, 상태 문구, 모르면 null", () => {
  assert.equal(usageText({ status: "ok", session: { percent: 17 }, weekly: { percent: 28.4 } }), "5h 17% · 주간 28%");
  assert.equal(usageText({ status: "ok", session: { percent: 9 }, weekly: null }), "5h 9%");
  assert.equal(usageText({ status: "expired" }), "토큰 만료");
  assert.equal(usageText({ status: "login-required" }), "로그인 필요");
  assert.equal(usageText({ status: "error", error: "x" }), null);
  assert.equal(usageText(null), null);
});

test("planLabel: 요금제 이름, 모르면 그대로, 없으면 null", () => {
  assert.equal(planLabel("team"), "Team");
  assert.equal(planLabel("max"), "Max");
  assert.equal(planLabel("pro"), "Pro");
  assert.equal(planLabel("enterprise"), "enterprise");
  assert.equal(planLabel(null), null);
});
