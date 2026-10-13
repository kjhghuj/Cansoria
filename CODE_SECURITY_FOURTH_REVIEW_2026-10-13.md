# Cansoria 第四次代码审核

日期：2026-10-13（Asia/Shanghai）。基于 HEAD `6964cbb` 和本轮未提交修复，对照第三次报告复核，并检查相邻失败路径。本次只新增审核报告和 `audits/2026-10-13/fourth-review/` 证据，没有修改业务代码。

**结论：上次的订单 Cookie/缓存串单、CMS 404 回退已修复；普通邮件断点恢复已生效。仍确认 3 类问题：密码重置锁生命周期（P1）、邮件恢复失败处理（P2）、确认页跨订单状态清理（P2，两个具体表现）。**

## 1. P1：断连后已完成的密码重置请求仍永久占锁

位置：[auth-guards.ts:75](H:/Cansoria/backend/src/lib/auth-guards.ts:75)。

删除固定 30 秒 bailout 消除了上次的定时提前释放路径，但当前把业务完成等同于 HTTP `finish`，并假设客户端断连后最终仍会触发它。实际 Node HTTP 生命周期并非如此：如果连接已断开，`close` 时 `writableEnded=false`，后续业务完成调用 `res.end()` 可以使 `writableEnded=true`，但不会再发出 `finish` 或第二次 `close`。锁内 Promise 从此无法完成。

该中间件不仅保护 token 消费，也按邮箱保护 `/auth/customer/emailpass/reset-password` 和管理员重置签发。对签发请求而言，不需要持有重置 token 就能进入邮箱锁。连接在签发期间断开后，相同邮箱的后续请求将持续等待/超时；在当前持续续租的 Redis provider 下，业务早已完成，锁却仍会被保留，直到进程退出等外部释放。这是账户恢复可用性问题，不是账户接管。

应用自身也可能触发：前端 [backendFetch](H:/Cansoria/frontend/src/lib/server-medusa.ts:72) 设置了 15 秒上游超时，慢签发超过此时间时 BFF 会终止连接。原生签发 handler 等待工作流完成后才响应，因此连接结束与业务结束不能混为一谈。

**复现：**使用 Node `v22.20.0` 真实本地 HTTP server/client，加上当前实际中间件；客户端在下游工作完成前断开，然后服务端调用 `end()`。记录为：

- close 时：`writableEnded=false`、`destroyed=true`；
- 工作完成后：`writableEnded=true`、未触发 finish、锁未释放；
- 后续相同 identifier 请求：模拟锁获取超时后，当前中间件返回 503。

HTTP 断连和事件是实际运行；业务工作与锁服务为隔离模拟，没有操作真实重置 token、账户或 Redis。现有单测在 close 后人工 `emit("finish")`，因此没有暴露真实断连后的行为。

**修复要求：**让锁直接等待实际签发/消费/更新操作的 Promise，并在其 finally 释放；权威 token 消费仍应使用原子消费机制。不要重新用固定定时器或无条件 close 解锁来修，否则会恢复上次的并发漏洞。

**验收：**真实 HTTP 下依次覆盖正常完成、提前断连、BFF 超时、业务抛错和超过 30 秒的下游停顿。业务尚在运行时不得释放，实际工作结束后必须释放；随后同一邮箱能重新申请链接，同一 token 最多成功消费一次。

## 2. P2：恢复旧邮件的查询失败时，仍会发送新的不兼容内容

位置：[send-notification.ts:145](H:/Cansoria/backend/src/lib/send-notification.ts:145)，调用处 [send-notification.ts:112](H:/Cansoria/backend/src/lib/send-notification.ts:112)。

新增 `recoverRenamedPayload` 已能在正常查询下找回改名记录。但 catch 把数据库异常直接转换为 null；调用者又把 null 当成“确实首次发送”，继续使用新 payload。恢复查询失败只能说明无法判断旧内容是否存在，不能证明不存在。

触发条件仍是上次的改名后、新建前故障窗口，加上本轮恢复查询暂时失败。新内容会以原幂等键提交，重新引入同键不同内容的错误。更糟的是，这次新记录已能创建并以 failure 保存，后续查询恢复正常后代码优先使用这条新失败记录，持续复用错误内容，不再回查原始 attempt。

