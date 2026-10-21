# 本轮审计证据

主报告：[手表独立站代码审核与改造计划](H:/Cansoria/WATCH_STORE_CODE_AUDIT_AND_REDESIGN_PLAN_2026-10-21.md)。

- source-inventory.csv：289 个文本文件的扫描清单和哈希，不代表逐行人工验证。
- legacy-hits.json：旧业务关键词初筛；包含需要保留的历史兼容/技术命名，不能直接作为删除清单。
- checks-summary.json 与 *.log：实际运行的检查及退出码。
- responsive-home.json：六屏宽首页的文档宽度与字号测量。
- route-smoke.json、dom-*.txt：辅助页面初始可达性快照，异步页面需结合稳定截图；不代表真实登录/订单操作成功。
- browser-console.json：本轮实际控制台观察。
- home-*.png 及编号截图：当前页面证据；04-cart-mobile-390.png 为加载阶段，稳定购物车证据使用 04-cart-mobile-390-stable.png。
- report-link-check.json：报告文件与截图链接存在性校验。

当前后端连接被拒绝；支付、邮件、数据库历史数据及真实交易流程尚未验收。
