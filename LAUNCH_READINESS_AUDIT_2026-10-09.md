# Cansoria 本地开业准备审核

审核日期：2026-10-09。范围：`H:\Cansoria` 的前端、后端、管理端组件、依赖、配置文件、种子脚本及本地运行数据。按你的要求，未检查正式域名、线上部署、线上数据库或线上账户。

**结论：当前本地版本还不适合直接开始收单。** 编译和已有单元测试通过，但金额单位、图片删除、支付完成校验、限流和服务配置存在影响真实交易的问题。应先完成下列 P1 修复，再用测试环境走完整交易验收。

本次采用全仓扫描、关键业务路径深入复核、本地只读接口与数据库检查，以及隔离的内存模拟。源码清单包含 224 个代码/CSS/测试文件，其中生产源码约 19,406 行；不包含依赖和生成目录。没有逐行人工验证所有第三方依赖，也没有用单元测试通过代替支付业务验收。**本次没有修改应用代码、商品价格、客户数据，也没有真实删除图片、发送邮件或发起支付。**

## 开业前修改清单

| 编号 | 优先级 | 问题 | 验证状态 |
| --- | --- | --- | --- |
| 01 | P1；特定部署条件下可达 P0 | Next.js 等依赖处于已知漏洞影响版本 | 官方 npm 审计及维护者公告 |
| 02 | P1 | 商品和运费沿用了“分”的数值，Medusa v2 按主货币单位处理 | 源码、本地商品接口、只读数据库 |
| 03 | P1 | 邮件金额又除以 100，与订单金额不一致 | 隔离渲染复现 |
| 04 | P1 | 全桶图片清理可能删除客户参考照片和仍使用的故事图片 | 隔离 S3 模拟复现；启用 S3 时触发 |
| 05 | P1 | 商品保存前先删原图，保存失败或取消会留下坏引用 | 隔离调用顺序验证 |
| 06 | P1 | 原生支付回调完成订单不执行自定义完成接口的业务校验与锁 | 安装版本源码调用链确认 |
| 07 | P1 | 不同顾客经过前端代理后共用限流额度 | 隔离限流复现 |
| 08 | P1 | 本地关键服务未配置，支付、通知和部分咨询功能未接通 | 本地环境文件与代码分支确认 |
| 09 | P1 | 前台仍强制显示筹备状态，覆盖后台商品介绍 | 源码及本地页面确认 |
| 10 | P1 | 订单通知失败被吞掉，事件/后台工作模块未显式配置 Redis | 源码与已安装框架默认配置 |
| 11 | 开业前决策 | 当前 Stripe 默认手动捕获，需要明确实际扣款流程 | 配置与已安装 Stripe provider |
| 12 | 视销售范围为 P1/P2 | 全站固定英国区域，无法使用已配置的美国/欧洲区域 | 源码与本地区域接口 |
| 13 | 业务确认 | 免费配送没有最低金额条件 | 种子配置及只读数据库 |
| 14 | P2 | 忘记密码入口为空链接，缺少找回流程 | 源码 |
| 15 | P2 | 游客下单后注册，页面承诺的历史订单关联没有完成 | 前后端流程复核 |
| 16 | P2 | 确认页缓存失败可能把已成功订单显示为失败 | 源码异常路径 |
| 17 | P2 | CMS 本地返回 426；请求没有明确超时，页面静默回退 | 两种前端构建日志及源码 |
| 18 | P2 | 未配置的营销/聊天功能仍显示；结账页有营销弹窗 | 配置与组件挂载路径 |

P1 表示应在接受真实订单前解决。P2 表示应在开业前尽量补齐，或提供清楚可用的替代流程。业务决策项不自动判为代码错误。

## 01. 依赖需要升级并复测

定位：[frontend/package.json:28](H:/Cansoria/frontend/package.json:28)、[backend/package.json](H:/Cansoria/backend/package.json)。

当前 Next.js 固定为 `16.1.1`。官方维护者公告 GHSA-p293-qw3h-jr36 将该版本列入影响范围：在 Windows 托管、相应 App/Pages Router 条件下，存在未认证远程代码执行风险，公告修复版本为 `16.3.3`。实际线上操作系统未检查，不能据此断言线上已经可利用。当前 npm 审计给出的 Next.js 修复目标为 `16.4.0`，还包括其他漏洞，不能只修一个公告。

