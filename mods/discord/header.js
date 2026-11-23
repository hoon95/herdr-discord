// 채널 머리줄(48px): # 지금 탭 이름 | 주제(폴더 · 브랜치) ... 나누기 · 파일 패널 · 멤버 목록 · 검색.
import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, run, layout, home } from "herdr";
import { icon, white, keepPress } from "./parts.js";

const MEMBERS_NODE = "members";
const PANEL_NODE = "panel";

function findNode(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

const isShown = (id) => {
  const node = findNode(layout(), id);
  return Boolean(node) && !node.hidden;
};

const tilde = (path, homeDir) => (path === homeDir ? "~" : path.startsWith(`${homeDir}/`) ? `~${path.slice(homeDir.length)}` : path);

// 주제: 지금 탭에서 키보드가 있는 창(없으면 첫 창)의 폴더와 브랜치.
function topic(tab) {
  const mine = panes().filter((p) => p.tab === tab.id && p.cwd);
  const pane = mine.find((p) => p.focused) ?? mine[0];
  if (!pane) return "";
  return [tilde(pane.cwd, home()), pane.branch ? `⎇ ${pane.branch}` : null].filter(Boolean).join(" · ");
}

function toolButton(t, id, iconName, tip, on, action) {
  return keepPress(div().id(id).flex_none().cursor_pointer().tooltip(tip)
    .text_color(on ? white(t) : t.muted).hover((s) => s.text_color(t.foreground))
    .on_click(action).child(icon(iconName, 22)));
}

function searchBox(t) {
  return keepPress(h_flex().id("search").w(144).h(24).flex_none().px(6).gap(4).items_center().rounded(4).bg(t.canvas)
    .text_size(13).text_color(t.dim).cursor_pointer().tooltip("찾기 (⌘P)")
    .on_click(() => run("mod.open", { name: "picker" }))
    .child(div().flex_1().child("검색")).child(icon("search", 14)));
}

export function renderHeader(_view, t) {
  const space = spaces().find((s) => s.active);
  const tab = space?.tabs.find((x) => x.active);
  const about = tab ? topic(tab) : "";
  return h_flex().id("header").size_full().bg(t.background).px(16).gap(8).items_center()
    .border_b(1).border_color(t.canvas)
    .child(div().text_color(t.idle).child(icon("hash", 24)))
    .child(div().flex_none().max_w(320).truncate().text_size(16).font_semibold().text_color(white(t))
      .child(tab?.name ?? "채널 없음"))
    .when(Boolean(about), (el) => el
      .child(div().w(1).h(24).mx(4).flex_none().bg(t.border))
      .child(div().flex_1().min_w(0).truncate().text_size(14).text_color(t.muted).child(about)))
    .when(!about, (el) => el.child(div().flex_1()))
    .child(h_flex().flex_none().gap(16).items_center()
      .child(toolButton(t, "split", "columns-2", "오른쪽으로 나누기 (⌘D)", false, () => run("pane.split", { direction: "right" })))
      .child(toolButton(t, "panel", "panel-right", "파일 패널 (⌘⇧E)", isShown(PANEL_NODE), () => run("layout.toggle", { id: PANEL_NODE })))
      .child(toolButton(t, "members", "users", "멤버 목록 보이기/숨기기", isShown(MEMBERS_NODE), () => run("layout.toggle", { id: MEMBERS_NODE })))
      .child(searchBox(t)));
}
