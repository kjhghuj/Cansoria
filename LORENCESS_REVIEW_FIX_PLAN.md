# LORENCESS 审核问题修复计划（交接给执行 AI）

日期：2026-11-01
仓库：`/Users/sg/Desktop/Cansoria`，前端 `frontend/`，后端 `backend/`
前置：`LORENCESS_FRONTEND_PLAN.md` 已执行完，提交 `98a9886` 到 `467f2f9`。本计划只修审核发现的问题，不加新功能。

---

## 一、基线（开工前先跑一遍，结果应与此一致）

在 `frontend/` 下：

| 命令 | 基线 |
| --- | --- |
| `npm run test:security` | 251 个测试中 250 个通过；唯一失败是 `florencess-brands.test.ts`（本机缺 `frontend_ref/snapshot/info`，与本计划无关） |
| `npx tsc --noEmit` | 只有 3 条 `@phosphor-icons/react` 缺失报错（旧手表页） |
| `npm run build` | 编译成功、32 个页面生成；最后因 Next.js 安全提示以退出码 1 结束（见第九节，本计划不处理） |

每修完一项，三项结果不得比基线差。

## 二、通用约束

- 每项问题先写一个能复现它的失败测试，再修，再确认测试通过。
- 不可变更新；函数不超过 50 行；不用 `console.log`。
- 只改本计划列出的文件。`providers.tsx` 里购物车的并发保护（`runCartMutation`、`sessionGeneration`、`cartRevision`）不要重写。
- 抄来的政策页正文、`RecentPurchase` 弹窗、本地商品数据都不要动。
- 每项修完、检查通过后单独提交一次，格式 `fix: ...`，正文末尾加 `Co-Authored-By: Claude <noreply@anthropic.com>`。不 push。
- 遇到第八节的问题要停下来问店主。

## 三、问题 1（高）：心愿单和购物车互相覆盖 customer metadata

### 现象

两处代码都调用 `updateCustomerMetadata({ ...user.metadata, <自己的键> })`，用的是登录时拿到的 `user.metadata` 旧副本，写完也不更新 `user`：

- 购物车：`frontend/src/lib/providers.tsx` 约第 332、351、519 行，写 `active_cart_id`。
- 心愿单：`frontend/src/lib/wishlist-context.tsx` 约第 91、125 行，经 `buildWishlistMetadata(user.metadata, ...)` 写 `wishlist`。

如果 Medusa 整体替换 metadata，后写的一方会把先写的一方的键冲掉：要么心愿单被清空，要么下次登录购物车恢复不了。

### 第一步：确认 Medusa 的行为

在 Medusa 源码（`backend/node_modules/@medusajs/`，搜 customer 更新的 workflow 或 service）或真实后端上确认：`POST /store/customers/me` 传 `metadata` 时是**整体替换**还是**按键合并**，以及值为 `""` / `null` 时是否删除该键。把结论和依据（文件路径或请求结果）写进提交说明。

- 如果是按键合并：仍要修下面的"写完同步 user"，否则前端状态和后端不一致。可以把 `buildWishlistMetadata` 改为只传 `{ wishlist }`。
- 如果是整体替换：按下面的方案修。

### 修法

1. 在 `providers.tsx` 新增一个内部函数，例如 `saveCustomerMetadata(patch: Record<string, unknown>)`：
   - 先用 `getCustomer()` 读取**最新**的 metadata（不要用 `user.metadata`）。
   - 合并为 `{ ...latest.metadata, ...patch }`，调用 `updateCustomerMetadata`。
   - 用返回的 customer 调用 `setUser(...)`，让 `user.metadata` 保持最新。
   - 失败时抛出原错误，由调用方处理。
