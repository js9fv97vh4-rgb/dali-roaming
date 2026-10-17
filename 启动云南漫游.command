#!/bin/zsh
# Finder's environment may omit Homebrew and Node's usual installation paths.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd -- "${0:A:h}" || exit 1
if ! command -v node >/dev/null 2>&1; then
  print '没有找到 Node.js。请先安装 Node.js 20 或更新版本，再重新双击此文件。'
  read -r '?按回车键关闭窗口…'
  exit 1
fi
node scripts/open.mjs
preview_exit=$?
if (( preview_exit != 0 )); then
  print '\n预览未能启动，请查看上方提示。'
  read -r '?按回车键关闭窗口…'
fi
exit "$preview_exit"
