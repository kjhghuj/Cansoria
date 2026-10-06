# 安全审核方案核验报告

> 本文记录修复前的审核基线，以下漏洞与行号属于当时的代码快照。当前修复状态、验证结果和部署要求见 [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md)。

审核日期：2026-10-05（Asia/Shanghai）。代码基线：`dc29534`，以本次工作区文件及已安装依赖为准。

## 1. 审核范围与方法

**结论：原方案的报告结构和只读约束正确，但“已核实”的漏洞描述与分级不能直接照搬。** 订单转移的授权缺陷、订单查询的客户端校验失效、CMS/商品内容的危险渲染、匿名付费接口滥用确有代码依据；代理管理接口、购物车能力凭证、调试页、SVG、模板路径等需要补充前提或降级。

本次使用两个只读探索代理分别扫描后端和前端攻击面，再由主审核者逐行核实关键链路。覆盖自定义 API、中间件、Medusa 内置相关路由、认证与存储、订单与结账、支付适配器、邮件与订阅、文件服务、内容渲染、Next.js 配置、管理工具、脚本和本地容器配置。采用 `ecc:security-review` 检查框架，并参考相关项目的官方文档。

后端清单声明 Medusa `2.12.4`，前端声明 Next.js `16.1.1`、React `19.2.3`、html-react-parser `^5.2.17`（`backend/package.json:29`，`frontend/package.json:19`、`:21`、`:22`）。框架行为通过本地 `node_modules` 实现核实；这些证据属于依赖实现，升级依赖或改变构建产物后必须重新确认。

本次只创建报告，没有修改源代码、配置或依赖，没有运行构建、测试、漏洞载荷、邮件发送、支付请求或生产探测。没有读取实际 `.env` 凭据。未覆盖实际 CDN/WAF、生产响应头、生产网络、账户与数据、S3 策略、完整 Git 历史或全量依赖 CVE。Strapi 服务端源码不在当前审核范围，无法证明其写权限和净化策略。

### 1.1 证据与分级规则

- **已确认**：代码及相关框架实现能够证明缺陷；不表示已在生产成功利用。
- **条件性风险**：危险行为已确认，但实际影响依赖已知对象 ID、内容写权限、环境配置或敏感数据存在。
- **待验证/不成立**：缺少可达攻击链，或者存在原方案未考虑的安全控制。
- **严重**：通常保留给可大范围接管系统、直接任意执行代码等影响。本次没有足够证据确认此级别。以下“高/中/低”为定性分级，不冒充经过计算的 CVSS 分数。

