# Cansoria Our Studio 改造验收

日期：2026-10-09。交付范围：筹备期页面、文案、素材标注、SEO 和 AI 客服事实统一。

## 已完成

- 新页面 /our-studio：Our Approach、Explore the Styles、Preparing Your Portrait、Before Commissions Open 四部分。沿用品牌标志、奶油色和全局页脚。
- /artists 返回永久 308 重定向；桌面/移动导航、页脚、canonical、分享摘要和 sitemap 使用新地址。
- 主按钮到 /shop，次按钮到 /contact，Photo Guide 到 /upload-photo；实际浏览器点击已验证。
- 首页、商品展示、About、How It Works、FAQ、购物车、结账、页脚和默认文章统一为筹备期事实。移除未确认的画师资历、材料、免费预览、无限修改及配送保证；购物车残留的免费草稿说明也已清除。
- 展示图标注 Style illustration、Illustrative scene 或 Concept comparison；artist-at-work.webp 不再用于当前制作或商品证明。
- 隐藏评价导航/页脚入口，/reviews 保留真实空状态，设置 noindex, follow 并移出 sitemap。删除未使用的虚构评价数据。
- 商品展示、SEO 和 JSON-LD 使用统一文案；旧商品数据不能重新输出虚构评分、材料或服务承诺。筹备期 JSON-LD 不输出在售 Offer。
- AI 客服使用相同的筹备期事实，未确定的问题明确待确认。当前页面不公开个人画师资料或社媒。

## 验证结果

- 15 个测试套件、82 项测试通过；新增检查覆盖旧商品文案、真实页面元数据/结构化数据、客服提示和默认文章。
- 前端类型检查、lint、git diff --check 通过。最终源码的生产构建在独立本地目录通过，并完成 Next.js 的 TypeScript 检查。
- 为保留正在运行的预览，隔离构建复制当前源码并复用已安装依赖；仅临时构建目录调整了依赖追踪根目录，原项目配置未修改。
- Our Studio、首页、商品页和购物车检查了 320、375、768、1440px：无横向溢出。Gallery、How It Works、About、FAQ、Photo Guide、Contact 和 Reviews 也通过 320px 检查。图片标注可读，主标题未被导航遮挡。
- 修复 320px 下提示卡片标题溢出：窄屏单列，长文字可换行。
- 首屏示意图设置优先加载；商品 JSON-LD 的 nonce 属性校验提示已处理。最终浏览器复验未出现此前的两条提示，HTTP 校验确认脚本与响应策略的 nonce 一致。
- HTTP 复验：/artists 308、/our-studio 200、canonical 正确、/reviews noindex、sitemap 新旧地址一致。

浏览器会隐藏 nonce 内容属性，因此只对该静态 JSON-LD 元素处理属性差异；脚本仍使用响应提供的 nonce。[MDN 说明](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/nonce#accessing_nonces_and_nonce_hiding)、[React 说明](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors)。

## 预览与后续

- 本地预览：http://localhost:3030/our-studio。当前 canonical/sitemap 使用本地站点 URL；正式环境应配置生产域名。
- 桌面截图：.codex/our-studio-desktop.jpg；移动截图：.codex/our-studio-mobile.jpg。
- 构建仍有既有 CMS 426 提示，文章使用本地后备内容；隔离目录有构建根路径格式提示，编译与类型检查均成功。
- 交易仍供本地内测。正式售价、支付、联系表单上线配置和完整交付流程需另行确认。本轮没有支付、发布或部署。
- 获取授权真实作品、制作实拍并验证交付后，再补充真实案例、材料、预览、修改和交付政策；个人画师介绍保持可选并须本人授权。
