// 채널 목록(240px): 스페이스 이름 머리줄 + '터미널 채널'(탭) + 채널마다 그 안의 에이전트(음성 채널 참가자처럼).
// 홈(서버 목록 맨 위)을 고르면 대신 '다이렉트 메시지' = 모든 에이전트를 최근 순으로 보여 준다.
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, agents, focused, run, openOverlay, shared } from "herdr";
import { cleanTitle, tabBadge } from "./look.js";
import { HOME_KEY, icon, white, programAvatar, withStatusDot, mentionBadge } from "./parts.js";

const HEADER_HEIGHT = 48;
const CHANNEL_HEIGHT = 34;
const VOICE_HEIGHT = 30;
const DM_HEIGHT = 44;
const NEW_MENU = { mod: "new-menu", kind: "popup", width: 250, height: 512 };

const agentName = (a) => cleanTitle(a.title) || a.program?.name || "에이전트";
const focusAgent = (a) => run("agent.focus", { terminal: a.address });

function header(t, children, onClick) {
  return h_flex().id("channels-header").h(HEADER_HEIGHT).flex_none().px(16).gap(6).items_center()
    .border_b(1).border_color(t.canvas).cursor_pointer().hover((s) => s.bg(t.hover))
    .on_click((_e, cx) => onClick(cx)).children(children);
}

function category(t, id, label, onAdd, addTip) {
  return h_flex().id(`cat-${id}`).pt(18).pb(4).pl(8).pr(10).gap(2).items_center().flex_none()
    .text_size(12).font_semibold().text_color(t.dim).hover((s) => s.text_color(t.foreground))
    .child(icon("chevron-down", 12)).child(div().flex_1().truncate().child(label))
    .child(div().id(`cat-add-${id}`).text_color(t.dim).cursor_pointer().tooltip(addTip)
      .hover((s) => s.text_color(t.foreground))
      .on_click((_e, cx) => { cx.stop_propagation(); onAdd(); }).child(icon("plus", 16)));
}

// 채널 한 줄. 고른 채널은 밝은 바탕, 안 본 완료는 흰 글씨 + 왼쪽 점, 입력이 필요하면 빨간 숫자.
function channelRow(t, space, tab, all) {
  const badge = tabBadge(tab, all);
  const bright = tab.active || badge.unread || badge.blocked > 0;
  return h_flex().id(`ch-${tab.id}`).relative().mx(8).h(CHANNEL_HEIGHT).flex_none().px(8).gap(6).items_center().rounded(4)
    .cursor_pointer().text_size(15).font_medium()
    .text_color(tab.active ? white(t) : bright ? t.foreground : t.dim)
    .when(tab.active, (el) => el.bg(t.selected))
    .when(!tab.active, (el) => el.hover((s) => s.bg(t.hover).text_color(t.foreground)))
    .on_mouse_down("left", (e) => { if (e.click_count === 2) run("tab.rename", { id: tab.id }); })
    .on_click(() => run("tab.select", { id: tab.id }))
    .on_mouse_down("right", (_e, cx) => {
      cx.stop_propagation();
      openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: tab.id, space: space.id } } });
    })
    .when(badge.unread && !tab.active, (el) => el.child(div().absolute().left(-8).w(4).h(8).rounded_r(4).bg(white(t))))
    .child(div().text_color(t.idle).child(icon("hash", 20)))
    .child(div().flex_1().min_w(0).truncate().child(tab.name))
    .when(badge.blocked > 0, (el) => el.child(mentionBadge(t, badge.blocked, tab.active ? t.selected : t.chrome)))
    .when(badge.blocked === 0 && badge.working, (el) => el.child(div().size(8).rounded_full().bg(t.working)
      .loop("opacity", { from: 0.45, to: 1, period: 1400 })));
}

