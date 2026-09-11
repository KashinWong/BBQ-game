# 食材图片生成记录

## 2026-09-10 T001–T005

执行窗口：2026-09-10 17:45–18:40，Asia/Shanghai。用户授权范围：完成 T001–T005，即准备工作、牛肉生/熟/焦三态及试样检查。

最终结果：T001–T005 已完成。默认内置 `image_gen` 共完成 8 次调用，得到 1 张生图和 7 张编辑候选；没有使用 CLI/API 备用路径，也不依赖 `OPENAI_API_KEY`。三张选定图和三项 QA 预览均已写入本 spec 目录。

### 路径与工具

- 提示词来源：[prompts.md](../prompts.md) 的 `beef-raw`、`beef-cooked` 和 `beef-burnt`。
- 生成工具：内置 `image_gen`。工具未返回实际图像模型名称，因此不作推测。
- 候选目录：`generated/candidates/`。
- 选定目录：`generated/selected/`。
- QA 目录：`generated/qa/`。
- 生图生成调用在当前主任务中执行；熟态与焦态作为两个独立编辑任务并行执行，最终均由主任务复核。

此前记录的“当前会话没有内置 image_gen”是工具发现阶段的误判。生牛肉调用 `ig_0f1cfae54c932d12016aa27eaa448c87d0b6e746945c19a52b` 随后成功返回有效 PNG，证明内置路径可用，T001 阻塞解除。

## T001 准备

- 已核对六种食材、三态名称、提示词章节、输入角色和 T001–T005 完成条件。
- 已创建 `candidates/`、`selected/`、`final/` 和 `qa/`；本轮没有向 `final/` 写入文件，统一尺寸整理仍属于 T021。
- 已确认输出目录可写，实际图片均保存在项目内。
- 未修改游戏代码、运行时接口或熟度规则。

## T002 生牛肉

| 项目 | 记录 |
| --- | --- |
| 操作 | 无输入图生成；使用 `beef-raw` |
| 调用 ID | `ig_0f1cfae54c932d12016aa27eaa448c87d0b6e746945c19a52b` |
| 候选 | `candidates/beef-raw-v01.png` |
| 选定 | `selected/beef-raw.png`，与候选字节相同 |
| SHA-256 | `2df1420816b7bf1038a5b8f2c5f061c8ebe3d6e74c05b587da5b8da0599fb56d` |
| 文件 | 1254×1254 RGBA PNG；目标 1024×1024 未满足 |
| alpha | 极值 `(0,255)`；826,896 个全透明像素；`alpha>=8` 包围盒 `(107,161,1163,1105)` |
| 目视 | 单块圆角方形牛肉，红粉肉色、浅色脂肪纹、深棕描边和斜俯视清楚；无竹签、场景、文字、投影或裁切 |

生图 alpha 在画布底边另有 8 个 `alpha=1` 的不可见噪点，主包围盒不触边。该噪点与尺寸统一留到 T021 清理，不把本次结果记为尺寸验收通过。

## T003 熟牛肉

编辑目标为 `selected/beef-raw.png`。第 2 次调用只尝试从第 1 个熟态候选提取背景；最终所选的第 3 次调用重新以生牛肉为唯一编辑目标，符合熟态必须从生图独立编辑的约定。

| 尝试 | 调用 ID | 候选 | 结果 |
| --- | --- | --- | --- |
| 1 | `ig_01f393dfb3c38817016aa28323839487d0940b8c40c9c879fd` | `beef-cooked-v01.png` | 1254×1254 RGB；熟色、两道烤痕和油光正确，但透明网格被绘入背景，无 alpha，未选 |
| 2 | `ig_01f393dfb3c38817016aa28438ce3087d0b63a9a8f1cb33ca9` | `beef-cooked-v02.png` | 背景提取返修；仍为 RGB、无 alpha，未选 |
| 3 | `ig_01f393dfb3c38817016aa284a742f087d08008ab41af6b2896` | `beef-cooked-v03.png` | 重新从生图编辑；RGB 画面合格，仍无 alpha；选作颜色内容来源 |

最终 `selected/beef-cooked.png` 保留 `beef-cooked-v03.png` 的 RGB 像素，并逐像素使用 `beef-raw.png` 的 alpha 通道恢复透明边缘。两图均为 1254×1254，无缩放或重采样；最终 RGB 与 v03 逐像素相同，alpha 与生图逐像素相同。

