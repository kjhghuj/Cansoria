# Cansoria 最新代码审核与剩余问题

审核日期：2026-10-10（Asia/Shanghai）。对象：`H:\Cansoria` 当前未提交工作树，HEAD `d65f8eb`。这是上次[复审](H:/Cansoria/LAUNCH_READINESS_RECHECK_2026-10-10.md)之后的重新核查，旧文档保留为历史快照，不能继续用其状态描述最新代码。

**结论：这一轮确实修好了一批问题，但还需要修改。优先处理新增订单读取凭证可用于认领、密码重置 token 并发消费、通知失败/重放不能可靠恢复这三项 P1。营业态商品正文、多区域、确认页与浏览器存储、CMS 内容模式、营销能力门控仍有明确残余。**

本次重新运行 548 项测试、类型检查、lint、前后端构建及官方生产依赖审计；检查实际安装的 Medusa 源码，并对关键问题执行实际函数配合内存服务的隔离复现。只新增报告和审核证据，未修改业务源码、业务数据、账户归属或外部服务。没有把进度文档中的完成声明当成证据。

## 1. 优先修改的代码问题

### F01／P1：新增只读订单 cookie 也能认领游客订单

定位：[完成响应签发](H:/Cansoria/backend/src/lib/cart-fields.ts:32)、[cookie 自动转发](H:/Cansoria/frontend/src/lib/server-medusa.ts:49)、[认领接口](H:/Cansoria/backend/src/api/store/orders/transfer/route.ts:11)。

完成接口为确认页恢复签发 `purpose="order"`、30 分钟 token。BFF 把它存为 HttpOnly cookie，并自动附加到所有后端请求。认领接口同样接受 `purpose="order"`，没有区分“完成后的读取凭证”和“邮件验证后的认领凭证”。

触发条件：浏览器持有刚完成游客订单的合法 cookie，然后登录或注册另一账户，向认领接口提交该订单编号。即使目标账户邮箱不同、没有完成订单邮件验证，也可更改游客订单归属。

本次使用实际响应投影签发 token、实际 transfer 路由及内存服务复现：返回 200，产生一次模拟归属更新，没有查询账户邮箱/验证状态。[复现证据](H:/Cansoria/audits/2026-10-10/latest-review/order-cookie-claim-probe.json)。需要合法 cookie，已有注册账户的订单归属保护仍存在；**不是无凭证读取或窃取任意订单**。变化来自直接完成时签发原本也可认领的 token，而不是伪造 URL 编号。

修复要求：分离订单读取与邮件验证/认领的 token 目的和权限；transfer 只接受适当的认领证明；BFF 仅在限定 GET 读取接口自动附加读取 cookie。保留后台签名、订单 ID 绑定和既有归属校验。验收读取 cookie 能恢复本订单，但不能用于 transfer；邮件验证认领仍正常，其他账户/订单不可越权。

### F02／P1：密码重置 token 的单次消费缺少并发原子保证

定位：[认证路由消费入口](H:/Cansoria/backend/node_modules/@medusajs/medusa/dist/api/auth/utils/validate-token.js:21)、[安装版 consume 实现](H:/Cansoria/backend/node_modules/@medusajs/auth/dist/services/auth-module.js:364)、[底层删除](H:/Cansoria/backend/node_modules/@medusajs/utils/dist/modules-sdk/medusa-internal-service.js:285)。

安装版先查询有效 token，再删除记录；没有在消费处使用行锁/原子条件删除，也没有检查删除是否真正影响一行。两个请求同时查到同一 token，第二个删除影响零行时，底层返回空数组，consume 仍接受它，两个请求可进入密码更新。

本次执行实际安装消费函数，使用同步两次查询的内存 repository：两次均成功，删除影响行数 `[1, 0]`。[复现证据](H:/Cansoria/audits/2026-10-10/latest-review/auth-recovery-probe.json)。**未执行真实 PostgreSQL 并发写入**；确认的是消费算法缺少足够原子约束，不声称真实账户已遭重复重置。

已修基础约束应保留：JWT 有效期 900 秒，过期 JWT/数据库 token 被拒绝，顺序第二次消费被拒绝。问题不是 token 无限有效或可任意顺序复用。

修复要求：通过持久的兼容升级/补丁或应用级可靠约束，实现原子消费并确认影响行数；并发签发也要核验。不能直接编辑 `node_modules` 作为可部署修复。验收真实 PG 下两个并发请求只有一个能继续更新，顺序/过期/重新签发场景一致。

### F03／P1：Redis 已配置，但通知失败和崩溃重放仍无法可靠恢复