2. 用一个 Promise 链（`useRef<Promise<void>>`）把所有 metadata 写入串行化，避免两个写入同时读到同一个旧版本。
3. 通过 `AuthContext` 暴露 `saveCustomerMetadata`。购物车的三处调用改用它（只传 `{ active_cart_id }`）。
4. `wishlist-context.tsx` 改用 `useAuth().saveCustomerMetadata({ wishlist: items })`，删掉对 `updateCustomerMetadata` 的直接引用。`buildWishlistMetadata` 不再需要时删除，同步修改 `wishlist.test.ts`。

### 测试

- 新增 `src/lib/__tests__/customer-metadata.test.ts`：把"读最新、合并、写入"的逻辑抽成纯函数或可注入依赖的函数，测试以下三点：
  - 先写 `wishlist`、再写 `active_cart_id`，最终两个键都在。
  - 反过来的顺序结果相同。
  - 两个写入同时发起时，第二个读到的是第一个写完后的数据。
- 现有 `lazy-cart.test.ts` 等购物车测试必须照样通过。

## 四、问题 2（高）：心愿单静默丢掉商品

### 现象

`frontend/src/lib/wishlist.ts` 的 `parseItem` 要求：

- 图片地址以 `/` 或 `https://` 开头（第 36 行 `validImage`）；
- 价格是非空字符串（第 52 行）。

不满足时 `addItem` 原样返回旧列表，点心形按钮没有任何反应。已用临时测试确认：

- 本地开发时 Medusa 图片地址是 `http://localhost:9030/static/...`（`backend/medusa-config.ts` 第 58 行），所有 Medusa 商品都加不进心愿单。
- `mapMedusaProduct` 对没设价格的商品返回 `price: ""`，生产环境也加不进。
- 卡片在没有图片时传 `image="/"`（`CatalogCard.tsx`、`ProductCard.tsx`、`ProductView.tsx`、`QuickViewModal.tsx`），心愿单页会把网站首页当图片加载。

### 修法

1. `validImage`：允许 `https://`、站内路径 `/...`，以及 `http://localhost` / `http://127.0.0.1`（带或不带端口）开头的地址。拒绝其他 `http://`、`javascript:`、`data:` 和 `//` 开头的地址。用 `new URL()` 解析并检查 `protocol` 和 `hostname`，不要只用字符串前缀判断。
2. 允许 `image` 为空字符串，表示没有图片。四个调用处把 `?? "/"` / `|| "/"` 改为 `?? ""` / `|| ""`。`WishlistView.tsx` 在 `image` 为空时显示占位块，不渲染 `<img>`。
3. 允许 `price` 为空字符串。`WishlistView.tsx` 在价格为空时不显示价格那一行。
4. `useWishlist().toggle` 在 `addItem` 没有加进去时（返回的列表与原列表相同，且原列表里没有该 slug）返回 `false`。`WishlistButton.tsx` 收到 `false` 时用 `role="status"` 显示一句 "This item could not be saved."，几秒后消失。不再静默失败。

### 测试（写进 `wishlist.test.ts`）

- `http://localhost:9030/static/a.jpg` 能加入。
- `https://example.com/a.jpg`、`/florencess/img/a.webp` 能加入。
- `http://example.com/a.jpg`、`javascript:alert(1)`、`data:image/png;base64,xx`、`//evil.com/a.jpg` 被拒绝。
- `image: ""`、`price: ""` 能加入。
- 从 `localStorage` 读回旧格式数据（`image: "/"`）时不报错。

## 五、问题 3（高）：本地页面也要等 Medusa，且没有超时

### 现象

`frontend/src/app/[slug]/page.tsx` 的页面函数一开始就 `await getRequestRegion()`，文章页、品牌页、本地商品页也不例外。`getRequestRegion`（`src/lib/request-region.ts`）调用的 `listRegions()`、`getRegion()` 走 Medusa SDK，没有超时；只有 `getStore()` 设了 `AbortSignal.timeout(5000)`。Medusa 卡住不响应时，这些原本不依赖后端的页面会一直挂着。

### 修法