- SHA-256：`f3801688d5a9d889ae9a3f65682d2504748d0bc6161cd568095e09a7a59155a5`。
- alpha 极值 `(0,255)`；`alpha>=8` 包围盒 `(107,161,1163,1105)`。
- 目视结果：暖棕与金棕熟色明确，顶部两道深棕烤痕，小面积油光清楚；身份、方块轮廓、朝向和光照保持一致，无额外物件或投影。

## T004 焦牛肉

四次烤制编辑均重新加载 `selected/beef-raw.png` 作为唯一食材编辑目标；后续尝试只收紧透明输出要求。所有调用都返回了可用的焦态 RGB 主体，但没有返回真实 alpha。

| 尝试 | 调用 ID | 候选 | 结果 |
| --- | --- | --- | --- |
| 1 | `ig_018a17925f523eff016aa283241fd887d080ed941ab106c841` | `beef-burnt-v01.png` | 1254×1254 RGB；焦态主体合格，透明网格被绘入背景，无 alpha，未选 |
| 2 | `ig_018a17925f523eff016aa28526b7e487d0b306039e6782e6c0` | `beef-burnt-v02.png` | 加强像素级透明约束；仍为 RGB、无 alpha，未选 |
| 3 | `ig_018a17925f523eff016aa285bafad887d089354d61913f18df` | `beef-burnt-v03.png` | 改为透明 cutout 表述；仍为 RGB、无 alpha，未选 |
| 4 | `ig_018a17925f523eff016aa2862cb19c87d0adbe0630a3aca5d3` | `beef-burnt-v04.png` | 最小化透明提示；RGB 焦态画面合格，仍无 alpha；选作颜色内容来源 |

最终 `selected/beef-burnt.png` 保留 `beef-burnt-v04.png` 的 RGB 像素，并逐像素使用 `beef-raw.png` 的 alpha 通道恢复透明边缘。两图均为 1254×1254，无缩放或重采样；最终 RGB 与 v04 逐像素相同，alpha 与生图逐像素相同。

- SHA-256：`80c5e8ee649f0102f40fd9e6c2e7c0a6c529530df7fca291358e656e05e268f4`。
- alpha 极值 `(0,255)`；`alpha>=8` 包围盒 `(107,161,1163,1105)`。
- 目视结果：深褐肉色、大块不规则炭黑焦斑和明显减少的油光符合焦态；仍保留棕色区域、深棕轮廓和方块身份，在深色背景上可辨认。内部纹理比生图和熟图更密，后续全量风格验收时继续复核。

## T005 牛肉试样检查

| 预览 | 内容 | SHA-256 |
| --- | --- | --- |
| [beef-states.png](./qa/beef-states.png) | 三态并排，白底与 `#241816` 分屏 | `4a31dd80723954080db8675bbbb515c9d6e33d2aaebec2fcf6855a565062fef4` |
| [beef-overlay.png](./qa/beef-overlay.png) | 生/熟、生/焦各 50% 叠放 | `e94db5dd5bc2fb31149a2e8b10658601275e529fbf23018176419292675ce324` |
| [beef-small.png](./qa/beef-small.png) | 42×36 与 34×31 实际显示框，白底及两种深色底 | `e2105bef75211c20ef20b388fbe7c5758640e462022efdbdf354b8f2ffc2d910` |

检查结论：

- 三态 alpha SHA-256 均为 `f8a0f2af79ed6d1a101e66898b379c0385b1f93fe40d48af6d9f39e958856ba6`，主体包围盒、锚点和透明轮廓完全一致。
- 三态颜色差异明显。主体区域平均绝对 RGB 差为：生/熟 `(43.65,20.31,53.05)`，生/焦 `(123.07,50.47,67.48)`，熟/焦 `(82.83,45.45,26.10)`。
- 白底、`#241816` 与 `#171412` 背景无可见白边；34×31 和 42×36 下三态均可辨认，焦态没有变成纯黑块。
- 三张图均只有一块牛肉，无竹签、餐具、角色五官、烟火、文字、标签、水印、拼图或地面投影。
- T001–T005 通过。T021 必须把三态统一等比归一化到 1024×1024，并清理底边 8 个 `alpha=1` 噪点；T022 再与其他五种食材一起做全量风格与易混食材验收。

