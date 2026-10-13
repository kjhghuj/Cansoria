# Cansoria 修复后代码复审

日期：2026-10-13（Asia/Shanghai）。工作区：`H:\Cansoria`；HEAD：`6964cbb`。本次包含尚未提交的修复及新增路由、辅助模块和测试，对照 [上次报告](H:/Cansoria/CODE_SECURITY_REVIEW_2026-10-12.md) 复审。仅新增本报告和本地审核证据，没有修改业务代码，没有操作真实账户、数据库、支付或邮件服务。

**结论：多项修复已生效，但 R02 密码重置并发、R03 邮件可靠性这两组 P1 仍不能关闭。购物车身份切换、页面跨导航状态、CMS 搜索/关联文章也有明确残余。598 项现有测试全部通过，仍未覆盖下述边界。**

P1 表示优先修复；P2 表示需要修复的较低优先级问题。邮件、页面和内容一致性问题分别说明其可靠性影响，避免将其都表述成账户入侵漏洞。

## 已生效的修复

| 上次编号 | 复审状态 | 当前证据 |
| --- | --- | --- |
| R01 订单读取凭证可认领 | 已修复 | 完成响应签发 `order-read`，transfer 仅接受 `order-claim`；读取凭证调用实际 transfer 返回 403。BFF 仅给订单 GET 自动附加 cookie，logout 清除订单 cookie。见 [凭证](H:/Cansoria/backend/src/lib/access-tokens.ts:11)、[认领入口](H:/Cansoria/backend/src/api/store/orders/transfer/route.ts:13)、[BFF](H:/Cansoria/frontend/src/lib/server-medusa.ts:54)、[退出](H:/Cansoria/frontend/src/app/api/auth/[action]/route.ts:24)。 |
| R05 后端弱密码 | 已修复 | 后端注册、更新入口执行 8–256 字符校验，更新校验位于消费 token 前；相关测试通过。见 [权威校验](H:/Cansoria/backend/src/lib/auth-guards.ts:19)、[注册 middleware](H:/Cansoria/backend/src/api/middlewares.ts:73)。 |
| R06 无效照片进入完成校验 | 已修复 | 上传和结账完整解码图片并限制像素；三字节伪 JPEG 被拒，真实 PNG 被接受。见 [图片解码](H:/Cansoria/backend/src/lib/portrait-photos.ts:43)、[结账复验](H:/Cansoria/backend/src/lib/checkout-completion.ts:151)。 |
| R09 浏览器缓存异常破坏购物车/退出状态 | 已修复 | 实际 Providers 隔离复测：读取抛错仍恢复服务器购物车；写入抛错仍保留有效车；退出删除抛错仍清空用户和购物车。见 [缓存封装](H:/Cansoria/frontend/src/lib/providers.tsx:37)。 |
| R11 营销和聊天能力条件不一致 | 已修复 | 营销弹窗使用 newsletterEnabled，弹窗缓存容错；生产聊天显示同时要求模型 key 和 CHAT_REDIS_URL。见 [营销入口](H:/Cansoria/frontend/src/components/LayoutWrapper.tsx:83)、[聊天条件](H:/Cansoria/frontend/src/app/layout.tsx:45)。 |
| 密码找回的 429/大小写输入 | 已修复 | 429 显示限流提示；BFF 对不同的原始、规范化邮箱均申请重置，保持账户存在性响应一致。见 [找回页面](H:/Cansoria/frontend/src/app/account/forgot-password/page.tsx:23)、[BFF](H:/Cansoria/frontend/src/app/api/auth/[action]/route.ts:38)。 |

R04 商品项路由新增的身份锁与锁内授权已生效，但其他写路由仍有遗漏。R07 首次未授权 ref 已能显示失败；R08 模块全局 token/ref 已移除，但跨导航成功状态仍未清理。R10 商品正文二次覆盖、默认 Free Preview 和 getStore 无超时已修复。R12 主文章详情、Hero、sitemap 已使用新的内容策略。R13 州省字段现在能保存和展示。以下只列这些修复之后仍存在的问题。

## 仍需修复

### R02 / P1：重置密码锁可通过等价 Authorization 或客户端断连绕过

位置：[锁键与生命周期](H:/Cansoria/backend/src/lib/auth-guards.ts:37)、[实际 JWT 解析器](H:/Cansoria/backend/node_modules/@medusajs/framework/dist/http/middlewares/authenticate-middleware.js:154)、[实际消费算法](H:/Cansoria/backend/node_modules/@medusajs/auth/dist/services/auth-module.js:364)。

