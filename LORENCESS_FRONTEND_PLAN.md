# LORENCESS 前端补齐计划（交接给执行 AI）

日期：2026-11-01
仓库：`/Users/sg/Desktop/Cansoria`，前端在 `frontend/`（Next.js 16.4 App Router、React 19.2、Medusa JS SDK 2.21.2）
前一份计划：`FLORENCESS_PAGES_PLAN.md`（复刻目录页，已完成）。本计划只做下面列出的事，不重做那份计划。

---

## 一、背景与已定决策

- 前端的版式和交互参照 entntnt.com（OpenCart Journal3 主题），店名改为 **LORENCESS**。
- 店主以后在 **Medusa Admin** 上传自己的商品，前端的分类、详情、加购、结算都要能读 Medusa 数据并真实下单。
- 不再抓取原站任何商品、图片或文字。
- 已抓取的本地目录（`src/data/florencess-catalog.json`，1,298 个商品；`public/florencess/catalog/`，约 812MB）**暂时保留，不得删除**，作为 Medusa 无商品时的展示数据。
- 改名只改用户可见的部分。内部文件名、变量名、CSS 类名保留 `florencess` / `fl-` 前缀，不要批量重命名。
- 要补的功能：迷你购物车、大菜单、货币切换、回到顶部、心愿单、快速查看。

## 二、当前状态（执行前先核对）

### 已完成但未提交的改名改动

`git status` 应能看到以下未提交修改，执行前不要回滚：

- 新增 `frontend/src/lib/brand.ts`：`SITE_NAME`、`SITE_DESCRIPTION`、`SITE_COMPANY_LINE`（读 `NEXT_PUBLIC_COMPANY_LINE`，未设置则页脚不显示公司行）、`siteUrl()`（读 `NEXT_PUBLIC_BASE_URL`，回退 `http://localhost:3030`）、`pageTitle(label)`。
- 新增 `frontend/src/lib/__tests__/brand.test.ts`。
- `florencess-data.ts`：`FL_BRAND = SITE_NAME`；`FL_LOCALES` 乱码已修。
- 14 个 `src/app/**/page.tsx` 和 `layout.tsx` 的标题、描述改用 `brand.ts`；结构化数据去掉了指向别人账号的 `sameAs`。
- `HeroSlider`、`SocialNewsletter`、`SiteFooter`、`LayoutWrapper` 中的可见店名已改。
- `florencess-home.test.ts` 的断言已同步。

新代码里凡是出现店名，一律从 `@/lib/brand` 引入，不写字面量。

### 基线检查结果（改动前就存在，不是你造成的）

在 `frontend/` 下运行：

| 命令 | 基线结果 |
| --- | --- |
| `npm run test:security` | 193 个测试中 192 个通过。`florencess-brands.test.ts` 的 1 个失败，原因是本机缺 `frontend_ref/snapshot/info` 目录 |
| `npx tsc --noEmit` | 只有 3 条报错，都是旧手表页缺 `@phosphor-icons/react` |
| `npx eslint <改动的文件>` | 无报错 |

每个阶段结束时，以上三项不得比基线更差。新增的失败或报错必须修好。

### 已知的环境限制

- 上一轮审计时本机没有可用的 Medusa（9030 端口无监听，Docker Desktop API 报 500）。开工前先按 `docker-compose.yml` 尝试启动后端，并调用 `/store/store-info` 和 `/store/regions` 确认服务可用。
- 起不来时，用单元测试 + 模拟数据完成开发，并在交付报告里明确写"未在真实 Medusa 上验证"，不要写成已验证。

## 三、通用约束

