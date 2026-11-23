// 사용자 패널(채널 목록 아래 52px): 지금 Claude 계정 · 사용량 + 리소스 모니터 · 파일 패널 · 설정 버튼.
// 계정은 claude-accounts 모드의 claude-acct 가 있을 때만(없으면 이 Mac 사용자 이름).
import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { run, shared, home } from "herdr";
import { usageText, planLabel } from "./look.js";
import { USAGE_KEY, icon, white, withStatusDot } from "./parts.js";

// 상태 점 색: 한도를 이만큼 넘게 쓰면 노랑(자리 비움) · 빨강(방해 금지).
const WARN_PERCENT = 70;
const DANGER_PERCENT = 90;

function usageStatus(usage) {
  if (!usage) return "idle";
  if (usage.status !== "ok") return usage.status === "error" ? "idle" : "blocked";
  const top = Math.max(usage.session?.percent ?? 0, usage.weekly?.percent ?? 0);
  if (top >= DANGER_PERCENT) return "blocked";
  if (top >= WARN_PERCENT) return "done";
  return "working";
}

function button(t, id, iconName, tip, action) {
  return div().id(id).size(32).flex_none().flex().items_center().justify_center().rounded(4).cursor_pointer()
    .tooltip(tip).text_color(t.muted).hover((s) => s.bg(t.hover).text_color(t.foreground))
    .on_click(action).child(icon(iconName, 20));
}

export function renderUser(view, t) {
  const account = view.account;
  const name = account?.name ?? home().split("/").pop();
  const usage = account ? shared(USAGE_KEY)?.byName?.[account.name] ?? null : null;
  const subtitle = usageText(usage) ?? planLabel(account?.plan) ?? (account ? "Claude 계정" : "이 Mac");
  const face = div().size(32).flex_none().rounded_full().flex().items_center().justify_center().bg(t.accent)
    .text_size(14).font_semibold().text_color(white(t)).child(Array.from(name)[0]?.toUpperCase() ?? "?");
  return h_flex().id("user").size_full().bg(t.raised).px(8).gap(2).items_center()
    .child(h_flex().id("me").flex_1().min_w(0).h(40).pl(2).pr(8).gap(8).items_center().rounded(4)
      .when(view.hasAccounts, (el) => el.cursor_pointer().tooltip("Claude 계정 (⌘⇧A)").hover((s) => s.bg(t.hover))
        .on_click(() => run("mod.open", { name: "claude-accounts" })))
      .child(withStatusDot(t, face, 32, usageStatus(usage), t.raised))
      .child(v_flex().flex_1().min_w(0)
        .child(div().truncate().text_size(14).font_semibold().text_color(white(t)).child(name))
        .child(div().truncate().text_size(12).text_color(t.muted).child(subtitle))))
    .when(view.hasMonitor, (el) => el.child(button(t, "monitor", "activity", "리소스 모니터 (⌘⇧M)", () => run("mod.open", { name: "resource-monitor" }))))
    .child(button(t, "settings", "settings", "설정", () => run("app.settings")));
}