依据：[Next.js 官方安全公告](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)。

在官方 npm registry 执行 `npm audit --omit=dev --json`，结果为：

| 项目 | Critical | High | Moderate | Low | 受影响包条目合计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| frontend | 1 | 5 | 4 | 0 | 10 |
| backend | 5 | 115 | 65 | 1 | 186 |

这些是受影响包条目，包含同一公告经不同依赖链传播的情况，**不是 196 个已证实可被利用的独立漏洞**。后端 Critical 链涉及 MikroORM、handlebars、protobufjs、proxy-addr、fast-xml-parser 等；实际暴露程度需要按最终升级方案复核。

修改：升级 Next.js 与匹配的 eslint 配置；按 Medusa 的兼容版本组合升级后端核心包及传递依赖。不要直接运行 `npm audit fix --force`；当前部分建议会把 Medusa 相关包切到旧主版本，可能破坏系统。升级后重新运行本报告中的构建、类型检查、安全测试和支付回归。

原始证据：[前端审计 JSON](H:/Cansoria/audits/2026-10-09/frontend-npm-audit.json)、[后端审计 JSON](H:/Cansoria/audits/2026-10-09/backend-npm-audit.json)。

## 02. 商品、加价和运费的金额单位不一致

定位：[seed.ts:62](H:/Cansoria/backend/src/scripts/seed.ts:62)、[seed.ts:69](H:/Cansoria/backend/src/scripts/seed.ts:69)、[seed.ts:328](H:/Cansoria/backend/src/scripts/seed.ts:328)、[create-random-products.ts:68](H:/Cansoria/backend/src/scripts/create-random-products.ts:68)。

种子脚本把 `12900`、`18900`、装框加价 `7000` 等直接写入 Medusa v2 的 `amount`。随机商品脚本也生成这一量级的价格，但日志又除以 100，掩盖了存储单位不一致。前端 [money.ts:3](H:/Cansoria/frontend/src/lib/money.ts:3) 正确按主货币单位格式化。

本地商品接口确认：英国区域最小宠物肖像变体价格为 **£8,502**；装框对应变体为 **£13,962**。只读数据库确认标准配送英国价格为 **£900**，优先配送为 **£1,800**，其他货币也存在相同量级。它们是当前真实存储/返回值，并非仅页面格式问题。

修改：先确认正式 SKU、装框加价、币种与运费价格表，再修脚本和现有价格记录。对已存在数据编写按 ID/明确条件执行的幂等迁移并保留变更前清单。**不要只在前端统一除以 100，也不要盲目把全部历史金额除以 100。**

验收：后台、商品详情、购物车、支付会话、订单、退款和邮件的同币种金额一致；任选一个明确的价格，例如 USD 129，应始终代表 USD 129。

## 03. 订单邮件金额缩小 100 倍

定位：[resend/service.ts:21](H:/Cansoria/backend/src/modules/resend/service.ts:21)、[resend/service.ts:102](H:/Cansoria/backend/src/modules/resend/service.ts:102)、[resend/service.ts:126](H:/Cansoria/backend/src/modules/resend/service.ts:126)。

`formatMoney` 将 Medusa v2 的金额再除以 100，商品单价、小计、配送费、总价都受到影响。用内存邮件 provider 渲染 `total: 129, currency_code: "usd"`，结果为 **USD 1.29**。

修改：统一主货币单位格式化约定；不要让种子脚本的错误与邮件错误互相抵消。补充跨购物车、订单及邮件金额的一致性验证。

## 04. 全桶清理会误判仍需使用的图片

定位：[cleanup-images/route.ts:61](H:/Cansoria/backend/src/api/admin/cleanup-images/route.ts:61)、[cleanup-images/route.ts:108](H:/Cansoria/backend/src/api/admin/cleanup-images/route.ts:108)、[cleanup-images/route.ts:153](H:/Cansoria/backend/src/api/admin/cleanup-images/route.ts:153)、[photos/route.ts:51](H:/Cansoria/backend/src/api/store/carts/[id]/photos/route.ts:51)、[medusa-config.ts:37](H:/Cansoria/backend/medusa-config.ts:37)。

