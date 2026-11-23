// 멤버 목록(오른쪽 240px): 지금 스페이스의 에이전트를 상태별로(입력 필요 → 작업 중 → 완료 → 대기).
// 디스코드의 '온라인 — 3' 묶음 자리이고, 대기는 오프라인처럼 흐리게 둔다.
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, agents, run, setAgentOrder, shared } from "herdr";
import { cleanTitle, memberGroups, agentSubtitle } from "./look.js";
import { HOME_KEY, white, programAvatar, withStatusDot } from "./parts.js";

const ROW_HEIGHT = 44;
const IDLE_OPACITY = 0.5;

function memberRow(t, a, workingSince, now) {
  const ring = a.focused ? t.selected : t.chrome;
  return h_flex().id(`member-${a.address}`).h(ROW_HEIGHT).flex_none().px(8).gap(12).items_center().rounded(4)
    .cursor_pointer()
    .when(a.status === "idle" && !a.focused, (el) => el.opacity(IDLE_OPACITY))
    .when(a.focused, (el) => el.bg(t.selected))
    .when(!a.focused, (el) => el.hover((s) => s.bg(t.hover).opacity(1)))
    .on_click(() => run("agent.focus", { terminal: a.address }))
    .child(withStatusDot(t, programAvatar(t, a.program, 32), 32, a.status, ring))
    .child(v_flex().flex_1().min_w(0)
      .child(div().truncate().text_size(15).font_medium()
        .text_color(a.focused ? white(t) : a.status === "idle" ? t.dim : t.foreground)
        .child(cleanTitle(a.title) || a.program?.name || "에이전트"))
      .child(div().truncate().text_size(12).text_color(a.status === "blocked" ? t.blocked : t.dim)
        .child(`${agentSubtitle(a.status, workingSince, now)} · #${a.tab_name}`)));
}

function empty(t, home) {
  return v_flex().px(8).pt(24).gap(6)
    .child(div().text_size(13).font_semibold().text_color(t.foreground).child(home ? "에이전트가 없어요" : "이 스페이스엔 에이전트가 없어요"))
    .child(div().text_size(12).text_color(t.dim).child("채널 목록의 + 로 Claude 를 시작하면 여기 나와요."));
}

export function renderMembers(_view, t) {
  const home = shared(HOME_KEY) === true;
  const space = home ? null : spaces().find((s) => s.active);
  const groups = memberGroups(agents(), space?.id ?? null);
  setAgentOrder(groups.flatMap((g) => g.items.map((a) => a.address)));
  const since = new Map(spaces().flatMap((s) => s.tabs.map((tab) => [tab.id, tab.working_since])));
  const now = Date.now();
  return v_flex().id("members").size_full().bg(t.chrome).px(8).pb(12).overflow_y_scroll()
    .when(groups.length === 0, (el) => el.child(empty(t, home)))
    .children(groups.flatMap((g) => [
      div().id(`group-${g.status}`).pt(20).pb(4).px(8).flex_none().text_size(12).font_semibold().text_color(t.dim)
        .child(`${g.label} — ${g.items.length}`),
      ...g.items.map((a) => memberRow(t, a, since.get(a.tab) ?? null, now)),
    ]));
}
