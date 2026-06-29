# Bilibili 自动开启中文字幕

这个目录里的 `bilibili-auto-chinese-subtitle.user.js` 是一个 Tampermonkey/Violentmonkey 用户脚本。安装后，在 B 站视频页和番剧播放页会自动尝试打开字幕菜单，并选择“中文”字幕。

## 安装

1. 浏览器安装 Tampermonkey 或 Violentmonkey 扩展。
2. 打开扩展的“新建脚本”页面。
3. 删除默认内容，把 `bilibili-auto-chinese-subtitle.user.js` 里的内容粘贴进去。
4. 保存脚本，刷新 B 站视频页。

## 说明

- 脚本会在页面加载、选集切换、播放器刷新时重试开启字幕。
- 如果视频本身没有中文字幕，脚本不会生成字幕，只会保持原状。
- 如果 B 站改版导致失效，可以优先更新脚本里的字幕按钮选择器和 `TARGET_TEXT`。