清理接口遍历整个 S3/R2 bucket，仅通过商品和部分变体 URL 判断占用。客户参考照片也通过同一个 file provider 写入该 bucket，虽然 ACL 为 private，清理程序仍能列出并删除。它没有检查购物车/订单照片引用。同时，清理读取 `detail_sections`，实际商品故事编辑器保存的是 `story_sections[].imageUrl`。

隔离模拟中，客户参考照片 `private/reference.jpg` 和仍被故事内容使用的 `story-only.jpg` 被当作孤立文件删除。模拟没有连接实际 bucket，也没有删除真实文件。当前本地使用文件 provider 回退；该问题在配置 S3 后会成为实际风险。

修改：先停用破坏性全桶清理；客户照片与公开商品素材采用明确隔离的存储空间/受控前缀；只清理允许清理的公开素材，完整检查商品、变体、故事、购物车和订单引用。增加只读预览、保留期及可恢复机制。

## 05. 文件删除发生在保存提交之前

定位：[product-image-cleanup.ts:79](H:/Cansoria/backend/src/api/middlewares/product-image-cleanup.ts:79)、[product-image-cleanup.ts:116](H:/Cansoria/backend/src/api/middlewares/product-image-cleanup.ts:116)、[product-detail-editor.tsx:126](H:/Cansoria/backend/src/admin/widgets/product-detail-editor.tsx:126)、[product-detail-editor.tsx:169](H:/Cansoria/backend/src/admin/widgets/product-detail-editor.tsx:169)、[delete-file/route.ts:22](H:/Cansoria/backend/src/api/admin/delete-file/route.ts:22)。

商品更新中间件先删除 S3 原图，再调用 `next()` 执行数据库更新。验证失败、更新冲突或数据库失败时，数据库仍指向已经删除的文件。隔离验证顺序为 `DELETE used-product.jpg` → `NEXT: product update begins`。

故事编辑器上传替换图时就删除旧图，尚未点击保存；退出编辑或保存失败也会破坏原内容。多个商品/变体共用同一文件时，原始删除接口没有引用保护。

修改：保存成功后再产生清理任务；清理任务检查完整引用，并在保留期之后删除。编辑状态只更新待保存数据，取消时不删除仍在使用的旧素材。优先通过 Medusa file 模块维护文件生命周期。

## 06. 支付回调完成订单绕过自定义业务校验路径

定位：[自定义 complete/route.ts:16](H:/Cansoria/backend/src/api/store/carts/[id]/complete/route.ts:16)、[complete/route.ts:24](H:/Cansoria/backend/src/api/store/carts/[id]/complete/route.ts:24)、[complete/route.ts:30](H:/Cansoria/backend/src/api/store/carts/[id]/complete/route.ts:30)、[resource-access.ts:74](H:/Cansoria/backend/src/lib/resource-access.ts:74)。

HTTP 完成接口检查肖像资料、支付 provider、欢迎优惠资格，并持有 `cart-identity:*` 和 `welcome-usage:*` 锁。但安装的 Medusa 存在另一个入口：支付回调的 `processPaymentWorkflow` → `completeCartAfterPaymentStep` → `workflowEngine.run("complete-cart")`。它直接进入原生工作流，不经过上述自定义 HTTP 接口。

框架证据：[process-payment.js:143](H:/Cansoria/backend/node_modules/@medusajs/core-flows/dist/payment/workflows/process-payment.js:143)、[complete-cart-after-payment.js:13](H:/Cansoria/backend/node_modules/@medusajs/core-flows/dist/payment/steps/complete-cart-after-payment.js:13)、[complete-cart.js:291](H:/Cansoria/backend/node_modules/@medusajs/core-flows/dist/cart/workflows/complete-cart.js:291)。本地项目未注册该工作流的自定义 validate hook。

支付初始化时已有肖像校验，降低了普通正常流程的风险，但它不能替代完成时校验。原生商品行更新仍接受 metadata；支付开始后状态变化/并发时，两条完成路径的业务约束和锁不一致。框架自身也有优惠预算检查，因此本报告**没有断言已经复现优惠超用或支付欺诈**；确认的是项目自定义校验与互斥保护没有覆盖回调入口。

