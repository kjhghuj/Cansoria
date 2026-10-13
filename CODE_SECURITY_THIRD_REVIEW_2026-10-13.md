# Cansoria 两轮修复后的第三次代码审核

日期：2026-10-13（Asia/Shanghai）。基于 HEAD `6964cbb` 及当前未提交改动、新增文件。对照前两份审核报告，检查修复相关代码、安装中的框架实现，并重新执行测试和隔离复现。本次只新增本报告和 `audits/2026-10-13/third-review/` 下的审核证据，没有修改业务代码。

**结论：本轮确认仍有 4 个可修复缺陷：1 个 P1、3 个 P2。多数前次修复已生效；剩余问题集中于超时、部分失败及多个状态来源的一致性。不能据本报告宣称整个系统不存在其他问题。**

## 1. P1：密码重置在 30 秒后仍可重复消费同一 token

位置：[auth-guards.ts:71](H:/Cansoria/backend/src/lib/auth-guards.ts:71)，以及安装框架的 [auth-module.js:363](H:/Cansoria/backend/node_modules/@medusajs/auth/dist/services/auth-module.js:363)。

Header 大小写/空白归一化和提前断连保护已经补上，但 `setTimeout(done, RESET_LOCK_RELEASE_MS)` 在 30 秒时无条件结束锁内 Promise。它既不取消也不等待已经由 `next()` 启动的 token 消费和密码更新。`locking.execute` 的等待超时不能弥补这个应用层主动释放。

触发条件：持有有效重置 token；第一个请求已读到 token 行，但后续身份查询或删除等操作因数据库拥塞等原因阻塞超过 30 秒。定时器释放锁后，第二个相同 token 请求可以读到尚未删除的行。原生消费逻辑仍是先读后删，不检查删除影响行数，因此两个请求都可能通过消费并进入密码更新。这不是无需 token 即可重置任意账户的漏洞。

**复现结果：**执行当前 guard 和从已安装框架读取的实际消费方法，在内存 repository 中暂停第一次身份读取，用受控定时器触发真实 30 秒 bailout。两个请求均返回消费成功；删除影响行数为 `[1, 0]`。没有运行真实 PostgreSQL/Redis 并发或真实密码修改。

**修复与验收：**在权威消费层实现原子条件删除/事务锁并检查实际消费结果，使用可部署的实现或持久补丁。应用锁如继续保留，必须等待实际工作终止；仅延长固定时间不能消除竞争。覆盖下游停顿超过 30 秒、断连、并发请求，确保最多一次消费及一次允许的密码更新。

## 2. P2：邮件重试在改名与新建之间失败，会丢失原发送内容

位置：[send-notification.ts:109](H:/Cansoria/backend/src/lib/send-notification.ts:109)。

正常重试现已复用 `prior.data`，同键发送也已加锁并验证 success。但先改旧记录的幂等键，再调用 `createNotifications`，是两个独立持久化阶段。若改名已成功，而新通知插入前数据库报错或进程退出，下次重试按原始键查询会返回空，走首次发送分支。虽然旧内容还在 `:attempt:<id>` 记录里，当前代码不会找回它，订单 subscriber 又会重新签发链接。

