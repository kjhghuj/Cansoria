# Cansoria 手表独立站：代码审核与黑白商务风改造计划

- 审核日期：2026-10-21（Asia/Singapore）
- 项目：H:/Cansoria；技术栈：Next.js 16.4 / React 19 / Tailwind 4 + Medusa 2.21.2。
- 版本基准：HEAD d48a553；实际审核对象为当前工作区，包含此前尚未提交的改造。以附件中的源码哈希为准。
- 本轮交付：审核报告与实施计划；未手工修改业务源码，未执行 seed、数据迁移、下单、发信或部署。

## 1. 审核结论

**宠物油画到手表的改造尚未完成。当前能够编译，但不能据此认定为可以正式销售的手表商城。**

| 用户要求 | 当前结论 | 主要依据 |
| --- | --- | --- |
| 宠物油画内容全部改造 | 未完成 | Logo、联系表单、条款、加载提示、商品占位图、后台订单组件和真实邮件渲染代码仍有旧内容 |
| 黑白简约商务风 | 未完成 | 首页、内容页、页脚及交易页面仍使用奶油色、棕金色、衬线标题和大量圆角 |
| 布局稳定、排版清楚 | 部分满足 | 首页六种屏宽未发现横向溢出；768px 下部分服务说明仅约 7.8px，系列区缺少上间距，手机菜单缺账号入口 |
| 没有 bug | 不能通过验收 | 已复现 React 重复 key 报错；存在商品规格、刻字履约和开店文案的一致性缺口；完整交易链路尚无法运行验证 |

建议保留现有 Next.js + Medusa 架构，围绕业务数据、共享设计体系和交易回归改造。没有证据表明需要重写整个项目。

## 2. 检查范围与证据边界

已建立全库文件清单，扫描前后端源码、测试、邮件模板与选定配置，重点审阅首页、导航、商品详情、变体、刻字、购物车、结账、订单读取、支付访问控制、邮件和种子数据。浏览器实测覆盖核心页面及辅助页面可达性。

| 扫描分组 | 文本文件数 | 行数 |
| --- | ---: | ---: |
| 前端 src 非测试文件（含说明文件） | 113 | 15,734 |
| 前端测试及夹具 | 25 | 2,288 |
| 后端 src 非测试文件（含说明文件） | 87 | 8,014 |
| 后端测试及夹具 | 47 | 4,797 |
| 邮件模板 | 4 | 92 |
| 选定构建、依赖、环境模板、部署配置与 HTTP 测试 | 13 | 652 |
| **合计** | **289** | **31,577** |

- 前端共有 24 个 page.tsx 页面入口；另有 API 路由、robots、sitemap 和 /shop 重定向。
- 另清点 public 下 20 个品牌/图片资源；核验了被引用的 canvas.svg、generic.svg 内容，二者分别仍写着 Wall Art、Canvas Artwork。
- source-inventory.csv 记录扫描文件、行数、SHA-256。**全库扫描不等同于逐行人工证明正确；未逐行人工审阅所有测试、工具脚本及第三方依赖。**
- 不把 node_modules、构建输出、历史设计截图、私人上传文件算作第一方业务源码。本轮未把历史审计文档结论当作当前缺陷证据。
- 未访问生产数据库；未核验数据库现有商品/分类、历史订单、库存、CMS 中的在线内容和远端存储文件。因此，不能声称动态数据中的宠物油画内容已经清零。
- 当前后端地址的 /health、/store/store-info、/store/products 均连接被拒绝（ECONNREFUSED）。商品详情进入默认 404；真实加购、配送、支付、邮件、后台登录和历史订单回归受阻。
- 构建会产生或刷新 .next、.medusa 和 Next.js 自动生成的 next-env.d.ts；业务源码与本轮读取快照逐文件比较未发现变化。

完整证据目录：[audit/2026-10-21-watch-store](H:/Cansoria/audit/2026-10-21-watch-store)。本报告为当前手表改造主文档；旧的待核验框架和过期方案已在后续文档整理中按用户要求删除。

## 3. 实际执行的检查

以下命令在对应 frontend / backend 目录执行；使用本地已安装依赖，未升级依赖。

