# 食材美术嵌入点清单

[返回方案](./README.md) · [对接文档](./integration.md)

本次仅定位后续接入位置；以下代码全部保持原样。符号以 2026-09-10 工作区读取结果为依据。

| 位置 | 当前职责 | 对后续素材接入的约束 |
| --- | --- | --- |
| [levelOneRules.ts](../../../../src/game/levelOneRules.ts) · IngredientKind | 定义六种食材标识 | 文件名沿用 beef、pepper、mushroom、sausage、corn、chicken，不新增食材 |
| [GameplayScene.ts](../../../../src/game/GameplayScene.ts) · FOOD | 名称、Emoji、三类颜色及烤制速度 | 美术描述对应这些食材身份，不能用热狗、整根玉米或带骨鸡腿替代 |
| GameplayScene · spawnIngredient | 备料区 42×36 色块与 Emoji；外层交互容器更大 | 42×36 是视觉参考，不是点击热区；换图时仍需保留原交互逻辑 |
| GameplayScene · buildSkewerVisual | 绘制独立竹签、34×31 食材色块、Emoji 和两面熟度条 | 每张素材只画食材，竹签与熟度条继续独立；每块中心横向间距为 39 |
| GameplayScene · refreshSkewerVisual | 按当前可见面的熟度更新外观 | 后续贴图不能错误使用另一面或两面平均熟度 |
| GameplayScene · colorForProgress | 根据连续熟度选原色、中间色、熟色、焦色 | 三态素材是视觉基准；中间过渡应在后续接入任务中明确，不修改熟度规则 |
| GameplayScene · updateOrderView 与关卡说明 | 订单及说明中的食材 Emoji / 名称 | 如未来替换订单图标，应复用同一食材身份；本次不改订单 UI |
| [main.ts](../../../../src/main.ts) · 场景配置 | 创建 Phaser 游戏并注册现有场景 | 后续新增资源加载需设计加载时机；本次不添加 preload、资源清单或启动场景 |

验收背景可参考 GameplayScene 中的烤架底色 `#241816` 与烤位底色 `#171412`。焦态素材需在这些深色背景上仍可辨认。

没有新增公开接口、配置项、数据库变更或部署步骤。