## 实际提交提示词

以下为内置工具实际返回的 `revised_prompt`，按调用顺序保留。工具未返回图像模型名称。

### 生牛肉尝试 1

调用：`ig_0f1cfae54c932d12016aa27eaa448c87d0b6e746945c19a52b`。

```text
Use case: stylized-concept
Asset type: mobile game ingredient sprite
Primary request: 为手机竖屏休闲烧烤游戏《烤串高手》绘制一张独立的生牛肉食材精灵图。
Subject: 一块适合穿串的厚实牛肉块，整体接近圆角方块。红粉色肉质，带两条简化的浅色脂肪纹，顶面和前侧面清楚。尚未烧烤，表面没有焦痕或熟色。不是完整牛排，没有骨头或血水。
Style/medium: 明亮可爱的2D卡通；造型圆润清晰；统一粗细的深棕色外轮廓；少量内部线条；简洁的两到三层明暗；适度食物质感；以小尺寸识别为优先；不要复杂纹理。
Composition/framing: 近似正交的轻微斜俯视，主要看到顶部，同时露出少量前侧面。仅一个独立食材单元，完整居中，四周透明留白。主体最长边约占画布75%，无裁切。缩小到34×31像素时仍能通过轮廓和主要色块辨认。
Lighting/mood: 左上方柔和暖光；仅食材自身明暗；无地面投影。
Output: 正方形1024×1024 PNG，真正透明背景，保留alpha通道，边缘干净。
Constraints: only one ingredient piece; no text; no watermark; no logos.
Avoid: 竹签、烤架、盘子、餐具、手、场景背景、标签、角色五官、手脚、白色贴纸边框、烟雾、火焰、飘散粒子、多件食材、拼图、摄影写实效果、模拟透明背景的棋盘格。
```

### 熟牛肉尝试 1

调用：`ig_01f393dfb3c38817016aa28323839487d0940b8c40c9c879fd`。

```text
Edit Image 1 only.
Use case: precise-object-edit
Asset type: square transparent PNG game ingredient sprite for 《烤串高手》 T003 cooked beef
Primary request: Change only the cooking state of this exact beef chunk. Turn the meat from raw red into appetizing warm cooked brown, with localized golden-brown areas, exactly two simple dark-brown grill marks on the upper meat surface, and a small restrained oily gloss. It should look tender, juicy, and just fully cooked.
Input images: Image 1 is the edit target and must remain the same ingredient.
Scene/backdrop: preserve a genuinely transparent background with real alpha; no ground shadow.
Style/medium: preserve the existing polished cartoon game-ingredient illustration style, dark-brown outer outline, and simple two-to-three-layer cel-shaded light and dark values; do not make it photorealistic.
Composition/framing: preserve Image 1's exact outer silhouette, position, scale, orientation, camera angle, cut geometry, perspective, and margins. The subject must not move, rotate, shrink, expand, or be recut.
Lighting/mood: preserve the exact original lighting direction and highlight placement logic; warm freshly grilled appearance.
Constraints: change only cooking color/state and add exactly two restrained grill marks plus a small oily highlight. Preserve ingredient identity, outer contour, all major internal cut/fat shapes, dimensions, location, viewpoint, outline thickness, and transparent canvas. Keep the deep-brown outline. Output a square transparent PNG.
Avoid: adding or removing ingredients; skewing or changing the silhouette; bamboo skewer, grill, plate, utensils, hand, scene, text, labels, watermark, face, limbs, white sticker border, smoke, flame, particles, multiple food pieces, collage, ground shadow, opaque or black background, photographic realism.
```

### 熟牛肉尝试 2

调用：`ig_01f393dfb3c38817016aa28438ce3087d0b63a9a8f1cb33ca9`。

