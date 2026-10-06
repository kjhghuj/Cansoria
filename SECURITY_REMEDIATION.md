# 安全修复与验证记录

修复日期：2026-10-05 至 2026-10-06（Asia/Shanghai）。修复前审核基线见 [SECURITY_AUDIT.md](SECURITY_AUDIT.md)。以下记录当前工作区实现；尚未部署到生产。

## 已实施的修复

| 问题 | 当前行为与证据 |
| --- | --- |
| 订单详情和订单转移越权 | 详情需要认证归属或有效邮件访问凭证；邮件凭证绑定订单、用途及 15 分钟期限。转移要求登录和邮件凭证，目标客户由认证上下文确定，仅可认领访客订单，不再复制地址。`backend/src/api/store/orders/[id]/route.ts:8`、`backend/src/api/store/orders/transfer/route.ts:6`、`backend/src/lib/access-tokens.ts:23` |
| 仅在客户端比对订单邮箱 | 查询表单调用邮件验证接口，统一返回 202；只向订单实际邮箱发送验证链接。页面读取后移除 URL 中的凭证。`backend/src/api/store/orders/access/route.ts:6`、`frontend/src/app/order/lookup/page.tsx:169` |
| 游客购物车缺少独立凭证 | 新购物车签发绑定 ID 的 7 天凭证，浏览器代理将其保存在 HttpOnly Cookie。已登录账户购物车要求认证归属。所有购物车子路由与支付集合均受后端守卫保护。`backend/src/lib/resource-access.ts:24`、`frontend/src/app/api/medusa/[...path]/route.ts:30` |
| 浏览器保存 JWT、宽泛代理 | 登录响应只返回成功状态，JWT 存 HttpOnly、SameSite=Lax Cookie，生产增加 Secure；清除旧 localStorage 凭据。代理仅允许明确的店铺路径与方法，写操作核验同源 Origin，拒绝管理、认证、测试及路径穿越入口。`frontend/src/lib/server-medusa.ts:6`、`frontend/src/app/api/auth/[action]/route.ts:15`、`frontend/src/lib/store-proxy-policy.ts:21` |
| CMS HTML 和 JSON-LD 注入 | 文章在服务端通过允许清单净化，禁止脚本、事件属性、危险 URL、SVG、iframe 等；三处 JSON-LD 使用共享序列化函数转义 `<`，并应用请求 nonce。`frontend/src/lib/html-safety.ts:4`、`frontend/src/lib/security-json.ts:2` |
| 缺少页面安全头 | 页面生成随机 nonce，Next 引导脚本、Flight 数据和 JSON-LD 使用同一 nonce；CSP 禁止内联无 nonce 脚本及对象嵌入，另加防框架、nosniff、Referrer-Policy 和生产 HSTS。动态商品与文章路径中的扩展名也不能绕过。商品页面明确动态渲染以支持 nonce。`frontend/src/proxy.ts:5`、`frontend/src/lib/security-policy.ts:34`、`frontend/next.config.ts:29`、`frontend/src/app/product/[handle]/page.tsx:12` |
| Gemini 匿名费用滥用 | Redis 原子准入：默认 10 次/客户端/分钟、全站 UTC 日预算 500 次、并发 4。流式读取限制 16 KB，请求最多 2000 字符，输出 256 token，10 秒中止客户端等待；生产 Redis 缺失或不可用返回 503。`frontend/src/lib/chat-controls.ts:19`、`frontend/src/lib/chat-controls.ts:76`、`frontend/src/lib/chat-controls.ts:159`、`frontend/src/app/api/chat/route.ts:24` |
| 测试邮件、邮箱枚举与调试页 | 测试邮件入口统一返回 410，邮箱检查不查询身份并返回统一结果；后端调试页在生产关闭，前端测试 HTML 移出 public。`backend/src/api/store/test-email/route.ts:5`、`backend/src/api/store/check-email/route.ts:20`、`backend/src/api/test-interface/route.ts:5`、`frontend/dev-tools/test-cart.html:1` |
| 匿名发放无限优惠码 | 匿名 newsletter 仅订阅，不创建或返回优惠码。注册欢迎券由服务端确定代码和期限，绑定客户 ID 与邮箱、使用预算 1；访客客户不触发注册赠券。Turnstile 核验 hostname 与 newsletter action。`backend/src/api/store/newsletter/route.ts:8`、`backend/src/subscribers/customer-created.ts:5`、`backend/src/lib/turnstile.ts:34` |
| 文件与商品公开范围 | 本地公开上传与私有上传目录分离；受控静态路由使用 basename、realpath 和内容类型检查，生产禁用本地静态入口并拒绝旧 static 残留。商品查询采用框架发布状态/销售渠道过滤。`backend/medusa-config.ts:22`、`backend/medusa-config.ts:53`、`backend/src/api/static/[filename]/route.ts:5`、`backend/src/api/store/products/[id]/route.ts:25` |
| 错误体、日志及 URL 中个人资料 | BFF 只返回稳定错误信息，支付响应裁剪到必要的会话字段；清除前端订单、PaymentIntent、客户凭据等调试日志。确认页数据仅在当前浏览器 sessionStorage 中短暂保存，结账重定向 URL 不再携带邮箱及姓名。`frontend/src/lib/server-medusa.ts:49`、`frontend/src/app/api/checkout/[cartId]/payment-sessions/route.ts:14`、`frontend/src/lib/order-confirmation.ts:10` |
| 生产配置与公开基础服务 | 生产要求强 JWT/Cookie secret、Redis、Stripe webhook secret、明确 HTTPS CORS；Stripe provider 显式传入签名密钥。Docker 数据库与 Redis 端口绑定 loopback，运维脚本客户邮箱从环境变量读取。`backend/medusa-config.ts:18`、`backend/medusa-config.ts:108`、`docker-compose.yml:11`、`backend/src/scripts/add-coupon.ts:8` |

