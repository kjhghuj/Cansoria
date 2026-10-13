# Cansoria 当前代码安全审核

审核日期：2026-10-12（Asia/Shanghai）。对象：`H:\Cansoria`，HEAD `6964cbb`。审核开始时业务工作树干净。本次只新增报告及本地审核证据，没有修改业务代码、数据库、账户归属或第三方服务。

**结论：仍有 3 项应优先修复的 P1 安全或可靠性问题。本次还新确认了购物车认领时序、后端弱密码校验、无效照片校验 3 项 P2。已有测试通过，但未覆盖这些边界，不能据此关闭问题。**

P1 表示应优先修复；P2 表示明确需要修复的较低优先级缺陷。下方另外区分了开放营业前的业务问题，以及尚未进行线上验收的部署风险。

## 1. 优先修复

### R01／P1：订单读取凭证仍能修改游客订单归属

位置：[签发读取凭证](H:/Cansoria/backend/src/lib/cart-fields.ts:34)、[BFF 自动转发](H:/Cansoria/frontend/src/lib/server-medusa.ts:49)、[认领接口](H:/Cansoria/backend/src/api/store/orders/transfer/route.ts:11)。

完成购物车时签发的是 `purpose="order"`、30 分钟有效的凭证。BFF 存入 HttpOnly cookie 后，会把它附加到后续请求，包括 `POST /store/orders/transfer`。认领接口接受同一目的的凭证，没有区分确认页读取与订单邮件验证。

持有刚完成游客订单的合法 cookie，再登录另一账户，就可以把这笔游客订单认领给该账户；不需要验证订单邮箱。实际完成响应投影与实际 transfer 路由的隔离复现返回 200，执行一次模拟归属更新，邮箱查询次数为 0。缺少凭证时仍返回 403；已注册账户的归属保护仍在。这不是仅凭订单编号窃取任意订单。

**修复：**分离读取与认领凭证的目的和权限；transfer 只接受邮件验证产生的认领证明；读取 cookie 只自动用于允许的订单 GET 请求。还应在退出登录时清理订单 cookie：当前 [logout](H:/Cansoria/frontend/src/app/api/auth/[action]/route.ts:19) 只清理 session/cart cookie，订单读取能力在退出后仍保留。

**验收：**确认页读取正常；读取 cookie 不能认领；邮件验证认领正常；跨订单、跨账户和退出登录后的读取均符合权限规则。

### R02／P1：密码重置凭证的单次消费缺少并发原子保证

位置：[实际安装的消费算法](H:/Cansoria/backend/node_modules/@medusajs/auth/dist/services/auth-module.js:364)、[删除后直接返回成功](H:/Cansoria/backend/node_modules/@medusajs/auth/dist/services/auth-module.js:377)。

算法先查询 token，再删除记录，未在消费处锁定记录，也没有确认删除影响了一行。两个请求可以同时查到同一 token；第二次删除返回空数组时，算法仍继续返回成功。

执行当前安装版本的实际函数，并让两个内存查询同时读到该记录，两个调用均成功，删除影响行数为 `[1, 0]`。这是算法缺口的确定性复现，**没有执行真实 PostgreSQL 并发密码写入**。现有有效期和顺序单次消费保护仍在。

**修复：**使用条件删除并检查返回行，或在可靠事务/行锁中消费，并核验消费与密码更新的失败恢复；同时验证并发签发时旧 token 的失效行为。通过可部署的依赖升级、持久补丁或应用级约束实施，不能只修改 `node_modules`。

**验收：**真实 PostgreSQL 下两个并发重置仅一个成功；过期、顺序重复、重新签发、无效输入及更新失败场景均有明确行为。

### R03／P1：邮件发送失败及进程崩溃后仍无法可靠恢复

位置：[订单 subscriber](H:/Cansoria/backend/src/subscribers/order-placed.ts:90)、[欢迎 subscriber](H:/Cansoria/backend/src/subscribers/customer-created.ts:55)、[重置密码 subscriber](H:/Cansoria/backend/src/subscribers/password-reset.ts:40)、[框架通知处理](H:/Cansoria/backend/node_modules/@medusajs/notification/dist/services/notification-module-service.js:54)。

Redis 队列和退避重试已经配置，但仍有三处断点：