| 检查 | 命令或入口 | 结果 |
| --- | --- | --- |
| 完整前端 Lint | node node_modules/eslint/bin/eslint.js（与 npm run lint 入口相同） | 0 错误、2 警告 |
| 前端类型 | node node_modules/typescript/bin/tsc --noEmit --incremental false | 通过 |
| 前端测试 | node ../backend/node_modules/jest/bin/jest.js --config jest.security.config.cjs --runInBand | 24 组 / 141 项通过 |
| 后端单元测试 | cross-env TEST_TYPE=unit NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js --runInBand --forceExit | 43 组 / 461 项通过 |
| 前端生产构建 | node node_modules/next/dist/bin/next build | 通过 |
| 后端及管理后台构建 | node node_modules/@medusajs/cli/cli.js build | 通过；提示 Stripe / Resend 未配置 |
| 响应式实测 | 首页宽度 320、375、390、768、1024、1440px | 均未发现首页根文档横向溢出；排版问题见下文 |
| 浏览器行为 | 搜索打开、输入 automatic、文章结果显示、Escape 关闭；手机菜单展开/收起 | 基本行为可用；焦点恢复与账号入口问题仍需整改 |
| 全流程购物 / 支付 / HTTP 集成 | 依赖可用的 Medusa、数据库、测试支付配置 | 未完成，不计作通过 |

合计 **67 组、602 项现有测试通过**。部分异常分支测试会主动打印 CMS / 邮件失败日志，这些不等于测试失败。

Lint 警告：WatchHome.tsx:10 的 DropIcon、cart-rendering.test.ts:8 的 imageSources 未使用。现有测试包含大量静态 HTML / 字符串断言，并不能验证像素布局、数据库迁移、库存并发或完整支付。

日志： [完整 Lint](H:/Cansoria/audit/2026-10-21-watch-store/frontend-lint-all.log)、[前端类型](H:/Cansoria/audit/2026-10-21-watch-store/frontend-types.log)、[前端测试](H:/Cansoria/audit/2026-10-21-watch-store/frontend-tests.log)、[后端测试](H:/Cansoria/audit/2026-10-21-watch-store/backend-tests.log)、[前端构建](H:/Cansoria/audit/2026-10-21-watch-store/frontend-build.log)、[后端构建](H:/Cansoria/audit/2026-10-21-watch-store/backend-build.log)。

## 4. 已确认问题与改造任务

优先级：P0 = 上线前必须解除的阻断；P1 = 本次改造必须完成；P2 = 同轮完善。证据类型：页面实测、源码确认、环境阻断、待联调风险。风险项不冒充已发生的交易故障。

### 4.1 旧业务残留

| 编号 | 级别 / 证据 | 问题及定位 | 处理与验收 |
| --- | --- | --- | --- |
| R01 | P1 / 页面实测 | [BrandLogo.tsx:6](H:/Cansoria/frontend/src/components/BrandLogo.tsx:6) 仍引用旧 wordmark；页头、页脚图片含爪印与 PET PORTRAITS, PAINTED BY HAND | 制作无宠物元素的手表品牌字标；同步检查 favicon、icon、apple-icon、分享图和 Organization.logo。后几项当前只列为检查项，不声称均已确认残留 |
| R02 | P1 / 源码＋页面 | [CartLoading.tsx:7](H:/Cansoria/frontend/src/app/cart/components/CartLoading.tsx:7) 的 artwork cart；[OrderSummary.tsx:102](H:/Cansoria/frontend/src/app/cart/components/OrderSummary.tsx:102)、[cart/page.tsx:25](H:/Cansoria/frontend/src/app/cart/page.tsx:25) 的 Commissions；[checkout/page.tsx:613](H:/Cansoria/frontend/src/app/checkout/page.tsx:613) 及 :643 的 previews / revisions | 改成手表下单、刻字、质检和配送语义；覆盖加载、空状态、报错、关闭和营业两个状态 |
| R03 | P1 / 页面实测 | [ContactForm.tsx:76](H:/Cansoria/frontend/src/components/ContactForm.tsx:76) 默认仍为 Choosing a photo；[terms/page.tsx:28](H:/Cansoria/frontend/src/app/terms/page.tsx:28) 保留 brushwork, tone, and texture；returns 仍提 revisions | 联系主题改为选表/尺寸、刻字、订单、售后；同步后端 topic 校验与邮件主题。条款围绕实物手表与刻字重写，使用经经营者确认的服务内容 |
| R04 | P1 / 源码确认 | [ProductGallery.tsx:8](H:/Cansoria/frontend/src/app/product/[handle]/components/ProductGallery.tsx:8)、[ProductCard.tsx:14](H:/Cansoria/frontend/src/components/ProductCard.tsx:14) 仍回退到画布图；文章商品块也引用 generic.svg。generic.svg 实际是 Canvas Artwork，不能仅凭名字认为通用 | 所有缺图、失败图和文章商品图统一回退到手表占位素材；覆盖 thumbnail 缺失、第二张图失败、变体缺图 |
| R05 | P1 / 源码确认 | [resend/service.ts:139](H:/Cansoria/backend/src/modules/resend/service.ts:139) 的真实订单邮件仍写 Artwork subtotal；同文件商品行 :103 起未输出刻字正文/字体/备注 | 修改实际运行的邮件渲染器，并同步 hbs / tsx 模板与黑白样式；用含两条不同刻字的订单验证邮件完整性，不能只改 data/templates |
| R06 | P1 / 源码确认 | [order-portrait-details.tsx:14](H:/Cansoria/backend/src/admin/widgets/order-portrait-details.tsx:14) 仍只读取 metadata.portrait，链接到已删除的 portrait-photos API；没有对应的专用刻字履约组件 | 新增后台刻字详情展示：SKU、文本、字体、备注；旧肖像订单如需保留，单独做只读兼容。不能宣称新刻字数据已经丢失，当前确认的是专用展示未适配 |

