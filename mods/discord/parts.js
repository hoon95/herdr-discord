// 디스코드 풍 블록들이 함께 쓰는 조각: 아이콘, 아바타, 상태 점, 공유 키.
import { div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";

// 홈(다이렉트 메시지 = 모든 에이전트)을 보고 있는지. 서버 목록이 쓰고 채널 목록이 읽는다.
export const HOME_KEY = "discord.home";
// 다른 모드가 남기는 값(없어도 된다).
export const SPACE_COLORS_KEY = "space.colors";
export const USAGE_KEY = "claude-accounts.usage";
export const ACCOUNTS_REV_KEY = "claude-accounts.rev";

export const icon = (name, size) => svg(`mods/discord/${name}.svg`).size(size).flex_none();

// 흰 글자(디스코드의 #f2f3f5). 테마에 흰색 이름이 없어 밝은 흰 ansi 를 쓴다.
export const white = (t) => t.ansi15;

export function statusColor(t, status) {
  return { working: t.working, blocked: t.blocked, done: t.done, idle: t.idle }[status] ?? t.idle;
}

// 누르면 창이 끌려가는 블록(window_drag) 안의 버튼: 누름을 멈춰야 클릭이 된다.
export const keepPress = (el) => el.on_mouse_down("left", (_e, cx) => cx.stop_propagation());

// 프로그램 아이콘을 얹은 동그란 아바타. tile 이 있으면 그 색 위에, 없으면 강조색 위에 그린다.
export function programAvatar(t, program, size) {
  const glyph = Math.round(size * 0.6);
  const art = !program?.icon ? div().text_size(size * 0.45).font_semibold().child((program?.name ?? "?").slice(0, 1))
    : program.tint ? svg(program.icon).size(glyph).text_color(program.color ?? white(t))
      : image(program.icon).w(glyph).h(glyph);
  return div().size(size).flex_none().rounded_full().flex().items_center().justify_center()
    .bg(program?.tile ?? t.accent).text_color(white(t)).child(art);
}

// 아바타 오른쪽 아래 상태 점. ring 은 점을 둘러 아바타와 떼어 놓는 바탕색(디스코드처럼).
export function withStatusDot(t, avatarEl, size, status, ring) {
  const dot = Math.max(8, Math.round(size * 0.32));
  return div().relative().flex_none().size(size).child(avatarEl)
    .child(div().absolute().right(-2).bottom(-2).size(dot + 4).rounded_full().bg(ring)
      .flex().items_center().justify_center()
      .child(div().size(dot).rounded_full().bg(statusColor(t, status))
        .when(status === "working", (el) => el.loop("opacity", { from: 0.45, to: 1, period: 1400 }))));
}

// 빨간 멘션 뱃지(입력 필요한 에이전트 수).
export function mentionBadge(t, count, ring) {
  return h_flex().h(16).min_w(16).px(4).rounded(8).justify_center().items_center()
    .bg(t.blocked).border_2().border_color(ring).text_size(11).font_bold().text_color(white(t))
    .child(count > 99 ? "99+" : String(count));
}
