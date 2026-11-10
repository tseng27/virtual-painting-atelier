# 第三方授權說明 / Third-party notices

## 素材（Assets）
本專案**未使用任何外部圖片、3D 模型或付費素材**。
- 3D 畫室中的畫架、桌子、調色盤、畫筆、窗戶、層架等全部以 Three.js 基本幾何體在程式中建構。
- 木地板、牆面、畫布紋理以及所有紙張／畫布材質（細紋素描紙、水彩紙、棉布／亞麻布、宣紙纖維）皆由程式以固定亂數種子即時產生（`src/scenes/textures.ts`、`src/painting/surfaces/heightmap.ts`）。
- 圖示為本專案自繪的 SVG 路徑（`src/components/Icon.tsx`）。

## 字型
透過 Google Fonts 載入（SIL Open Font License 1.1）：
- Noto Sans TC
- Cormorant Garamond

## 執行期套件（npm）
| 套件 | 授權 |
|---|---|
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber | MIT |
| zustand | MIT |

## 開發／測試工具
vite、@vitejs/plugin-react、typescript (Apache-2.0)、vitest、@playwright/test (Apache-2.0)、jsdom、fake-indexeddb (Apache-2.0)，其餘為 MIT。