### 4.2 手表业务与交易完整性

| 编号 | 级别 / 证据 | 问题及定位 | 处理与验收 |
| --- | --- | --- | --- |
| R07 | P0 / 环境阻断 | 当前后端未运行；首页固定商品入口实际进入 404。构建亦提示支付、邮件密钥未配置 | 在隔离测试环境启动数据库/Redis/Medusa，核验销售渠道、API key、手表商品和测试支付配置；不直接对现有库运行 seed。必须完成真实接口联调才可评估交易可用性 |
| R08 | P1 / 源码确认 | [catalog-fields.ts:71](H:/Cansoria/backend/src/lib/catalog-fields.ts:71) 的公开 metadata 白名单保留 free_preview，却不包含新种子使用的 movement、water_resistance、warranty、engraveable；[ProductInfo.tsx](H:/Cansoria/frontend/src/app/product/[handle]/components/ProductInfo.tsx) 主要呈现通用问答而非具体型号参数 | 定义公开手表规格契约、逐键白名单及前端参数表；内部采购/成本/备注继续保密。验证型号规格从后台→API→详情页一致 |
| R09 | P1 / 源码确认 | 刻字能力分散在 [frontend engraving.ts:28](H:/Cansoria/frontend/src/lib/engraving.ts:28)、[backend watch-prices.ts](H:/Cansoria/backend/src/lib/watch-prices.ts) 的 handle 清单，以及 [ProductCard.tsx](H:/Cansoria/frontend/src/components/ProductCard.tsx) 的关键词猜测。新建或改名商品可能卡片承诺可刻字，详情/API 却拒绝 | 以经校验的商品能力字段作为权威；前后端共享规则/契约。改名和新增型号不应要求同步修改多份硬编码清单 |
| R10 | P1 / 源码确认 | “单一 orders_open 开关”未贯穿全部页面。how-it-works 使用 PREPARATION_STEPS；shipping/returns/about 等仍固定 STUDIO；ProductActions.tsx:428 的手机栏永远写 Orders in preparation，:48 永远 In Preparation；部分 CTA 默认 false | 统一营业状态和文案解析；营业、筹备、状态读取失败分开处理；测试同一开关打开后所有页面、按钮、邮件和 SEO 的一致性。不得靠删掉后端关店保护来解决 |
| R11 | P1 / 页面＋源码 | [medusa.ts](H:/Cansoria/frontend/src/lib/medusa.ts) 的 getProductByHandle/searchProducts/getProducts 在服务异常时返回 null / []；详情随后 notFound，搜索将后端掉线显示为 No products found | 区分不存在、无结果、超时/503、无权限。真正不存在才 404；故障给可重试服务提示，避免把故障解释成商品下架 |
| R12 | P1 / 源码确认 | [next.config.ts:13](H:/Cansoria/frontend/next.config.ts:13) 将 /shop 重定向到首页锚点；首页仅固定 4 个系列入口，gallery 仅固定 6 个型号。新增商品无法自动进入正常浏览链路 | 恢复真实 /shop 商品列表，接入已发布手表数据，支持系列/机芯/尺寸筛选、排序、分页、加载/空/失败状态。首页系列进入真实分类结果，新增已发布商品能被发现 |
| R13 | P1 / 源码确认 | [seed.ts:426](H:/Cansoria/backend/src/scripts/seed.ts:426) 等直接创建分类、区域、商品，不是旧业务迁移；:742 查询所有 inventory_item，:751 统一设置 1000 库存。重跑可能冲突，也不能清理现有旧商品 | 单独编写可预览、可重复执行、有范围限制的迁移方案；备份后按指定商品/渠道处理旧数据；库存只能更新明确属于目标手表的条目，保留历史订单 |
| R14 | P1 / 源码确认 | [seed.ts:649](H:/Cansoria/backend/src/scripts/seed.ts:649) 的 Lucienne Slim 32 仍复用所有型号相同的 36/38/40/42mm 变体；Field & Pine 文案写 canvas strap，但公共表带选项仅 leather/steel/mesh | 先确认真实型号参数，按商品配置尺寸、表带、表盘、价格和图片；不能把所有排列组合视为可销售 SKU。此处 canvas strap 是合法手表材质，不属于油画残留 |
| R15 | P1 / 待联调业务风险 | [seed.ts:351](H:/Cansoria/backend/src/scripts/seed.ts:351) 的 Free Watch Delivery 描述称 qualifying orders，但配置未包含金额门槛，仅有 enabled_in_store / is_return 规则 | 明确是否全场免邮；如有门槛，在服务端配置适用条件并测门槛前后金额。当前不能据此声称已发生运费损失 |
| R16 | P2 / 源码确认 | [ProductActions.tsx:104](H:/Cansoria/frontend/src/app/product/[handle]/components/ProductActions.tsx:104) 仅在填写刻字文本时传 customization；界面单独填写 Notes 后，不刻字加购会丢弃备注 | 选择“备注属于刻字”或“备注属于订单”并实现一致契约；前者在无刻字时隐藏/说明，后者独立持久化。验收只填备注的情况 |