1. **不复制原站内容**。只参照版式、间距、交互方式；所有新写的文字（按钮、提示、空状态、菜单标题、宣传语）都自己写。不要把原站文字换个店名或改几个词就用。
2. **测试先行**：纯逻辑（映射、心愿单增删、区域选择校验）先写测试看它失败，再实现。测试放 `src/lib/__tests__/*.test.ts`，用 `@jest/globals`，运行 `npm run test:security -- <文件>`。
3. **不可变更新**：状态用展开运算符返回新对象，不原地修改数组或对象。
4. **文件大小**：单文件 200–400 行为宜，不超过 800 行；函数不超过 50 行。`florencess.css` 已有 1,328 行，**新样式放新文件** `src/app/lorencess-features.css`，在 `layout.tsx` 中 `florencess-catalog.css` 之后引入。
5. **错误处理**：Medusa 连不上时显示错误状态并可重试，不能显示成"没有商品"、404 或"操作成功"。服务端记录错误时不输出密钥或用户数据。不用 `console.log`；需要服务端日志时用 `console.error` 并带上下文前缀，例如 `[medusa-catalog]`。
6. **输入校验**：URL 参数、`localStorage`、cookie、customer metadata 都当作不可信数据，读取后先校验结构和长度。
7. **不改动无关代码**：旧手表页、旧 `/product/[handle]`、`/shop`、结算与支付逻辑保持原样。`providers.tsx` 里购物车的并发保护、会话恢复逻辑不要重写，只做本计划要求的增量。
8. **CSP 与代理**：浏览器端访问 Medusa 只能经过 `/api/medusa/...`，允许的路径和查询参数由 `src/lib/store-proxy-policy.ts` 白名单控制。新请求如果被拒，**只为确实需要的路径和参数**加白名单，并补 `store-proxy.security.spec.ts` 的测试。图片域名受 `src/lib/security-policy.ts` 的 `img-src` 限制。
9. **Git**：每个阶段做完、检查通过后提交一次，格式 `feat: ...` / `fix: ...` / `test: ...`，正文末尾加 `Co-Authored-By: Claude <noreply@anthropic.com>`。不 push，不 force，不删除文件目录（除非本计划明确写了）。
10. **不确定就停下来问店主**，特别是第十节列出的问题。

## 四、需要先读的文件

| 文件 | 作用 |
| --- | --- |
| `src/lib/medusa.ts` | SDK 封装。`getProductByHandle` 出错会抛 `MedusaUnavailableError`；`getCategories`、`getProductsByCategory` 出错返回空数组（会把故障伪装成空，不要直接用） |
| `src/lib/providers.tsx` | `useCart()`（cart、cartLoading、cartError、cartCount、addItem、updateItem、removeItem、refreshCart）、`useRegion()`、`useAuth()`、`useStoreStatus()`（ordersOpen） |
| `src/lib/florencess-catalog.ts` | 本地商品类型 `FlProduct`、`FlCategory` 及查询函数 |
| `src/lib/florencess-variants.ts` | 变体映射；`resolveFlVariant` 只认 `variant_` 开头的真实 ID |
| `src/lib/florencess-routes.ts` | `/[slug]` 的解析顺序与静态路由保留表 `FL_RESERVED_ROUTES`（新增顶级路由必须加进去） |
| `src/lib/florencess-listing.ts` | 分页、排序、URL 参数 |
| `src/app/[slug]/page.tsx` | 分类 / 商品 / 文章 / 品牌的统一入口 |
| `src/components/florencess/Header.tsx` | 头部、导航下拉、手机抽屉、搜索层 |
| `src/components/florencess/ProductBuy.tsx` | 选项、数量、加购按钮及各种不可购买状态 |
| `src/components/florencess/CatalogCard.tsx`、`ProductCard.tsx` | 列表卡片、首页卡片（服务端组件） |
| `src/components/LayoutWrapper.tsx` | 页面外壳；目前把 `cartCount` 传给 `Header` |
| `src/proxy.ts` | 旧地址兼容跳转，`/wishlist.html` 目前跳登录 |
| `src/app/cart/components/OrderSummary.tsx` | 购物车金额字段的现有用法，迷你购物车要与它一致 |
| `src/app/robots.ts`、`src/app/sitemap.ts` | 新增的私人页面（心愿单）要排除在索引外 |

