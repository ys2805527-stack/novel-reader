# 阅读 · 写作

面向手机屏幕的本地阅读与写作应用。

- 支持 TXT、EPUB 导入与 EPUB 封面提取
- 随机匹配 28 张内置书籍插画
- 真实累计阅读计时、阅读进度与最近 7 天统计
- 单页写作、循环切换与上滑删除
- 数据保存在当前浏览器的 IndexedDB / localStorage 中
- 支持 PWA 安装和离线使用

## 在线演示

https://ink-reader-demo-20261021.nimblespark17.chatgpt.site

## 本地运行

请通过本地静态服务器打开项目目录，例如：

```bash
python3 -m http.server 8080
```

然后访问 http://localhost:8080 。直接双击 `index.html` 时，Service Worker 和部分文件读取能力可能受到浏览器限制。

## 安装到 iPhone

使用 Safari 打开部署后的 HTTPS 页面，点击“分享” → “添加到主屏幕”。