### 4.3 视觉、布局与交互

| 编号 | 级别 / 证据 | 问题及定位 | 处理与验收 |
| --- | --- | --- | --- |
| R17 | P1 / 源码＋页面 | globals.css、watch-home.css、studio.css、footer.css 分别定义暖色；studio.css:1 局部重写变量，页脚又硬编码颜色；全局声明字体、已加载 DM Sans 和 Georgia 使用不一致 | 先统一主题、字体和语义组件；同时清理局部覆盖与硬编码，不能只改 globals.css。首页、政策、交易和账号页面应为同一套黑白设计 |
| R18 | P1 / 六屏宽实测 | [watch-home.css:14](H:/Cansoria/frontend/src/app/watch-home.css:14) 用 1vw 作为全页单位。768px 时介绍约 10.98px、服务说明约 7.83px、导航 10px；手机服务说明也仅 9px | 字体独立使用有最小值的 rem / clamp，正文 16px、辅助文字 12–14px 起；平板不再整体缩小。不要把浏览器开发工具的 Issues 浮层当成店面自身遮挡问题 |
| R19 | P2 / 源码＋页面 | [watch-home.css:26](H:/Cansoria/frontend/src/app/watch-home.css:26) 给 #styles 设置留白，但 [WatchCollections.tsx:33](H:/Cansoria/frontend/src/app/components/home/WatchCollections.tsx:33) 已改成 id=collections。实测系列标题 top 与 section top 相同，紧贴首屏底部 | 修正锚点/选择器，使用统一 Section 间距和正确 scroll-margin；点 Watches 后标题不能藏在粘性导航后 |
| R20 | P1 / 页面实测 | watch-home.css:176 隐藏 .nav-account；[Navbar.tsx:21](H:/Cansoria/frontend/src/components/Navbar.tsx:21) 的手机菜单又没有 Account。正常手机浏览缺少显眼账号入口 | 手机菜单补 Account / Orders；未登录、已登录状态都有明确入口，保留搜索和购物车 |
| R21 | P2 / 控制台复现 | [Footer.tsx:41](H:/Cansoria/frontend/src/components/Footer.tsx:41) 使用 link.href 作为 key；constants.ts:302–303 两项均为 /how-it-works | 改为稳定唯一 id 或组合 key；去掉重复用途入口或明确锚点区分。全站浏览不再出现对应 React error |
| R22 | P2 / 源码＋AX 证据 | [LoginForm.tsx](H:/Cansoria/frontend/src/app/account/components/LoginForm.tsx) 的 Email / Password label 无 htmlFor、也未包裹 input，AX 输入框无名称。搜索可 Escape 关闭，但焦点回到页面而非触发按钮 | 绑定所有表单标签，补 autocomplete；搜索使用完整对话框焦点管理、关闭后恢复触发位置。人工键盘和读屏回归，不能仅凭截图宣布无障碍通过 |
| R23 | P2 / 源码＋页面 | 首页大表盘 SVG、系列图高度相似；cart/page.tsx:278仍使用旧室内场景，alt 却称是手表工作台。文章使用同一占位图；基础错误页为默认 404 | 换成真实且可用的商品/细节/佩戴素材；商品图真实颜色保留，UI 黑白；alt 描述实际图像。购物车移除无关大横幅，补品牌一致的空状态和错误页 |

