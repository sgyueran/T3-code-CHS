// 轻量 asar 改写器：不解包、不碰 .unpacked 目录。
// 原理：asar 中文件 offset 相对于“数据区起点”，所以只要把原数据区原样拷贝，
// 把新增/修改的文件追加到数据区末尾、更新头部 JSON，即可得到合法的新包。
import fs from "node:fs";
import crypto from "node:crypto";

const BLOCK = 4 * 1024 * 1024;

export function readHeader(file) {
  const fd = fs.openSync(file, "r");
  try {
    const head = Buffer.alloc(16);
    fs.readSync(fd, head, 0, 16, 0);
    const headerPickleSize = head.readUInt32LE(4);
    const strLen = head.readUInt32LE(12);
    const json = Buffer.alloc(strLen);
    fs.readSync(fd, json, 0, strLen, 16);
    return { header: JSON.parse(json.toString("utf8")), dataStart: 8 + headerPickleSize, fd: null };
  } finally {
    fs.closeSync(fd);
  }
}

function node(header, p, create) {
  const parts = p.split("/").filter(Boolean);
  let n = header;
  for (let i = 0; i < parts.length; i++) {
    if (!n.files) throw new Error(`路径不是目录: ${parts.slice(0, i).join("/")}`);
    if (!n.files[parts[i]]) {
      if (!create) throw new Error(`asar 中不存在: ${p}`);
      n.files[parts[i]] = i === parts.length - 1 ? {} : { files: {} };
    }
    n = n.files[parts[i]];
  }
  return n;
}

export function readFile(file, p) {
  const { header, dataStart } = readHeader(file);
  const n = node(header, p, false);
  if (n.unpacked) return fs.readFileSync(file + ".unpacked/" + p);
  const buf = Buffer.alloc(n.size);
  const fd = fs.openSync(file, "r");
  try { fs.readSync(fd, buf, 0, n.size, dataStart + Number(n.offset)); } finally { fs.closeSync(fd); }
  return buf;
}

function integrity(buf) {
  const blocks = [];
  for (let i = 0; i < buf.length; i += BLOCK) blocks.push(crypto.createHash("sha256").update(buf.subarray(i, i + BLOCK)).digest("hex"));
  if (!blocks.length) blocks.push(crypto.createHash("sha256").update(Buffer.alloc(0)).digest("hex"));
  return { algorithm: "SHA256", hash: crypto.createHash("sha256").update(buf).digest("hex"), blockSize: BLOCK, blocks };
}

function pickleHeader(jsonStr) {
  const str = Buffer.from(jsonStr, "utf8");
  const payload = 4 + str.length;
  const padded = (payload + 3) & ~3;
  const headerPickle = Buffer.alloc(4 + padded);
  headerPickle.writeUInt32LE(padded, 0);
  headerPickle.writeUInt32LE(str.length, 4);
  str.copy(headerPickle, 8);
  const sizePickle = Buffer.alloc(8);
  sizePickle.writeUInt32LE(4, 0);
  sizePickle.writeUInt32LE(headerPickle.length, 4);
  return Buffer.concat([sizePickle, headerPickle]);
}

/**
 * @param {string} src 源 asar（原版）
 * @param {string} dest 输出 asar
 * @param {Record<string, Buffer>} changes asar 内路径 → 新内容（新增或替换）
 */
export function rewrite(src, dest, changes) {
  const { header, dataStart } = readHeader(src);
  const srcSize = fs.statSync(src).size;
  const oldDataLen = srcSize - dataStart;
  let offset = oldDataLen;
  const appended = [];
  for (const [p, buf] of Object.entries(changes)) {
    const n = node(header, p, true);
    if (n.files) throw new Error(`不能用文件覆盖目录: ${p}`);
    if (n.unpacked) throw new Error(`不支持修改 unpacked 文件: ${p}`);
    delete n.link;
    n.size = buf.length;
    n.offset = String(offset);
    n.integrity = integrity(buf);
    offset += buf.length;
    appended.push(buf);
  }
  const head = pickleHeader(JSON.stringify(header));
  const tmp = dest + ".tmp";
  const out = fs.openSync(tmp, "w");
  try {
    fs.writeSync(out, head);
    // 流式拷贝原数据区
    const fdIn = fs.openSync(src, "r");
    const chunk = Buffer.alloc(8 * 1024 * 1024);
    let pos = dataStart;
    while (pos < srcSize) {
      const n = fs.readSync(fdIn, chunk, 0, Math.min(chunk.length, srcSize - pos), pos);
      fs.writeSync(out, chunk, 0, n);
      pos += n;
    }
    fs.closeSync(fdIn);
    for (const b of appended) fs.writeSync(out, b);
  } finally {
    fs.closeSync(out);
  }
  fs.renameSync(tmp, dest);
}