1. `request-region.ts`：给区域查询加 3 秒超时。用 `Promise.race` 包一层，超时后抛 `MedusaUnavailableError`，走现有的回退分支。回退分支里的 `getRegion()` 也要套同一个超时，两次都失败时返回 `null`，不再抛错。超时时长写成命名常量 `REGION_LOOKUP_TIMEOUT_MS`。
2. `[slug]/page.tsx`：只在真正需要区域时才调用 `getRequestRegion()`：
   - 本地文章、品牌、本地商品：不调用。
   - 本地分类（需要合并 Medusa 商品）、Medusa 回退查询：调用。
   - `generateMetadata` 中同理，本地命中时不调用。
3. `listMedusaCategoryProducts`、`getMedusaCategoryBySlug`（`src/lib/medusa-catalog.ts`）也加同样的超时，超时按 `MedusaUnavailableError` 处理，这样分类页会显示"部分商品无法加载"的提示，而不是挂住。
4. 不改 `src/lib/medusa.ts` 里旧函数的行为，旧页面还在用。超时工具函数放在新文件 `src/lib/with-timeout.ts`，`medusa-catalog.ts` 和 `request-region.ts` 共用。

### 测试

- `with-timeout.test.ts`：Promise 在时限内完成时返回结果；超时后抛 `MedusaUnavailableError`；用 jest 假定时器，不真的等待。
- `request-region` 的逻辑抽成可注入依赖的函数后测试：区域列表接口超时返回默认区域；默认区域接口也超时返回 `null`。
- 手动：停掉 Medusa，或用防火墙让 9030 端口不响应，打开 `/about-us`、`/shipping-policy`、一个本地商品页，都能在 1 秒内显示。

## 六、问题 4（中）：开发种子脚本写死管理员密码

### 现象

`backend/src/scripts/lorencess-dev-seed.ts` 第 30–31 行写死 `ADMIN_EMAIL = "admin@lorencess.dev"`、`ADMIN_PASSWORD = "lorencess-dev-admin"`，也不检查运行环境。误对生产库运行会创建一个密码公开的管理员。

### 修法

1. 改为从 `LORENCESS_SEED_ADMIN_EMAIL`、`LORENCESS_SEED_ADMIN_PASSWORD` 读取。任一缺失时抛错退出，错误信息写明需要的变量名。密码少于 12 位时同样拒绝。
2. 脚本开头检查：`NODE_ENV === "production"` 时直接抛错，提示"dev seed refuses to run in production"。
3. 日志里只输出邮箱，不输出密码。
4. 在 `backend/.env.example`（不存在则新建）加上两个变量的空值示例；在 `frontend/README.md` 或后端 README 写明运行方式。
5. 搜一遍仓库，确认 `lorencess-dev-admin` 不再出现在任何文件里（`git log` 历史里的不用处理，但在交付报告里提醒店主：如果这个密码在任何可访问的环境用过，要改掉）。

### 测试

后端有 jest 的话，把"读取并校验配置"抽成纯函数测试：缺变量、密码过短、生产环境都会抛错。没有合适的测试环境时，在提交说明里写明手动验证的命令和结果。

## 七、问题 5（中）：心愿单延迟保存可能被丢掉

### 现象

`wishlist-context.tsx` 第 118–136 行：effect 一开始就把 `pendingSave.current` 置空，再启动 500ms 计时器。计时期间 `user.metadata` 变化（例如购物车写了 `active_cart_id`）会触发 effect 清理并取消计时器；重新运行时 `pendingSave.current` 已是 `null`，这次改动就不会保存。

### 修法

问题 1 修完后，`user.metadata` 不再是这个 effect 的依赖。在此基础上：

1. 只在计时器真正触发、开始写入时才清空 `pendingSave.current`。
2. effect 依赖只保留 `items`，不依赖 `user` 对象。
3. 组件卸载或退出登录时，如果还有待保存的数据：卸载时立即保存一次（不等计时器）；退出登录时丢弃，不要写到下一个账号。

### 测试