### 4.4 需要同步维护的内容

- 后续文档整理已将主 README、前后端 README 和保留的接口说明更新为手表业务，并移除重复接口文档。此项文档维护不代表业务改造已经完成。
- 过期油画方案、照片流程、旧设计验收 Markdown 和重复改造框架已按用户后续要求删除；原设计图片与其他非 Markdown 证据保持不变。最新历史安全复核单独保留，用于跟踪待关闭问题。
- asset-cleanup-preview 中 portrait/portrait_photos 的识别可能用于保护历史资产；删除前先确认旧订单与资源保留策略。
- ART15 优惠码仍被创建并用于旧券校验，不能直接全局替换前缀，否则可能破坏历史券约束。若改成新前缀，须覆盖生成、校验、结账、邮件及既有券兼容。
- 原宠物页面被移除后，建立旧 URL 对照表：有对应内容的重定向到准确页面，无对应内容的给合理的不存在响应；不把所有旧地址统一跳首页。
- sitemap、结构化数据和 CMS 必须根据实际公开商品/文章生成；后台恢复后核验旧商品、旧文章、旧图片是否仍对外公开。
- 静态文章的 featuredProductId 使用 p1 / p2，而文章页按真实 Medusa id 查询；恢复服务后需映射到真实 id 或明确的 handle，避免关联商品缺失。

## 5. 黑白简约商务风设计规范

目标：清晰、克制、专业，让用户优先看清型号、商品图、规格、价格和购买操作。黑白要求用于界面；真实商品图不统一转灰度。

| 设计项 | 实施规范 |
| --- | --- |
| 品牌标识 | 无爪印、宠物标语；采用清楚的 Cansoria 字标及必要的小型品牌副标 |
| 色彩 | 背景 #FFFFFF，主文字/主按钮 #111111，次文字 #525252，辅助文字 #666666，分区 #F5F5F5，边框 #E5E5E5 |
| 状态 | 错误、成功、库存状态配明确文字/图标；必要状态色保持少量，不能只靠颜色表达 |
| 字体 | 统一使用本地 DM Sans 或经确认的单一无衬线字体，实际加载所用字重；删除未使用的 Geist / Playfair 等声明，正文不混用多套字体 |
| 字号 | 正文 16px / 1.6；辅助 14px / 1.5；非核心元信息不低于 12px；H1 桌面 48–64px、手机 32–40px；H2 28–36px；H3 20–24px |
| 行宽 | 政策和长正文约 65–75 个英文字符；标题限制行数但不裁掉必要信息；减少小字号全大写和过大的字距 |
| 数字 | 价格和订单金额用等宽数字特性，金额右对齐；所有金额来自服务端和相同币种格式化工具 |
| 布局 | 主内容最大宽约 1200–1280px；手机侧边距 16–20px，平板 24px，桌面 32px；商品正文和页脚使用统一网格 |
| 间距 | 4/8/12/16/24/32/48/64/80px；Section 桌面 64–80px、手机 40–48px；不用固定页面高度容纳可变长度文案 |
| 按钮/输入 | 主按钮黑底白字，次按钮白底黑边；统一高度 44–48px、圆角 0–4px；状态、聚焦和禁用态清楚 |
| 商品图 | 卡片统一 1:1 或 4:5，一次选定；主图完整展示手表，细节图可放大；固定尺寸占位，缺图使用手表资源 |
| 装饰 | 去掉棕金渐变、画作式装饰线、厚重阴影和大胶囊样式；动效短且可关闭，不影响阅读和操作 |