- 三个 subscriber 捕获异常后正常返回。事件 worker 把正常返回当作处理完成，配置的重试不会恢复这次发送失败。
- 框架重试同幂等键的 FAILURE 通知时生成新通知 ID，却不创建对应记录，发送后更新新 ID 失败。当前函数配合内存 repository 复现了首次发送失败、第二次发送成功、状态更新 `NOT_FOUND`。
- 已存在的 PENDING 通知不会重发。模拟发送前崩溃留下 PENDING 后，重放发送次数为 0、返回结果为空；欢迎处理器还可能把 `welcome_email_sent` 标记为 true。

**修复：**让失败进入可重试状态并核验通知结果；修复重试时记录 ID 的一致性；建立超时 PENDING 的恢复策略、告警和人工补发入口；保持稳定幂等键与可重放的消息内容。仅将 catch 改成 throw 不足以解决全部问题。

**验收：**服务暂时失败、同键重试、发送前后崩溃、重复事件、多实例和过期密码重置邮件都能正确恢复或明确提示重新申请。

## 2. 本次新增确认的问题

### R04／P2：原生购物车操作在认领后没有重新检查权限

位置：[请求入口 guard](H:/Cansoria/backend/src/lib/resource-access.ts:42)、[原生商品项操作](H:/Cansoria/backend/node_modules/@medusajs/medusa/dist/api/store/carts/[id]/line-items/[line_id]/route.js:8)、[认领包装工作流](H:/Cansoria/backend/src/workflows/cansoria-claim-cart.ts:44)。

自定义更新、认领和完成路由会在身份锁内重新授权，但原生商品项操作仍只在 middleware 中授权一次。原生工作流获取购物车锁后只接收 cart ID/商品项/更新数据，不再核验请求者身份。

如果一个持有合法游客凭证的请求先通过 guard，随后购物车被账户认领，前一个请求仍能执行原生操作，并在响应中重新读取已认领购物车的资料。隔离执行实际 guard → 模拟并发认领 → 实际原生 handler 时，新的 `authorizeCart` 已返回 false，但 handler 仍返回 200、调用一次模拟修改，并返回新所有者的模拟邮箱。现有默认购物车字段也包含地址。

这要求先有合法游客凭证和重叠的认领/请求时序，不是任意购物车 ID 越权。复现使用模拟 workflow/query；真实 HTTP/Redis/PostgreSQL 时序仍需验收。

**修复：**将仍走原生路由的购物车写操作纳入与认领一致的、可等待的身份锁边界，在执行和敏感响应读取前重新授权。不要只在 middleware 中把 `next()` 包进锁：下游异步 handler 可能在锁释放后继续执行。

**验收：**暂停游客商品项请求、完成账户认领，再恢复该请求，应拒绝修改并且不返回账户资料；正常并发购物车操作仍可完成。

### R05／P2：八字符密码规则只在前端 BFF 实施

位置：[BFF 长度校验](H:/Cansoria/frontend/src/app/api/auth/[action]/route.ts:68)、[后端自定义 auth middleware](H:/Cansoria/backend/src/api/middlewares.ts:66)、[实际 emailpass 注册函数](H:/Cansoria/backend/node_modules/@medusajs/auth-emailpass/dist/services/emailpass.js:92)。

后端 auth middleware 只加了限流；原生注册/provider 仅检查密码是非空字符串。直接请求后端注册入口可以绕过 BFF 的八字符规则。实际 provider 配合内存身份服务接受了密码 `x`，创建一次模拟身份；原生密码更新同样缺少该长度规则。

外部利用取决于后端 auth 是否可直达；当前仓库没有提供证明这些入口仅允许 BFF 访问的 ingress 规则。CORS 不会阻止非浏览器直接请求。

**修复：**在后端注册与密码更新的权威入口统一验证密码长度、类型和上限；对无效重置输入应在消费 token 前拒绝。若采用网络隔离作为边界，部署配置和直连拒绝必须可验证。

**验收：**绕过 BFF 直接调用后端，短密码注册/更新都被拒绝；正常注册、旧账户登录及有效重置仍正常。

### R06／P2：照片校验只检查文件头，无效图片也能进入结账

位置：[上传校验](H:/Cansoria/backend/src/lib/portrait-photos.ts:57)、[结账读取校验](H:/Cansoria/backend/src/lib/checkout-completion.ts:148)。

