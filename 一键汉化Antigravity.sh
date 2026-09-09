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

# macOS 下修改 /Applications 中的应用文件需要管理员权限 (sudo)
if [ "$EUID" -ne 0 ]; then
    echo "[提示] 修改 /Applications 目录下的文件需要管理员权限。"
    echo "       请输入您的 Mac 密码（输入时终端不会显示字符，直接输完按回车即可）："
    sudo env "PATH=$PATH" "$NODE_BIN" "$DIR/patch.js"
else
    "$NODE_BIN" "$DIR/patch.js"
fi