## 五、阶段 1：商品从 Medusa 读取（最优先）

目标：店主在 Medusa Admin 上架的商品能出现在分类页、详情页、搜索结果，并能真实加购结算。本地 JSON 商品继续展示，但仍不可购买。

### 1.1 新增服务端数据层 `src/lib/medusa-catalog.ts`

文件第一行加 `import "server-only";`（如果项目没装 `server-only` 包，就不加，改为在文件注释里写明只在服务端使用）。

- `mapMedusaProduct(product: StoreProduct, currencyCode: string): FlProduct`：纯函数，便于测试。
  - `id`：`medusa:${product.id}`，与本地数字 ID 不会撞。
  - `slug` = `handle`；`title`；`description`（去掉 HTML，截断不在这里做）；`brand` 读 `metadata.brand`，没有则空串；`model` 读第一个变体的 `sku`，没有则空串。
  - 价格：用 `lowestProductPrice()` 取最低 `calculated_amount`，用 `formatPrice()` 格式化成 `price`。`original_amount` 大于 `calculated_amount` 时填 `oldPrice` 和折扣标签（例如 `-20%`），否则留空。没有价格时 `price` 为空串，界面显示"Price unavailable"，不要显示 `$0.00`。
  - `options`：来自 `product.options`（名称 + 去重后的值）。
  - `localImages`：`images` 按 `rank` 排序；为空时用 `thumbnail`；都没有时为空数组。
  - `currency`、`availability`、`pageCaptured: true`。
- `mapMedusaVariants(product): FlVariant[]`：每个变体生成 `{ id, selection }`，`selection` 为"选项名 → 选项值"。核对 SDK 类型：v2 的变体选项值在 `variant.options[].value`，选项名需要通过 `option_id` 对应到 `product.options[].title`；如果字段请求里没带 `*options`、`*variants.options`，先补字段再映射。
- 库存：变体 `manage_inventory` 为 true 且 `inventory_quantity <= 0` 时视为缺货，不放进可购买列表（或标记 `soldOut`，由 ProductBuy 显示 "Sold out"）。
- `getMedusaProductBySlug(slug, regionId)`：基于 `getProductByHandle`，返回 `{ product: FlProduct, variants: FlVariant[] } | null`；故障时抛 `MedusaUnavailableError`，不吞掉。
- `getMedusaCategoryBySlug(slug)`：新写一个会抛错的版本，调用 `sdk.store.category.list({ handle: slug, fields: "id,name,handle,description,parent_category_id" })`。**不要复用会吞错的 `getCategories()`。**
- `listMedusaCategoryProducts(categoryId, regionId)`：新写，会抛错；分页取完（每页 100，最多 10 页，超出时记录日志并截断）。

`medusa.ts` 里已有函数的签名和行为不要改，旧页面还在用。

### 1.2 变体解析改为可注入

- 在 `florencess-variants.ts` 增加纯函数 `resolveVariantFrom(variants: FlVariant[], options: FlOption[], selection)`，把现有 `resolveFlVariant` 的匹配逻辑移进去；`resolveFlVariant` 改为调用它，行为不变（现有测试必须照样通过）。
- `ProductBuy` 增加可选 prop `variants?: FlVariant[]`：传了就用它解析，没传沿用本地映射。按钮可用条件不变：区域就绪、`ordersOpen`、选项选全、解析出真实变体、未缺货。

### 1.3 路由接入 `src/app/[slug]/page.tsx`

解析顺序：

1. 先用现有 `resolveFlSlug(slug)`（本地分类、商品、文章、品牌）。
2. 未命中时查 Medusa 商品 `getMedusaProductBySlug`。
3. 再未命中时查 Medusa 分类 `getMedusaCategoryBySlug`。
4. 都没有：`notFound()`。
5. 第 2、3 步抛 `MedusaUnavailableError`：渲染新组件 `CatalogUnavailable`（标题 + "The catalogue is temporarily unavailable. Please try again shortly." + 重试链接），HTTP 状态保持页面默认，**不要**调用 `notFound()`。