实施位置：新增统一设计变量/基础组件，协调 globals.css、watch-home.css、studio.css、footer.css 及 Tailwind 语义 token；清理旧 portrait/pet 命名时与组件和相关测试同步，避免无效选择器。

基础组件至少包括：PageContainer、Section、Button、Input/Select/Textarea、ProductCard、Price、Status、EmptyState、ErrorState、Dialog。先完成这些，再批量改页面。

## 6. 页面改造矩阵（覆盖现有 24 个页面入口）

| 页面 | 改造方案 | 关键验收 |
| --- | --- | --- |
| / | 简洁图文首屏、真实系列/商品推荐、经确认的服务信息、简短品牌介绍 | 商品入口可用，价格/营业状态一致，平板字体不缩小 |
| /shop（目前只有重定向） | 新建真实商品列表，筛选/排序/分页，系列卡片进入对应筛选结果 | 新增商品自动出现；筛选刷新、返回和空结果可恢复 |
| /gallery | 改为真实系列展示或明确的品牌图集，避免与商城列表重复 | 不显示已下架的固定型号；系列链接与商品数据一致 |
| /product/[handle] | 桌面图片＋购买信息双栏；手机按主图→型号/价格→规格→变体→刻字→购买排列 | 价格随 SKU 更新；完整规格；刻字、库存和缺图表现正确；购买栏不遮内容 |
| /cart | 移除室内大横幅；商品清单与金额摘要清楚对齐；移动端单列 | 长名称、不同刻字、数量、优惠码和服务失败不会丢数据或挤坏排版 |
| /checkout | 联系方式→地址→配送→支付→确认；明确步骤和当前总价 | 付款前再次核对金额；失败可重试；已付款确认失败可恢复且不重复扣款 |
| /order/confirmed、/order/lookup | 使用清楚的状态、订单号、商品与刻字摘要及售后入口 | 签名链接/登录归属验证保留；不因前端跳转就认定付款完成 |
| /account、/register、/account/forgot-password、/account/reset-password | 统一表单、标签、错误提示、字号；账号内订单/地址/优惠券统一风格 | 手机可进入账号；字段有名称；后端错误可理解；账号切换不串购物车 |
| /search | 结果卡片与列表统一，保留搜索词，区分无结果和服务故障 | 商品与文章来源一致；键盘、关闭焦点和长词排版通过 |
| /about、/our-studio、/how-it-works | 精简重复筹备说明，使用经确认的品牌、选表、刻字、质检信息 | 开店状态贯穿页面；不凭演示插图编造工厂、机芯或服务承诺 |
| /journal、/journal/[slug] | 黑白文章排版、合理封面比例、统一分类和关联商品 | 标题不压图、正文清晰；真实商品关联；CMS 撤回文章不被静态内容意外恢复 |
| /faq、/contact、/reviews | 手表 FAQ、选表/刻字联系主题、仅显示有依据的真实评价或透明空状态 | 前后端 topic 一致；表单不可用有说明；不展示种子中的虚构评分 |
| /shipping、/returns、/privacy、/terms | 统一窄栏正文、标题层级和服务内容 | 发布实际配送、保修、普通/刻字商品售后政策；旧照片、画风、笔触语义清零 |
| 系统状态 / 默认 404 / 异常页 | 品牌一致的 loading、empty、not-found、error 与重试入口 | 真正缺失和服务失败分开，站内导航可继续使用 |
| 后台 / 事务邮件 | 以手表规格、SKU、刻字、质检和配送为中心；邮件同步黑白视觉 | 后台人员和顾客看到同一份刻字与订单数据 |

## 7. 分阶段实施顺序

