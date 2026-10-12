# Cansoria 开业准备复审与剩余修复清单

复审日期：2026-10-10（Asia/Shanghai）。依据：[原审计文档](H:/Cansoria/LAUNCH_READINESS_AUDIT_2026-10-09.md)。对象：`H:\Cansoria` 当前工作树，包括尚未提交的修复；Git HEAD 为 `d65f8eb`。

**结论：已有明确修复，但仍不具备完整收单条件。02、03、05、07 的原缺陷可以关闭；06 的回调绕过校验问题也已修复，但真实支付及恢复验收尚未闭环。01、04 仅部分完成，08–18 仍有待办，其中 13 需要业务决策。**

本次以当前源码、实际安装的框架代码、新运行的测试/构建/官方 npm 审计、当前本地数据库只读事务为依据。`REPAIR_PROGRESS.md` 和历史验收文件只作为线索，不以“已完成”声明代替核查。范围仍限本地，没有审核正式部署、线上配置或真实账户；没有修改应用逻辑、运行价格迁移、写入业务数据库、真实删图、发送邮件或发起支付。

## 1. 原 18 项的准确状态

“已修复”表示原文指出的具体缺陷在当前实现中已消除，并有本地验证支持；不等于整个电商流程已通过真实交易验收。“部分修复”表示仍有明确实现待办；“核心修复、待验收”表示应保留验收任务，不能重复描述成原漏洞仍存在。

| 原编号 | 问题 | 当前判定 | 本次确认与剩余内容 |
| --- | --- | --- | --- |
| 01 | 依赖漏洞 | **部分修复** | Next/React/Medusa 已升级且构建兼容；前端生产依赖漏洞为 0，后端仍有 17 High、66 Moderate 条目。 |
| 02 | 商品、加价、运费单位 | **已修复** | 脚本采用主货币单位；当前数据库 522 条价格全部匹配，未完成购物车的 4 条商品单价也匹配。 |
| 03 | 邮件金额除以 100 | **已修复** | 邮件直接格式化主单位，并正确处理优惠、税、抵扣及舍入；真实投递归入 08/10。 |
| 04 | 全桶清理误删 | **部分修复：危险删除已阻断** | POST 清理恒 410，只读预览限制前缀并检查引用；公开/私有写入隔离、保留与恢复方案尚未实现。 |
| 05 | 保存前删除原图 | **原问题已修复** | 中间件不删图，编辑只改引用，自定义及原生上传删除入口均阻断；安全回收归入 04。 |
| 06 | webhook 绕过自定义校验 | **核心修复、待真实验收** | HTTP/webhook 共用原生完成工作流及 validate hook，修改/认领/照片追加共用 cart 锁；并发支付与崩溃恢复仍需真实验收。 |
| 07 | BFF 顾客共享限流额度 | **原问题已修复** | 签名访客、可信 IP/账户、Redis 与总量预算已实现，购物车按需创建；本地共享签名密钥正确配置。 |
| 08 | 核心服务未配置 | **未完成** | 支付、邮件、私有存储等配置仍缺失；访客签名配置已补齐，不再重复列为缺失。 |
| 09 | 强制筹备展示、覆盖后台内容 | **未修复** | `studioProduct()` 仍覆盖介绍/清空故事；筹备信息与可下单能力没有后端营业状态约束。 |
| 10 | 通知恢复、持久事件/工作流 | **未修复** | 默认仍为 local event bus/inmemory workflow；通知异常被吞，缺稳定订单邮件幂等键及补发任务。 |
| 11 | 自动/人工捕获 | **自动扣款目标尚未实现** | 修复记录写明自动扣款；当前 provider 仍默认 manual，结账接受 `requires_capture`。 |
| 12 | 国际区域与地址 | **未修复** | 前端仍固定英国区域；美国/欧洲后端区域存在但前台不可切换，缺州省输入/写入。 |
| 13 | 免邮条件 | **业务决策待确认** | 源码及当前数据库均无最低金额规则；若全单免邮获确认，可保留。 |
| 14 | 忘记密码 | **未修复** | 链接仍为 `#`，无前端恢复流程或对应代理动作。 |
| 15 | 下单后注册与游客认领 | **未修复** | 安全认领接口已存在，但注册未接入；仍承诺订单历史可见，密码长度仍为 6/8 不一致。 |
| 16 | 浏览器缓存导致错误/无法恢复 | **未修复，并发现关联问题** | 订单缓存写入可抛错；确认页没有授权查询回退；认证初始化清缓存抛错会卡住 loading。 |
| 17 | CMS 不可用与超时 | **未修复** | 本次 GET 仍返回 426，前端构建也记录 426；四处 CMS fetch 无明确超时/静态模式。 |
| 18 | 营销/聊天展示不匹配配置 | **未修复** | 未接通入口仍展示，checkout/account/order 未排除营销弹窗；已有失败关闭保护不能替代展示门控。 |