本地分类同名合并：店主在 Medusa 建了与导航相同 handle 的分类（如 `bags-all`、`shoes`）时，分类页展示 **Medusa 商品在前、本地商品在后**的合并列表，排序与分页在合并后的完整列表上做（复用 `sortFlProducts`、`paginateFl`）。合并时 Medusa 查询失败，就只显示本地商品，并在列表上方显示一条提示 "Some products could not be loaded."，同时服务端记日志。

`generateMetadata` 对 Medusa 商品、分类同样输出 `pageTitle()`、描述（截断 180 字）、canonical、首图。

区域：服务端用 `getRegion()` 取默认区域；阶段 4 完成后改为读区域 cookie（见 4.2）。

### 1.4 搜索

`src/app/search/page.tsx`：在现有 `flSearchProducts` 结果前合并 Medusa 的 `searchProducts(query, regionId)` 结果（映射为 `FlProduct`），按 slug 去重。Medusa 失败时只显示本地结果并给出与 1.3 相同的提示。

### 1.5 站点地图

`sitemap.ts` 可追加 Medusa 商品 handle（最多 1,000 条）；拉取失败时跳过这部分，不能让整个 sitemap 报错。

### 1.6 测试（先写）

- `medusa-catalog.test.ts`：用手写的 `StoreProduct` 假数据测试：有折扣、无折扣、无价格、无图片只有缩略图、多选项变体映射、缺货变体、HTML 描述被清理。
- `florencess-variants.test.ts`（或现有相近文件）：`resolveVariantFrom` 的完全匹配、少选、多余选项、非 `variant_` ID 被拒。
- 路由顺序：把 Medusa 查询函数做成可注入参数（例如抽一个 `resolveStorefrontSlug(slug, deps)`），测试本地优先、Medusa 商品、Medusa 分类、未知 slug、Medusa 故障五种结果。

### 1.7 验收

- 在 Medusa Admin 建一个 handle 为 `test-bag` 的商品（两个颜色变体，有价格，有库存），放进 handle 为 `bags-all` 的分类：`/test-bag` 能打开、选颜色后能加购；`/bags-all` 第一页第一个是它。
- 停掉 Medusa：`/test-bag` 显示"暂时不可用"而不是 404；`/bags-all` 只显示本地商品并有提示。
- 本地 JSON 商品的详情页仍显示 "Not Available Online"。
- 写一段说明加到 `README.md`："商品 handle 即网址；分类 handle 与导航一致才会出现在对应菜单下；`metadata.brand` 填品牌名"。

## 六、阶段 2：迷你购物车

### 2.1 组件

- 新建 `src/components/florencess/MiniCart.tsx`（客户端组件），直接用 `useCart()`，不再依赖 `Header` 的 `cartCount` / `cartTotal` props。改完后删掉 `Header` 上这两个 prop，以及 `LayoutWrapper` 里对应的传参。
- 再拆一个 `MiniCartPanel.tsx` 放列表内容，控制单文件大小。
- 头部购物袋图标改为按钮：
  - 桌面（宽度 > 900px，与 `florencess.css` 现有断点一致）：点击在图标下方展开下拉面板，宽约 360px。
  - 手机：从右侧滑出抽屉，复用 `fl-scrim` 遮罩的写法。
- 打开后：点外部、按 Esc、点关闭按钮都会关闭；打开时焦点移到面板标题，关闭后焦点回到图标按钮。按钮带 `aria-expanded`、`aria-controls`。

### 2.2 面板内容（四种状态分开）

| 状态 | 显示 |
| --- | --- |
| `cartLoading` | 加载中占位 |
| `cartError` | 错误文字 + "Retry" 按钮（调用 `refreshCart()`），不清空、不显示成空购物车 |
| 空 | "Your bag is empty." + 去 `/new` 的链接 |
| 有商品 | 列表 + 小计 + 两个按钮 |