上传和共享完成校验只核验头部 magic bytes、大小、扩展名和签名。只有三个字节 `FF D8 FF` 的文件没有图像帧、像素或完整 JPEG 结构，但实际 `validatePhoto` 接受它，实际 `validateCheckoutCompletion` 读取相同模拟文件后也通过。

因此“照片存在且可读”的保护还不能保证用户提交了能制作肖像的图像。这是无效资料进入订单的明确缺陷；本次没有证明 XSS、代码执行或已经完成真实扣款。

**修复：**在受限资源下完整解码并核验图像结构、尺寸/像素上限，必要时转码为受控格式；结账使用已验证结果并确认文件未变化。

**验收：**截断 JPG/PNG/WebP、伪造头、无像素文件和超限图像被拒；真实格式、正常尺寸照片能上传并完成验证。

## 3. 仍未关闭的前端和营业问题

| 编号 / 优先级 | 当前问题及影响 | 修复与验收 |
| --- | --- | --- |
| R07 / P2 | [确认页](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:63) 把格式正确的 ref 直接当作确认订单；授权查询返回 403 后仍显示“Order Confirmed”。禁用存储时 ref 被清除，刷新也无法从仍有效的 cookie 恢复。 | 区分待验证、已确认和失败状态；只有完成结果或授权读取成功才确认。保留安全的服务器恢复入口，验证禁用存储后的刷新。实际组件隔离复现 403 后仍展示成功；后端数据权限仍有效。 |
| R08 / P2 | [重置 token](H:/Cansoria/frontend/src/app/account/reset-password/page.tsx:9) 和 [订单 ref](H:/Cansoria/frontend/src/app/order/confirmed/page.tsx:16) 使用模块全局 `??=` 缓存；同一 SPA 的第二个链接仍使用第一次的值。 | 将值绑定页面实例/导航，同时兼容清理 URL。隔离执行实际 snapshot 函数，两次链接均返回第一次的值；验收连续重置、连续两笔订单。 |
| R09 / P2 | [Providers](H:/Cansoria/frontend/src/lib/providers.tsx:222) 还有未容错的缓存读写/删除。读取失败阻止服务器保存购物车恢复；写入失败丢掉已读出的有效车；[退出登录](H:/Cansoria/frontend/src/lib/providers.tsx:336) 删除缓存失败后仍显示用户。 | 缓存操作 best-effort，内存/服务器状态独立提交。实际组件与现有 hook fixture 已复现三类问题；覆盖禁用存储、配额满、退出和完成车清理。 |
| R10 / 开放营业前优先 | 服务器按 ordersOpen 保留正式商品正文，但 [ProductClient](H:/Cansoria/frontend/src/app/product/[handle]/components/ProductClient.tsx:147) 再次默认调用 studioProduct，覆盖为筹备文案。SEO 与正文不一致；[商品卡](H:/Cansoria/frontend/src/components/ProductCard.tsx:181) 默认展示 Free Preview，后台新 metadata 白名单又未传递 free_preview，不能可靠控制该承诺。 | 贯穿统一营业状态和审核正文；服务承诺只接受明确 true，按需白名单公开对应字段。实际双调用已复现正文被覆盖。同步政策、FAQ、页脚和结账；[getStore](H:/Cansoria/frontend/src/lib/medusa.ts:37) 还应增加有界请求超时。 |
| R11 / P2 | [营销弹窗](H:/Cansoria/frontend/src/components/LayoutWrapper.tsx:80) 不使用 newsletterEnabled，缺必需配置也会弹出无法完成的订阅。其缓存读写仍会抛错。[聊天显示](H:/Cansoria/frontend/src/app/layout.tsx:43) 只检查模型 key，生产 API 另要求 CHAT_REDIS_URL。 | UI 与 API 共享完整能力条件，弹窗存储容错。验收缺验证码/Klaviyo、只有模型 key 无预算 Redis 等配置组合。 |
| R12 / P2 | 健康 CMS 无文章时 [Hero](H:/Cansoria/frontend/src/components/journal/JournalHero.tsx:30) 仍补旧文；[详情](H:/Cansoria/frontend/src/app/journal/[slug]/page.tsx:279) 对健康 CMS 缺失 slug 也回退静态文章；搜索固定搜本地文章；默认静态文章又没进入 sitemap。 | 所有出口使用同一最终内容集和 source/status；健康 CMS 缺内容为空态/404，按明确策略回退。验收下架、空 CMS、CMS 错误及静态模式的列表/详情/搜索/sitemap。 |
| R13 / P2，多地区销售前优先 | [Provider](H:/Cansoria/frontend/src/lib/providers.tsx:148)、商品和搜索固定英国区域，没有区域切换；[账户地址](H:/Cansoria/frontend/src/app/account/components/AddressesContent.tsx:52) 缺少州省保存。 | 落实地区选择并重算价格/币种/运费/税/支付，或明确只销售已支持地区；账户地址与结账使用同一模型。验收英国、美国和一个支持的欧洲国家。 |