Resend 对相同幂等键、不同 payload 返回 `409 invalid_idempotent_request`，参见 [官方合同](https://resend.com/docs/dashboard/emails/idempotency-keys)。

**复现：**执行当前实际 helper，使用内存通知记录并模拟远端合同：

- 恢复查询正常：发送一次，复用原始数据，第二次去重成功；
- 恢复查询仅第一次抛错：两次重试都提交新数据、都模拟返回 409；即使后续查询恢复，仍无法自动回到旧内容。

没有调用真实邮件服务；409 为模拟官方合同的结果。现有新增测试 `falls back to a genuine first send when the recovery query cannot run` 正在把这个不安全的回退行为当成预期结果。

**修复要求：**区分“查询成功且确实无历史记录”与“查询失败”。后者应传播可重试异常，不新建通知、不发送邮件；只有确定首次发送时才能采用新 payload。已有 attempt 但数据损坏也不应悄悄视为首次发送。

**验收：**恢复查询失败时 create/send 调用均为零；下一次查询恢复后，继续使用最初的内容。保留正常首次发送、普通失败重试、改名后崩溃和 success 去重覆盖。

## 3. P2：确认页跨订单状态清理不完整，可能永远等待

位置：[page.tsx:113](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:113)、[恢复短路条件](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:138)。

Cookie 与缓存的订单身份优先级已经正确，但切换订单时只清除部分状态，留下两个可复现的失配。

### 3a. A → B → A 后卡在验证页

没有有效 sessionStorage 确认缓存时，先成功验证 A；导航 B 后请求仍在途，此时返回 A。切换 effect 已把 `recoveryOutcome` 清空，但没有清除 `recoveredFor`，它仍为 A。渲染认为 A 尚待验证，恢复 effect 却因 `recoveredFor === orderId` 跳过请求。B 请求被取消后，没有任何剩余结果可以解除等待。

**复现：**实际组件结合仓库已有 hook fixture，依次执行 A 已验证、B 待返回、回到 A；最后持续显示 `Verifying your order reference`，请求列表仅 A、B，没有重新请求 A。

### 3b. 注册请求跨订单返回后，按钮持续禁用

在订单 A 确认页发起注册，请求未结束前切换到持有有效缓存的订单 B。切换 effect 没有重置 `registering`；随后 A 请求失败并结束，因为身份不同，finally 又跳过 `setRegistering(false)`。B 页显示 `Creating Account...`，按钮一直 disabled，无法发起新的注册。

**复现：**实际组件、延迟拒绝的注册 mock；旧请求已结束，新订单邮箱已显示，但按钮仍为 Creating Account/disabled。没有创建真实账户。

**修复要求：**将验证状态、验证对应的订单 ID、注册状态和异步结果统一绑定到当前订单；切换时原子地重置整组状态或按订单保留完整结果。不要留下“已验证 ID 但无结果”或“无在途请求但 busy=true”的组合。

**验收：**覆盖 A→B→A（B 请求 pending/失败）、注册 A pending 时切换 B 后 A 成功/失败，以及旧响应不得覆盖新页面。继续保留本轮已修复的旧 Cookie A＋新缓存 B 测试。

## 上次四项的本轮判定

| 上次问题 | 当前判定 |
| --- | --- |
| 30 秒定时解锁导致重复消费 | 定时器已删除；该具体路径已移除，但断连后的锁永久占用必须修复，不能整体关闭重置锁生命周期问题。 |
| 邮件改名/新建之间故障丢失旧内容 | 正常恢复已通过；恢复查询失败仍回到错误发送路径。 |
| 旧引用 Cookie 与新缓存混合显示 | 已通过本轮实际组件复核：新缓存优先，Cookie 同步为新订单；此前具体问题可关闭。 |
| CMS 404 补回静态关联文章 | 已通过本轮实际函数复核：404 返回空列表；此前具体问题可关闭。 |

## 检查与证据

- 后端：45 套件、485 项测试通过。[结果](H:/Cansoria/audits/2026-10-13/fourth-review/backend-tests.json)
- 前端：24 套件、152 项测试通过。[结果](H:/Cansoria/audits/2026-10-13/fourth-review/frontend-tests.json)
- 合计 637 项；前后端 `tsc --noEmit --incremental false` 和前端 ESLint 均通过，`git diff --check` 通过。
- 额外复现和已修复路径核验：[脚本](H:/Cansoria/audits/2026-10-13/fourth-review/probes.cjs)、[输出](H:/Cansoria/audits/2026-10-13/fourth-review/probes.json)。脚本复用了第三次审核脚本中的 TypeScript loader，未执行其旧断言。从项目根运行 `node audits/2026-10-13/fourth-review/probes.cjs`。HTTP 仅绑定 127.0.0.1 临时端口。
- 现有测试在已获准的沙箱外运行；本地 HTTP 探针在沙箱内无法完成，终止后在获准环境成功运行。
- 本次没有生产构建、浏览器 E2E、真实 PostgreSQL/Redis 并发、真实重置/支付/邮件操作或新一轮依赖审计。范围是本轮修复及相邻路径，未将未执行的部署验收视为已通过。