## 修复过程中复核的原生接口旁路

这些问题也已纳入本次修复，并增加了回归测试：

- Medusa 中间件加载器将 matcher 转成字符串，因此真实 RegExp 并不能实现原先预期的匹配。改为支持的路径字符串，使用实际 MiddlewareFileLoader、RoutesSorter 和 Express 确认购物车子路由、支付集合及旧订单转移入口均受到保护。`backend/src/api/middlewares.ts:24`、`backend/src/api/__tests__/middleware-matching.unit.spec.ts:22`。
- 公共地区、商品、支付集合及配送数据都采用固定安全投影；订单列表和账户地址也保留正常默认输出。全局禁止经购物车反向关系读取他人资料，覆盖从地区、商品渠道、配送选项等入口的间接查询。`backend/src/lib/catalog-fields.ts:17`、`backend/medusa-config.ts:69`、`backend/src/lib/cart-fields.ts:32`。
- 本站没有前台退货 API 功能，因此公开退货接口统一返回 410，避免未验证订单所有者的请求创建退货或登记收货；退货政策页和管理员流程保持正常。`backend/src/api/store/returns/route.ts:3`。
- 未验证邮箱不能关联已注册客户；访客客户仍遵守框架的邮箱/账户状态唯一约束。购物车字段由服务器固定，不允许扩展 `customer.carts`、`customer.addresses` 等反向关系来读取其他购物车。`backend/src/lib/guest-customer.ts:5`、`backend/src/lib/cart-fields.ts:5`。
- 购物车地址拒绝字符串 ID，地址对象中的 ID 会剥离，避免关联、读取或修改别人的地址；商品项 ID 必须属于已授权购物车，防止借原生删除接口修改另一购物车。`backend/src/lib/cart-fields.ts:40`、`backend/src/lib/resource-access.ts:43`。
- 本站只允许 Stripe 支付会话，后端拒绝直接指定系统手工支付 provider，也拒绝使用残留的非 Stripe 会话完成新订单。已完成购物车的授权重试保持幂等。`backend/src/lib/resource-access.ts:61`、`backend/src/api/store/carts/[id]/complete/route.ts:22`。
- 欢迎券结账按券加共享锁，在锁内重新检查使用预算，并等待原生 complete workflow 的真实 Promise 完成；客户断开连接不会提前释放锁。`backend/src/api/store/carts/[id]/complete/route.ts:28`。

## 验证范围与结果

前端安全测试与原有优惠码回归共 49 项，覆盖代理隔离、CSRF、HttpOnly 凭证、注册后刷新客户身份、旧账号大小写身份兼容、支付数据裁剪、HTML 净化、JSON-LD、CSP、聊天配额、超时与故障关闭。前端 TypeScript 检查及生产 webpack 构建通过。修改文件 ESLint 无错误，剩余 4 条既有原生 img 性能建议。

使用独立、仅监听 loopback 且不持久化的 Redis 实测两个模块实例共享并发上限、每日预算、客户端限流、成功释放与过期 lease 回收。生产 Next.js 配合本地模拟 Medusa 验证订单页 200、有效商品 200、缺失商品 404，所有脚本 nonce 与 CSP 一致，扩展名路径也有 CSP；恶意商品标题不能逃逸 JSON-LD。文章不存在时可能按 App Router 流式响应返回 200 并显示 404/noindex 内容，未出现 500。

