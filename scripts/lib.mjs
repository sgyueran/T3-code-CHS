// 公共工具：定位安装目录、读取 asar 内文件
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import asar from "@electron/asar";

// 默认安装位置：%LOCALAPPDATA%\Programs\t3code；可用 --dir 或环境变量 T3CODE_INSTALL_DIR 覆盖
export const DEFAULT_INSTALL_DIR = path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
  "Programs",
  "t3code",
);

export function resolveInstallDir() {
  const i = process.argv.indexOf("--dir");
  const dir = i > -1 ? process.argv[i + 1] : process.env.T3CODE_INSTALL_DIR || DEFAULT_INSTALL_DIR;
  const res = path.join(dir, "resources");
  if (!fs.existsSync(path.join(res, "server.asar"))) {
    throw new Error(`找不到 T3 Code 安装目录: ${dir}（可用 --dir 指定）`);
  }
  return { dir, res };
}

/** 优先读取 .orig 备份（未打补丁的原版），否则读当前包 */
export function pristineAsar(res, name) {
  const orig = path.join(res, `${name}.orig`);
  return fs.existsSync(orig) ? orig : path.join(res, name);
}

export function readAsarText(archive, file) {
  return asar.extractFile(archive, file.split("/").join(path.sep)).toString("utf8");
}

export function listAsar(archive) {
  return asar.listPackage(archive, { isPack: false }).map((p) => p.replace(/\\/g, "/").replace(/^\//, ""));
}

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