修改：把最终肖像可履约性、允许的支付方式、欢迎优惠绑定和一次使用约束放进所有完成入口共享的工作流校验/步骤，统一关键数据的锁或数据库原子约束。HTTP 访问权限校验继续保留在接口层。

验收：浏览器完成与 webhook 同时到达、付款后关页、重复 webhook、修改肖像 metadata、两辆购物车使用同一单次优惠，均只生成合法的一份订单且不会重复消费优惠。当前未发起真实 Stripe 测试，需在修复后完成。

## 07. BFF 后面的顾客共享限流额度

定位：[rate-limit.ts:12](H:/Cansoria/backend/src/lib/rate-limit.ts:12)、[server-medusa.ts:35](H:/Cansoria/frontend/src/lib/server-medusa.ts:35)、[middlewares.ts:36](H:/Cansoria/backend/src/api/middlewares.ts:36)、[providers.tsx:229](H:/Cansoria/frontend/src/lib/providers.tsx:229)。

后端默认按连接端 IP 限流；前端 BFF 请求对后端表现为同一个代理 IP。当前本地没有配置 `STORE_TRUSTED_IP_HEADER` 和 `TRUSTED_PROXY_IPS`。前端还在新访客进入时主动创建购物车，会消耗创建额度。

内存模拟用不同 `x-real-ip`、相同 socket IP 发出 31 次创建请求，结果 30 次通过、第 31 次被拒绝，只有一个限流桶。相同默认配置下，经过同一 BFF 的顾客可能共用每 15 分钟 30 个购物车、20 次认证请求和每小时 5 个账户创建额度。没有对实际服务施加批量写入或压力。

修改：建立可信入口覆盖用户 IP、阻止绕过入口并配置受信代理；或使用服务端可信的访客/账户维度，结合合理的全局预算。不要直接信任浏览器可伪造的 forwarded header。延迟到实际加入商品时创建购物车。

## 08. 本地关键服务尚未接通

这里只记录本地 `.env` / `.env.local` 的配置状态，不包含任何秘密值，也不代表线上状态或外部进程环境。

| 功能 | 本地缺失/空配置 | 后果及处理 |
| --- | --- | --- |
| 卡支付 | `NEXT_PUBLIC_STRIPE_KEY`、`STRIPE_API_KEY`、`STRIPE_WEBHOOK_SECRET` | 结账不具备完整支付能力；使用测试配置验收支付和回调 |
| 通知、游客订单找回 | `RESEND_API_KEY` | 邮件发送不可用；游客邮箱验证找回链路也受影响 |
| 客户参考照片上线存储 | `PORTRAIT_PHOTO_SECRET`、S3 必需配置 | 当前为本地文件回退；完成私有存储、签名与读取验收 |
| 联系表单 | Turnstile 前后端配置、`CONTACT_EMAIL` | 联系表单无法正常完成验证/投递 |
| 邮件订阅 | Turnstile、`KLAVIYO_PRIVATE_KEY`、`KLAVIYO_LIST_ID` | 订阅服务不可用；接通前隐藏入口 |
| AI 咨询 | `GEMINI_API_KEY`、`CHAT_REDIS_URL` | AI 功能及共享预算未准备好；可作为非核心功能暂时关闭 |
| 代理客户 IP | `STORE_TRUSTED_IP_HEADER`、`TRUSTED_PROXY_IPS` | 见第 07 项 |
| CMS | `STRAPI_API_URL` | 回退到 localhost:1337，当前请求返回 426 |

定位：[checkout/page.tsx:41](H:/Cansoria/frontend/src/app/checkout/page.tsx:41)、[medusa-config.ts:90](H:/Cansoria/backend/medusa-config.ts:90)、[contact/route.ts:37](H:/Cansoria/backend/src/api/store/contact/route.ts:37)、[orders/access/route.ts:18](H:/Cansoria/backend/src/api/store/orders/access/route.ts:18)。

当前本地 JWT/COOKIE secret 长度满足已有强度检查，Redis URL 已配置；没有把这些已满足的项重复列为问题。后端已有生产环境缺配置拒绝启动检查，是正确保护。由于线上已搁置，本报告没有尝试用当前开发配置强行启动生产环境。

## 09. 前台还处于“未开放订单”的强制展示状态

