# 昆明站 · 城市风景与日常

2026-11-09 本地首版，2026-11-18 调整地图，2026-11-24 加入商圈与到达导览。

南屏街与顺城商圈使用 2025 年南屏街实拍，交通导览使用 2026 年 10 月 1 日昆明南站 D88 次列车实拍。南屏街照片采用 CC BY-SA 4.0，列车照片由 AC. 以 CC BY 4.0 授权。页面上的三站位置为相对主城的方位示意。

## 入口和内容

云南地图的昆明地名、分区和目录链接，以及顶部“昆明漫游”统一进入 `#kunming`。已开放目的地增加为3站。

包含教场中路、昆明老街、翠湖、滇池、斗南花市五处地点，以及“茶与咖啡”城市生活主题。茶咖包含不同地点，不画成一家店的地图点位。市场与米线不作为主题入口。

滇池岸线取自 [OpenStreetMap 关系 254775](https://www.openstreetmap.org/relation/254775)，按比例投影后简化。地形由 [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) 局部高程着色，留存为本地 WebP。城区局部框放大花街、翠湖与老街的点选区。岸边的海埂代表滇池观景区域，斗南在东岸。地图用于位置导览，页面标有数据来源。昆明页无需 WebGL。

## 影像与分享

拍摄者、日期、原作与许可列于站内影像来源。斗南花市和社区咖啡各有一幅 AI 场景图，列有工具、生成日期与资料链接。新华社花市图从原站加载，拍摄日期未注明。列车、街巷及湖岸实拍保留原色。


## 操作和链接

- 地图选点同步影像预览与下方详情，详情可关闭；列表选点滚动至详情。
- 茶与咖啡以通栏显示，可从「街巷日常」与收藏找到。按花街、湖岸、街巷或收藏筛选；收藏存储在独立的 yunnan-kunming-saved-v1 键，存储失败给出提示。
- `#kunming?spot=old-street` 直达详情；`#kunming?spot=old-street&frame=101` 直达第二幅影像。
- 相册支持左右键、Escape和返回地图；浏览器前进/后退与页面状态同步。
- 本地与外站照片均有失败提示、重试及原作链接。斗南旧版 `frame=0` 回到斗南并提示图片已更新。

## 验收

运行 npm test 和 npm run build。浏览器核对1440、820、390px布局、3个目的地入口、6个主题、5个地图选点、收藏刷新、图片左右键、Escape、直达和返回、来源，以及WebGL关闭时的昆明页面。


2026-11-18 验收：82 项自动检查通过。本地构建成功。Chromium 在 1440、1100、820、751、600、501、390 和 320px 检查地图，五个点位至少 44px，不重叠，页面无横向溢出。另验证窄屏全站导航、收藏与筛选、键盘相册、历史记录、分享、底图加载失败和本地及外站照重试。

浏览器检查可用 `node tests/kunming-browser.cjs` 重跑。请先启动 `npm run dev`，并使用已装 Playwright 的 Node 环境。可用 `KUNMING_PLAYWRIGHT_PATH` 指定已有 Playwright 模块，用 `KUNMING_CHROME_PATH` 指定已有 Chromium 或 Chrome，用 `KUNMING_PREVIEW_URL` 指定预览地址。

## 2026-11-24 画面选择

南站入口和展开配图使用同一张「澜沧号」站台照片，点开大图可查看摄影原作。老街用对月楼俯瞰与马家大院街面对照。翠湖保留一张 2019 年的观鱼楼倒影，配 2024 年冬日湖面。滇池的两幅照片分别摄于 2025 和 2026 年。

### AI 场景制作提示词

- night-market — Use case: photorealistic-natural. Landscape 3:2 editorial art for a travel album about the Dounan cut flower market in Kunming. At night within a contemporary utilitarian covered wholesale hall, waist-high row of freshly cut roses in kraft-paper sleeves and plastic florist buckets, a vendor in everyday work clothes mid-ground passing a modest bundle to a customer, an ordinary aisle leading to other softly lit flower stalls. Foreground petals and leaves tactile, warm task lights and slightly cooler warehouse light. Compose around the warm red-and-coral blooms and one human exchange, authentic scale, quiet documentary cinematic colour, softly imperfect natural textures. No film borders, text, legible signage, logos, watermarks, neon fantasy, street festival or ornate temple. Original composition, not a replica or a claim of documentation.
- city-coffee — Use case: photorealistic-natural. Landscape 3:2 intimate editorial travel illustration in photographic language. A pause at a modest neighborhood café near Wenlin Street, Kunming. From beside an open timber casement at pavement level, a hand-brewed black coffee in one off-white porcelain cup and saucer and a glass server on a worn narrow wood sill in crisp foreground, dappled morning light through a street tree. Through the opening: a quiet lived-in contemporary Chinese city lane, a passing cyclist in slight motion blur, a few parked bikes, subdued low-rise plaster façades. Restrained warm palette, local everyday life, real materials, natural perspective, medium focal length, pleasing simple composition with detail in shadows. No recognizable store, signage, words, latte art, logos or landmark mashup. Fresh editorial composition; not a claim of documentation.