## 2. 可以关闭的原缺陷，以及不可扩大解释的边界

### 02：金额单位与当前价格数据已确认修好

源码：[统一价格表](H:/Cansoria/backend/src/lib/studio-prices.ts:7)、[种子脚本](H:/Cansoria/backend/src/scripts/seed.ts:66)、[随机商品](H:/Cansoria/backend/src/scripts/create-random-products.ts:115)、[受控价格修复计划](H:/Cansoria/backend/src/lib/price-unit-repair.ts:24)。迁移按明确 SKU/选项/货币及精确旧价处理，已修值为 no-op，不是把全部历史金额盲目除以 100。

本次独立 `REPEATABLE READ READ ONLY` 查询确认：504 条商品价、18 条配送价，`amount` 和 `raw_amount.value` 共 522 条全部匹配当前价格表；8 个未完成购物车中的 4 条商品行均与目录价一致。最小宠物肖像 Canvas Only 为 GBP 85.02 / USD 109 / EUR 100.28；Framed 为 GBP 139.62 / USD 179 / EUR 164.68。英国标准/优先配送为 GBP 9 / 18，免费配送为 0。

证据：[本次数据库汇总](H:/Cansoria/audits/2026-10-10/recheck/current-data.json)。这是当前存储价格与购物车商品单价验证；Stripe 实际扣款、订单/退款全链路一致性仍需交易验收，未用数据库价格正确替代该验收。

### 03：邮件金额缩小 100 倍的问题已消除

[邮件格式化](H:/Cansoria/backend/src/modules/resend/service.ts:28) 不再除以 100；[订单字段与金额派生](H:/Cansoria/backend/src/subscribers/order-placed.ts:17) 和[金额测试](H:/Cansoria/backend/src/modules/resend/__tests__/order-amounts.unit.spec.ts:42) 覆盖主单位、多数量、优惠、税、抵扣和半分舍入。本次完整后端单测包含这些用例，全部通过。

真实邮件发送尚不可验收，属于 08 的凭据和 10 的恢复问题，不应把这两个问题误写成金额修复失败。

### 05：不会再在商品保存之前删除仍引用素材

[原中间件](H:/Cansoria/backend/src/api/middlewares/product-image-cleanup.ts:8) 已退役为直接 `next()`；[自定义删除](H:/Cansoria/backend/src/api/admin/delete-file/route.ts:7) 恒 410；[原生上传 DELETE](H:/Cansoria/backend/src/api/middlewares.ts:79) 也被阻断。[故事编辑](H:/Cansoria/backend/src/admin/widgets/product-detail-editor.tsx:152) 和[媒体移除](H:/Cansoria/backend/src/admin/widgets/product-media-manager.tsx:283) 只更新草稿/商品引用；[照片保存](H:/Cansoria/backend/src/api/store/carts/[id]/photos/route.ts:64) 在数据库提交结果不明确时保留文件。

这关闭了原文的提前物理删除缺陷。当前保留文件可能产生废弃上传，须由 04 的安全生命周期方案处理；不能因此重新启用原删除接口。

### 06：共享完成校验已实际覆盖支付回调

[validate hook](H:/Cansoria/backend/src/workflows/hooks/complete-cart-validation.ts:6) 被安装版加载器递归加载。HTTP 完成和[支付回调](H:/Cansoria/backend/node_modules/@medusajs/core-flows/dist/payment/steps/complete-cart-after-payment.js:13) 都执行同一 `complete-cart`；安装版[先获取 cart 锁及快照](H:/Cansoria/backend/node_modules/@medusajs/core-flows/dist/cart/workflows/complete-cart.js:309)，再运行[共享 hook](H:/Cansoria/backend/node_modules/@medusajs/core-flows/dist/cart/workflows/complete-cart.js:342)。[共享业务校验](H:/Cansoria/backend/src/lib/checkout-completion.ts:166) 覆盖允许的 provider、签名照片实际读取、欢迎优惠绑定和资格；[身份更新](H:/Cansoria/backend/src/workflows/cansoria-update-cart.ts:68)、[认领](H:/Cansoria/backend/src/workflows/cansoria-claim-cart.ts:44)、[照片追加](H:/Cansoria/backend/src/api/store/carts/[id]/photos/route.ts:67) 与完成使用同一 cart 锁。