定位：[studio-content.ts:5](H:/Cansoria/frontend/src/lib/studio-content.ts:5)、[studio-content.ts:79](H:/Cansoria/frontend/src/lib/studio-content.ts:79)、[product/page.tsx:73](H:/Cansoria/frontend/src/app/product/[handle]/page.tsx:73)、[checkout/page.tsx:570](H:/Cansoria/frontend/src/app/checkout/page.tsx:570)、[shipping/page.tsx:20](H:/Cansoria/frontend/src/app/shipping/page.tsx:20)、[returns/page.tsx:17](H:/Cansoria/frontend/src/app/returns/page.tsx:17)。

首页、FAQ、商品介绍、配送/退换页面和聊天指令都写着 commissions in preparation；制作、材料、预览、修改和配送安排仍未确认。`studioProduct()` 无条件替换后台 subtitle/description/material，并清空故事内容，因此只在后台填正式商品介绍不会生效。

修改：明确开业状态与可售商品，在生产、材料、预览次数、修改范围、工期、运费、取消/退款和联系方式真实确定后，统一更新展示规则、政策页、SEO 与聊天知识。展示审核过的真实后台内容，继续保护未证实的评价/资历，不能直接恢复旧的无依据承诺。若仍保留筹备阶段，应在后端也关闭下单入口。

这里指出的是商业信息和代码状态不一致；没有审核任何国家的具体法律合规要求。

## 10. 通知失败恢复和事件模块配置不足

定位：[medusa-config.ts:74](H:/Cansoria/backend/medusa-config.ts:74)、[order-placed.ts:49](H:/Cansoria/backend/src/subscribers/order-placed.ts:49)、[order-placed.ts:66](H:/Cansoria/backend/src/subscribers/order-placed.ts:66)、[customer-created.ts:52](H:/Cansoria/backend/src/subscribers/customer-created.ts:52)、[确认页:116](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:116)。

项目显式启用了 Redis locking，但没有显式配置 Redis event bus/workflow engine。安装版本的非 Cloud 默认值分别是 `event-bus-local` 和 `workflow-engine-inmemory`；设置 `projectConfig.redisUrl` 不会自动切换这些默认模块。框架仍有工作流事务存储，不能将此描述为“全部订单/工作流数据仅保存在内存”。问题是事件投递、重试与后台编排的持久化/多实例保证没有准备完整。

订单通知发送异常只记录后返回，没有看到补发任务；订单通知也没有像欢迎邮件那样设置稳定幂等键。确认页无论实际邮件投递状态都说“已发送”。

修改：显式选择适合正式运行的持久化事件/工作流模块；建立可重试通知任务，使用 `order:{id}:placed` 等稳定幂等键、失败告警和人工补发。不要把发送失败当成处理成功。前台区分订单已收到与邮件已发送。

## 11. 确认自动扣款还是人工捕获

定位：[medusa-config.ts:109](H:/Cansoria/backend/medusa-config.ts:109)、[checkout/page.tsx:287](H:/Cansoria/frontend/src/app/checkout/page.tsx:287)、[Stripe provider:31](H:/Cansoria/backend/node_modules/@medusajs/payment-stripe/dist/core/stripe-base.js:31)。

没有设置 `capture: true`，安装的 Stripe provider 默认 `capture_method: "manual"`。结账接受 `requires_capture`，所以订单确认可能只是付款已授权。后台可以人工捕获，这本身可以是合理业务设计。

开业前必须选择：授权后什么时候实际扣款、谁处理、如何提醒、授权失效时怎么处理，以及退款/取消如何对应订单状态。不要把“订单创建成功”直接当作“已到账”。用测试模式确认 payment 状态、订单状态和实际 capture 行为。

## 12. 国际销售受固定英国区域限制

定位：[providers.tsx:127](H:/Cansoria/frontend/src/lib/providers.tsx:127)、[product/page.tsx:51](H:/Cansoria/frontend/src/app/product/[handle]/page.tsx:51)、[checkout/page.tsx:164](H:/Cansoria/frontend/src/app/checkout/page.tsx:164)、[checkout-delivery.ts:40](H:/Cansoria/frontend/src/lib/checkout-delivery.ts:40)。

