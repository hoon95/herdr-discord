// 디스코드 풍 레이아웃(layouts/discord.json)의 블록들. props.view 로 어느 부분인지 정한다.
//   rail     서버 목록 = 스페이스(맨 위 홈 = 모든 에이전트, 맨 아래 + = 프로젝트 열기)
//   channels 채널 목록 = 지금 스페이스의 탭, 채널 아래 = 그 탭의 에이전트(음성 채널 참가자처럼)
//   user     사용자 패널 = 지금 Claude 계정과 사용량(claude-accounts 모드가 있을 때)
//   header   채널 머리줄 = 지금 탭 이름 · 폴더 · 브랜치 + 버튼
//   members  멤버 목록 = 지금 스페이스의 에이전트를 상태별로
import { View } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme, props, checking, exec, home, appHome, shared } from "herdr";
import * as fs from "fs/promises";
import { renderRail } from "./rail.js";
import { renderChannels } from "./channels.js";
import { renderUser } from "./user.js";
import { renderHeader } from "./header.js";
import { renderMembers } from "./members.js";
import { ACCOUNTS_REV_KEY } from "./parts.js";

const VIEWS = { rail: renderRail, channels: renderChannels, user: renderUser, header: renderHeader, members: renderMembers };
// herdr-app check 는 props 를 못 넘겨서 모든 부분을 나란히 그린다(크기는 레이아웃과 같게).
const CHECK_WIDTHS = { rail: 72, channels: 240, home: 240, user: 240, header: 480, members: 240 };
const CHECK_VIEWS = { ...VIEWS, home: (view, t) => renderChannels(view, t, true) };
const ACCOUNT_CHECK_MS = 3000;
// 멤버 목록의 'N분째' 를 바꾸는 간격.
const ELAPSED_TICK_MS = 60000;
const ACCOUNT_TIMEOUT_MS = 10000;

async function exists(path) {
  try {
    return await fs.exists(path);
  } catch {
    return false;
  }
}

export default class Discord extends View {
  init(_props, cx) {
    this.view = props()?.view ?? null;
    this.hovered = null;
    this.account = null; // { name, plan }
    this.accountRev = null;
    this.hasAccounts = false;
    this.hasMonitor = false;
    this.hasProjectOpen = false;
    if (checking()) return;
    cx.spawn(async (cx) => this.findMods(cx));
    if (this.view === "user") cx.timer.every(ACCOUNT_CHECK_MS, (cx) => this.checkAccount(cx));
    if (this.view === "members") cx.timer.every(ELAPSED_TICK_MS, (cx) => cx.notify());
  }

  // 함께 쓰면 좋은 모드들(없으면 그 버튼을 감추거나 기본 동작으로).
  async findMods(cx) {
    const mods = `${appHome()}/mods`;
    this.hasProjectOpen = await exists(`${mods}/project-open/main.js`);
    this.hasMonitor = await exists(`${mods}/resource-monitor/main.js`);
    this.hasAccounts = (await exists(`${mods}/claude-accounts/main.js`)) && (await exists(this.accountCli()));
    if (this.view === "user") await this.loadAccount();
    cx.notify();
  }

  accountCli() {
    return `${home()}/.local/bin/claude-acct`;
  }

  // claude-accounts 모드가 계정을 바꾸면 shared rev 가 바뀐다. 그때만 다시 읽는다.
  checkAccount(cx) {
    if (!this.hasAccounts) return;
    const rev = shared(ACCOUNTS_REV_KEY) ?? null;
    if (rev === this.accountRev) return;
    this.accountRev = rev;
    cx.spawn(async (cx) => {
      await this.loadAccount();
      cx.notify();
    });
  }

  async loadAccount() {
    if (!this.hasAccounts) return;
    try {
      const r = await exec(this.accountCli(), ["list", "--json"], { timeout: ACCOUNT_TIMEOUT_MS });
      const data = JSON.parse(r.stdout);
      const current = data?.accounts?.find((a) => a.name === data.current);
      this.account = current ? { name: current.name, plan: current.subscriptionType ?? null } : null;
    } catch {
      this.account = null; // 못 읽으면 이 Mac 사용자 이름으로 보인다
    }
  }

  render() {
    const t = theme();
    if (checking() || !VIEWS[this.view]) {
      return h_flex().size_full().children(Object.entries(CHECK_VIEWS).map(([name, draw]) =>
        h_flex().w(CHECK_WIDTHS[name]).h(name === "user" ? 52 : name === "header" ? 48 : 600).flex_none().child(draw(this, t))));
    }
    return VIEWS[this.view](this, t);
  }
}