每行商品：缩略图、商品名（链接到 `/${product_handle}`；没有 handle 时不加链接）、变体名、单价、数量加减（调用 `updateItem`，最少 1，最多 99，请求中按钮禁用）、删除（调用 `removeItem`）。单行操作失败时在该行显示错误，不影响其他行。

底部：小计（字段与 `OrderSummary.tsx` 用法一致，用 `formatPrice(amount, cart.currency_code)`）、"View Bag"（`/cart`）、"Checkout"（`/checkout`；`useStoreStatus().ordersOpen` 为 false 时禁用并说明原因）。

### 2.3 加购后自动打开

新建一个很小的 `MiniCartContext`（放在 `LayoutWrapper` 内，提供 `openMiniCart()`）。`ProductBuy` 在 `addItem` 成功后调用它；context 不存在时（例如在旧页面里）静默跳过。

### 2.4 验收

- 加购后面板自动打开并显示新商品；改数量后小计更新；删掉最后一件显示空状态。
- 断网后点加号：该行显示错误，原数量不变。
- 键盘能完成打开、改数量、关闭；Esc 关闭后焦点回到图标。

## 七、阶段 3：大菜单

### 3.1 数据结构

在 `florencess-data.ts` 扩展 `FlNavGroup`（保持向后兼容，现有 `children` 继续可用）：

```ts
interface FlNavColumn { title: string; links: { label: string; href: string }[] }
interface FlNavPromo { image: string; alt: string; title: string; href: string }
interface FlNavGroup {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
  columns?: FlNavColumn[]; // 有 columns 时按大菜单渲染
  promo?: FlNavPromo;
}
```

为 BAGS、SHOES、CLOTHING 三组填写 `columns`（例如 BAGS："By Style" 放现有子分类，"Featured" 放 New / Sale 链接）。栏目标题自己起，不照抄原站。`promo` 图片暂时用 `public/florencess/img/` 里现有的分类图，并在代码注释里写明"店主替换为自有图片"。

导航仍是静态配置，不从 Medusa 分类树自动生成；在 README 里说明修改位置。

### 3.2 渲染

- 拆出 `src/components/florencess/MegaMenu.tsx`，`Header` 只负责循环调用。
- 桌面：面板宽度等于内容容器宽度，左侧多列链接，右侧促销图。鼠标移入约 120ms 后打开、移出约 200ms 后关闭（防止划过时闪烁）；`:focus-within` 时也打开；Esc 关闭并把焦点还给顶级链接。顶级链接仍可点击直达分类页。
- 手机抽屉：继续用现有分组折叠，`columns` 里的链接按列平铺进去即可。
- 带 `prefers-reduced-motion` 时不做动画。

### 3.3 验收

- 鼠标、键盘（Tab 进入、Esc 退出）都能打开、关闭；面板内所有链接都指向已存在的页面（写一个测试遍历 `FL_NAV` 所有 href，检查它们能被 `resolveFlSlug` 解析或是已知静态路由）。

## 八、阶段 4：货币切换与回到顶部

### 4.1 区域即货币

Medusa 里货币属于区域（region）：每个区域有一个 `currency_code` 和若干国家。切换货币 = 切换区域。**只显示 Medusa 里真实存在的区域**，不显示假选项。

- `medusa.ts` 增加 `listRegions()`：会抛错的版本，返回 `{ id, name, currency_code, countries[].iso_2 }`。
- `providers.tsx` 的 `RegionContext` 增加 `regions: StoreRegion[]` 和 `selectRegion(regionId: string): Promise<void>`。初始化时：先读 cookie `lorencess_region`，校验 ID 在 `regions` 列表里，否则用现有 `getRegion()` 默认值。

### 4.2 选择的持久化与服务端价格