定位：[订单异常处理](H:/Cansoria/backend/src/subscribers/order-placed.ts:90)、[欢迎异常处理](H:/Cansoria/backend/src/subscribers/customer-created.ts:55)、[密码重置异常处理](H:/Cansoria/backend/src/subscribers/password-reset.ts:40)、[原生通知处理](H:/Cansoria/backend/node_modules/@medusajs/notification/dist/services/notification-module-service.js:51)。

这次 Redis event bus/workflow 配置、5 次退避和订单稳定幂等键已经加上，不能再说它们没有实现。但仍有三个断点：

- 三个 subscriber 捕获错误后只写日志、不抛出。Redis worker 只把拒绝的 subscriber 当失败；当前处理器正常返回，被标记完成，`attempts: 5` 不会补发这次失败。
- 安装通知模块重试同幂等键的 FAILURE 时，为发送生成新 `noti` ID，却不创建该 ID 的记录，发送后 update 新 ID 会 NOT_FOUND。本次执行实际通知模块和内部 update 服务、配合内存 repository，复现首次失败后第二次发送成功但状态更新失败。
- 如果通知记录 PENDING 已提交、发送前进程崩溃，重放同键时模块只重试 FAILURE，PENDING 被跳过，返回 undefined 且发送次数为 0；欢迎 subscriber 还可能继续设置“已发送”标记。

上述没有真实发送邮件或重启生产服务。[通知复现证据](H:/Cansoria/audits/2026-10-10/latest-review/notification-retry-probe.json)。当前也未找到可操作的补发任务/管理接口；日志写“must be resent”不等于已有补发流程。

修复要求：让失败进入可重试状态，检查真实通知结果，解决当前框架同键失败重试的 ID 问题；为僵死 PENDING 建立恢复/重发策略；提供告警和人工补发路径。验收服务暂时失败、失败后重试、发送前后崩溃、重复事件、多实例和过期重置邮件；不能仅把 catch 改为 throw 就宣布闭环。

### F04／P2：未经授权确认的引用也显示“订单已确认”，刷新恢复仍不完整

定位：[确认页选择引用](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:61)、[清除查询参数](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:74)、[授权查询](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:81)、[成功展示](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:160)。

格式正确的 `?ref=order_...` 直接成为 orderId。即使后端返回 403、订单不存在或查询失败，页面仍显示 “Order Confirmed / We have received your order”。这只是错误确认展示；后台签名和归属保护仍阻止未经授权读取真实数据。

另一个残余：禁用 sessionStorage 时，首次 `?ref` 跳转可以尝试授权恢复，但页面立即清掉 ref；刷新/新标签页后既无缓存又无引用，cookie 仍有效也不会发起恢复查询。

修复要求：区分待验证引用、已确认和查找失败状态；只有可靠完成结果或授权查询成功时展示确认。提供安全的服务器恢复入口/受控引用生命周期，覆盖禁用存储后的刷新和新标签。缓存写入 best-effort 已修，应保留；不能因展示恢复失败再次发起付款。

### F05／P2：密码 token 与订单 ref 的模块全局缓存污染下一次导航

定位：[重置页缓存](H:/Cansoria/frontend/src/app/account/reset-password/page.tsx:9)、[确认页缓存](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:16)。

`cachedResetToken` / `cachedOrderRef` 位于模块全局，使用 `??=` 只记住第一次非空值。同一 SPA 会话进入第二个重置链接或第二个无缓存订单，仍使用第一个 token/ref。实际源码隔离执行已复现查询值 B 返回 A，见[探针](H:/Cansoria/audits/2026-10-10/latest-review/auth-recovery-probe.json)。

修复要求：将值绑定到本次页面实例/导航，在清理 URL 后保留本次值，并能响应下一次合法链接。验收连续两次重置和连续两笔订单的导航。

密码恢复 UI 还须补齐：[忘记密码页](H:/Cansoria/frontend/src/app/account/forgot-password/page.tsx:24) 把 429 当成请求成功，应展示统一限流提示；[重置请求](H:/Cansoria/frontend/src/app/api/auth/[action]/route.ts:39) 仅 trim 邮箱，不像登录支持大小写回退，规范化账户用混合大小写可能收不到邮件。处理时需兼容已有大小写身份，不能简单破坏旧账户。

### F06／P2：其他浏览器缓存异常仍打断购物车恢复和登出