本地后端已有英国、美国、欧洲区域，但前端固定 `getRegion("gb")`。结账国家列表来自英国购物车区域，无法正常购买到美国/欧洲。地址模型也没有州/省字段。

如果开业只卖英国，固定区域可以保留，但配送说明要一致。如果卖多国，增加区域选择并同步购物车币种、价格、配送和支付会话，按目的地支持州/省等地址字段。销售范围未得到确认，所以此项按条件处理。

## 13. 免费配送对符合服务区域的订单无金额门槛

定位：[seed.ts:363](H:/Cansoria/backend/src/scripts/seed.ts:363)。

`Free Art Delivery` 的价格为 0，只有启用/非退货等通用规则，没有购物车最低金额条件。本地数据库的规则与脚本一致。

如果计划所有订单免运费，这是合理配置。如果只打算满额免邮，需要在后端加入适用条件并验证门槛上下两种购物车，不能仅修改前台标签。

## 14. 忘记密码没有实现

定位：[LoginForm.tsx:85](H:/Cansoria/frontend/src/app/account/components/LoginForm.tsx:85)、[auth route:17](H:/Cansoria/frontend/src/app/api/auth/[action]/route.ts:17)。

忘记密码链接为 `href="#"`，前端认证代理只支持 login/register/logout。顾客忘记密码后无法自助恢复。

修改：接通邮件重置 token、有效期、单次使用与限流，或者短期提供清楚可用的人工恢复入口。不能继续显示一个无效操作。

## 15. 下单后注册与游客订单认领没有衔接

定位：[confirmed/page.tsx:64](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:64)、[confirmed/page.tsx:191](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:191)、[lookup/page.tsx:153](H:/Cansoria/frontend/src/app/order/lookup/page.tsx:153)、[orders/transfer/route.ts](H:/Cansoria/backend/src/api/store/orders/transfer/route.ts)。

确认页注册成功后直接告诉用户可查看历史订单，但只创建账户，未执行游客订单验证认领。现有安全设计要求邮箱订单访问凭证，不能仅凭相同邮箱自动转移订单。

修改：注册后明确引导邮件验证和订单认领，完成后再承诺账户历史可见。确认页密码最小长度为 6，认证接口要求至少 8，应同步约束，避免 6/7 位密码提交失败。

## 16. 浏览器缓存失败可能把已创建订单显示为失败

定位：[order-confirmation.ts:9](H:/Cansoria/frontend/src/lib/order-confirmation.ts:9)、[checkout/page.tsx:327](H:/Cansoria/frontend/src/app/checkout/page.tsx:327)、[checkout/page.tsx:345](H:/Cansoria/frontend/src/app/checkout/page.tsx:345)。

后端创建订单成功后，结账先调用未捕获异常的 `sessionStorage.setItem`，然后跳转。浏览器存储被禁用/容量不足时会进入结账外层错误分支，出现订单无法确认提示。确认页还依赖同一缓存，过期或新标签页时可能显示找不到订单。

修改：缓存采用 best-effort 写入，失败不能改变真实支付/订单结果；提供经过权限验证的订单查询回退。保留完成重试幂等性，不能因为浏览器缓存异常重新收费。

## 17. CMS 不可用被隐藏成内容回退

定位：[cms.ts:16](H:/Cansoria/frontend/src/lib/cms.ts:16)、[cms.ts:337](H:/Cansoria/frontend/src/lib/cms.ts:337)、[journal/page.tsx:40](H:/Cansoria/frontend/src/app/journal/page.tsx:40)。

两次前端构建都出现 `[CMS] Failed to fetch articles: 426`。读取失败返回空数组，页面使用回退内容；请求没有明确 AbortSignal 超时。文章内容没接通时可能不容易察觉，卡住的 CMS 也可能拖慢内容页面或构建。

修改：启动/配置预期的本地 CMS，或明确采用静态内容模式；所有外部内容请求增加有界超时，区分“没有文章”和“服务不可用”。这是内容问题，不应把它说成支付功能故障。

## 18. 营销和聊天功能应与准备状态一致

