// 서버 목록(왼쪽 72px): 홈(모든 에이전트) · 스페이스마다 동그란 아이콘 · 프로젝트 열기(+).
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { spaces, agents, run, openOverlay, shared, setShared, window } from "herdr";
import { initials } from "./look.js";
import { HOME_KEY, SPACE_COLORS_KEY, icon, white, keepPress, mentionBadge } from "./parts.js";

const RAIL_WIDTH = 72;
const ICON = 48;
// 왼쪽 흰 막대 높이: 고른 것 / 마우스 올림 / 안 본 완료.
const PILL = { selected: 40, hover: 20, unread: 8 };
const PILL_MS = 160;
// macOS 창 버튼이 서버 목록 위에 앉는다(layouts/discord.json 의 traffic_lights).
const TOP_PAD_MACOS = 38;
const TOP_PAD = 12;
const TEXT_SIZE = { 1: 18, 2: 16, 3: 13 };

function pill(t, height) {
  return div().absolute().left(0).w(4).rounded_r(4).bg(white(t))
    .top((ICON - height) / 2).h(height)
    .transition("height", PILL_MS).transition("top", PILL_MS);
}

function pillHeight(selected, hovered, unread) {
  if (selected) return PILL.selected;
  if (hovered) return PILL.hover;
  return unread ? PILL.unread : 0;
}

// 서버 아이콘 한 칸: 왼쪽 막대 + 동그라미(고르거나 올리면 둥근 네모) + 오른쪽 아래 뱃지.
function slot(view, t, { id, tooltip, selected, unread, blocked, working, face, onClick, onRight }) {
  const hovered = view.hovered === id;
  const height = pillHeight(selected, hovered, unread);
  return h_flex().id(`slot-${id}`).relative().w(RAIL_WIDTH).h(ICON).flex_none().justify_center()
    .tooltip(tooltip)
    .on_hover((on, cx) => {
      view.hovered = on ? id : view.hovered === id ? null : view.hovered;
      cx.notify();
    })
    .child(pill(t, height).when(height === 0, (el) => el.opacity(0)))
    .child(keepPress(face(selected || hovered).id(`face-${id}`).cursor_pointer())
      .on_click((_e, cx) => onClick(cx))
      .when(Boolean(onRight), (el) => el.on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); onRight(); })))
    .when(blocked > 0, (el) => el.child(div().absolute().right(10).bottom(-4).child(mentionBadge(t, blocked, t.canvas))))
    .when(blocked === 0 && working, (el) => el.child(div().absolute().right(10).bottom(-2).size(14).rounded_full().bg(t.canvas)
      .flex().items_center().justify_center()
      .child(div().size(8).rounded_full().bg(t.working).loop("opacity", { from: 0.45, to: 1, period: 1400 }))));
}

function circle(t, active, fill) {
  return div().size(ICON).flex_none().flex().items_center().justify_center()
    .rounded(active ? 16 : ICON / 2).bg(active ? (fill ?? t.accent) : (fill ?? t.background))
    .text_color(active || fill ? white(t) : t.foreground);
}

function spaceFill(t, colors, id) {
  const color = colors[id];
  if (!color) return null;
  return color.startsWith("#") ? color : (t[color] ?? null);
}

function homeSlot(view, t, all, home) {
  const blocked = all.filter((a) => a.status === "blocked").length;
  return slot(view, t, {
    id: "home", tooltip: "다이렉트 메시지 · 모든 에이전트", selected: home, unread: false, blocked, working: false,
    face: (active) => circle(t, active, null).child(icon("message-circle", 26)),
    onClick: (cx) => { setShared(HOME_KEY, true); cx.notify(); },
  });
}

function spaceSlot(view, t, s, all, home, colors) {
  const mine = all.filter((a) => a.space === s.id);
  const text = initials(s.name);
  return slot(view, t, {
    id: s.id,
    tooltip: s.machine ? `${s.name} · ${s.machine}` : s.name,
    selected: s.active && !home,
    unread: s.status === "done",
    blocked: mine.filter((a) => a.status === "blocked").length,
    working: mine.some((a) => a.status === "working"),
    face: (active) => circle(t, active, spaceFill(t, colors, s.id))
      .text_size(TEXT_SIZE[Array.from(text).length] ?? 13).font_medium().child(text),
    onClick: (cx) => {
      setShared(HOME_KEY, false);
      run("space.select", { id: s.id });
      cx.notify();
    },
    onRight: () => openOverlay({ mod: "menu", kind: "popup", width: 200, height: 260, props: { tab: "space", target: { id: s.id } } }),
  });
}

function addSlot(view, t) {
  return h_flex().id("slot-add").w(RAIL_WIDTH).h(ICON).flex_none().justify_center()
    .tooltip(view.hasProjectOpen ? "프로젝트 열기 (⌘O)" : "새 스페이스")
    .child(keepPress(div().id("face-add").size(ICON).flex().items_center().justify_center().rounded(ICON / 2)
      .bg(t.background).text_color(t.working).cursor_pointer()
      .hover((s) => s.rounded(16).bg(t.working).text_color(white(t)))
      .on_click(() => (view.hasProjectOpen ? run("mod.open", { name: "project-open" }) : run("space.new"))))
      .child(icon("plus", 24)));
}

export function renderRail(view, t) {
  const all = agents();
  const home = shared(HOME_KEY) === true;
  const colors = shared(SPACE_COLORS_KEY) ?? {};
  const w = window();
  const top = w?.platform === "macos" && !w?.fullscreen ? TOP_PAD_MACOS : TOP_PAD;
  return v_flex().id("rail").size_full().bg(t.canvas).pt(top).gap(8).items_center()
    .child(homeSlot(view, t, all, home))
    .child(div().w(32).h(2).flex_none().rounded(1).bg(t.hover))
    .child(v_flex().id("servers").flex_1().min_h(0).w_full().gap(8).pb(12).items_center().overflow_y_scroll()
      .children(spaces().map((s) => spaceSlot(view, t, s, all, home, colors)))
      .child(addSlot(view, t)));
}
