# 开业问题修复进度

开始日期：2026-10-09。依据：[本地审核报告](H:/Cansoria/LAUNCH_READINESS_AUDIT_2026-10-09.md)。修复按编号分阶段进行，每项完成实现、验证和代码复核后再推进；各阶段明确记录验收范围及是否为独立复核。

## 已确认的范围和业务选择

- 仅处理本地项目；线上配置、部署和正式支付账户另行处理。
- 金额采用 Medusa v2 主货币单位。基础价 USD 129 / 189 / 259 / 399；装框加 USD 70；方形加 USD 15；宠物肖像减 USD 20。英国标准/优先配送 GBP 9 / 18。按这套价格修正代码和匹配旧单位特征的现有数据。
- 销售区域：英国、美国和后端现有欧洲地区。
- 支付方式：订单支付成功后自动扣款。
- 制作/发货地点、材料规格、工期、预览/修改、取消/退款、联系邮箱和免邮条件仍待定；不编造正式营业承诺。
- 变更保留在工作树供审核，不提交、推送或部署。

## 编号进度

| 编号 | 内容 | 状态 |
| --- | --- | --- |
| 01 | 依赖安全升级与框架兼容 | 已完成兼容升级和验收；uuid/otel-pg 已用 overrides 清除，braces/sprintf-js 上游无补丁，保留暴露分析记录 |
| 02 | 商品/配送金额单位及现有数据 | 已完成；516 条价格修正、3 个购物车重算，独立验收通过 |
| 03 | 邮件金额 | 已完成；主单位、优惠/税/抵扣与十进制舍入均通过独立验收 |
| 04 | 全桶图片清理误删 | 已关闭危险删除；只读预览验收通过；本地公开/私有目录已按 access 分离，S3 provider 命名空间隔离与可恢复删除待部署前实施 |
| 05 | 保存前删除素材 | 已完成；删除入口关闭、失败上传保留、跨商品异步误写修复，独立验收通过 |
| 06 | 支付完成入口统一业务校验 | 已完成共享校验、锁封装和本地验收；真实 Stripe 并发与崩溃恢复验收仍未做（见 10） |
| 07 | 代理后的共享限流 | 已完成；签名访客/可信 IP/账户与总量预算、按需购物车、真实 Next HTTP 和 Redis 双进程验收通过 |
| 08 | 本地核心服务配置和可用性 | 待处理；不能生成不存在的第三方凭据 |
| 09 | 营业状态、真实介绍和政策 | 代码已完成（2026-10-10）：后端 store 元数据 orders_open 门控完成/支付会话，前台营业态展示真实后台内容并阻止加购/结账；正式业务资料与文案审核仍待业务确认 |
| 10 | 事件与通知失败恢复 | 代码已完成（2026-10-10）：Redis 事件总线/工作流引擎（含重试退避）、订单邮件稳定幂等键、失败可见可补发；多实例/崩溃重放真实恢复验收仍待真实服务 |
| 11 | 自动捕获付款 | 代码已完成（2026-10-10）：provider capture: true，前端仅接受 succeeded，授权/已扣款会话可续确认；Stripe 真实扣款验收待 08 |
| 12 | 区域、币种和地址 | 州省地址已实现（2026-10-10）；区域/币种切换待业务确认销售范围后实施 |
| 13 | 免费配送条件 | 待处理；业务条件待定 |
| 14 | 忘记密码 | 代码已完成（2026-10-10）：重置邮件订阅器、单次 15 分钟 token、BFF 动作、页面与限流；真实邮件送达待 08 |
| 15 | 游客订单认领与注册提示 | 代码已完成（2026-10-10）：密码下限统一 8，注册后引导验证+安全认领，不再无条件承诺历史可见 |
| 16 | 确认页缓存异常恢复 | 代码已完成（2026-10-10）：缓存 best-effort、?ref 回退、完成时短期订单能力 cookie 授权重读、认证初始化异常不再卡 loading |
| 17 | CMS 不可用及超时 | 代码已完成（2026-10-10）：全部请求有界超时、默认静态模式不再请求 CMS、空内容与服务失败区分；接通真实 Strapi 待 08 |
| 18 | 营销/聊天准备状态与结账弹窗 | 代码已完成（2026-10-10）：checkout/account/order/register 排除弹窗与聊天，订阅按前后端整套配置门控，聊天按 GEMINI key 门控 |