定位：[Providers 读取](H:/Cansoria/frontend/src/lib/providers.tsx:222)、[写回](H:/Cansoria/frontend/src/lib/providers.tsx:242)、[登出](H:/Cansoria/frontend/src/lib/providers.tsx:339)、[完成车清理](H:/Cansoria/frontend/src/lib/providers.tsx:362)。

认证初始化卡住 loading 的原问题已修。但 getItem 抛错会在读取服务器保存购物车之前终止恢复；setItem 配额异常会丢弃已经成功获取的有效 savedCart；登出接口成功后 removeItem 抛错会阻止清理内存用户，界面仍显示登录；已完成购物车清缓存失败也阻止清空内存状态。

本次实际 Providers 配合现有 hook fixture 和 mock 服务复现前三种残余，同时确认 authLoading 能结束。[前端探针](H:/Cansoria/audits/2026-10-10/latest-review/frontend-probe.json)。

修复要求：逐处缓存读写/删除 best-effort，服务器和内存状态更新独立于缓存成功与否。验收禁用存储、容量满、退出和已完成车恢复，不丢有效服务器车、不显示假登录状态。

### F07／P1（开放订单前）：营业态商品正文仍被二次覆盖，承诺未统一

定位：[服务器转换](H:/Cansoria/frontend/src/app/product/[handle]/page.tsx:73)、[客户端二次转换](H:/Cansoria/frontend/src/app/product/[handle]/components/ProductClient.tsx:147)、[商品卡预览承诺](H:/Cansoria/frontend/src/components/ProductCard.tsx:181)。

服务器按 ordersOpen 保留后台内容，ProductClient 却再次调用 `studioProduct(rawProduct)`，没有传营业状态，恢复筹备分支并覆盖 subtitle/description。页面正文变成筹备文案，而 metadata/JSON-LD 仍是后台正式内容。实际双调用探针已复现。故事在服务器处理部分已保留，不能继续声称所有故事被清空。

详情 FAQ、ProductInfo、ProductActions、Footer、结账等仍有无条件筹备文字。商品卡还用“字段不是 false”默认显示 Free Preview，后台未明确提供该服务也会出现该承诺。

修复要求：整个商品展示使用同一营业状态及审核内容，避免二次默认转换；只有明确确认 true 的服务字段才展示承诺；统一正文、政策、FAQ、结账、页脚和 SEO。[getStoreMetadata](H:/Cansoria/frontend/src/lib/medusa.ts:37) 现在是商品/metadata 必经请求，还须有界超时，避免后端无响应拖住页面。

当前本地 store 的 orders_open 未开启，后端关门保护有效；本项主要在启用营业态时触发，不能仅切开关就认为正式内容准备完成。

### F08／P2：营销弹窗与生产聊天仍漏能力门控

定位：[弹窗挂载](H:/Cansoria/frontend/src/components/LayoutWrapper.tsx:80)、[弹窗触发](H:/Cansoria/frontend/src/components/ExitIntentPopup.tsx:42)、[聊天开关](H:/Cansoria/frontend/src/app/layout.tsx:43)、[生产聊天预算保护](H:/Cansoria/frontend/src/lib/chat-controls.ts:161)。

交易路径及子路径的弹窗/聊天排除已修，Footer 订阅也已按整套能力隐藏。但普通 cart/search/shipping 等页面仍无条件挂 ExitIntentPopup；它不读取 newsletterEnabled，缺验证码/Klaviyo 也会十秒弹出，用户无法完成订阅。其 localStorage 操作也未容错。

聊天展示只检查 GEMINI key，生产接口却要求 CHAT_REDIS_URL；只有模型 key、没有预算 Redis 时界面显示聊天而全部消息 503。

修复要求：弹窗与 Footer 复用完整能力状态；生产聊天开关包含其必需预算配置；弹窗存储 best-effort。验收配置组合和交易/普通页面行为一致。

### F09／P2：CMS 列表已分模式，但 Hero、详情、搜索和 sitemap 没统一

定位：[Hero 默认回退](H:/Cansoria/frontend/src/components/journal/JournalHero.tsx:30)、[详情回退](H:/Cansoria/frontend/src/app/journal/[slug]/page.tsx:279)、[搜索](H:/Cansoria/frontend/src/components/SearchOverlay.tsx:58)、[sitemap](H:/Cansoria/frontend/src/app/sitemap.ts:43)。

默认静态模式不请求 CMS、各读取请求默认 5 秒超时，这两点已修。剩余问题：健康 CMS 没有文章时，列表传 featured=null，Hero 却补出旧文章；健康 CMS 已删除/不存在的 slug，详情页仍用静态 fallback；搜索一直搜本地 ARTICLES，仍能发现 CMS 已下架内容。当前默认静态模式中，getArticles 返回空数组，页面显示的静态文章却未进入 sitemap。