锁键散列整个 Authorization 字符串。框架却接受 Bearer 大小写和不同空白，因此 `Bearer <token>` 与 `bearer  <token>` 验证为同一 JWT/JTI，却获取不同锁。底层消费仍是查询后删除、不检查删除影响行数，两个调用可以同时成功。

此外，`res.on("close", done)` 在客户端提前断连时释放锁，而下游 token 消费/密码更新可能仍在执行。同一原始 header 也因此能重入临界区。

隔离执行当前 guard、框架 JWT 解析和 token 消费函数：等价 header 产生两个锁键，两次消费均成功；提前 close 场景只有一个锁键，两次消费同样成功。两者删除影响行数都是 `[1, 0]`。这是当前算法的确定性复现，未执行真实 PostgreSQL 并发密码更新。利用需要持有有效重置 token；没有证明可凭空重置他人密码。

**修复要求：**优先在权威消费处使用条件删除并检查返回行，或可靠事务/行锁。若保留应用锁，按验证后的稳定 token/JTI 加锁，直接等待实际消费和密码写入完成，不能以客户端断连作为工作完成依据。修复需通过可部署的代码或持久补丁实施。

**验收：**同一 token 的大小写/空白等价请求、相同 header 并发、第一客户端提前断连，在真实 PostgreSQL/Redis 下都只有一次消费和一次允许的密码更新；另覆盖过期、重新签发及写入失败恢复。

证据：[auth-probes.json](H:/Cansoria/audits/2026-10-13/auth-probes.json)。

### R03 / P1：订单邮件重试内容不稳定，并发 PENDING 仍可误标发送成功

位置：[通知辅助函数](H:/Cansoria/backend/src/lib/send-notification.ts:69)、[每次渲染重新签发链接](H:/Cansoria/backend/src/modules/resend/service.ts:154)、[发送幂等键](H:/Cansoria/backend/src/modules/resend/service.ts:319)、[欢迎发送标记](H:/Cansoria/backend/src/subscribers/customer-created.ts:51)。

subscriber 已改为传播异常；失败记录改名后重新创建，修复了顺序重试时旧框架更新不存在 ID 的问题。超时 PENDING 检查、定时标记和管理补发入口也已新增。但仍有两个断点：