用 jest 假定时器测试：

- 连续 3 次改动只写一次，写入的是最后一次的数据。
- 计时期间发生一次无关的重新渲染，改动仍然会被保存。
- 退出登录后待保存的数据不会被写入。

## 八、问题 6、7（低）

### 问题 6：Medusa 商品或分类与本地 slug、固定路由重名时打不开

`resolveStorefrontSlug` 先查本地，所以 Medusa 里 handle 为 `cart`、`search` 或与本地商品同名的商品永远打不开，而且没有任何提示。

修法（只做提示，不改解析顺序）：

1. `medusa-catalog.ts` 导出 `isReservedSlug(slug)`：检查 `FL_RESERVED_ROUTES`、本地分类、本地商品、本地文章、品牌。
2. 映射 Medusa 分类商品列表时，跳过 handle 被占用的商品，并用 `console.error("[medusa-catalog] handle shadowed", { handle })` 记录，避免列表里出现点进去是别的商品的链接。
3. `frontend/README.md` 的上架说明里加一条：商品和分类的 handle 不能与现有页面网址重复，并列出 `FL_RESERVED_ROUTES`。
4. 测试：被占用的 handle 不出现在合并后的分类列表里。

### 问题 7：后端字段白名单改动没跑后端测试

提交 `6cfd54a` 改了 `backend/src/lib/catalog-fields.ts`、`cart-fields.ts`。这项不用改代码，只需：

1. 在 `backend/` 下运行现有单元测试（看 `package.json` 的 test 脚本），记录结果。
2. 如果有字段白名单相关的测试，确认它们覆盖了"客户端请求额外字段不会被放行"。没有的话补一个：请求 `fields=*customer` 或 `fields=+cart` 时不返回这些关联。
3. 结果写进交付报告。

## 九、不在本计划内、需要店主决定的事

1. **Next.js 升级**：`npm run build` 编译和生成页面都成功，但最后打印 "Your version of Next.js is affected by a known security vulnerability"，退出码为 1。`npm audit --omit=dev` 没有报出 `next@16.4.0` 的问题。执行 AI **不要自行升级**，也不要运行构建输出里给出的升级命令。先查官方安全公告确认具体漏洞，再问店主是否升级。升级会影响整个前端，应单独做、单独测。
2. 抄来的政策页、About Us 正文和首页图片、短文案，以及 `RecentPurchase` 的假购买记录，仍按 `LORENCESS_FRONTEND_PLAN.md` 第十节等店主决定。

## 十、执行顺序

| 顺序 | 问题 | 说明 |
| --- | --- | --- |
| 1 | 问题 1：metadata 互相覆盖 | 问题 5 依赖它 |
| 2 | 问题 5：延迟保存丢失 | 和问题 1 改的是同一处，紧接着做 |
| 3 | 问题 2：心愿单静默丢商品 | 独立 |
| 4 | 问题 3：区域查询超时 | 独立 |
| 5 | 问题 4：种子脚本密码 | 独立，只改后端 |
| 6 | 问题 6、7 | 最后做 |

## 十一、交付

全部完成后提交一份报告给店主，写清：

- 每个问题怎么修的、对应哪个提交、新增了哪些测试。
- 问题 1 中 Medusa metadata 到底是整体替换还是按键合并，依据是什么。
- 三项基线检查的最终结果，以及后端测试结果。
- 是否在真实 Medusa 上验证过。没有就明说，并列出店主需要手动验证的步骤：
  1. 游客加两件商品到心愿单，并把一件商品加入购物车。
  2. 登录。
  3. 刷新页面，心愿单和购物车都还在。
  4. 退出后重新登录，两者仍在。
  5. 停掉 Medusa，打开 `/about-us`，页面能正常显示。
- 新增的环境变量：`LORENCESS_SEED_ADMIN_EMAIL`、`LORENCESS_SEED_ADMIN_PASSWORD`。
- 第九节仍待店主决定的事项。