在不含实际 `.env` 文件、仅含公开模板的临时副本，后端最终单元测试 20 个套件、174 项全部通过，TypeScript 检查通过；不带实际 `.env` 文件的临时源码副本完成 Medusa 后端及管理端构建。安全变更范围覆盖率为 statements 92.74%、branches 85.23%、functions 94.11%、lines 95.52%，不代表全仓库覆盖率。

后端也实测 Redis 初次连接的 64 个并发请求：按测试配额 7 个通过、57 个限流、0 个不可用；仅断开测试消费者后，客户端自动重建并成功处理请求，限流键保留 TTL。未调用真实 Resend、Stripe、Gemini、Klaviyo 或生产数据库。未人工打开或输出实际环境凭据；Jest/Next 的常规配置加载可能读取本地环境文件，隔离后端构建另使用无 `.env` 副本。

复现命令（先安装 backend 与 frontend 依赖；前端 Node 需 ≥22.12）：

```sh
cd backend
npm run test:unit
npx tsc --noEmit
# 本次 Medusa 构建在无实际 .env 的临时源码副本执行
npm run build

cd ../frontend
npm run test:security
npx tsc --noEmit
npm run build -- --webpack
```

Redis 验证脚本固定连接 `127.0.0.1:16491` 的测试数据库 15，删除的仅是自身测试键。请先启动专用实例，切勿用于现有业务 Redis：

```sh
env LC_ALL=C redis-server --port 16491 --bind 127.0.0.1 --save '' --appendonly no --dir /tmp
# 另一终端，在 frontend 目录运行：
node scripts/verify-redis-security.cjs
```

## 部署时必须配置

1. 后端 `JWT_SECRET`、`COOKIE_SECRET` 使用至少 32 字符的随机值；配置 `REDIS_URL`、`STRIPE_WEBHOOK_SECRET`、HTTPS `STOREFRONT_URL`、S3 存储及准确的 HTTPS CORS。轮换泄露过的秘密；密钥轮换会使旧登录会话及购物车/订单签名凭证失效。
2. 前端配置 `MEDUSA_BACKEND_URL`、publishable key、正确的 `NEXT_PUBLIC_BASE_URL`、`CHAT_REDIS_URL` 和明确的 `NEXT_PUBLIC_ASSET_ORIGINS`；前端运行时升级到 Node ≥22.12。文章/商品静态 HTML 缓存应关闭，避免随机 nonce 与缓存响应混用。
3. 只有入口代理会覆写来源 IP 头、且无法绕过代理直连时，才设置 `STORE_TRUSTED_IP_HEADER`、`STORE_TRUSTED_PROXY_HOPS`、`CHAT_TRUSTED_IP_HEADER` 与 `CHAT_TRUSTED_PROXY_HOPS`；后端 `TRUSTED_PROXY_IPS` 必须是实际 BFF 出站地址。默认不信任浏览器转发头，来源未知会共享配额，容量较保守。
4. 配置邮件发送服务和正确的店铺地址；订单查询依赖验证邮件送达。日志系统应删除访问链接的 token 查询参数，订单页面已使用 no-referrer。旧浏览器 JWT 会清除；没有新签名凭证的旧游客购物车会重新创建，建议在维护窗口发布。
5. Turnstile 设置准确 hostname，action 为 `newsletter`；Klaviyo 列表启用 double opt-in。旧无归属的欢迎码应清理/停用，核对现有营销活动是否使用同一 ART15 前缀。
6. 本地旧 static 文件先分类迁移到受控公开或私有存储，再启生产。实际 S3/R2 桶策略须单独验收：公开 R2 桶不提供对象级 ACL 隔离，私有资料需要独立非公开桶或授权下载服务，不能仅依赖 file provider 的 `private` 标记。[R2 S3 兼容性](https://developers.cloudflare.com/r2/api/s3/api/)，[公开桶说明](https://developers.cloudflare.com/r2/buckets/public-buckets/)。
7. 用 Stripe 测试环境验收 webhook 的有效签名成功、无效签名拒绝，以及完整支付流程。实际 CDN/WAF、生产桶策略、数据库并发事务、邮件送达和支付结算尚未通过本次本地验证。

Gemini AbortSignal 终止的是客户端等待，供应商仍可能计费。因此中止调用保留并发 lease 至 30 秒过期，每次已准入调用都占用每日预算。预算是调用数量上限，不是精确货币费用上限。