- 用 cookie `lorencess_region`（`SameSite=Lax`，`Path=/`，一年；只存区域 ID，格式校验 `^reg_[A-Za-z0-9]{1,64}$`），不用 localStorage，因为服务端渲染价格也要读它。
- 服务端新增 `getRequestRegion()`（`src/lib/request-region.ts`）：用 `cookies()` 读取、校验，再到区域列表里确认存在，失败时回退默认区域。阶段 1 中 `[slug]`、搜索页取区域的地方改为调用它。
- 切换后调用 `router.refresh()`，让服务端组件按新区域重新计算价格。

### 4.3 购物车跟随区域

已有购物车时，切换区域要调用 Medusa `sdk.store.cart.update(cartId, { region_id })` 更新购物车，然后刷新。

- 先确认 `store-proxy-policy.ts` 是否允许 `POST store/carts/{id}`（第 14 行的正则看起来允许，执行时用测试确认）。
- 新区域里买不到的商品会被 Medusa 移除或报错：比较更新前后的行数，减少时用提示告诉用户"Some items are not available in this region and were removed."；更新失败时保留原区域和原购物车，显示错误，不切换。
- 这段逻辑放进 `providers.tsx` 的 `selectRegion`，复用现有的 `mutationPending` / `cartRevision` 并发保护，不另写一套。

### 4.4 界面

- 新建 `CurrencySwitcher.tsx`：头部右侧（桌面）和手机抽屉底部各放一个（手机抽屉现在写死了 "USD $"，替换掉）。显示格式例如 `USD $`、`EUR €`（用 `Intl.NumberFormat` 取货币符号，不手写符号表）。
- 页脚的 `FL_LOCALES` 下拉目前是假数据，只改本地 state。改为同一个区域列表；`FL_LOCALES` 不再使用后从 `florencess-data.ts` 删除。
- 只有 1 个区域时，切换器只显示当前货币，不显示下拉。区域列表取不到时整个切换器隐藏。
- 本地 JSON 商品的价格是固定的美元字符串，切换货币后不会变；详情页已有 "Prices are shown in USD" 文字，保留即可，不要做汇率换算。

### 4.5 回到顶部

- 新建 `ScrollTopButton.tsx`，在 `LayoutWrapper` 中渲染一次。
- 页面滚动超过 600px 显示，点击平滑滚动到顶部；`prefers-reduced-motion` 时直接跳。用 `requestAnimationFrame` 节流滚动监听，组件卸载时移除监听。
- 位置在右下角，注意不要和 `ChatWidget`（如启用）以及 `RecentPurchase` 弹窗重叠；手机上避开底部的安全区（`env(safe-area-inset-bottom)`）。
- `aria-label="Back to top"`。

### 4.6 测试与验收

- 纯函数测试：区域 ID 格式校验、cookie 值不在列表时回退默认、货币符号格式化。
- 手动：有两个区域（例如 USD 和 EUR）时，切换后分类页、详情页、迷你购物车价格都变成 EUR；刷新后仍是 EUR；购物车商品数量不变（或在被移除时看到提示）。

## 九、阶段 5：心愿单与快速查看

### 5.1 心愿单数据（纯函数，先写测试）

新建 `src/lib/wishlist.ts`：

```ts
interface WishlistItem {
  slug: string;      // 商品网址，作为唯一键
  title: string;
  image: string;     // 只接受以 "/" 或 "https://" 开头的地址
  price: string;     // 加入时的展示价，仅用于显示
  addedAt: string;   // ISO 8601，例如 "2026-11-01T08:00:00.000Z"
}
```

- `addItem(list, item)`、`removeItem(list, slug)`、`hasItem(list, slug)`、`mergeLists(a, b)`：都返回新数组；按 slug 去重，新加的在前，最多 100 条。
- `parseWishlist(raw: unknown): WishlistItem[]`：校验来自 `localStorage` 或 customer metadata 的数据；字段缺失、类型不对、slug 不符合 `^[a-z0-9][a-z0-9-]{0,199}$`、字符串过长的条目直接丢弃，不抛错。

### 5.2 状态与同步