触发条件：原邮件被远端接收但本地未确认；之后重试恰好在改名后、新建前失败。再次重放会以同一原始幂等键提交不同链接/内容，恢复失败。Resend 对同键不同 payload 返回 `409 invalid_idempotent_request`，并保留幂等键 24 小时，见 [官方幂等文档](https://resend.com/docs/dashboard/emails/idempotency-keys)。

**复现结果：**执行当前 `sendNotification`，模拟旧失败记录、成功改名和插入前数据库失败，再执行第二次重试；原键记录数为 0，实际传给发送层的是新数据而非仍存在的旧数据。模拟 Resend 合同返回 409。没有调用真实邮件服务；409 是按官方合同模拟的结果。

**修复与验收：**使逻辑发送键对应的原始 payload 始终可恢复；例如用独立持久发送记录保存内容，或在事务中完成旧记录迁移和新待发送记录创建，再执行外部发送。不能把远程邮件调用当成数据库事务的一部分。验收需在改名前后、新建前后、远端成功后注入失败，确认所有自动重试仍复用相同内容。

## 3. P2：新订单缓存会与旧订单 Cookie 混用，显示错误订单号

位置：[page.tsx:84](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:84)。

`activeConfirmation` 只检查缓存是否匹配 URL ref；URL 没有 ref 时，它接受任意有效缓存。但下一行选择 `orderId` 时，`rememberedOrderId` 又优先于缓存订单号。因此旧 Cookie=A、新缓存=B 时，页面显示 A 的订单号和 B 的邮箱，并因为已有 `activeConfirmation` 跳过授权读取。

这个组合可以正常发生：某个标签页通过 ref 恢复订单 A，设置跨标签页共享的引用 Cookie；另一个标签页完成订单 B，成功保存自己的 sessionStorage，结账代码跳转不带 ref 的 `/order/confirmed`。当前缓存保存和正常确认路径均不会同步更新旧引用 Cookie。

**复现结果：**实际组件配合仓库现有 hook fixture，Cookie=`order_old`、缓存=`order_new`：显示 `Order Confirmed!`、旧订单编号和新订单邮箱，服务端验证调用 0 次。属于错误确认信息，未发现它绕过后端读取权限。

**修复与验收：**先统一选定订单身份，再只使用与该身份一致的缓存、邮箱和状态。没有显式 ref 时，成功结账的新缓存应优先于旧引用 Cookie；保存新订单时同步引用也可防止后续刷新串单。测试跨标签页 A Cookie+B 缓存、显式 ref 覆盖缓存、存储禁用及刷新。

## 4. P2：CMS 关联文章收到 404 后仍会补回静态旧文

位置：[cms.ts:525](H:/Cansoria/frontend/src/lib/cms.ts:525)。

文章页已经移除无条件 concat，搜索也能接受健康空数组。但新的 `getRelatedArticles` 对所有非 2xx 响应都调用静态回退，包括表示关联资源不存在的 404。只要被删除/下架文章的 ID 与内置静态文章 ID 相同，关联区仍会出现那篇旧文。仅在 200+`data:null` 时返回空，未覆盖实际的 404 响应。Strapi 的 NotFoundError 使用 404，见 [官方错误处理文档](https://docs.strapi.io/cms/error-handling)。

**复现结果：**执行当前 `getRelatedArticles([1])`，模拟 CMS 404，返回 1 篇内置文章，slug 为 `how-to-turn-a-photo-into-a-hand-painted-oil-painting`。

**修复与验收：**将 404/明确不存在视为权威缺失，直接忽略；将网络不可用、5xx 等故障与内容缺失分开处理。测试真实响应形状的 404、200+空内容、5xx 和静态模式，确认下架内容不重新出现。

## 已验证的进展

- 订单读取与认领 token 已拆分；BFF 的完成 cookie 只随读取发送。
- 密码重置锁键已归一化，提前 close 不再立即释放；剩余为上面的固定超时问题。
- 通知普通重试已复用存储数据；PENDING/undefined 不再被当成发送成功；人工补发拒绝旧重置链接，订单补发会重新签发链接。
- shipping-methods 和 taxes 新包装路由已在购物车身份锁内重新授权并等待原生处理完成，相关测试通过。
- 显式 ref 与缓存冲突、连续两笔订单、连续重置链接的已有测试通过；新增引用 Cookie 的优先级冲突仍需修复。
- 搜索的健康空 CMS、不确定期间不展示旧文已覆盖；关联文章还缺 404 分支。

## 验证和边界

- 后端：45 个套件、481 项测试通过，见 [backend-tests.json](H:/Cansoria/audits/2026-10-13/third-review/backend-tests.json)。
- 前端：23 个套件、147 项测试通过，见 [frontend-tests.json](H:/Cansoria/audits/2026-10-13/third-review/frontend-tests.json)。合计 628 项。
- 前后端 `tsc --noEmit --incremental false` 通过；前端 ESLint 通过。
- 4 个额外边界复现已执行，见 [脚本](H:/Cansoria/audits/2026-10-13/third-review/probes.cjs) 和 [结果](H:/Cansoria/audits/2026-10-13/third-review/probes.json)。从项目根目录运行 `node audits/2026-10-13/third-review/probes.cjs` 可重跑；不访问真实数据库、支付或邮件。
- 现有测试最初因 Windows 沙箱 realpath 权限错误未能启动，后在获准的沙箱外执行成功。此环境错误不算代码缺陷。
- 没有重跑生产构建、浏览器 E2E、真实 PostgreSQL/Redis 故障测试、支付或邮件送达验收，也没有重新执行依赖 audit。本报告不把历史依赖数字当成本次结果。
- 本次重点是两轮修复及其相邻路径。营业文案、地区销售范围、存储桶策略和部署配置仍需按实际启用范围验收，不将这些未验证项混入上述 4 个已确认缺陷。