因此不能继续断言 webhook 绕过这些校验。但现有相关测试的锁、repository 和支付模块含模拟，真实 PG/Redis/Stripe 并发与持久恢复验收仍未完成，见下面 06/10 待办。

本次另查全部 promotion（含软删除）为 **0**，旧日期欢迎券和相关带日期账户 campaign 也为 0。[当前盘点](H:/Cansoria/audits/2026-10-10/recheck/current-coupon-inventory.json) 说明本地没有“旧 ART15 券迁移”任务；未来导入历史券时才需受控迁移，不能照抄为现有阻断问题。

### 07：BFF 单桶限流缺陷与提前建车已修复

[前端访客证明](H:/Cansoria/frontend/src/lib/server-visitor.ts:18)、[代理去除调用方身份头后重新签名](H:/Cansoria/frontend/src/lib/server-medusa.ts:28)、[后端验证](H:/Cansoria/backend/src/lib/visitor-identity.ts:14)、[限流维度及 Redis](H:/Cansoria/backend/src/lib/rate-limit.ts:61) 已实现。[购物车初始化](H:/Cansoria/frontend/src/lib/providers.tsx:236) 只恢复，首次加购或有效照片选择才创建。

本次核对前后端 `STORE_VISITOR_SECRET` 均已配置、相同且通过基本强度检查，Redis URL 已配置。现有测试覆盖访客隔离和伪造证明；本次重跑通过。此前真实 Next HTTP/Redis 双进程证据对应的 17 个文件与当前哈希全部一致，[哈希核对](H:/Cansoria/audits/2026-10-10/recheck/prior-rate-limit-source-match.json) 仅证明源码对应，**没有声称本次重新执行了这些 HTTP/Redis 场景**。

可信 IP 配置仍为空，但当前签名访客方案并不依赖该分支才能隔离顾客，不再将空 IP 头配置单独判为原缺陷未修复。正式部署仍须核对入口、共享密钥及 Redis；清 cookie 可更换匿名身份的边界由账户/可信 IP/总量预算约束。

## 3. 剩余实现与验收任务

### 01／P1：处理后端残余依赖风险

本次核对声明、lockfile 和安装版本一致：Next / eslint-config-next 16.4.0，React / React DOM 19.2.8，Medusa 核心 2.21.2。新运行官方 npm registry 的 `npm audit --omit=dev --json`：

| 项目 | Critical | High | Moderate | Low | 受影响包条目合计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| frontend | 0 | 0 | 0 | 0 | 0 |
| backend | 0 | 17 | 66 | 0 | 83 |