- 新建 `src/lib/wishlist-context.tsx`：`WishlistProvider` + `useWishlist()`（items、count、toggle、remove、has）。在 `providers.tsx` 的 `Providers` 内部、`AuthContext` 之下包一层（需要读登录状态）。
- 游客：存 `localStorage` 键 `lorencess_wishlist`；监听 `storage` 事件，多个标签页同步。存储不可用时只在内存里保留，不报错。
- 登录用户：登录后把本地列表与 `user.metadata.wishlist` 合并（`mergeLists`），写回 metadata，然后清空本地键。之后每次变动用 `updateCustomerMetadata` 写回，500ms 防抖。
  - **写 metadata 时必须带上现有的其他键**（尤其是 `active_cart_id`，购物车恢复依赖它），只替换 `wishlist` 这一项。先确认 Medusa 的 metadata 更新是整体替换还是合并，按结果处理，并写测试覆盖"写心愿单后 active_cart_id 仍在"。
  - 写回失败：保留界面上的新状态，显示一次 "Your wishlist could not be saved to your account." 提示，下次变动时重试。
- 退出登录：清空内存里的列表（不要把上一个账号的数据留给下一个人）。

### 5.3 界面

- `WishlistButton.tsx`（客户端小组件，心形图标，`aria-pressed`）。放在：`CatalogCard`、首页 `ProductCard` 的图片右上角，详情页 `ProductView` 价格旁边，快速查看弹窗里。卡片是服务端组件，只把按钮做成客户端组件嵌进去，不要把整张卡改成客户端组件。
- 头部心形图标改为链接到 `/wishlist`，并显示数量角标（0 时不显示）。
- 新页面 `src/app/wishlist/page.tsx`：标题、商品网格（图、名、价、"Remove"、链接到详情页）、空状态 "Your wishlist is empty." + 去 `/new` 的链接。页面里的价格是加入时的快照，在页面上注明 "Prices may have changed."。
- `wishlist` 加入 `florencess-routes.ts` 的 `FL_RESERVED_ROUTES`；`robots.ts` 禁止抓取 `/wishlist`；页面 metadata 设 `robots: { index: false }`；不进 sitemap。
- `proxy.ts`：`/wishlist.html` 和 `/index.php?route=account/wishlist` 改为 308 跳到 `/wishlist`（不再跳登录）。同步更新 `florencess-legacy.test.ts`、`florencess-routes.test.ts` 中的相关断言，以及 `tools/florencess-ref/data/route-matrix-local.md` 不用改（它是历史记录）。

### 5.4 快速查看

- 数据接口：新建 `src/app/api/quickview/[slug]/route.ts`（GET）。
  - 校验 slug 格式（同 5.1），不合格返回 400。
  - 先查本地目录，再查 Medusa（复用阶段 1 的函数和区域 cookie）。返回精简数据：`title, slug, price, oldPrice, discount, description(前 300 字), images(最多 6 张), options, variants, purchasable`。
  - 找不到 404；Medusa 故障 503，返回 `{ error: "unavailable" }`，不泄露内部错误。
  - `proxy.ts` 的 matcher 已排除 `/api`，不需要改代理。
- `QuickViewButton.tsx`：卡片图片上的 "Quick View" 按钮；桌面在鼠标悬停时显示，但键盘聚焦时也必须可见；手机上不显示（直接进详情页）。
- `QuickViewModal.tsx`：
  - 打开时 fetch 上面的接口，显示加载、错误（可重试）、成功三种状态；用 `AbortController` 在关闭时取消请求。
  - 内容：左侧复用 `ProductGallery`，右侧标题、价格、简介、`ProductBuy`（传入 `variants`）、`WishlistButton`、"View full details" 链接。
  - `role="dialog"`、`aria-modal="true"`、焦点锁在弹窗内、Esc 和点遮罩关闭、打开时禁止背景滚动、关闭后焦点回到触发按钮。
  - 加购成功后关闭弹窗并打开迷你购物车（阶段 2.3 的 context）。