## 数据保护与验证记录

- 升级前已创建 PostgreSQL custom-format 完整备份：`H:\Cansoria\.local-backups\2026-10-09\before-medusa-2.21.2.dump`，444,153 bytes，并确认 `PGDMP` 文件头。目录被 Git 忽略，不包含在提交候选中。
- 本地价格修复前只读清单：7 个产品、168 个变体、522 条有效价格记录。02 号已修正其中 516 条，6 条免费配送零价格保留；3 个未支付购物车通过原生工作流重算，历史交易未更改。敏感前后快照保存在忽略目录 `.local-backups`。
- 初始完整测试基线：前端 95 项、后端 202 项通过；前后端构建、类型检查及前端 ESLint 通过。
- 01 升级后首次前端默认 Turbopack 构建通过；CMS 426 属于 17 号，未将其当成已修复。
- 01 最终验证：后端 205 项、前端 95 项测试；前后端构建/类型检查及前端 lint 均通过。安全数据库迁移成功。本地 BFF 三币种商品和区域、五个 SSR 页面、JS 与本地图片通过独立验收。前端生产依赖漏洞为 0；后端生产 Critical 为 0，17 个 High 条目来自同一尚无补丁的 braces 链，另有 66 个 Moderate 条目；不声称所有依赖漏洞清零。
- 01 详情：[实现结果](H:/Cansoria/audits/2026-10-09/01-dependencies/RESULT.md)、[独立验收](H:/Cansoria/audits/2026-10-09/01-dependencies/VERIFICATION.md)。
- 02 最终验证：后端 26 套 243 项测试、类型检查和构建通过。独立核对商品 API 的 504 个规格/币种价格、配送价格及前端 £85.02 展示均正确；再次干跑为零变更。详情：[实现结果](H:/Cansoria/audits/2026-10-09/02-prices/README.md)、[独立验收](H:/Cansoria/audits/2026-10-09/02-prices/VERIFICATION.md)。
- 03 最终验证：后端 28 套 257 项测试通过；最终金额/安全定向 28 项、类型检查通过，后端与管理后台构建通过。18 个订单查询字段符合安装版 schema。独立复核补修了半分税额舍入及 1 美分抵扣容差；邮件金额与原生 Medusa/Stripe 转换一致。仅模拟发送，真实送达仍待邮件服务配置。详情：[实现结果](H:/Cansoria/audits/2026-10-09/03-email-amounts/RESULT.md)、[独立验收](H:/Cansoria/audits/2026-10-09/03-email-amounts/VERIFICATION.md)、[代码复核](H:/Cansoria/audits/2026-10-09/03-email-amounts/REVIEW.md)。
- 04 最终验证（2026-10-10）：后端 30 套 293 项测试、类型检查、后端/管理后台构建通过；独立核对 23 个查询字段和分页转换。POST 清理恒为 410；GET 只读检查固定公开前缀，引用不完整时无候选。未操作真实 S3。原 provider、历史 key 和私有目录保留；新命名空间写入隔离及可恢复删除尚未实施，物理清理不得恢复。详情：[实现结果](H:/Cansoria/audits/2026-10-09/04-asset-cleanup/RESULT.md)、[独立验收](H:/Cansoria/audits/2026-10-09/04-asset-cleanup/VERIFICATION.md)、[代码复核](H:/Cansoria/audits/2026-10-09/04-asset-cleanup/REVIEW.md)。其他删除入口由 05 号处理，见后续记录。
- 05 最终验证（2026-10-10）：后端 31 套 302 项单测、最终类型检查、后端与管理后台构建通过；媒体补修后管理后台再次构建通过。实际组件处理函数的 23 项模拟状态检查及安装版原生路由契约检查通过。中间件不再保存前删图，自定义和原生上传删除入口均阻断；提交结果不明确的照片保留；编辑/移除只改引用。独立复核实证发现并补修媒体管理器跨商品迟到请求导致误保存的问题。未做真实 DOM/E2E 或任何外部存储/业务数据操作。详情：[实现结果](H:/Cansoria/audits/2026-10-09/05-save-assets/RESULT.md)、[独立验收](H:/Cansoria/audits/2026-10-09/05-save-assets/VERIFICATION.md)、[代码复核](H:/Cansoria/audits/2026-10-09/05-save-assets/REVIEW.md)。
- 06 最终验证（2026-10-10）：后端 37 套 387 项单测、类型检查、最终后端/管理后台构建通过；12 个生产文件与构建产物 AST 一致。实际加载器 8 项、查询契约 40 项、25 文件哈希检查通过，代码复核与反模式检查通过。HTTP 和支付回调共用原生快照校验；照片实际有界读取；身份更新/认领/照片追加与完成流程互斥并支持失败补偿。一次使用验证执行真实原生算法与工作流，但 repository/锁为模拟，不代表真实 PG/Redis/Stripe 验收。欢迎优惠仍为 30 天，资格统一基于服务器注册时间；新 campaign 不设 ends_at，旧带日期 ART15 暂拒使用且需单独迁移，本阶段未改其数据。原生重复 revert 可影响后继用量的崩溃恢复边界继承 10，未声称任意崩溃下全局 exactly-once。详情：[实现结果](H:/Cansoria/audits/2026-10-09/06-completion/RESULT.md)、[独立验收](H:/Cansoria/audits/2026-10-09/06-completion/VERIFICATION.md)、[代码复核](H:/Cansoria/audits/2026-10-09/06-completion/REVIEW.md)、[原生优惠契约](H:/Cansoria/audits/2026-10-09/06-completion/NATIVE_USAGE_CONTRACT.md)。
- 07 最终验证（2026-10-10）：后端 38 套 401 项、前端 21 套 126 项测试通过；前后端类型、前端全量 lint、后端/管理后台及最终默认 Turbopack 构建通过。真实 Next 开发/生产 HTTP 验证同 BFF 下两访客独立额度（A 第 31 次 429，B 仍通过）、cookie 真实持久化/复用/篡改替换及生产 Secure/HttpOnly、伪造证明拒绝。真实本地 Redis 双进程共享单访客额度、另一访客隔离和 TTL 均通过，随机测试 key 已清理。购物车仅在首次加购或有效照片选择后创建；保留照片/cart 绑定，补修延迟 effect 与重复选图。独立服务端共享密钥已配置在忽略的本地环境文件中，未打印；未写业务 DB、创建真实购物车/订单或操作真实照片/支付/邮件。照片/Provider 为实际处理函数加受控 hook 测试，未声称 DOM E2E。清 cookie 轮换身份仍受总量预算限制，不声称匿名单人绝对唯一。详情：[实现结果](H:/Cansoria/audits/2026-10-09/07-rate-limits/RESULT.md)、[本地验收](H:/Cansoria/audits/2026-10-09/07-rate-limits/VERIFICATION.md)、[本会话代码复核](H:/Cansoria/audits/2026-10-09/07-rate-limits/REVIEW.md)。
- 原始审计和依赖升级证据保存在 [audits/2026-10-09](H:/Cansoria/audits/2026-10-09)。不以依赖版本号变化代替启动、接口数据和交易流程验证。