| 阶段 | 工作包 | 依赖 | 交付与完成条件 |
| --- | --- | --- | --- |
| 0. 固定基线 | 保存当前未提交改动、测试基线、截图；建立隔离联调环境，确认依赖和测试凭据 | 无 | 后端健康、商品接口、销售渠道可用；不误执行现有 seed |
| 1. 手表数据闭环 | R06–R09、R13–R16：型号专属规格/变体、公开字段、刻字能力、后台/邮件展示、迁移预览 | 0 | 一个普通表和一个刻字表可在测试环境完整下单；老订单仍可读 |
| 2. 品牌与文案清理 | R01–R05、R10：新 Logo、正确占位素材、所有页面/通知的手表语义、开店状态统一 | 1 的契约明确 | 残留逐项有处理结论；营业/筹备两种状态均检查 |
| 3. 设计基础 | R17–R19：黑白变量、单一字体、容器、组件、统一断点和间距；先做首页/列表/详情三个样板 | 2 的品牌素材 | 三页在桌面/平板/手机形成同一套样式，避免逐页打补丁 |
| 4. 核心购物页 | 真实 /shop、详情、购物车、结账、订单确认/查询；R11–R12、R20–R23 | 1、3 | 完整购物流程、响应式和错误恢复通过 |
| 5. 辅助页面 | 账号、内容、FAQ、联系、评价、政策、页脚、搜索、后台通知；历史文档归档与旧 URL 处理 | 2、3、4 | 24 个既有页面入口及新列表逐项完成；无控制台应用错误 |
| 6. 回归与发布准备 | 自动检查、真实测试支付/邮件、迁移演练、截图对比、数据/配置核验 | 全部 | 下方验收清单全部满足或明确登记为不发布的未完成项 |

任务不宜先从“全局替换宠物词”或“只把颜色改黑”开始。历史订单兼容、优惠码约束、服务端白名单和媒体保护需要保留准确语义。

## 8. 回归测试与验收清单

### 8.1 业务与数据

- [ ] 后端恢复后，按销售渠道查询全部已发布商品和分类，确认线上不再公开旧油画商品；分页遍历，不能只检查首屏。
- [ ] 8 个现有种子型号逐个核对真实规格，特别是 32mm 型号、帆布表带及不可销售组合；价格与库存以正式数据为准。
- [ ] 普通、可刻字、不可刻字、新增型号和修改 handle 的商品，卡片→详情→API 的刻字能力一致。
- [ ] 刻字空值/20 字符/超长/非法字符、不同字体、只填备注、同 SKU 两种刻字分别测试；购物车、结账、订单、后台和邮件一致。
- [ ] 金额覆盖 USD / GBP / EUR，折扣、税费、运费和免邮门槛；前端价格与服务端最终金额一致。
- [ ] 库存不足、变体不可用、并发最后一件、数量上下限、订单重试及重复回调不导致超卖或重复订单。
- [ ] 旧订单和旧资源保留策略明确，迁移有预览、备份、范围限制和回滚；不把“旧数据保留”当成改造失败。

### 8.2 交易与异常

- [ ] 测试支付覆盖成功、拒付、取消、3DS、付款后确认失败、刷新/返回、重复点击、重复回调；成功状态由服务端验证。
- [ ] 游客、注册、登录、退出、账号切换和无浏览器存储情况下，购物车和订单权限正确；不能读取或修改他人的订单。
- [ ] 后端 503、断网和超时明确显示服务不可用，商品不存在才 404，搜索无结果不掩盖接口错误。
- [ ] 配送地址更改后重新确认运费和总价，付款前订单摘要与服务端一致。
- [ ] 邮件在测试环境验证实际收件与格式；订单刻字、金额及安全查询链接正确，重试不重复发送。
- [ ] orders_open=false/true/读取失败分别测试全站文案与按钮；营业模式不残留筹备说明，筹备模式不错误承诺已具备服务。

### 8.3 视觉、排版与交互

