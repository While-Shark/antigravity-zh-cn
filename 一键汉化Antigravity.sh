#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "          Antigravity macOS 汉化 / 还原管理工具         "
echo "========================================================"
echo ""

NODE_BIN="$(which node 2>/dev/null || command -v node 2>/dev/null)"
if [ -z "$NODE_BIN" ]; then
    echo "[错误] 未检测到 Node.js 环境！请先安装 Node.js (https://nodejs.org) 后再运行本工具。"
    exit 1
fi

# 检查是否正在运行
if pgrep -x "Antigravity" >/dev/null 2>&1; then
    echo "⚠️  [警告] 检测到 Antigravity 正在运行！"
    echo "    请先按下 Cmd + Q 彻底退出 Antigravity（确保 Dock 栏图标下无小圆点），"
    echo "    否则在软件运行中修改会导致代码缓存偏移错乱，汉化无法生效！"
    echo ""
    read -p "确认已完全退出后，请按回车键继续..." dummy
    echo ""
fi

# macOS 下修改 /Applications 中的应用文件需要管理员权限 (sudo)
# 指定独立的 npm_config_cache 避免 sudo 下 npx 污染用户 ~/.npm 缓存目录
if [ "$EUID" -ne 0 ]; then
    echo "[提示] 修改 /Applications 目录下的文件需要管理员权限。"
    echo "       请输入您的 Mac 密码（输入时终端不会显示字符，直接输完按回车即可）："
    sudo env "PATH=$PATH" "npm_config_cache=/tmp/npm_cache_antigravity" "$NODE_BIN" "$DIR/patch.js"
else
    env "npm_config_cache=/tmp/npm_cache_antigravity" "$NODE_BIN" "$DIR/patch.js"
fi