## 2026-10-10 复审驱动修复轮

依据：[复审清单](H:/Cansoria/LAUNCH_READINESS_RECHECK_2026-10-10.md)。本轮实现 09/10/11/14/15/16/17/18 的代码部分、12 的州省地址、01 的可用依赖 overrides、04 的本地隔离标记澄清。全部变更保留在工作树，未提交。

### 各项实现摘要

- **09 营业状态**：新增 [store-status](H:/Cansoria/backend/src/lib/store-status.ts)（store 元数据 `orders_open === true` 才开门，缺省/异常一律关门）。[完成校验](H:/Cansoria/backend/src/lib/checkout-completion.ts)在订单关联幂等分支之后强制该门（HTTP 与支付回调共用），已授权/已扣款 Stripe 会话放行以免搁浅真实付款；[paymentAccessGuard](H:/Cansoria/backend/src/lib/resource-access.ts) 关门时拒绝新建支付会话；[store-info](H:/Cansoria/backend/src/api/store/store-info/route.ts) 暴露 `orders_open` 与 `capabilities.newsletter`。前台 [studioProduct](H:/Cansoria/frontend/src/lib/studio-content.ts) 在营业态展示后台审核内容（不再清空故事/覆盖介绍），未验证的评价/评分声明仍始终压制；商品页/加购/结账按状态门控并给出明确文案。
- **10 持久事件与通知**：[medusa-config](H:/Cansoria/backend/medusa-config.ts) 在配置 REDIS_URL 时启用 event-bus-redis（jobOptions 5 次指数退避重试）与 workflow-engine-redis，未配置时保持本地开发内存实现；[订单订阅器](H:/Cansoria/backend/src/subscribers/order-placed.ts) 使用稳定幂等键 `order:{id}:placed` 并在失败时输出含订单号的错误供补发；确认页文案改为"已收到订单，确认邮件稍后送达"，不再无条件宣称已发送。
- **11 自动捕获**：Stripe provider 增加 `capture: true`（安装版据此创建 automatic intent）；结账仅接受 `succeeded` 状态，`hasAuthorizedStripePayment` 接受 `authorized|captured`（Medusa 语义）继续确认；"已授权待确认"提示改为"已收款待确认"。
- **14 密码找回**：新增 [auth.password_reset 订阅器](H:/Cansoria/backend/src/subscribers/password-reset.ts)（仅注册客户、单次 15 分钟 token、按 token 哈希幂等）、Resend `password_reset` 模板（校验链接 origin/path）、`/auth/customer/emailpass/reset-password` 专属限流（5 次/小时）。BFF 新增 `request-password-reset`（统一应答不泄露账户存在）与 `reset-password`（token≥20 字符、密码≥8、透传单次消费语义）动作；新增 `/account/forgot-password` 与 `/account/reset-password` 页面（token 从 URL 读取后清除），登录页链接指向真实流程。
- **15 注册引导**：确认页密码下限 6→8 与注册代理一致；注册成功后改为引导邮箱验证并经 `/order/lookup` 安全认领，认领前不再承诺订单历史可见。
- **16 缓存与确认回退**：[order-confirmation](H:/Cansoria/frontend/src/lib/order-confirmation.ts) 写入 best-effort 并返回成败；保存失败时结账带 `?ref=<orderId>` 跳转（仅展示用，无授权能力）；完成响应通过 [projectPaymentResponses](H:/Cansoria/backend/src/lib/cart-fields.ts) 注入 30 分钟订单能力 token，BFF 存为 HttpOnly cookie 并在授权订单读取时回传；确认页无缓存时用 `?ref` + 能力 cookie 做服务端授权恢复，缺凭证时引导安全找回且明确提示勿重复付款；providers 认证初始化的 storage 清理移入 try/finally，任何异常都会结束 loading，不再阻断购物车/结账。
- **17 CMS**：[cms.ts](H:/Cansoria/frontend/src/lib/cms.ts) 未配置（或 disabled/static/off）时进入静态模式完全不请求；所有请求 5 秒有界超时（`STRAPI_TIMEOUT_MS`）；新增 `getArticlesDetailed` 区分 cms/static/error，journal 页仅对不可用/禁用回退内置内容，CMS 健康但为空时如实显示空态；构建日志不再出现 426。
- **18 展示门控**：[LayoutWrapper](H:/Cansoria/frontend/src/components/LayoutWrapper.tsx) 在 `/checkout`、`/account`、`/order`、`/register` 排除聊天与营销弹窗；聊天仅当 `GEMINI_API_KEY` 存在时由服务端布局启用；Footer 订阅区仅当前端 Turnstile site key 与后端 Turnstile/Klaviyo 整套配置齐备（store-info capabilities）时展示。
- **12 州省地址**：`DeliveryDetails` 增加 `state`，`prepareDelivery` 写入 `province`，Stripe billing address 传 state，美/加/澳等国显示必填州省输入并纳入地址变更失效键；区域/币种切换未实施——购物车币种绑定区域、需先确认销售范围（业务决策）。
- **01 依赖**：后端 overrides 增加 `uuid@^11.1.1`（清除 bullmq 拖带的 uuid<11.1.1 公告 GHSA-w5hq-g745-h8pq）与 `@opentelemetry/instrumentation-pg@^0.73.0`（GHSA-qqmp-wf37-98f9）；审计前后证据见 [fixes 目录](H:/Cansoria/audits/2026-10-10/fixes)。前端生产依赖维持 0。
- **04 标记澄清**：本地 provider 本就按 access 分离 `public-uploads/` 与 `private-uploads/`（客户照片 access:"private"）；预览报告标记从 `not_implemented` 改为 `provider_pending` 并如实说明 S3 provider 命名空间/ACL 隔离仍未配置。物理删除入口保持关闭。

