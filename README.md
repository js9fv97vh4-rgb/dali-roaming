# 大理漫游 · V1.0.0

从云南地图上的一颗红星出发，沿着洱海探索风景、规划行程，走近白族扎染。

**[在线体验](https://js9fv97vh4-rgb.github.io/dali-roaming/)** · **[下载 V1](https://github.com/js9fv97vh4-rgb/dali-roaming/releases/tag/v1.0.0)**

## 第一版包含什么

- 云南目的地地图，点击红星进入洱海。
- 机场、大理站、自驾示例入口；海西、海东与全部景点筛选。
- 15 处景点、全景照片地图、主图艺术字、多图相册与完整照片查看。
- 目的地与停留点选择、沿岸候选、行程排序、文字复制与下载。
- 放大洱海的渔灯模式：灯影漂动、水面风纹、动画暂停，搭配 4 张洱海渔灯实景资料图。
- 靛蓝扎染视觉，以及“绞扎 → 浸染 → 拆线”的互动示意。
- 适配手机，支持键盘与减少动态效果偏好。

行程保存在**当前浏览器**，刷新后可恢复；不需要账号或后端，不会跨设备同步。地图连线表示探索顺序与沿岸方向，不能替代道路导航。

## 启动

需要 Node.js 20 或更新版本；生成 ZIP 发行包另外需要 Python 3。

```sh
git clone https://github.com/js9fv97vh4-rgb/dali-roaming.git
cd dali-roaming
npm run dev
```

打开 `http://localhost:8765`。静态网页启动不需要安装第三方依赖。端口被占用时：

```sh
npm run dev -- --port 8766
```

检查、构建和封装：

```sh
npm test
npm run build
npm run preview
npm run package
```

`build` 输出 `dist/client` 静态网站；`package` 输出 `release/dali-roaming-v1.0.0.zip` 和 SHA-256 校验文件，包含源码与可直接运行的静态网页。下载解压后也可以直接打开根目录的 `index.html`；推荐使用本地服务器，以获得一致的行程保存体验。

如需修改可选数据库模型，再执行 `npm ci` 安装锁定的依赖。

## 部署到 GitHub Pages

在仓库 **Settings → Pages** 选择 **Deploy from a branch → main → /(root)** 并保存。根目录入口会进入 `web/index.html`，保留访问时的页面锚点；`.nojekyll` 让静态资源直接发布。无需数据库、密钥或付费服务。

其他静态托管服务可直接发布 `web/` 或 `dist/client/`，使用相对资源路径。

## 开源版的图片

15 处景点均配有真实照片，共 **43 张景点影像、4 张洱海渔灯资料图和 1 张洱海总览**。周城相册使用 2025 年 11 月 21 日拍摄的工坊照片，三塔与双廊补入新的主图，感通寺山门换用更清晰的版本。

发行包收录 **33 张可分发的照片**，按公有领域、CC0、相应版本的 CC BY-SA 或 Unsplash License 保留独立授权。另有 **15 张源站图片引用**，页面保留作者和原作链接，图片文件不随开源包分发；这些影像需要联网，源站未来可能更改链接。加载失败时显示明确标注的洱海参考图，不冒充对应景点。

逐图来源、分发范围和拍摄信息见 [素材说明](docs/ASSETS.md)、[第三方授权](THIRD_PARTY_NOTICES.md) 与 [素材清单](asset-sources.json)。

## 项目结构

```text
web/                 网页、地图、景点、相册和图片
data/                可复用地图几何与点位数据
scripts/             本地预览、构建与打包
tests/               行程模型、素材完整性、可选存储测试
worker/              原站点的可选 Sites 存储参考实现
db/、drizzle/        可选数据库模型与空库迁移
asset-sources.json   分发照片与外部引用的作者、来源和授权
docs/                素材规则与存储说明
```

GitHub Pages 仅发布静态页面；`worker/` 不会执行，也不是独立的通用认证服务。可选存储的适用范围见 [存储说明](docs/STORAGE.md)。包中没有原站点绑定、个人行程、密钥或原 Git 历史。

## 贡献与授权

欢迎通过 Issue 提出建议，或提交带来源、作者、许可说明的照片。参见 [贡献说明](CONTRIBUTING.md)。

原创代码和原创装饰纹样采用 [MIT](LICENSE)。照片保留各自许可；OpenStreetMap 洱海湖岸与点位数据采用 ODbL 1.0；Natural Earth 云南轮廓为公有领域。MIT 不覆盖这些第三方素材和数据。