密码找回另有两个明确残余：[忘记密码页面](H:/Cansoria/frontend/src/app/account/forgot-password/page.tsx:24) 将 429 当作成功；[BFF 请求重置](H:/Cansoria/frontend/src/app/api/auth/[action]/route.ts:39) 不像登录那样支持混合大小写输入回退。应提供统一限流提示，并兼容规范化账户和已有大小写身份。账户创建提示也不应暗示已经发送认领验证邮件，因为注册处理器没有触发该流程。

## 4. 当前依赖结果与部署边界

| 生产依赖审计 | Critical | High | Moderate | Low | 包条目总数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| frontend | 0 | 0 | 0 | 0 | 0 |
| backend | 0 | 77 | 3 | 0 | 80 |

使用官方 `registry.npmjs.org` 重新执行 `npm audit --omit=dev --json`。默认 npmmirror 的安全审计接口返回 404，因此不能把默认命令失败当作“没有漏洞”。官方结果保存在 [前端审计](H:/Cansoria/audits/2026-10-12/frontend-npm-audit.json) 和 [后端审计](H:/Cansoria/audits/2026-10-12/backend-npm-audit.json)。

High 条目主要由 [braces 深层模式栈耗尽公告](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 经依赖链传播；Moderate 对应 [sprintf-js 精度参数拒绝服务公告](https://github.com/advisories/GHSA-hp3w-g68c-fv3c)。80 个包条目不是 80 个独立、已证实可利用的漏洞。当前未在应用源码发现直接把用户输入传给这两者的调用；框架间接路径和生产暴露面仍需单独分析。braces 本次返回 `fixAvailable=false`，应结合上游修复或兼容补丁处理，不能盲目强制降级 Medusa。

以下项目属于部署验收或业务决定，本次没有在线配置证据，不能宣称已完成，也不将其自动计作已发生的漏洞：

- S3/R2 公私访问隔离：代码设置 `access="private"`，但还需验证桶策略、公开域名/CDN 与私有对象读取。当前 provider 共用一个 bucket/prefix，单靠应用权限不足以证明存储直链安全。
- 上传保留、可恢复隔离、备份及最终删除前引用重查。现有物理删除入口继续关闭，不应在验收前打开。
- 真正的 Stripe 3DS、拒付、扣款、退款、webhook 并发及故障恢复；真实 PostgreSQL/Redis 锁和工作流恢复；邮件实际送达和补发。
- 工期、制作地点、材料、预览/修改、取消退款、联系信息和免邮规则，应由真实业务信息确定。

## 5. 本次验证和证据

- 后端：41 个测试套件、427 项测试通过。
- 前端：21 个测试套件、136 项测试通过。合计 563 项。
- 前后端 TypeScript `--noEmit --incremental false` 通过；前端 ESLint 通过。
- [安全隔离复现](H:/Cansoria/audits/2026-10-12/security-probes.json)：读取凭证认领、密码重置并发、通知重试/PENDING、原生弱密码、购物车认领时序、三字节无效照片。
- [前端隔离复现](H:/Cansoria/audits/2026-10-12/frontend-probes.json)：缓存异常、跨导航全局缓存、营业正文二次覆盖、退出未清订单 cookie、未授权 ref 显示确认。

组件复现使用现有 deterministic hook fixture；服务复现使用当前真实函数和内存 mock。没有将其描述成真实浏览器、真实数据库并发或生产支付结果。本次未重新运行生产构建或完整 E2E。

生产环境 fail-closed、强秘密检查、BFF 路径/查询白名单、目录穿越防护、CMS HTML 清洗、订单字段投影、共享完成校验和关闭物理删除的已有保护仍在，未发现本轮重新开放这些旧入口。

建议修复顺序：R01–R03 → R04–R06 → R07–R09；开放营业前完成 R10，按实际启用范围处理 R11–R13，再执行真实服务和部署验收。