修复要求：所有内容出口共享最终内容集及 source/status；健康 CMS 缺文章应空态/404，只有明确 static/error 策略才回退；Hero 不自行补文章，搜索/sitemap 与当前模式一致。实际探针确认 static 的 0 次 fetch 和健康空列表仍展示 fallback，[证据](H:/Cansoria/audits/2026-10-10/latest-review/frontend-probe.json)。

### F10／多地区销售为 P1：区域仍固定英国，账户地址未补州省

定位：[Provider](H:/Cansoria/frontend/src/lib/providers.tsx:148)、[商品页](H:/Cansoria/frontend/src/app/product/[handle]/page.tsx:51)、[搜索页](H:/Cansoria/frontend/src/app/search/page.tsx:17)、[账户地址](H:/Cansoria/frontend/src/app/account/components/AddressesContent.tsx:52)。

英国、美国、欧洲后端区域存在，但前台仍固定 getRegion("gb")，没有区域切换。结账 state/province、Stripe state、按国家必填和支付地址失效键已修；账户地址管理仍没有省州输入/写入，允许美国地址时资料不完整。

修复要求：落实已记录的多地区目标，或明确收缩销售范围；切区同步价格、币种、运费、税和支付会话；账户地址与结账使用一致模型。分别验收英国、美国和一个现有欧洲国家，包含切区重算与省州持久化。

## 2. 最新修复状态与仍需准备的事项

| 原编号 | 最新准确状态 |
| --- | --- |
| 01 依赖 | uuid/otel-pg 相关条目已清；前端生产审计 0，后端剩 80 包条目，见下文。 |
| 02 金额单位 | 主单位代码和回归测试仍通过；不能重新指为原单位缺陷。 |
| 03 邮件金额 | 仍已修；邮件送达/恢复问题归 F03 和服务配置。 |
| 04 图片清理 | 删除持续关闭；本地公开/私有目录分离，S3 命名空间和保留/恢复待做。 |
| 05 保存前删图 | 原风险仍已阻断，没有发现重新启用删除。 |
| 06 共享完成校验 | 仍已实现；真实 PG/Redis/Stripe 并发/恢复验收未完成。 |
| 07 访客限流 | 签名访客、Redis、总量预算和按需建车仍在；没有重复判为共享单桶。 |
| 08 服务配置 | 本地文件中 Stripe/Resend/S3/照片秘密等仍缺；不能把构建或 health 200 当功能可用。 |
| 09 营业状态 | 后端门控已实现；前台内容与承诺仍见 F07。 |
| 10 事件/通知 | Redis 模块和订单幂等键已实现；恢复仍有 F03。 |
| 11 自动扣款 | 新 intent 已配置 capture:true，前端新支付仅接受 succeeded；旧会话和真实扣款需验收。 |
| 12 国际地址 | 结账州省已修，区域切换/账户地址仍见 F10。 |
| 13 免邮 | 当前后端仍无最低金额；这是待确认政策，不自动判错误。 |
| 14 找回密码 | 页面、代理、模板、限流、15 分钟/顺序单次已实现；F02/F05/F03 尚未关闭。 |
| 15 注册与认领 | 密码下限 8 和引导文案已修；新凭证权限问题见 F01。注册成功提示应引导到查询页申请验证，不要暗示自动发了认领链接。 |
| 16 缓存/恢复 | 缓存写入和 authLoading 原缺陷已修；F01/F04/F05/F06 仍有残余。 |
| 17 CMS | 默认 static 和有界请求已修；内容出口一致性见 F09。 |
| 18 营销/聊天 | 交易路由排除、Footer 和模型 key 开关已修；F08 仍有缺口。 |

本次配置检查仅针对本地 `.env` / `.env.local`，不读取或公开秘密，不代表其他进程注入或线上配置：[配置存在性](H:/Cansoria/audits/2026-10-10/latest-review/env-presence.json)。Stripe 前端 key/API key/webhook secret、Resend API key、PORTRAIT_PHOTO_SECRET 和 S3 必需组合仍缺；Turnstile/Klaviyo、联系方式和聊天预算也未接通。STORE_VISITOR_SECRET 两端已配且相同、REDIS_URL 已配。

04 必须保持物理删除关闭，完成 S3 公私命名空间、废弃上传保留、可恢复隔离、备份及最终删除前引用重查。09/13 的制作地点、材料、工期、预览/修改、取消退款、联系方式和免邮基数需要真实业务决定，不能自动编造。