// 채널 아래 참가자 줄: 작업 중이면 디스코드의 '말하는 중'처럼 아바타에 초록 테두리.
function voiceRow(t, a) {
  const speaking = a.status === "working";
  const face = div().size(24).flex_none().rounded_full().p(speaking ? 0 : 2)
    .when(speaking, (el) => el.border_2().border_color(t.working))
    .child(programAvatar(t, a.program, 20));
  return h_flex().id(`voice-${a.address}`).ml(36).mr(8).h(VOICE_HEIGHT).flex_none().px(6).gap(8).items_center().rounded(4)
    .cursor_pointer().hover((s) => s.bg(t.hover))
    .on_click(() => focusAgent(a))
    .child(face)
    .child(div().flex_1().min_w(0).truncate().text_size(14).text_color(a.focused ? white(t) : t.dim).child(agentName(a)))
    .when(a.status === "blocked", (el) => el.child(div().size(8).rounded_full().bg(t.blocked)))
    .when(a.status === "done", (el) => el.child(div().size(8).rounded_full().bg(t.done)));
}

function spaceList(t, space) {
  const all = agents();
  const tabs = space.tabs.filter((tab) => !tab.settled || tab.active);
  return v_flex().size_full().bg(t.chrome)
    .child(header(t, [
      div().flex_1().min_w(0).truncate().text_size(15).font_semibold().text_color(white(t)).child(space.name),
      div().text_color(t.foreground).child(icon("chevron-down", 18)),
    ], () => openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: space.id } } })))
    .child(v_flex().id("channel-list").flex_1().min_h(0).pb(12).overflow_y_scroll()
      .child(category(t, "terminals", "터미널 채널", () => openOverlay(NEW_MENU), "채널 만들기 (새 탭)"))
      .children(tabs.flatMap((tab) => [
        channelRow(t, space, tab, all),
        ...all.filter((a) => a.tab === tab.id).map((a) => voiceRow(t, a)),
      ])));
}

function dmRow(t, a) {
  return h_flex().id(`dm-${a.address}`).mx(8).h(DM_HEIGHT).flex_none().px(8).gap(12).items_center().rounded(4)
    .cursor_pointer().when(a.focused, (el) => el.bg(t.selected))
    .when(!a.focused, (el) => el.hover((s) => s.bg(t.hover)))
    .on_click(() => focusAgent(a))
    .child(withStatusDot(t, programAvatar(t, a.program, 32), 32, a.status, a.focused ? t.selected : t.chrome))
    .child(v_flex().flex_1().min_w(0)
      .child(div().truncate().text_size(15).font_medium().text_color(a.focused ? white(t) : t.foreground).child(agentName(a)))
      .child(div().truncate().text_size(12).text_color(t.dim).child(`${a.space_name} · #${a.tab_name}`)));
}

function homeList(t) {
  const list = [...agents()].sort((a, b) => b.seq - a.seq);
  return v_flex().size_full().bg(t.chrome)
    .child(h_flex().id("dm-search").h(HEADER_HEIGHT).flex_none().px(10).items_center().border_b(1).border_color(t.canvas)
      .child(div().id("dm-find").w_full().h(28).px(8).flex().items_center().rounded(4).bg(t.canvas)
        .text_size(13).text_color(t.dim).cursor_pointer().on_click(() => run("mod.open", { name: "picker" }))
        .child("대화 찾기 또는 시작하기")))
    .child(v_flex().id("dm-list").flex_1().min_h(0).pb(12).overflow_y_scroll()
      .child(category(t, "dm", "다이렉트 메시지", () => openOverlay(NEW_MENU), "에이전트 시작 (새 탭)"))
      .when(list.length === 0, (el) => el.child(div().px(16).py(8).text_size(13).text_color(t.dim)
        .child("아직 에이전트가 없어요. + 를 눌러 Claude 를 시작해 보세요.")))
      .children(list.map((a) => dmRow(t, a))));
}

export function renderChannels(_view, t, home = shared(HOME_KEY) === true) {
  if (home) return homeList(t);
  const space = spaces().find((s) => s.active) ?? spaces().find((s) => s.id === focused()?.space);
  if (!space) {
    return v_flex().size_full().bg(t.chrome).p(16).text_size(13).text_color(t.dim).child("스페이스가 없어요. 왼쪽 + 로 프로젝트를 여세요.");
  }
  return spaceList(t, space);
}
