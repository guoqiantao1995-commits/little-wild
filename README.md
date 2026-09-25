# 小小动物园 · Little Wild

为 1 岁 8 个月至 2 岁幼儿制作的静态动物认知 PWA。项目不使用账号、后端、数据库、广告、统计或第三方追踪。

## 本地运行

需要 Python 3。在项目目录运行 `python3 -m http.server 8000`，然后用浏览器打开 `http://localhost:8000/`。项目没有第三方运行依赖。

## 发布

当前测试版标记为 **V1 Test 1**。项目按 GitHub Pages 的 `/little-wild/` 子目录编写，所有页面、脚本、图片、图标、manifest 和 Service Worker 地址均为相对路径。GitHub Pages 发布源应设置为 `main` 分支根目录，仓库名为 `little-wild` 时首页地址为 `https://<账号>.github.io/little-wild/`。

正式照片均随项目存放在 `assets/animals/`，已统一为 640 × 800 WebP。PWA 安装时由 Service Worker 将应用外壳、数据、图标及 80 张照片一并缓存；家长设置中会显示离线照片缓存数量。图片来源、作者/上传者、许可和署名记录在 `credits.json`，家长模式内可查看。

## iPhone 使用说明

首次联网打开页面并等待显示“80 / 80 动物已准备完成”后，可在 Safari 中添加到主屏幕。iPhone 上的离线英文发音使用系统 Speech Synthesis；是否能在断网时发音取决于设备已安装/下载的英文语音。需要彻底锁定在本 App 时，请开启 iPhone 引导式访问。网页 PWA 无法阻止 iOS 的 Home 手势或系统级退出。

## 当前范围

- 80 只动物的英文名、中文名和分类；数据结构集中在 `animals.js`。
- 单动物大图卡片、左右切换、英语语音、家长锁、顺序/随机、语言和自动发音设置。
- “动物叫声”开关目前仅预留；实际动物叫声尚未加入。
- 图片版权明细位于 `credits.json`。

Service Worker 发布缓存目前为 `little-wild-release-v6`。下次发布 Test 2 / Test 3 时，需同步更新 `sw.js` 与 `app.js` 中的缓存版本标识。新版本通过新 Service Worker 安装预缓存、`skipWaiting()` 和 `clients.claim()` 切换；页面导航在线时优先取网络，离线时回退到缓存首页，旧版缓存会在激活后删除。