自动扣款兼容边界：capture:true 不会把已有 manual intent 自动改为 automatic。本次本地支付会话和 payment 均为 0，没有发现需要迁移的在存授权。使用实际原生工作流/生产 hook 的内存复现确认：自动付款已成功但本地 session 尚 pending、店铺刚关闭时，浏览器完成暂时被拒，正常 SUCCESSFUL webhook 同步付款后能完成；**不是已证明的永久丢单**。旧 manual 授权在闭店条件下的 AUTHORIZED 回调仍可能被门控阻止，应作为导入/升级/在途兼容验收，见[支付探针](H:/Cansoria/audits/2026-10-10/latest-review/closed-store-payment-probe.json)。

## 3. 依赖审计最新结果

| 项目 | Critical | High | Moderate | Low | 受影响包条目 |
| --- | ---: | ---: | ---: | ---: | ---: |
| frontend | 0 | 0 | 0 | 0 | 0 |
| backend | 0 | 77 | 3 | 0 | 80 |

这是本次官方 registry 的实际结果；不能继续引用上轮 17 High/66 Moderate。High 条目由同一 braces 公告经依赖链传播，Moderate 为 sprintf-js；80 条目不是 80 个已证实可利用的独立漏洞。

uuid 11.1.1 和 instrumentation-pg 0.73.0 的 lockfile/安装版本已核对，相关审计条目已消除。[版本证据](H:/Cansoria/audits/2026-10-10/latest-review/dependency-versions.json)。剩余 [braces 公告](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 和 [sprintf-js 公告](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) 本次查询仍无补丁。

应用源码未发现将请求参数作为 glob/格式字符串传入这些包的路径，不能把审计计数直接说成外部可利用；仍需保留最终生产运行/构建暴露分析和上游修补计划。兼容修补后再审计，不强制降级 Medusa。

证据：[后端审计](H:/Cansoria/audits/2026-10-10/latest-review/backend-npm-audit.json)、[前端审计](H:/Cansoria/audits/2026-10-10/latest-review/frontend-npm-audit.json)。

## 4. 本次验证与边界

| 检查 | 结果 | 证据 |
| --- | --- | --- |
| 后端单测 | 40 suites / 415 tests 通过 | [日志](H:/Cansoria/audits/2026-10-10/latest-review/backend-tests.log) |
| 前端安全测试 | 21 suites / 133 tests 通过 | [日志](H:/Cansoria/audits/2026-10-10/latest-review/frontend-tests.log) |
| 前后端 TypeScript | 均通过 | [前端](H:/Cansoria/audits/2026-10-10/latest-review/frontend-types.log)、[后端](H:/Cansoria/audits/2026-10-10/latest-review/backend-types.log) |
| 前端全量 lint | 通过 | [日志](H:/Cansoria/audits/2026-10-10/latest-review/frontend-lint.log) |
| 前端默认构建 | 通过，本次无 CMS 426 日志 | [日志](H:/Cansoria/audits/2026-10-10/latest-review/frontend-build.log) |
| 后端/管理端构建 | 通过 | [日志](H:/Cansoria/audits/2026-10-10/latest-review/backend-build.log) |
| 当前本地 HTTP | 后端 health、前端首页 200；直接 CMS GET 426 | [GET 汇总](H:/Cansoria/audits/2026-10-10/latest-review/current-http.json) |
| 当前 PG 只读汇总 | 1 store 未开启订单；支付会话/payment 为 0；三地区存在；免邮无金额门槛 | [汇总](H:/Cansoria/audits/2026-10-10/latest-review/current-data.json) |
| 实际函数隔离探针 | 上述凭证、消费、缓存、内容及通知问题已验证；模拟依赖、非 DOM/E2E | 各问题节的 JSON |

548 项既有测试通过说明已有覆盖未回归，不能证明新增缺口已覆盖。特别是当前密码重置测试的“surfaces failed send”只检查日志，并未要求处理器拒绝/事件重试。

本次未进行真实数据库并发密码重置、真实订单转移、Stripe/Resend/S3 调用、完整浏览器交易或真实多实例崩溃重放；不能把隔离探针扩大为真实服务验收。直接 CMS 仍 426，但当前默认静态模式已不依赖它，不能再写成构建正在被 CMS 426 影响。

下一轮先修 F01/F02/F03，再补 F04–F10；接通测试服务后验证游客/账户交易、金额、邮件、认领、3DS/拒付/捕获/退款、并发回调和崩溃恢复。正式业务信息、免邮政策和存储生命周期完成后，再做独立部署验收。