### 01 残余依赖暴露分析（无补丁公告）

官方 registry 复审后残余 80 个受影响包条目全部来自两个上游无补丁公告，处置如下：

- **braces GHSA-vfj7-8cjw-p6xm（High，<=3.0.3 全部受影响，无补丁版本）**：嵌套模式导致的栈耗尽 DoS。进入链路为 micromatch→fast-glob→globby/chokidar/tailwindcss3/umzug/mikro-orm/@medusajs admin-bundler，均为构建工具或框架内部固定模式的 glob，不在请求路径上接收攻击者控制的 glob 模式；不采用 `audit fix --force` 降级 Medusa。处置：保留记录，补丁发布后升级；不宣称清零。
- **sprintf-js GHSA-hp3w-g68c-fv3c（Moderate，含 1.1.3 全部受影响，无补丁版本）**：无限精度说明符 DoS。仅作为调试格式化传递依赖，无用户输入触达面。处置：同上。

### 本轮验证

- 后端 `npm run test:unit`：40 套 415 项通过（新增 store-status、password-reset、营业门控、订单能力 cookie 等用例；受影响夹具已更新）。
- 前端 `npm run test:security`：21 套 133 项通过（新增重置动作、订单 cookie、州省写入、营业态展示等用例）。
- 前后端 `tsc --noEmit --incremental false` 通过；前端全量 ESLint 通过；后端 `medusa build` 与前端默认 Turbopack `next build` 通过（构建日志无 CMS 426）。
- 后端 overrides 后官方 registry 生产依赖复审：uuid/otel-pg 相关条目消除；`npm ls` 确认 bullmq 下 uuid 已去重为 11.1.1、instrumentation-pg 为 0.73.0。

### 本轮明确不做/未完成

- 08 外部凭据（Stripe/Resend/S3/Turnstile/Klaviyo/Gemini/CMS）：无法代生成，配置后才能做真实送达/扣款验收。
- 06/10/11 的真实并发与恢复验收（真实 PG/Redis/Stripe、崩溃重放、锁到期、多实例）：需要真实服务，保持待办。
- 09/12/13 的业务确认（营业资料与政策文案、销售范围、免邮门槛）：决策后才能落地内容与区域切换。
- 04 的 S3 命名空间隔离、保留/隔离/恢复生命周期：属部署前存储方案，标记 `provider_pending`。

后续每一阶段补充最终验证、残余问题和变更数据清单。未完成项不会标为完成。