83 是受影响包条目，含同一公告经依赖链传播，不是 83 个已证实可利用的独立漏洞。直接公告涉及 braces、OpenTelemetry pg instrumentation、sprintf-js、uuid。braces 的 High 公告影响 `<=3.0.3`，本次查阅公告仍没有补丁版本：[官方公告](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)。其他三类见 [OpenTelemetry](https://github.com/advisories/GHSA-qqmp-wf37-98f9)、[sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)、[uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq)。

剩余工作：沿当前安装依赖链评估真实运行暴露面，按 Medusa 兼容性选择升级、上游补丁或隔离受影响构建/工具路径；不能直接 `audit fix --force` 或把无补丁的条目宣称清零。无法立即消除的风险要给出具体暴露分析和处置依据。验收：再次审计，并对任何依赖修改运行构建、类型与业务回归。

原始证据：[前端审计](H:/Cansoria/audits/2026-10-10/recheck/frontend-npm-audit.json)、[后端审计](H:/Cansoria/audits/2026-10-10/recheck/backend-npm-audit.json)。

### 04／启用存储清理前：完成素材隔离与可恢复生命周期

[清理 POST](H:/Cansoria/backend/src/api/admin/cleanup-images/route.ts:7) 恒 410；[预览](H:/Cansoria/backend/src/lib/asset-cleanup-preview.ts:245) 限于 `public-assets/`，并检查商品、变体、故事、购物车和订单引用，引用查询不完整时不给候选。这是已生效的保护，不存在本次已证实的继续误删。

但预览明确标识 [namespace_write_isolation 尚未实现](H:/Cansoria/backend/src/lib/asset-cleanup-preview.ts:94)，[file provider](H:/Cansoria/backend/medusa-config.ts:40) 也未实现公开/私有命名空间隔离写入。剩余工作：明确商品素材与私有客户照片的写入隔离；处理历史 key；定义废弃上传/客户照片保留周期、可恢复隔离或版本存储、恢复操作和最终删除前引用重查。参考照片的解码/像素上限及备份恢复也应验收。

验收：用隔离存储测试故事共享图、跨商品/变体共享图、购物车/订单照片、未保存替换图和废弃上传；正常使用文件不能进入删除候选，误操作可恢复。**完整方案验收前维持所有物理删除入口关闭**；本项当前不等于必须先恢复删除才能收单，但安全私有存储属于 08 的收单前条件。

### 06／P1 验收：完成真实支付与并发交易验证

剩余工作：在真实本地 PG/Redis 和 Stripe 测试模式下，验证浏览器完成与 webhook 同时到达、付款后关页、重复/延迟 webhook、照片或身份并发修改、两车使用同一单次欢迎券、支付失败与退款补偿。核对订单数、支付/capture、优惠用量和照片可履约性。

验收：每个合法购物车只产生一份合法订单，单次优惠不会超用，失败补偿不会破坏后继交易；不得只凭模拟锁测试或浏览器确认页判定通过。崩溃重放与锁期限见 10，不将尚未证明的重放风险写成已经发生的支付欺诈。

### 08／P1：接通本地核心服务，关闭未准备的可选能力

本次只核对 `backend/.env` 和 `frontend/.env.local` 中配置是否存在，不输出秘密，也不代表其他进程环境或线上配置。[无秘密配置汇总](H:/Cansoria/audits/2026-10-10/recheck/env-presence.json)：

| 能力 | 当前本地文件状态 | 剩余工作 |
| --- | --- | --- |
| Stripe | 前端 key、API key、webhook secret 缺失/为空 | 配置测试账户和正确回调，完成支付、3DS、捕获及退款验收。 |
| 邮件与游客验证 | RESEND_API_KEY 缺失/为空 | 配置并验证订单/欢迎/找回邮件和验证链接真实送达；from 已有值不代表发信域名已验证。 |
| 私有参考照片 | PORTRAIT_PHOTO_SECRET 缺失；S3 只有 bucket 等部分值，必需组合不完整 | 强签名秘密、私有存储、受控读取与备份恢复验收；当前仍本地 file provider 回退。 |
| 联系表单 | Turnstile 前后端 key、CONTACT_EMAIL 缺失/为空 | 接通验证码和收件地址，验证成功/拒绝/投递失败。 |
| 订阅 | Turnstile、Klaviyo key/list 缺失/为空 | 接通后验收，或按 18 隐藏入口。 |
| AI 聊天 | GEMINI_API_KEY、CHAT_REDIS_URL 缺失/为空 | 配置并验收共享预算，或按 18 关闭。 |
| CMS | STRAPI_API_URL 缺失/为空 | 按 17 明确 CMS 或静态模式。 |
| 访客身份/限流 | STORE_VISITOR_SECRET 两端正确配置，Redis URL 已配置 | 保留现有方案；可信 IP 分支如启用，再配置受信入口/代理。 |

现有生产缺配置拒绝启动保护应保留。本次构建日志再次显示 Resend/Stripe 未配置；构建通过不等于支付邮件可用。

### 09／P1：营业状态、真实内容与后端下单能力一致

[studio-content](H:/Cansoria/frontend/src/lib/studio-content.ts:79) 仍无条件覆盖后台介绍，并在 88 行清空故事；[商品页](H:/Cansoria/frontend/src/app/product/[handle]/page.tsx:73) 仍调用它。[加购判断](H:/Cansoria/frontend/src/app/product/[handle]/components/ProductActions.tsx:83) 和当前完成校验没有营业状态限制。

剩余工作：确认制作/发货地点、材料、工期、预览/修改、取消/退款及联系方式；以明确营业/可售状态展示审核过的真实后台介绍，统一政策、FAQ、SEO 和聊天知识。若继续筹备，后端应阻止新下单，并明确处理已有付款/授权的购物车；不能仅前台写“未开放”。

验收：后台正式内容可见且故事不被无条件清空；筹备状态不能通过直接 API 绕过；营业状态下承诺与实际服务一致。尚未确认的商业资料不是可以自动编造的代码值。

### 10／P1：持久事件、通知重试与恢复边界

[配置](H:/Cansoria/backend/medusa-config.ts:76) 仅显式 Redis locking，安装版[默认事件模块](H:/Cansoria/backend/node_modules/@medusajs/utils/dist/modules-sdk/definition.js:44) 及[默认工作流模块](H:/Cansoria/backend/node_modules/@medusajs/utils/dist/modules-sdk/definition.js:56) 仍为 local/inmemory。[订单 subscriber](H:/Cansoria/backend/src/subscribers/order-placed.ts:87) 吞掉发送异常且没有稳定邮件幂等键；[欢迎 subscriber](H:/Cansoria/backend/src/subscribers/customer-created.ts:55) 虽有幂等键仍吞错。未发现补发任务；[确认页](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:114) 无条件宣称邮件已发送。

剩余工作：显式配置适合正式运行的持久事件/工作流模块；失败进入可重试任务，订单邮件使用 `order:{id}:placed` 等稳定键；建立告警及人工补发；前台区分“订单已收到”和“邮件已投递”。不要描述为全部订单数据都在内存，框架仍有数据库事务/订单存储。

恢复验收还须覆盖原生优惠补偿与锁期限：[revertUsage](H:/Cansoria/backend/node_modules/@medusajs/promotion/dist/services/promotion-module.js:279) 按 code 处理，在 326 行扣 `used - 1`，缺 cart/registration 幂等身份；[现有契约测试](H:/Cansoria/backend/src/__tests__/workflows/welcome-usage-contract.unit.spec.ts:347) 证明直接重复 revert 可影响后继登记，但未证明真实 workflow engine 已发生这种重放。原生完成锁 TTL 为 120 秒，共享校验 35 秒上限不等于整个支付完成都在锁期内。

验收：邮件服务短时失败、后台重启、多实例、崩溃在优惠登记/补偿附近、重复恢复和 Redis 锁到期均有确定结果；通知最终可恢复且不重复，失败可见，优惠用量不被错误回滚。根据真实恢复实验决定是否需要额外原子/幂等约束。

### 11／P1：实现并核验自动捕获

修复记录采用自动扣款目标，当前[provider 配置](H:/Cansoria/backend/medusa-config.ts:110) 仍没有 `capture: true`；安装版[Stripe provider](H:/Cansoria/backend/node_modules/@medusajs/payment-stripe/dist/core/stripe-base.js:38) 因此创建 manual intent。[结账](H:/Cansoria/frontend/src/app/checkout/page.tsx:287) 接受 `requires_capture`，订单成功仍可能只表示授权。

剩余工作：明确设置自动捕获，检查已有会话是否还沿用 manual，并让前台状态与真实付款相符。验收：Stripe intent、Medusa payment/capture 和订单交易记录一致，覆盖成功、拒绝、3DS、取消、退款。不能仅以订单创建成功证明实际到账。

### 12／多地区销售时 P1：区域、币种、配送及州省地址

[Provider](H:/Cansoria/frontend/src/lib/providers.tsx:133) 和[商品页](H:/Cansoria/frontend/src/app/product/[handle]/page.tsx:51) 仍固定 `getRegion("gb")`，结账国家来自当前英国区域。[地址模型及写入](H:/Cansoria/frontend/src/lib/checkout-delivery.ts:3) 没有州省输入/写入；[Stripe 地址](H:/Cansoria/frontend/src/app/checkout/page.tsx:273) 也未写 state。本次数据库确认英国、美国、欧洲区域都存在。

修复记录列明英国/美国/现有欧洲地区销售，但当前前台没有实现该目标。剩余工作：目的地/区域选择，同步报价、购物车币种、配送、税与失效支付会话；按国家填写州省。验收：英国、美国及至少一个现有欧洲国家分别完成测试订单，切区重新计算，旧支付会话不能误用。若实际收缩为英国销售，须重新明确销售范围并同步服务说明。

### 13／业务决策：免费配送门槛

[种子规则](H:/Cansoria/backend/src/scripts/seed.ts:342) 与本次数据库一致：只有 `enabled_in_store=true`、`is_return=false`，无最低金额。全单免邮可以是合理政策，不能直接判为代码错误。

剩余工作：确认全单还是满额免邮；若满额，确认各币种阈值、地区、优惠前后计算基数，实施后端条件并迁移现有 option。验收门槛下/等于/上及优惠后跌破门槛。只改标签不算修复。

### 14／P2：可操作的密码找回

[登录入口](H:/Cansoria/frontend/src/app/account/components/LoginForm.tsx:85) 仍为 `href="#"`；[认证代理](H:/Cansoria/frontend/src/app/api/auth/[action]/route.ts:17) 只允许 login/register/logout。未发现恢复页面/代理动作/邮件订阅闭环。

剩余工作：实现重置邮件、token 有效期/使用语义、限流和提交页面，或暂时提供明确可用的人工恢复入口。验收有效/过期/重复 token、邮件失败与未知邮箱；不泄露账户是否存在，不展示不可用操作。

### 15／P2：注册后引导验证认领，统一密码约束

[确认页](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:70) 仅注册账户，190 行仍承诺查看历史订单；158 行最短 6，而[代理](H:/Cansoria/frontend/src/app/api/auth/[action]/route.ts:29) 要求至少 8。[游客查询认领页](H:/Cansoria/frontend/src/app/order/lookup/page.tsx:153) 与[安全 transfer](H:/Cansoria/backend/src/api/store/orders/transfer/route.ts:9) 已存在，但未衔接确认页注册。

剩余工作：注册后明确引导邮件验证与认领，成功后才承诺本次订单进入账户历史；密码最短统一为 8。验收游客付款→注册→邮箱验证→认领→历史订单可见，已有账户也可认领；不得只凭邮箱相同自动转移。

### 16／P2：浏览器存储异常与授权确认回退

[订单缓存写入](H:/Cansoria/frontend/src/lib/order-confirmation.ts:10) 未捕获异常；[结账](H:/Cansoria/frontend/src/app/checkout/page.tsx:327) 先缓存后跳转，缓存失败会落入 345 行的订单未确认错误。[确认页](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:46) 只读缓存，30 分钟过期/新标签页/缺缓存不能恢复。后端[授权订单查询](H:/Cansoria/backend/src/api/store/orders/[id]/route.ts:12) 已存在，问题是确认页没接入，不是后端完全缺少查询能力。

本次还确认关联异常：[认证初始化](H:/Cansoria/frontend/src/lib/providers.tsx:147) 的 localStorage/sessionStorage 清理在 try/finally 之前；清理抛错时无法执行 153 行结束 `authLoading`，165 行又阻断购物车初始化，账户及结账可能持续加载。

剩余工作：缓存写入/清理 best-effort，所有异常路径结束 loading；确认页接入服务器授权恢复，缺凭证时引导安全验证找回。验收禁用存储、配额满、刷新、新标签页、过期缓存；已成功订单不显示成交易失败，也不能触发再次收费；他人或无凭证仍不能读取。

### 17／P2：明确 CMS 模式、超时与不可用状态

[cms.ts](H:/Cansoria/frontend/src/lib/cms.ts:16) 仍回退 localhost:1337，343/374/407/440 行四处 fetch 没有明确 signal/timeout；[journal](H:/Cansoria/frontend/src/app/journal/page.tsx:44) 把空文章与失败都当成回退内容。本次只读 GET `http://localhost:1337/api/articles` 实得 426，当前前端构建也记录 `[CMS] Failed to fetch articles: 426`。

剩余工作：接通预期 CMS 或明确静态模式；全部内容请求有界超时，区分空内容与服务失败，保留可观测记录；静态模式不再请求 CMS。验收正常、空列表、错误响应、无响应/超时；这是内容链路问题，不误写成支付故障。

### 18／P2：按能力显示可选功能，移除交易页营销干扰

[LayoutWrapper](H:/Cansoria/frontend/src/components/LayoutWrapper.tsx:26) 的排除列表没有 checkout/account/order，64/65 行仍挂聊天和营销弹窗；[弹窗](H:/Cansoria/frontend/src/components/ExitIntentPopup.tsx:42) 十秒触发；Footer 仍挂订阅入口。[聊天接口](H:/Cansoria/frontend/src/app/api/chat/route.ts:21) 缺 GEMINI 返回 503，订阅缺验证码会禁用/报错，这些保护已存在，但不是入口与完整服务配置相符。

剩余工作：由服务器提供可安全公开的能力状态，按整套必需配置隐藏或降级订阅/聊天；checkout/account/order 排除营销弹窗。验收各配置组合和后端行为一致，交易页停留十秒或鼠标离开不出现营销弹窗。

钱包附注仍成立：`StripeWalletButton` 只有组件定义，没有调用，不应记为已支持 Apple Pay/Google Pay。是否接通属于功能决策，接通后需独立验收地址、配送、3DS 与完成错误。

## 4. 本次新运行的验证及范围限制

| 检查 | 本次结果 | 证据 |
| --- | --- | --- |
| 后端 `npm run test:unit` | 38 suites / 401 tests 通过 | [日志](H:/Cansoria/audits/2026-10-10/recheck/backend-tests.log) |
| 前端 `npm run test:security` | 21 suites / 126 tests 通过 | [日志](H:/Cansoria/audits/2026-10-10/recheck/frontend-tests.log) |
| 前后端 TypeScript | `tsc --noEmit --incremental false` 均通过 | [前端](H:/Cansoria/audits/2026-10-10/recheck/frontend-types.log)、[后端](H:/Cansoria/audits/2026-10-10/recheck/backend-types.log) |
| 前端全量 ESLint | 通过 | [日志](H:/Cansoria/audits/2026-10-10/recheck/frontend-lint.log) |
| 后端/管理端构建 | `npm run build` 通过 | [日志](H:/Cansoria/audits/2026-10-10/recheck/backend-build.log) |
| 前端默认 Turbopack 构建 | `npm run build` 通过，仍有 CMS 426 | [日志](H:/Cansoria/audits/2026-10-10/recheck/frontend-build.log) |
| 官方 registry 生产依赖审计 | 完成；前端 0，后端 83 条目 | 上文审计 JSON |
| 本地 PG 当前金额/免邮/区域/旧券 | 只读事务完成 | [价格汇总](H:/Cansoria/audits/2026-10-10/recheck/current-data.json)、[券汇总](H:/Cansoria/audits/2026-10-10/recheck/current-coupon-inventory.json) |
| 本地 HTTP 状态 | 3030/9030 连接拒绝；CMS 426 | [GET 汇总](H:/Cansoria/audits/2026-10-10/recheck/current-http.json) |

本次测试合计 **527 项通过**。Windows 沙箱最初阻断 Jest realpath 和本地/代理网络；获工具自动审核允许后完成上述命令。最终结果取成功重跑，不把最初权限错误判为代码失败。没有新增测试文件来替代真实验收。

HTTP 检查时前后端端口未监听，所以没有把原报告的 health/page 200、商品 API 读取作为本次已通过结果；连接拒绝本身也不能证明源码启动失败。本次未启动业务服务、未重跑完整浏览器交易/生产模式启动、未验证真实邮件/Stripe/S3，也未重跑 webpack 构建。历史真实 Next/Redis 证据与本次测试/只读数据证据已分别标明。

## 5. 下一轮实施顺序与关闭条件

1. 保持物理图片删除关闭；处理后端残余依赖风险，完成私有存储配置和必要隔离。
2. 接通测试 Stripe/Resend，落实自动捕获、持久事件/工作流及通知重试；进行 06/10/11 的真实并发与恢复验收。
3. 明确营业资料、销售范围与免邮条件；实现营业状态、真实商品内容、多区域/地址流程。
4. 完成密码找回、注册后的验证认领、缓存/授权确认回退；处理 CMS 模式和可选功能门控。
5. 完成端到端：游客/账户上传照片→定制→地址配送→付款→后台订单及照片→邮件→安全查询/认领；同时核对金额、优惠、拒付、3DS、退款、断网重试、多访客限流与越权访问。

这些真实服务与交易验收未完成前，不把“测试和构建通过”提升为“可以开始真实收单”。线上部署验收仍需另做。
