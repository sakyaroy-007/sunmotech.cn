# sunmotech.cn

合肥讯沐信息技术有限公司（Sunmo）官网，GitHub Pages 托管，自定义域名 `sunmotech.cn`。

## 改网站

页面源文件在 `src/`，根目录下的 `index.html`、`beatkitchen/`、`labs/`、`macyourcash/`、`about/`、`404.html` 都是生成出来的，不要直接改。

- `src/partials/`：`head.html`、`nav.html`、`footer.html`，所有页面共用
- `src/pages/*.html`：每个页面的正文，开头的 `<!--meta {...} -->` 写输出路径、标题、描述、页面专属脚本
- `assets/css/site.css`：样式；`assets/js/`：交互（`site.js` 通用、`aurora.js` 首屏光场、`sequencer.js` 鼓机、`labs.js` 旋钮与频谱、`pool.js` 算力池）

改完在仓库根目录运行：

```bash
python3 -I src/build.py                     # 只重新生成页面
NOTO_SERIF_SC=/path/NotoSerifSC-Medium.otf \
  python3 -I src/build.py --fonts           # 改了带 class="serif" 的中文字时，顺便重新截取宋体子集（需要 fontTools、brotli）
python3 -m http.server 8777                 # 本地预览 http://127.0.0.1:8777
```

推到 `main` 就会发布。

## 字体

Geist、Geist Mono、Instrument Serif、思源宋体（Noto Serif SC，按页面用到的字截取为 `SunmoSerifSC.woff2`）都是 SIL Open Font License 1.1，许可见 `assets/fonts/OFL.txt`。

## DNS（新网）

`@` 两条 A 记录指向 GitHub Pages（新网同类记录最多两条），`www` CNAME 到 `sakyaroy-007.github.io`，`_github-pages-challenge-sakyaroy-007` TXT 是 GitHub 域名验证，MX 是腾讯企业邮。别删。
