#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "========================================================"
echo "          Antigravity macOS 汉化 / 还原管理工具         "
echo "========================================================"
echo ""

if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js 环境！请先安装 Node.js (https://nodejs.org) 后再运行本工具。"
    exit 1
fi

node "$DIR/patch.js"