定位：[LayoutWrapper.tsx](H:/Cansoria/frontend/src/components/LayoutWrapper.tsx)、[ExitIntentPopup.tsx](H:/Cansoria/frontend/src/components/ExitIntentPopup.tsx)、[ChatWidget.tsx](H:/Cansoria/frontend/src/components/ChatWidget.tsx)、[StripeWalletButton.tsx](H:/Cansoria/frontend/src/app/cart/components/StripeWalletButton.tsx)。

未配置的订阅/聊天仍有入口；营销弹窗也可能出现在 checkout/account/order 页面。建议关闭未接通功能，并将支付/订单操作页面排除营销弹窗。

钱包按钮组件存在，但全仓没有调用处，不能将 Apple Pay / Google Pay 宣称为已支持。如果决定上线钱包支付，需要接通钱包地址、配送更新、3DS 和完成订单错误处理，并实际验收。

## 已经通过的检查

| 检查 | 结果 |
| --- | --- |
| 前端 `npm run test:security` | 18 suites，95 tests 全通过 |
| 后端 `npm run test:unit` | 23 suites，202 tests 全通过 |
| 前端全量 ESLint | 通过 |
| 前后端 TypeScript `tsc --noEmit` | 通过 |
| 后端 `npm run build` | server/admin 构建通过 |
| 前端 `npm run build -- --webpack` | 通过；有 CMS 426 日志 |
| 前端默认 `npm run build`（Turbopack） | 通过；有 CMS 426 日志 |
| 本地前端/后端 health | 200 |
| 14 个本地页面/输出读取 | 均为 200，带 CSP header |
| npm 正式 registry 生产依赖审计 | 完成，有上文漏洞条目 |

14 个读取覆盖首页、宠物商品、购物车、结账、账户、注册、订单找回、配送、退换、联系、journal、搜索、robots 和 sitemap。只读商品/区域查询及数据库检查使用现有本地数据，数据库检查在只读事务中完成。

隔离模拟复核了邮件金额、全桶图片误删、保存前删除顺序和代理限流共享。**没有运行需要真实支付/外部邮件/真实文件删除的完整端到端交易测试**，也未新增测试文件掩盖这些验收缺口。

已有安全保护包括 HttpOnly cookie、同源写入和代理路由白名单、购物车/订单访问凭证、资源归属检查、私有照片签名与受控读取、HTML/JSON-LD 安全处理、nonce CSP、验证码失败关闭和部分共享预算。这些设计值得保留，不应在修复体验问题时退回按邮箱直接认领订单或信任任意客户端 IP。

## 建议实施顺序与开业验收

1. 先禁用危险图片清理，并修金额单位；按照正式价格表更新脚本和现有数据。
2. 升级受影响依赖，再运行构建、类型检查和已有安全测试。
3. 统一 HTTP/webhook 完成校验和关键锁，修复代理限流与订单邮件金额。
4. 在本地测试配置下接通 Stripe、Resend 和私有照片存储；补上通知重试和扣款处理流程。
5. 发布真实确认的商品介绍、工期和服务政策；按销售区域修复国家/币种/地址流程；暂时关闭未接通的可选功能。
6. 补齐找回密码、游客订单认领和确认页回退，然后完成下列交易验收。

开业验收至少覆盖：

- 游客与账户客户：上传照片 → 定制商品 → 地址/配送 → 付款 → 后台订单及参考照片 → 邮件 → 订单查询/认领。
- 价格表、装框、多数量、优惠、税费和运费在页面、Stripe、订单及邮件一致。
- 测试卡成功、拒绝、3DS、手动捕获或自动捕获、取消、退款；核对真实 payment/capture 状态。
- 浏览器关页、断网、重复点击、重复/延迟 webhook、完成接口与回调并发，均不会重复订单/重复收费。
- 邮件暂时失败、重启后台、重试通知不会丢失或重复发送；失败有可见告警和补发办法。
- 未登录或不同账户不能读取他人订单/照片；商品清理不会删除客户照片或仍引用素材。
- 两个以上独立顾客不共用限流额度；单个滥用访客仍被限制。

参考照片还应明确存储保留周期、废弃上传清理、备份恢复和图片解码/像素上限；本地源码未看到完整的废弃上传清理任务。此项属于后续运维及数据生命周期准备，本次没有评估线上存储或法律合规。

线上检查已按要求搁置；完成上述本地修复与交易验收后，再单独做部署验收。