- [ ] 所有核心页面覆盖 320、375、390、768、1024、1440px，另测 200% 缩放、长商品名、长地址、多位金额和缺图；不能只回归首页。
- [ ] 无意外横向滚动、按钮遮挡、标题裁切、粘性导航挡锚点或购买栏挡页脚。
- [ ] 正文和辅助文字按规范保持最小字号；实际加载字体一致；对比度、焦点和禁用状态清楚。
- [ ] 手机菜单包含账号入口；搜索/弹窗可键盘打开、关闭、遍历并正确恢复焦点；输入有可访问名称。
- [ ] 缺图实际显示手表素材；图片比例一致；真实商品颜色保留；不再把室内图描述成手表场景。
- [ ] 运行页面不存在重复 key、hydration 或未处理 Promise 的应用错误；浏览器开发工具提醒与应用缺陷分别判断。

### 8.4 自动检查与内容

- [ ] 完整 Lint、前端类型、前后端构建、现有 602 项测试通过；清除两条现有 Lint 警告。
- [ ] 为本次实际缺陷补有价值的回归：公开手表 metadata、后台/邮件刻字、营业状态矩阵、菜单账号入口、服务故障与404区分、迁移可重复性。
- [ ] 增加有真实接口的“商品→SKU→刻字→加购→配送→测试支付→订单→邮件”端到端测试；不能只用字符串断言替代交易验收。
- [ ] 扫描旧业务词并逐项判定：用户可见残留清零；canvas strap、历史兼容字段、历史券保护、历史文档可在说明后保留。
- [ ] 核验在线 CMS、邮件服务、远端资源及 SEO，不将源码未命中等同于动态内容清理完成。

## 9. 本轮页面证据与健康状态

本轮截图均来自当前代码运行页面；未使用历史 design-evidence 作为现状证据。首张购物车加载中截图仅作为加载文案观察，稳定布局使用带 stable 后缀的截图。

| 步骤 | 实际观察 | 状态 | 证据 |
| --- | --- | --- | --- |
| 1 | 首页及六种屏宽 | 可访问；旧 Logo、暖色、字体过小、系列区留白问题 | home-320/375/390/768/1024/1440.png，responsive-home.json |
| 2 | 系列与型号入口 | 系列可访问；静态固定内容，商品入口受后端离线阻断 | 06-gallery-desktop.png、03-product-mobile-390.png |
| 3 | 手机导航 | 展开/关闭可用；缺 Account | 12-mobile-menu-390.png |
| 4 | 购物车 | 空状态最终可见；旧场景图、Commissions、加载文案残留；有商品状态未验证 | 04-cart-mobile-390-stable.png |
| 5 | 结账 | 页面可访问；油画定制用语残留；实际支付未验证 | 05-checkout-mobile-390.png |
| 6 | 联系与政策 | 页面可访问；Choosing a photo / brushwork 残留，联系发送未验证 | 07-contact-desktop.png、08-terms-mobile-390.png |
| 7 | 文章与搜索 | 静态手表文章可见；搜索文章命中、Escape 可关闭；商品查询故障被空结果掩盖 | 09-journal-mobile-390.png、11-search-mobile-390.png |
| 8 | 账号与订单入口 | 登录/注册/查询页可达；输入标签缺关联；登录、邮件和真实订单未验证 | 10-account-mobile-390.png、route-smoke.json |

附加访问：FAQ、配送、退换、隐私、About、Our Studio、How It Works 已记录 DOM。200% 缩放、其他浏览器、真实后台及全部动态状态的视觉检查留给实施回归，不宣称本轮已通过。

### 首页现状（桌面）

![当前首页：旧宠物字标及暖色表盘插画](H:/Cansoria/audit/2026-10-21-watch-store/home-1440.png)

### 平板排版现状（768px）

![平板首页：导航和服务说明字号过小](H:/Cansoria/audit/2026-10-21-watch-store/home-768.png)

### 联系页旧照片选题

![联系页默认仍为 Choosing a photo](H:/Cansoria/audit/2026-10-21-watch-store/07-contact-desktop.png)

### 稳定的手机购物车空状态

![手机购物车：旧室内场景和油画委托文案](H:/Cansoria/audit/2026-10-21-watch-store/04-cart-mobile-390-stable.png)

## 10. 本轮不能作出的结论

不能据本报告声称“全部油画业务已改完”“所有页面都没有布局问题”“支付与邮件已联调成功”或“绝对没有 bug”。本轮已经完成可运行的静态检查、现有测试、构建和具名页面观察，并形成上述实施计划；真实数据与交易验收仍需在后端及测试服务可用后执行。
