# 云南州、市探索地图

首页展示云南 16 个州、市的完整分区与简称，点选区域或地名可以查看全称。下方目录提供相同的选择功能；大理红星直接进入现有洱海漫游，其他地区明确显示尚未开放。

## 数据与投影

- 州、市现用名称：云南省民政厅[行政区划设置名录](https://ynmz.yn.gov.cn/bmfw/xzqh/xzqhsz/)，2026-10-16 核对，共 8 个地级市、8 个自治州。
- 分区形状：© OpenStreetMap contributors / Wambacher，通过 [geoBoundaries 3.0.0 中国 ADM2 档案](https://www.geoboundaries.org/data/geoBoundaries-3_0_0/CHN/ADM2/)取得，ODbL 1.0。档案标注边界年份为 2017、更新日期为 2020-05-25。数据只用于区域探索示意，不声称是现行法定界线。
- 省级轮廓继续使用 Natural Earth 公有领域数据。所有分区采用与原省级轮廓相同的经纬度线性投影，并裁切至该轮廓。
- 先统一简化共享弧，再组装多边形，避免各区独立简化产生裂缝。保留地理坐标的子集位于 `data/yunnan-prefectures.geojson`；网页 SVG 路径位于 `web/prefecture-data.js`。
- 标签锚点以区内点计算，怒江与大理的文字位置做了排版偏移。红星继续指向大理区域。

从原始档案重新生成数据，在项目根目录运行：

```sh
python3 scripts/prepare-prefectures.py /path/to/geoBoundaries-3_0_0-CHN-ADM2.topojson
```

## 动效与交互

云影与风纹采用本地 SVG/CSS；不加载地图服务或密钥。支持暂停、减少动态效果、页面不可见与地图离开视口时暂停。区域、标签和目录会同步高亮；键盘 Enter / Space 可选择地图上的地区。

## 本地验证

`npm test` 检查 16 个行政代码、8/8 类型分布、闭合多边形、区内标签锚点和大理红星的位置。2026-10-16 浏览器验证了地区点选、键盘选区、16 项目录、暂停云影，以及 390px / 707px 宽度下的地名排版与横向溢出。