1. `renderOrderEmail` 每次发送都重新调用 `orderAccessUrl`。时间变化后签名链接和 HTML 改变，而幂等键仍为同一订单键。若 Resend 接收了第一次请求、客户端丢失响应，稍后重试会以同键提交不同内容。Resend 对此返回 `409 invalid_idempotent_request`，幂等记录保留 24 小时；这是其 [官方接口约束](https://resend.com/changelog/idempotency-keys)，不是推测的新规则。
2. `sendNotification` 的预查询与框架创建之间没有同键锁。另一发送者在两者之间插入 PENDING 时，框架跳过发送并返回 undefined。辅助函数正常返回，欢迎 subscriber 随即写入 `welcome_email_sent=true`。若另一发送者随后崩溃/失败，事件重放又会被此标记跳过。

第一种隔离复现使用当前 helper、框架通知函数和实际 Resend provider 渲染，并模拟官方幂等合同：第一次远端接收后丢失响应，十秒后重试失败；两次 key 相同、HTML 不同，本地记录均为 failure。第二种复现使用当前 helper、框架和欢迎 subscriber：发送调用为 0，通知仍 pending，欢迎标记却为 true。没有发送真实邮件。

**修复要求：**首次生成并持久化完整发送内容和签名链接，自动重试复用同键、同内容；处理远端已接收但本地未知的结果。对同通知键的查询、状态迁移和发送进行可靠协调，只有已验证的 success 才能设置业务发送标记，undefined/PENDING 应进入等待或重试。

**验收：**覆盖远端接收后响应丢失、多实例同时发送、预查询后插入 PENDING、发送前后进程退出、过期重置邮件，以及通知成功但业务标记写入失败。定时 job 当前只标记 failure 和输出 error 日志，需确认运营实际能收到告警并完成补发。

证据：[notification-probes.json](H:/Cansoria/audits/2026-10-13/notification-probes.json)。

### R03 补发 / P2：人工补发复用已经过期或失效的密码重置链接

位置：[复用旧记录数据](H:/Cansoria/backend/src/lib/send-notification.ts:98)、[密码邮件存储链接](H:/Cansoria/backend/src/subscribers/password-reset.ts:36)。

管理补发只是新建幂等键并照抄旧 `data`。密码重置记录中的 JWT 过期或被重新签发作废后，补发仍返回 sent=true，用户收到的链接无法使用。order_access 模板中的旧签名链接也需要相同的有效期策略。

隔离复现：对嵌入已过期 JWT 的 password_reset 记录执行当前 `resendNotification`，返回 sent=true，发送数据仍包含原来的过期 token。

**修复要求：**按模板区分补发策略。重置密码应引导重新申请或走正式签发流程；不要仅修改 JWT 过期时间或重新签名旧 token，因为权威 token 记录可能已消费/作废。订单验证链接也应重新走允许的授权签发流程。

**验收：**过期、已消费、已被新申请作废的邮件，补发不能报告一个可用的新链接；正常订单通知补发仍能完成。

### R04 / P2：运输方式和税额写路由遗漏身份锁内授权

位置：[入口一次授权](H:/Cansoria/backend/src/lib/resource-access.ts:36)、[原生运输方式路由](H:/Cansoria/backend/node_modules/@medusajs/medusa/dist/api/store/carts/[id]/shipping-methods/route.js:6)、[原生税额路由](H:/Cansoria/backend/node_modules/@medusajs/medusa/dist/api/store/carts/[id]/taxes/route.js:6)。运输方式可通过 [BFF 白名单](H:/Cansoria/frontend/src/lib/store-proxy-policy.ts:16) 调用；taxes 当前不在 BFF 白名单中，但后端原生路由仍存在。

新增商品项包装路由已经在 `cart-identity:<id>` 锁内重新授权，并等待修改与 refetch。shipping-methods 仍只有 middleware 入口检查。若游客请求通过 guard 后，购物车被合法认领，该旧请求仍可修改运输方式，随后 refetch 返回新所有者邮箱和地址字段。taxes 从源码看有相同边界遗漏，未单独执行它的时序复现。

当前实际 guard → 模拟认领 → 实际原生 shipping handler 隔离复现：认领后 authorizeCart=false，但运输方式 handler 返回 200、执行一次模拟写入并返回账户邮箱。相同时序的新商品项包装路由返回 403、写入 0 次。

需要先持有合法游客购物车能力，并出现与认领重叠的请求；不是仅凭任意 cart ID 越权。

**修复要求：**完整枚举购物车写入口，将运输方式、税额等需要保留的入口纳入与认领相同的身份锁，并在锁内重新授权、等待实际修改和敏感响应读取完成。

**验收：**真实 HTTP/Redis/PostgreSQL 下暂停游客写请求，认领完成后恢复，请求不得继续修改或返回账户资料；正常写入和并发操作不受破坏。

证据：[access-photo-probes.json](H:/Cansoria/audits/2026-10-13/access-photo-probes.json)。

### R07–R08 / P2：第二个订单/重置链接仍沿用上一次结果，禁用存储刷新不能恢复

位置：[旧缓存优先于新 ref](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:75)、[未绑定 ref 的恢复状态](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:83)、[重置成功状态](H:/Cansoria/frontend/src/app/account/reset-password/page.tsx:26)。

模块级缓存已移除，capturedRef/capturedToken 会更新，但相关结果状态没有随身份变化重置：

- 无存储时先验证订单 A，再在同一页面实例导航订单 B：B 的查询尚未返回就显示 Order Confirmed，带 B 编号和 A 邮箱。B 返回 403 后才显示失败。
- sessionStorage 保留 A 的确认缓存时导航显式 ref=B：`confirmation?.orderId ?? urlOrderId` 选择 A，且恢复 effect 因 confirmation 存在而跳过 B 的授权查询。
- 重置 A 成功后导航 token=B：done 仍为 true，继续显示旧成功提示，没有 B 的密码表单。
- 禁用存储时首次通过 ref 与 cookie 恢复可以工作，但 URL 清理后刷新失去 ref，即使 cookie 仍有效也显示 Reference Not Found。

以上使用实际组件和现有 hook fixture 复现，导航、请求和存储为 mock，未运行浏览器 E2E。后端读取权限仍有效；本项是错误成功提示和用户流程阻断，不是服务器越权。

**修复要求：**把确认数据、恢复状态、邮箱及注册结果绑定到订单 ID；缓存必须与显式 ref 匹配。重置表单及异步结果绑定 token，身份改变时重置状态并取消旧操作结果。保留能在存储被禁用后刷新恢复的服务器入口或安全引用。

**验收：**两笔订单、两次重置连续导航；A 缓存+B ref；A 成功+B 待定/403；禁用存储首次访问和刷新。

证据：[frontend-probes.json](H:/Cansoria/audits/2026-10-13/frontend-probes.json)。

### R12 / P2：健康空 CMS 的搜索仍显示旧文，关联文章仍无条件混入静态内容

位置：[忽略空列表](H:/Cansoria/frontend/src/components/SearchOverlay.tsx:49)、[搜索回退](H:/Cansoria/frontend/src/components/SearchOverlay.tsx:78)、[关联文章合并](H:/Cansoria/frontend/src/app/journal/[slug]/page.tsx:287)。

新列表 API、主文章详情、Hero 和 sitemap 已改用健康 CMS 权威策略。但搜索仅在 `data.articles.length` 非零时更新 journalIndex。API 正常返回 [] 时状态仍为 null，搜索继续使用旧 `ARTICLES`。实际组件隔离复现：API 文章数为 0，搜索 photo 仍展示 “How to Turn a Photo Into a Hand-Painted Oil Painting”。非空索引还会在组件整个生命周期缓存，重新打开搜索不刷新。

文章页关联区则仍无条件 concat `getFallbackRelatedArticles`。健康 CMS 缺失的关联 ID 若与静态 ID 相同，仍会显示对应旧文章链接；这部分为源码确认，未单独进行 CMS 服务端时序复现。

**修复要求：**接受有效空数组；等待最终索引期间避免展示错误静态集，失败回退使用与页面相同的内容源。关联内容同样保留 CMS source/status，健康缺失不补旧文。为搜索索引定义刷新/失效策略。

**验收：**健康空 CMS、文章下架、关联文章下架、CMS 请求失败、静态模式和同一浏览器会话内内容变更。

## 营业和地区配置残余

这两项延续上次业务检查，不额外算作新安全漏洞：

- **R10，营业前优先：**ordersOpen 已贯穿商品转换，Free Preview 已要求明确 true，getStore 已有 5 秒超时。但 [商品正文](H:/Cansoria/frontend/src/app/product/[handle]/components/ProductClient.tsx:329)、[交付文案](H:/Cansoria/frontend/src/app/product/[handle]/components/ProductClient.tsx:393)、[页脚](H:/Cansoria/frontend/src/components/Footer.tsx:30) 等仍固定显示筹备/开业前文案。需在 ordersOpen=true 的真实渲染中统一商品、FAQ、政策、页脚与服务承诺。
- **R13，多地区销售前优先：**州省保存已补，但 [区域初始化](H:/Cansoria/frontend/src/lib/providers.tsx:172) 仍固定 gb，缺少区域切换。地址表单虽允许美国等国家，[州省仍统一标为 Optional](H:/Cansoria/frontend/src/app/account/components/AddressesContent.tsx:254)。按实际销售范围实现地区价格/税/运费/支付切换及必要地址校验，或明确只支持已验收地区。

## 依赖审计

| 生产依赖 | Critical | High | Moderate | Low | 告警包条目 |
| --- | ---: | ---: | ---: | ---: | ---: |
| frontend | 0 | 0 | 0 | 0 | 0 |
| backend | 0 | 77 | 3 | 0 | 80 |

本次重新使用官方 registry 执行 `npm audit --omit=dev --json`。结果：[前端](H:/Cansoria/audits/2026-10-13/frontend-npm-audit.json)、[后端](H:/Cansoria/audits/2026-10-13/backend-npm-audit.json)。数量与上次一致。

主要根告警仍是 [braces 深层模式栈耗尽](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 和 [sprintf-js 无界精度拒绝服务](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)，经框架依赖链传播。80 是受影响包条目数，不代表 80 个独立、已证实能通过店铺接口利用的漏洞。当前未确认应用请求输入能到达这两个危险参数路径。braces 的 audit fixAvailable=false，公告仍无修复版本；sprintf-js 的 audit fixAvailable=true，需检查其依赖升级方案和兼容性，不能据此直接强制升级/降级整个 Medusa 栈。

## 验证范围与交付

- 后端：44 个套件、461 项测试通过，见 [测试结果](H:/Cansoria/audits/2026-10-13/backend-tests.json)。
- 前端：21 个套件、137 项测试通过，见 [测试结果](H:/Cansoria/audits/2026-10-13/frontend-tests.json)。合计 598 项。
- 前后端 TypeScript `--noEmit --incremental false` 通过；前端 ESLint 通过。
- 服务隔离复现执行当前实际函数、框架消费/通知函数和邮件渲染，repository、锁调度与远端响应用内存 mock；前端复现使用现有 deterministic hook fixture，没有将这些结果表述成真实数据库或浏览器验收。
- 没有重新运行生产构建、完整 E2E、真实 PostgreSQL/Redis 并发、Stripe 扣款/退款或实际邮件送达。S3/R2 桶访问策略、支付恢复与外部服务告警仍沿用上次报告的待部署验收范围。

建议先处理 R02 和 R03，再补齐 R04 的所有写入口，然后关闭页面/CMS残余；按实际营业和销售范围完成 R10/R13，最后运行真实服务集成验收。