### 5.5 测试与验收

- `wishlist.test.ts`：增、删、去重、上限 100、合并顺序、`parseWishlist` 拒绝坏数据（缺字段、超长、非法 slug、`javascript:` 图片地址）。
- 快速查看接口：合法本地商品 200、非法 slug 400、未知 404、Medusa 故障 503（模拟）。
- 手动：游客加心愿单 → 刷新仍在 → 登录后仍在 → 换浏览器登录同一账号能看到 → 退出后列表清空。

## 十、需要店主先决定的事（遇到就停下来问，不要自己定）

1. **抄来的正文**：About Us、Shipping / Privacy / Terms / Cookie 政策页、Careers 等文章页（`src/lib/florencess-pages.ts`、`src/data/florencess-content.json`）、FAQ，都是逐字复制原站的，里面仍有 FLORENCESS、原站公司名、地址、电话、`service@entntnt.com`。
   - 店主目前选择**暂时不改**，本计划各阶段**不要碰这些正文**，也不要只把 FLORENCESS 替换成 LORENCESS（换名不改内容，仍然是别人的文字）。
   - 店主同意后，按店主提供的真实信息（公司名、地址、邮箱、退换货天数、配送时效、支付方式）**重新写**，不要改写或改述原文。缺的信息用明显的占位符，例如 `[COMPANY NAME]`，并列清单交给店主。改完后同步更新 `florencess-pages.test.ts`、`florencess-content.test.ts` 的断言。
2. **首页图片和短文案**：轮播图、分类磁贴图、商品图都来自原站；顶部滚动条、卖点条、磁贴上的短句也照搬了原站。上线前需要换成店主自己的图和文字。本计划不处理，只在交付报告里列出位置（`florencess-data.ts` 的 `FL_TOPBAR_ITEMS`、`FL_HERO_SLIDES`、`FL_USP`、`FL_TILES`）。
3. **最近购买弹窗**：`RecentPurchase.tsx` 显示的是 `FL_RECENT_PURCHASES` 里写死的假姓名和假订单。这属于虚构的购买记录，建议删除，或改为读真实订单数据。问店主选哪种，不要自己决定。
4. **已抓取的 812MB 商品图和 1,298 个本地商品**：店主上传自己的商品后是否删除，由店主决定。删除前必须再次确认。
5. **Logo**：现在是文字 Logo。店主有图片 Logo 时再替换。

## 十一、执行顺序与交付

| 顺序 | 阶段 | 依赖 |
| --- | --- | --- |
| 1 | 阶段 1：Medusa 商品 | 无 |
| 2 | 阶段 2：迷你购物车 | 无（可与阶段 3 并行） |
| 3 | 阶段 3：大菜单 | 无 |
| 4 | 阶段 4：货币切换、回到顶部 | 阶段 1（服务端价格读区域 cookie） |
| 5 | 阶段 5：心愿单、快速查看 | 阶段 1（Medusa 商品数据）、阶段 2（加购后打开迷你购物车） |

每个阶段完成后：

1. 运行 `npm run test:security`、`npx tsc --noEmit`、`npx eslint <改动的文件>`，结果不比第二节的基线差。
2. 运行 `npm run build`，生产构建成功。
3. `npm run dev`（端口 3030）下在 1440 宽和 390 宽两种窗口各点一遍本阶段的验收项。
4. 提交一次 commit。

全部完成后，交付一份报告给店主，写清：

- 每个阶段完成了什么，验收项哪些通过、哪些没测。
- 是否在真实 Medusa 上验证过（没有就明说）。
- 新增的环境变量：`NEXT_PUBLIC_COMPANY_LINE`、`NEXT_PUBLIC_BASE_URL`。
- 第十节中仍待店主处理的事项。
- 店主在 Medusa Admin 上架商品的步骤：建区域和货币 → 建分类（handle 与导航一致）→ 建商品（handle、图片、选项、变体、价格、库存、上架到销售渠道）→ 在前台检查。