`x-publishable-api-key` 是前端公开使用的渠道凭证，不能替代用户认证。Medusa 对 `/store` 检查该 key，但允许未登录请求；`/admin` 默认强制管理用户认证（`backend/node_modules/@medusajs/framework/dist/http/router.js:87`、`:97`、`:99`）。因此本报告中的“匿名”指没有客户/管理员会话，Store 路由通常仍需公开 key。官方用法见 [Medusa Storefront Publishable API Key](https://docs.medusajs.com/resources/storefront-development/publishable-api-keys)。

### 1.2 原方案逐项校正

| 原结论 | 核验结果与建议分级 | 证据 |
| --- | --- | --- |
| 任意订单转移到任意客户 | 授权缺陷成立，高危、上线阻断；需要有效订单 ID 和有效目标客户。接口未限制仅访客订单；邮箱可由订单详情接口取得 | `backend/src/api/store/orders/transfer/route.ts:27`、`:56`、`:71`、`:80`、`:138` |
| 订单查询邮箱校验仅在客户端 | 成立，高危；根因还包括默认后端详情接口没有用户归属过滤，不能只改前端 | `frontend/src/app/order/lookup/page.tsx:140`、`:156`；内置 orders 路由 `route.js:6`，详见 H-02 |
| 购物车凭 ID 暴露全部敏感信息 | 指定字段确实返回；属于条件性隐私风险，不能据此认定所有购物车可枚举或订单可查询；已完成购物车被拒绝 | `backend/src/api/store/carts/[id]/route.ts:54`、`:59`、`:62`、`:71` |
| test-email 是开放邮件转发 | 匿名任意收件人触发邮件成立，高危资源滥用；固定欢迎模板，不能发送任意正文，不能称 open SMTP relay | `backend/src/api/store/test-email/route.ts:18`、`:20`；`backend/src/modules/resend/service.ts:227` |
| test-interface 是高危无鉴权调试后门 | 无鉴权且无生产开关成立；仅浏览器请求工具，未证明服务端特权或鉴权绕过，降为低危卫生项 | `backend/src/api/test-interface/route.ts:4`、`:113`、`:142` |
| check-email 用户枚举 | 成立，中危；准确说是认证身份存在性枚举，未限定一定为 customer 身份 | `backend/src/api/store/check-email/route.ts:23`、`:31` |
| newsletter 批量制造折扣码 | 条件性成立，中危；每次需有效 Turnstile token，验证失败会拒绝；缺少领券去重、领取资格和使用约束 | `backend/src/api/store/newsletter/route.ts:32`、`:60`、`:95` |
| 私有本地上传公开、SVG XSS | 非生产本地存储风险成立；生产已有 S3 必配开关。SVG 影响需上传权限、文件存在和浏览器访问方式 | `backend/medusa-config.ts:14`、`:35`；`backend/src/api/static/[filename]/route.ts:45`、`:56` |
| 全站无速率限制 | 未发现应用层限流；不能证明 CDN/WAF/第三方配额也没有限制 | `backend/src/api/middlewares.ts:15`；`backend/SECURITY.md:65`；`frontend/src/app/api/chat/route.ts:12` |
| Handlebars 模板路径穿越 | 路径拼接缺少约束，但现有匿名邮件入口固定模板，尚无攻击者控制模板名的链路；列待验证 | `backend/src/modules/resend/service.ts:236`；`backend/src/api/store/test-email/route.ts:20` |
| journal 未净化存储型 XSS | 危险渲染链路成立，高危且有内容写权限前提；不能推断匿名用户可写 Strapi，不能用 React 不执行的字符串 onerror 证明利用 | `frontend/src/app/journal/[slug]/HtmlContentRenderer.tsx:53`；parser `dom-to-react.js:79`，详见 H-03 |
| 两处 JSON-LD script 逃逸 | 成立，高危且有商品/CMS字段写入前提；`JSON.stringify` 不转义 `<` | `frontend/src/app/journal/[slug]/page.tsx:438`；`frontend/src/app/product/[handle]/page.tsx:148` |
| rewrite 暴露 admin/auth 就是高危 | 转发范围成立，但不自动取消后端认证；列中危边界风险，需确认生产网络设计 | `frontend/next.config.ts:42`；Medusa `router.js:88` |
| JWT localStorage 高危 | 存储事实成立，单独为中危风险放大因素；与同源 XSS 组合可盗用客户 token | `frontend/src/lib/providers.tsx:249`、`:266` |
| chat 匿名无限调用 | 应用无认证/限流/长度和输出预算限制成立，高危费用滥用；需配置 Gemini key，仍受供应商配额约束 | `frontend/src/app/api/chat/route.ts:13`、`:26`、`:33` |
| 后端错误体原样透传 | 多字段透传成立，中危；payment-sessions 已覆盖 message，但其他字段仍保留，不能说所有字段完全原样 | `frontend/src/app/api/checkout/[cartId]/payment-sessions/route.ts:55`、`:90`、`:120`；`frontend/src/lib/medusa.ts:333`、`:380` |
| 无任何安全响应头 | 仓库未配置页面级 CSP/XFO/HSTS；实际生产未知，且图片响应明确有 CSP 与 attachment，原措辞过宽 | `frontend/next.config.ts:36`、`:37`、`:39` |
| 成功 URL 泄露 email+姓名 | 成立，中危；另有订单邮件中的查询 URL。URL 编码不等于保密 | `frontend/src/app/checkout/page.tsx:301`；`backend/src/modules/resend/service.ts:175` |
| test-cart.html 会发布 | public 下保留测试页，低危；请求目标是 localhost 且 key 为空，未证明生产可操作真实后台 | `frontend/public/test-cart.html:6`、`:7`、`:33` |
| https 通配 + SVG 直接导致 XSS/SSRF | 通配过宽成立；已有 SVG CSP/attachment，Next 默认不允许本地 IP，不能认定直接 SVG XSS 或内网 SSRF | `frontend/next.config.ts:32`、`:35`、`:37`；Next `image-config.js:62` |
| 硬编码真实客户邮箱 | 硬编码邮箱存在，低危隐私/运维卫生；仅凭源码无法确认是真实客户，不在报告重复该邮箱 | `backend/src/scripts/add-coupon.ts:8` |
| bcrypt 零使用证明密码问题 | 不成立：Medusa emailpass 实际使用 scrypt；只能检查是否有冗余直接依赖 | `backend/package.json:34`；`backend/node_modules/@medusajs/auth-emailpass/dist/services/emailpass.js:17` |
| 打印 publishable key 泄露秘密 | 不属于管理密钥泄露：脚本明确筛选 publishable，前端本就使用该 key | `backend/src/scripts/list-api-keys.ts:13`、`:18`；`frontend/src/lib/medusa.ts:6` |

## 2. 漏洞与风险明细

### 2.1 严重

本次没有确认达到上述“严重”标准的独立漏洞。以下 H-01 至 H-04 应作为上线阻断问题优先处理；不应因未标“严重”而延后。

### 2.2 高危

#### H-01 订单转移信任外部客户 ID，允许越权改归属和复制地址（已确认）

- **位置**：`backend/src/api/store/orders/transfer/route.ts:27`（三个参数来自 body）、`:56`（读取任意订单）、`:67`（只比较提供的邮箱）、`:80`（改客户 ID）、`:92`（地址绑定目标客户）、`:138`（创建客户地址）；`backend/src/api/middlewares.ts:15`（没有该路由的强制认证）。框架允许匿名 Store 请求的依据见 `backend/node_modules/@medusajs/framework/dist/http/router.js:99`。
- **原理**：知道某邮箱不等于持有该邮箱或订单。代码没有使用 `req.auth_context.actor_id`，没有核实目标客户邮箱/身份，没有拒绝已经属于其他客户的订单。内置 `/store/orders/:id/transfer/request` 的认证不保护名称不同的 `/store/orders/transfer`（`backend/node_modules/@medusajs/medusa/dist/api/store/orders/middlewares.js:60`）。
- **攻击场景**：持有有效订单 ID 的攻击者通过 H-02 取得订单邮箱，再以自己的有效 customer ID 请求转移。订单归属被改写，收货/账单地址在复制成功时进入攻击者账户。没有证明可凭数字展示订单号枚举全部订单，也没有证明此路径可退款或绕过支付。
- **修复方向**：强制 customer 认证，目标客户仅取认证上下文；禁止任意覆盖已有归属。访客认领使用发送给订单邮箱的一次性、短有效期、绑定订单和目标客户的凭证，优先复用 Medusa 标准 transfer workflow；认领和地址处理设计为幂等事务，记录审计事件。仅增加“登录”或再次比较 body 邮箱不足以修复。

#### H-02 前端邮箱校验无法保护匿名订单详情接口（已确认）

- **位置**：`frontend/src/app/order/lookup/page.tsx:140` 在未提交邮箱时已发起详情读取，`:153` 先接收订单，`:156` 才在浏览器检查邮箱。依赖证据：`backend/node_modules/@medusajs/medusa/dist/api/store/orders/middlewares.js:53` 只有查询校验，`backend/node_modules/@medusajs/medusa/dist/api/store/orders/[id]/route.js:6` 只传入订单 ID 和非草稿过滤，`backend/node_modules/@medusajs/medusa/dist/api/store/orders/query-config.js:25` 默认返回邮箱，`:59`、`:60` 返回地址；工作流 `backend/node_modules/@medusajs/core-flows/dist/order/workflows/get-order-detail.js:41` 没有客户归属过滤。
- **原理与场景**：直接调用后端或前端 rewrite 可绕过页面逻辑。有效高熵订单 ID 成为唯一访问条件；请求者无需先知道邮箱便能读取详情，并进一步利用 H-01。方案将邮箱作为第二重验证的意图没有在服务端实现。
- **修复方向**：登录订单按认证客户 ID 过滤；访客订单详情由服务端校验独立的签名/一次性访问凭证，再返回最小字段。关闭或增加默认详情路由的服务器访问控制，不能只新增安全 BFF 而保留可绕过的原接口。邮箱本身不应充当足够的所有权证明；敏感详情响应使用 `Cache-Control: private, no-store`。

#### H-03 Strapi HTML 未净化进入服务端文章渲染（条件性）

- **位置**：`frontend/src/lib/cms.ts:152` 仅改图片 URL，`:281` 将 HTML 映射为文章字段；`frontend/src/app/journal/[slug]/page.tsx:228` 是服务器页面，`:350` 把内容交给渲染器；`frontend/src/app/journal/[slug]/HtmlContentRenderer.tsx:31` 仅替换产品短代码，`:53` 直接 parse。依赖 `frontend/node_modules/html-react-parser/lib/dom-to-react.js:79`、`:84` 保留 script/style 原始内容；`frontend/node_modules/react-dom/cjs/react-dom-server.node.production.js:1192` 调用原样输出函数 `:1052`。
- **原理与场景**：能写入已发布 CMS HTML 的人或被攻陷的 CMS 可把脚本/危险嵌入内容跨越到店铺浏览器信任域；完整服务器页面加载有原始 script 输出链路，结合 M-05 可盗用客户 token。未证明匿名内容写入，也未执行浏览器载荷；React 对字符串事件属性和 javascript URL 的控制不能误当作不存在。
- **修复方向**：在服务器渲染边界做允许清单 HTML 净化，禁止 script、事件属性、srcdoc、危险 URL、非必要 iframe/object/embed，限制外部资源；为产品短代码保留必要标记。收紧 CMS 发布角色和凭据，配合页面 CSP。不能仅把 parser 换名、做 HTML 字符串正则替换或依赖编辑器界面限制。
- **参考**：[html-react-parser 官方 FAQ](https://github.com/remarkablemark/html-react-parser#faq) 明确说明其不净化 HTML；客户端动态插入 script 的行为不能代表服务端初始文档加载。

#### H-04 两处 JSON-LD 缺少 HTML 上下文转义（条件性）

- **位置**：`frontend/src/app/journal/[slug]/page.tsx:438`、`:442`、`:447` 使用文章标题/作者；`frontend/src/app/product/[handle]/page.tsx:148`、`:152`、`:153` 使用商品标题/描述。React 依赖的原始 innerHTML 输出见 `frontend/node_modules/react-dom/cjs/react-dom-server.node.production.js:1052`。
- **原理与场景**：`JSON.stringify` 会处理 JSON 引号，但保留 `<`。具有 CMS 或商品字段写入能力的攻击者可以使浏览器提前结束 JSON-LD script，再引入活动 HTML/脚本；`type=application/ld+json` 不阻止 HTML 解析器识别结束标签。没有证明这些字段对匿名用户可写。
- **修复方向**：建立共享的安全 JSON-LD 序列化函数，例如 `JSON.stringify(data).replace(/</g, '\\u003c')`，并统一应用到动态数据写入点。`frontend/src/app/layout.tsx:48` 也使用 JSON-LD，但当前主要为固定值/环境配置，不计为另一个已证实用户输入漏洞。
- **参考**：[Next.js JSON-LD 官方指南](https://nextjs.org/docs/app/guides/json-ld) 推荐在输出前转义 `<`。

#### H-05 匿名触发任意收件人的欢迎邮件（已确认）

- **位置**：`backend/src/api/store/test-email/route.ts:10`、`:18`、`:20`、`:31`；`backend/src/modules/resend/service.ts:218` 校验邮箱格式、`:227` 固定欢迎模板、`:277` 调 Resend。
- **原理与场景**：没有客户登录、邮箱所有权、生产开关或发送频率控制，公开 Store key 不能防止任意收件人骚扰、邮件费用/配额消耗和发信信誉损害。成立前提是发信服务有效配置；请求者不能通过此入口任意指定正文/模板，因此原方案“开放转发”的术语不准确。返回 `error.message` 是另一个信息暴露风险，不意味着一定泄露密钥。
- **修复方向**：移除生产测试入口，或放到强制管理员认证且有生产禁用条件的专用接口；固定测试收件人允许清单，添加发送配额和审计。客户端只返回稳定错误码和通用提示。

#### H-06 Chat API 缺少服务端费用控制（已确认）

- **位置**：`frontend/src/app/api/chat/route.ts:12`、`:13`、`:26`、`:33`、`:36`。
- **原理与场景**：配置 Gemini key 后，任意访问者可直接提交请求。代码仅检查 message 非空，没有认证/匿名配额、请求长度、输出 token 预算、并发与调用时间控制，可消耗费用、供应商配额及服务器资源。“无限”应改为“未实现应用级限制”；供应商仍可能限额。Gemini key 位于服务端，未发现由该接口直接返回 key（`:41`）。
- **修复方向**：在服务端/网关实施按 IP、匿名会话及账号的共享限流和并发上限，设置请求体/消息长度、`maxOutputTokens`、超时、每日预算与熔断；必要时加入机器人挑战。前端按钮禁用不能保护 API。

### 2.3 中危

#### M-01 购物车 ID 访问模型及宽字段返回的隐私风险（条件性）

- **位置**：`backend/src/api/store/carts/[id]/route.ts:24`、`:54`、`:55`、`:59`、`:60`、`:62`、`:71`；`frontend/src/lib/providers.tsx:154` 把 cart ID 存取于浏览器。原生能力凭证行为见 `backend/node_modules/@medusajs/medusa/dist/api/store/carts/middlewares.js:48`。另有前端入口 `frontend/src/app/api/checkout/[cartId]/payment-sessions/route.ts:41`、`:45` 代加公开 key，并在 `:142` 至 `:145` 返回 cart、payment session 和 client_secret，没有额外归属检查。
- **原理/场景**：持有一个尚未完成、有个人资料的有效 cart ID，可以读取其邮箱、地址和 payment session 数据，包括经前端支付初始化入口访问。访客购物车按高熵 ID 访问是框架原有能力凭证设计；未证明 ID 可预测、可枚举或已有独立泄漏路径，故不直接定为严重 IDOR。支付会话数据是否含敏感字段取决于 provider；没有证据证明返回银行卡号或 Stripe 服务端 API key。若部署实际上要求登录购物车归属隔离且有 ID 泄漏路径，应按实际影响升级风险等级。
- **修复方向**：明确访客购物车的独立能力凭证和已登录归属规则；只返回结账需要的字段，去掉 session/provider data 通配，限制 ID 在日志/URL中的传播。不要用“所有 cart 都强制登录”破坏访客结账；对旧/完成 cart 保持拒绝访问。

#### M-02 认证身份存在性枚举（已确认）

- **位置**：`backend/src/api/store/check-email/route.ts:23`、`:25`、`:31`。
- **原理/场景**：不需要用户会话即可探测邮箱是否存在 auth identity，辅助定向钓鱼和撞库。此查询没有按 actor 类型限定，不能保证返回结果只代表客户账户。
- **修复方向**：取消公开布尔查询或采用统一响应，通过邮箱完成后续流程；为注册/找回/登录统一错误与限流，避免在其他接口重新形成枚举。

#### M-03 欢迎优惠缺少领取及使用资格约束（条件性）

- **位置**：`backend/src/api/store/newsletter/route.ts:32`、`:40`、`:53`、`:60`、`:65`、`:95`；`backend/src/lib/turnstile.ts:6`、`:29` 失败关闭；注册赠券见 `backend/src/subscribers/customer-created.ts:51`、`:58`。
- **原理/场景**：有效挑战通过后，每次订阅新建活动和 15% 促销，直接返回代码；代码未绑定验证过的邮箱/客户，没有领券去重或首单资格规则。可反复领券、共享优惠、制造多余记录。注册赠券也应一并检查相同资格。不能声称同一个 Turnstile token 能反复重放、任意叠加折扣，或仅凭本文件证明平台默认无预算。
- **修复方向**：验证邮箱、领取幂等和去重；使用 customer/email/首单规则、明确使用次数和活动预算，统一订阅与注册优惠策略；使用安全随机值生成代码。校验 Turnstile 返回的预期 hostname/action，并加应用限流。机器人挑战不能替代业务资格校验。

#### M-04 全路径后端代理扩大前端可达范围（条件性）

- **位置**：`frontend/next.config.ts:39`、`:42`、`:43`；认证控制见 `backend/node_modules/@medusajs/framework/dist/http/router.js:88`。
- **原理/场景**：任何后端路径都可经前端域名转发，包括管理、认证、调试与静态路径。如果管理 API 原本只应内网可达，会破坏网络边界；若后台本已公开，主要是额外入口与策略不一致。CORS 是浏览器控制，不是身份授权；本配置本身并未证明管理认证被绕过，也不是目标主机由请求者选择的通用开放代理。
- **修复方向**：仅允许店铺业务需要的路径/方法，将 admin、测试工具和非店铺能力从该入口排除；统一代理与直连两条入口的认证、限流和日志策略，确保私有后端不会被其他泛匹配路径公开。

#### M-05 客户 token 可被同源脚本读取（风险放大因素）

- **位置**：`frontend/src/lib/providers.tsx:123`、`:249`、`:266`；`frontend/src/app/order/confirmed/page.tsx:176`。
- **原理/场景**：localStorage 中的 bearer token 可被 H-03/H-04 等同源 XSS 读取并带离站点。单凭 localStorage 不能证明已有账户泄露，不独立重复计算为高危账户接管。
- **修复方向**：采用服务器管理会话/BFF，将凭据放入 `HttpOnly; Secure` Cookie；根据流程选择适当 SameSite、Origin/CSRF 防护、过期与撤销机制，消除其他 SDK/手写持久 token 副本。HttpOnly 降低 token 外带风险，不能代替 XSS 修复。

#### M-06 未发现应用层统一速率与资源限制（已确认代码缺口，部署待核验）

- **位置**：`backend/src/api/middlewares.ts:15` 至 `:33` 仅列商品中间件；`backend/SECURITY.md:65` 要求上线前限流；`frontend/src/app/api/chat/route.ts:12`、`backend/src/api/store/test-email/route.ts:4`、`backend/src/api/store/newsletter/route.ts:12` 未实现独立请求限额。
- **原理/场景**：放大枚举、邮件/聊天滥用、优惠创建和认证攻击；实际 WAF、边缘限流和供应商配额尚未验证。与 H-05/H-06 同源的资源影响不重复累计。
- **修复方向**：使用 Redis/网关共享计数，按敏感操作设置 IP+账户/收件人/对象维度限额，覆盖代理和后端直连；正确处理可信代理 IP，定义并发、超时、预算和 429 响应。

#### M-07 未配置页面级安全响应头（部署待核验）

- **位置**：`frontend/next.config.ts:5` 至 `:47` 未提供 `headers()`，仅图片配置 `:37` 提供 CSP；`frontend/src/app/journal/[slug]/page.tsx:438` 有危险输出点。
- **原理/场景**：应用未提供页面 CSP、frame-ancestors/XFO 与 HSTS 配置，可能放大 XSS/点击劫持风险；实际平台是否追加头未知，不能写“生产没有任何头”，也不能单凭缺头认定 HTTPS 已可被降级。
- **修复方向**：在应用或统一边缘层配置适配 Next.js/Stripe/Turnstile 的 CSP（nonce/hash、frame-ancestors、base-uri、object-src），以及 nosniff、Referrer-Policy。验证 HTTPS 覆盖后部署 HSTS；谨慎处理 includeSubDomains。检查页面、API、静态资源不同响应，不用图片 CSP 替代页面 CSP。

#### M-08 订单 ID、邮箱和姓名进入 URL 与日志（已确认）

- **位置**：`frontend/src/app/checkout/page.tsx:301`、`:308`；`frontend/src/app/order/confirmed/page.tsx:232`；`backend/src/modules/resend/service.ts:175`。
- **原理/场景**：数据可能进入浏览器历史、代理日志、同源 Referer、分析系统或分享截图；订单 ID 泄露可进一步触发 H-01/H-02。没有证明第三方服务实际收到完整 URL；现代跨源默认 Referrer 策略可能只发送 origin。`encodeURIComponent` 只编码，不能保密。
- **修复方向**：URL 仅放短有效期的访问凭证或非敏感状态，从受控会话取得显示信息；浏览器完成流程后清理查询串，对 URL/日志做数据最小化，设置合适 Referrer-Policy。

#### M-09 本地文件“私有”目录公开与活动 SVG（条件性）

- **位置**：`backend/medusa-config.ts:35`、`:36` 使用相同 static 目录；`backend/src/api/static/[filename]/route.ts:10` 无登录、`:45` 返回 SVG、`:55` 公共缓存、`:56` ACAO `*`；生产限制 `backend/medusa-config.ts:14`。
- **原理/场景**：使用 file-local 的环境中，知道文件名的人可读所谓私有上传；若能上传含活动内容的 SVG 并诱导直接作为文档访问，可能在后端来源执行脚本。通过 M-04 访问静态文件还应检查前端来源影响。`<img>` 显示 SVG 不等于脚本会执行，ACAO `*` 也不是单独产生 XSS 的原因；没有证明匿名上传权限。生产已要求 S3，不能忽略此控制并断言生产必然使用本地上传。
- **修复方向**：开发环境不用真实私有数据；私有文件使用独立私有存储和授权下载。禁止/净化活动格式，配置适当 CSP/下载头和缓存规则；生产关闭不需要的 static 路由，避免残留文件公开。检查 S3 的公开/私有策略及上传权限。

#### M-10 static 路径前缀比较不能证明目录边界（条件性，新增）

- **位置**：`backend/src/api/static/[filename]/route.ts:19`、`:22`、`:59`。
- **原理/场景**：`absolutePath.startsWith(staticDir)` 会把同级 `static-backup` 等目录误认为在 `static` 中。Express 参数确会执行 URL 解码（`backend/node_modules/express/lib/router/layer.js:148`、`:172`）；编码后的分隔符若未被入口代理阻止，且存在可读同前缀文件，就可能逃出预期目录。当前工作区没有对应 static 同前缀兄弟目录，未动态验证生产入口，也没有证明能读任意服务端文件或 `.env`。
- **修复方向**：按业务只允许 basename，拒绝路径分隔符；使用 `path.relative` 判断完整边界，处理 realpath/符号链接，不以裸字符串前缀授权。限定可服务文件和类型，优先标准且根目录受控的静态服务。

#### M-11 错误与完整支付会话日志的数据最小化不足（条件性）

- **位置**：`frontend/src/app/api/checkout/[cartId]/payment-sessions/route.ts:55`、`:90`、`:120` 扩展后端错误对象，`:126` 记录整个会话响应，`:151` 返回 exception message；`frontend/src/lib/medusa.ts:333`、`:380` 包含错误体；`backend/src/api/store/test-email/route.ts:31` 返回 error.message。
- **原理/场景**：特定上游错误可能泄露内部实现；支付响应日志可能包含 payment intent/client secret/客户信息，扩大日志访问者能见数据。client secret 不是 Stripe 服务端 API key，结账向合法浏览器提供所需 client secret 属正常行为。没有证据证明发生了真实密钥泄漏。
- **修复方向**：错误只返回允许清单字段、稳定代码和请求 ID，详细错误在受控日志中脱敏；禁止整对象 payment/cart/customer 日志，限定日志访问和保留期。修正 medusa.ts 的 try/catch，将 JSON 解析与抛出业务错误分开，避免 catch 把已解析错误再次包回完整 body。

#### M-12 图片优化来源允许任意 HTTPS 主机（条件性）

- **位置**：`frontend/next.config.ts:30`、`:32`；现有 SVG 防护 `:36`、`:37`；框架默认 `frontend/node_modules/next/dist/shared/lib/image-config.js:62` 禁止本地 IP。
- **原理/场景**：任何 HTTPS 图像来源都匹配，扩大不可信外部资源、服务器公网抓取和图片优化资源消耗面。未证明内网 SSRF；也不能忽略 attachment 和 SVG CSP 后宣称直接同源 SVG XSS。开发模式 `unoptimized: isDev`（`:9`）意味着其行为又与生产不同。
- **修复方向**：按真实资产来源限制 host、path 和必要参数，移除生产 localhost 规则；无需求时禁止 SVG，保持本地 IP 禁用、优化器资源限制和现有图片安全头。参考 [Next.js Image 官方配置](https://nextjs.org/docs/app/api-reference/components/image)。

#### M-13 自定义商品详情忽略发布状态与渠道过滤（条件性，新增）

- **位置**：`backend/src/api/store/products/[id]/route.ts:35`、`:36`、`:44`、`:48`、`:71`；框架中间件在 `backend/node_modules/@medusajs/medusa/dist/api/store/products/middlewares.js:111`、`:117` 准备渠道和 published 条件。默认受控路由使用 `req.filterableFields`，见 `backend/node_modules/@medusajs/medusa/dist/api/store/products/[id]/route.js:12`，并在 `:42` 过滤内部分类。
- **原理/场景**：自定义 query 仅匹配 ID/handle，没有使用框架中间件准备的发布状态/渠道限制，返回广泛 metadata、变体和价格。知道/猜到未发布商品 handle 的访问者可能取得非公开信息；是否存在敏感商品或多销售渠道需数据核实。未证明直接修改价格或绕过订单支付。
- **修复方向**：复用默认查询和定价上下文，强制 published、允许销售渠道与公开分类规则，采用返回字段允许清单；保留扩展图片功能时仍使用框架已准备的过滤条件。

### 2.4 低危与卫生项

#### L-01 测试页面随应用保留（已确认）

- **位置**：`backend/src/api/test-interface/route.ts:4`、`:113`、`:142`；`frontend/public/test-cart.html:6`、`:7`、`:77`。
- **原理/场景**：没有生产开关，暴露测试用途页面和接口使用方式。test-interface 的请求在访问者浏览器里执行，未发现服务器代理特权；test-cart 指向 localhost 且 publishable key 为空。不能据此认定匿名管理访问或远程代码执行；“每次构建发布”是默认发布预期，尚未核实实际产物/边缘规则。
- **修复方向**：生产入口拒绝测试路由，测试 HTML 移出 public；确有管理需求时放入认证和网络受控的工具，并禁止保存敏感凭据。

#### L-02 运维脚本固定客户邮箱（已确认事实）

- **位置**：`backend/src/scripts/add-coupon.ts:8`、`:11`、`:23`。
- **原理/场景**：固定邮箱进入仓库、日志及运维操作，可能错误指向个人账户。未确认是真实客户，也不在报告复制具体值；不等同账号凭据泄漏。
- **修复方向**：通过参数/环境传入目标，示例用保留域名，日志隐藏身份细节；执行前显示目标和操作范围。

## 3. 不计入已确认漏洞的事项与审核盲区

### 3.1 模板路径：存在弱约束，但缺少外部输入链

`backend/src/modules/resend/service.ts:236` 将 template 拼入文件路径；现有匿名入口写死 `customer_created`（`backend/src/api/store/test-email/route.ts:20`），订阅事件同样使用固定模板（`backend/src/subscribers/order-placed.ts:52`）。没有找到匿名控制 template 的代码路径，不能认定远程文件读取、模板注入或 RCE。未来应把模板名映射到允许清单，并检查解析后的路径边界；模板穿越和 Handlebars 表达式执行是不同问题。

### 3.2 publishable key、bcrypt 和生产默认 secret

`backend/src/scripts/list-api-keys.ts:13` 只列 publishable；公开 key 不应按管理 secret 泄漏评级。仍应保持日志最小化，并防止未来脚本扩展到 secret 类型。

`backend/package.json:34` 的直接 bcrypt 依赖没有应用源码调用，不证明密码明文保存；认证委托 Medusa 模块（`backend/src/scripts/create-admin-user.ts:48`）。实际 emailpass 实现在 `backend/node_modules/@medusajs/auth-emailpass/dist/services/emailpass.js:17` 至 `:20` 使用 scrypt 散列，`:83` 验证散列。是否删除冗余依赖是后续依赖维护工作，当前不修改。

`backend/medusa-config.ts:49`、`:50` 的默认 secret 不宜直接报告为生产 JWT 伪造：`:101` 至 `:104` 已在 `NODE_ENV=production` 下阻止 `supersecret`。仍须检查实际部署是否正确设为 production、是否使用模板中的其他可预测值；现有检查不是随机性强度验证。

### 3.3 Stripe webhook：缺少配置，未发现跳过签名

`backend/medusa-config.ts:83` 至 `:85` 的 Stripe provider options 只有 apiKey，没有 webhookSecret；`backend/.env.template:20` 至 `:22` 也没有对应变量。内置 provider 在 `backend/node_modules/@medusajs/payment-stripe/dist/core/stripe-base.js:386` 调验签，在 `:459`、`:460` 将 signature、rawData、webhookSecret 交给 `constructEvent`。

因此应报告“若使用 Stripe webhook，签名配置缺失会导致合法事件处理失败”，而不是“没有验签所以可伪造付款”。需要在后续修复中增加签名 secret 配置、保留原始 body、验证环境/endpoint 配对、失败处理、幂等和重放规则；实际收款完成、回调及补偿链未动态验证。

### 3.4 本地容器不能当作已暴露的生产数据库

`docker-compose.yml:8` 使用开发密码，`:11` 映射 PostgreSQL 端口；Redis `:24` 未设置访问认证，`:26` 映射端口。如果该 compose 运行在不可信可达主机且没有防火墙，会产生数据库/缓存暴露风险；不能在未检查网络时断言互联网可访问。开发部署绑定 loopback，生产使用隔离网络、凭据和必要 TLS，禁止复用开发数据密码。

## 4. 部署前安全清单

以下为后续整改/验收要求。本报告未替用户执行这些动作；复选框不代表缺陷已修复。

- [ ] **订单边界**：修复 H-01/H-02；分别确认未登录、其他客户、访客凭证过期/重放、已归属订单、默认接口直连及 rewrite 访问均符合设计（证据：transfer `route.ts:80`；lookup `page.tsx:156`）。
- [ ] **内容安全**：文章 HTML 在服务器净化，动态 JSON-LD 安全序列化，确认 CMS 与商品发布权限，并覆盖完整服务器文档加载和客户端导航（证据：HtmlContentRenderer `:53`；商品页 `:148`）。
- [ ] **匿名资源**：关闭生产 test-email、test-interface、test-cart；对 chat、邮件、订阅、认证、订单查询和支付初始化配置共享限流、并发与费用预算（证据：chat `route.ts:33`；SECURITY.md `:65`）。
- [ ] **优惠资格**：订阅/注册赠券共用领取规则，完成邮箱验证、去重、首单/客户限制、使用次数与活动预算；核实 Turnstile hostname/action（证据：newsletter `route.ts:60`；turnstile `:29`）。
- [ ] **CORS 与网络**：生产 STORE_CORS、ADMIN_CORS、AUTH_CORS 精确允许真实 HTTPS 来源；前端代理仅暴露需要的路径，核实管理员网络边界及数据库/Redis端口（证据：medusa-config `:46`；next.config `:42`；docker-compose `:11`、`:26`）。CORS 不承担鉴权。
- [ ] **生产模式与 secrets**：正确设置 NODE_ENV=production，用高熵 JWT/COOKIE secret，确认 S3 配置；根据泄漏证据、共享历史和人员访问情况轮换敏感密钥，必要时撤销会话。不要因 publishable key 可见而无理由轮换它（证据：medusa-config `:14`、`:101`；list-api-keys `:13`）。本次没有核实实际 secrets 或完整历史。
- [ ] **管理员身份**：无默认/共享密码，删除不需要的测试管理员，审查最小权限和登录保护；脚本从安全来源取得密码（证据：create-admin-user `:18`、`:48`）。
- [ ] **支付**：正确配置 Stripe webhookSecret 和签名验证，保证 raw body、幂等、事件重试/补偿；服务端决定金额、货币和完成状态，确认没有靠 URL success 标志履行订单；不记录完整 payment session（证据：medusa-config `:83`；stripe-base `:460`；payment-sessions `:126`）。
- [ ] **会话**：评估 BFF/HttpOnly Cookie 方案、CSRF/Origin 与 SameSite，统一 SDK 和手写认证的有效期、退出与撤销（证据：providers `:249`；confirmed `:176`）。
- [ ] **隐私**：购物车/订单只返回需要字段；禁止 PII/访问凭证进入公共缓存、分析日志与 URL，错误和运营日志脱敏（证据：carts `route.ts:55`；checkout `page.tsx:301`；payment-sessions `:55`）。
- [ ] **文件**：S3 公私隔离、最小权限、短有效期授权下载；上传限制大小/格式/内容，活动文件隔离；static 路径边界和生产入口受控（证据：medusa-config `:35`；static `route.ts:22`、`:45`）。
- [ ] **商品**：默认与自定义详情路由都执行发布状态、渠道、公开分类及价格字段限制（证据：products `route.ts:48`；内置详情 `route.js:12`）。
- [ ] **HTTP/图片**：检查真实生产页面/API/图片响应的 CSP、frame-ancestors、HSTS、nosniff、Referrer-Policy；收紧 remotePatterns，保持 SVG 安全头及本地 IP 阻止策略（证据：next.config `:32`、`:37`）。
- [ ] **依赖与发布**：单独审核 lockfile 的已知漏洞与补丁状态、Git 历史和实际发布产物，核查 WAF/网关/Strapi/S3 配置。本次未执行依赖扫描或部署安全验收（版本证据：`backend/package.json:29`；`frontend/package.json:21`）。

## 5. 方案验收建议

保留“范围与方法、按风险分级明细、部署清单、中文报告和文件行号”的结构。补充每项的验证状态、利用前提、框架已有控制与未覆盖范围；把订单查询与转移的组合影响说明清楚，不重复夸大多个独立严重漏洞。

“不跑构建/测试”符合本次静态核验约束，但只能交付静态审核报告，不能等同生产安全验收。整改完成后，在授权测试环境针对归属、匿名资源限制、HTML/JSON-LD、文件边界和支付回调做定向验证；本次没有为此修改或运行测试。