```text
Edit the most recently loaded image only (the cooked beef candidate with a visible gray-and-white checkerboard background).
Use case: background-extraction
Asset type: transparent PNG game ingredient sprite for 《烤串高手》 T003 cooked beef
Primary request: Remove the entire gray-and-white checkerboard pattern and replace it with genuine pixel transparency (real alpha channel). The checkerboard is an unwanted baked-in background, not part of the artwork.
Subject: preserve the cooked beef sprite exactly as shown, including its exact outer silhouette, position, scale, orientation, camera angle, cut geometry, deep-brown outline, warm brown and golden-brown cooking colors, exactly two grill marks, oily highlights, internal fat shapes, and lighting direction.
Composition/framing: preserve the same square canvas and the exact beef placement and margins. Do not move, rotate, resize, shrink, expand, recut, repaint, or restyle the beef.
Constraints: change only the background pixels; output a square PNG with a genuine RGBA alpha channel; every pixel outside the beef silhouette must have alpha 0. Keep clean antialiased semi-transparent edge pixels where needed. No rendered checkerboard, no white background, no black background, no ground shadow.
Avoid: any change to the subject, extra objects, sticker border, scene, text, smoke, flame, particles, photographic realism, or opaque background.
```

### 熟牛肉尝试 3

调用：`ig_01f393dfb3c38817016aa284a742f087d08008ab41af6b2896`。

```text
Edit Image 1 only.
Use case: precise-object-edit
Asset type: 《烤串高手》 T003 cooked-beef game sprite, square transparent PNG
Primary request: Change only this exact beef chunk from raw to just-cooked. Make the meat warm medium brown with a few golden-brown cooked areas, exactly two simple dark-brown grill marks across the upper surface, and a small restrained oily shine. Keep it tender and juicy.
Subject invariants: preserve the exact ingredient identity, outer silhouette, position, subject dimensions, orientation, camera angle, perspective, cut geometry, fat-band shapes, internal structure, lighting direction, deep-brown outer outline, and outline thickness from Image 1. Preserve the clean cartoon rendering with only two to three broad light/dark layers. Do not add fine speckles or painterly texture.
Canvas and transparency: preserve a square canvas. Encode all background pixels as actual transparent PNG alpha (RGBA, alpha 0 outside the beef). Transparency must exist in the file channel; do not draw, render, or depict a checkerboard/grid pattern. No colored background, no black or white background, no ground shadow. Preserve clean antialiased silhouette edges with alpha.
Constraints: the only visible changes are the meat's cooked warm-brown coloration, localized golden-brown areas, exactly two grill marks, and small oily highlights. Do not move, rotate, resize, shrink, expand, recut, deform, or restyle the subject.
Avoid: bamboo skewer, grill, plate, utensils, hand, scene, text, labels, watermark, face, limbs, white sticker border, smoke, flame, particles, multiple ingredients, collage, checkerboard transparency preview, opaque background, drop shadow, photographic realism.
```

### 焦牛肉尝试 1

调用：`ig_018a17925f523eff016aa283241fd887d080ed941ab106c841`。

```text
Edit Image 1 only.

Use case: precise-object-edit
Asset type: square transparent PNG ingredient sprite for the game 《烤串高手》, T004 burnt beef
Input image: Image 1 is the edit target.
Primary request: Change only this beef cube's cooking state from raw to badly burnt. Make the meat surface deep cooked brown with several large, irregular charcoal-black scorch patches. Reduce the oily shine substantially. Keep clearly visible brown cooked areas between the black patches so the beef remains recognizable and is not a solid black mass. The result must unmistakably look overcooked and ruined.
Style/medium: preserve the exact clean stylized 2D game illustration style, with simple two-to-three-level shading and the existing dark-brown outline.
Critical invariants: preserve the ingredient identity as beef; preserve the exact outer silhouette, position, scale, orientation, perspective, viewing angle, lighting direction, outline thickness, cube/block structure, cut shapes, all edges, and canvas framing from Image 1. Do not rotate, move, shrink, expand, reshape, crop, or add/remove any ingredient. Keep the subject occupying the same pixels and visual footprint as closely as possible.
Background/output: square PNG with genuine transparent alpha background, no background fill and no ground shadow.
Avoid: whole object pure black; red/raw meat appearance; photorealism; bamboo skewer; grill; plate; utensils; hands; scene; text; labels; watermark; face; limbs; white sticker border; smoke; flames; particles; multiple ingredients; collage; added objects; changed composition; changed outline.
```

### 焦牛肉尝试 2

调用：`ig_018a17925f523eff016aa28526b7e487d0b306039e6782e6c0`。

```text
Edit Image 1 only. Image 1 is the sole edit target and source of truth.

Use case: precise-object-edit
Asset type: square transparent PNG ingredient sprite for the game 《烤串高手》, T004 burnt beef revision v02
Primary request: Change only the beef cube's cooking state from raw to badly burnt. Turn the meat surface deep cooked brown and add several large irregular charcoal-black scorch patches. Greatly reduce oily shine. Preserve substantial visible brown cooked-beef regions between scorch patches so it remains clearly recognizable as beef and is never a solid black mass. It must unmistakably look overcooked and ruined.

Critical transparency requirement: The background must be genuine PNG transparency encoded in the alpha channel. Every pixel outside the beef silhouette must have alpha=0. Do not draw, bake, rasterize, or simulate any background into RGB. Absolutely no gray-and-white checkerboard pattern, no white background, no black background, no colored background, and no transparency preview pattern. A visible checkerboard in the image pixels is a failed result. Preserve clean antialiased silhouette edges with partial alpha only at the edge where needed.

Style/medium: preserve the exact clean stylized 2D game illustration style from Image 1, including the dark-brown outline and simple two-to-three-level shading.
Critical visual invariants: preserve the ingredient identity, exact outer silhouette, position, visual footprint, subject scale, orientation, perspective, viewing angle, lighting direction, outline thickness, cube/block structure, cut shapes, internal structural divisions, all edges, and canvas framing from Image 1. Do not rotate, move, shrink, expand, reshape, crop, or add/remove anything. Keep the square canvas and same dimensions as Image 1.

Avoid: simulated transparency checkerboard; any opaque background; whole object pure black; red/raw meat appearance; photorealism; bamboo skewer; grill; plate; utensils; hands; scene; text; labels; watermark; face; limbs; white sticker border; ground shadow; smoke; flames; particles; multiple ingredients; collage; added objects; changed composition; changed outline.
```

### 焦牛肉尝试 3

调用：`ig_018a17925f523eff016aa285bafad887d089354d61913f18df`。

```text
Edit only the currently loaded Image 1, the original raw beef PNG. Treat Image 1 as the sole source image.

Use case: background-extraction
Asset type: transparent RGBA game ingredient sprite, burnt beef

Required output structure: return one isolated beef cube on an empty transparent canvas. The output file must be a PNG with an alpha channel. Outside the beef outline, pixels must be transparent with alpha value 0. Transparency must be actual file data, not a visible visual treatment. Keep only the beef artwork; omit the background entirely. No transparency grid or background pattern may be drawn into the image.

Object edit: change only cooking state. Make the beef deep cooked brown with large irregular charcoal-black burnt patches and much less oily shine. Leave enough brown meat visible that it is clearly beef and not a solid black shape. It must look badly overcooked.

Preserve from Image 1: exact beef identity, outer silhouette, position, footprint, scale, orientation, perspective, viewing angle, lighting direction, dark-brown outline thickness, rounded cube structure, cut and fat structures, internal divisions, canvas framing, and clean 2D game illustration with two to three shading levels. Do not rotate, move, resize, reshape, crop, add, or remove any structural part.

Do not include any background, checker pattern, solid canvas color, ground shadow, white sticker border, skewer, grill, plate, utensil, hand, scene, text, label, watermark, face, limb, smoke, flame, particle, second ingredient, collage, or photorealism.
```

### 焦牛肉尝试 4

调用：`ig_018a17925f523eff016aa2862cb19c87d0adbe0630a3aca5d3`。

```text
Edit only Image 1, the original raw beef cube.

Create the burnt state of the same game sprite. Change only the surface cooking: deep brown cooked meat, several large irregular charcoal-black burnt patches, clearly reduced shine, and enough brown areas to remain recognizable as beef. Keep the exact existing silhouette, position, size, orientation, perspective, lighting, dark-brown outline, cube structure, cut structure, internal divisions, and simple two-to-three-level 2D shading.

Output an isolated RGBA PNG cutout on a fully transparent canvas. All pixels outside the beef silhouette must have alpha=0. Preserve clean antialiased edge alpha. The canvas outside the object contains no visible image content.

Do not add, remove, rotate, move, resize, reshape, crop, or change the composition. No ground shadow, skewer, grill, plate, utensils, hands, scene, text, labels, watermark, face, limbs, smoke, flames, particles, extra ingredients, collage, or photorealism.
```
