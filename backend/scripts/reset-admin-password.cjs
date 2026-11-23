const path = require('node:path');
const { existsSync } = require('node:fs');
const { pathToFileURL } = require('node:url');

const databasePath = path.join(__dirname, '..', 'data', 'newbee.db');

function openDatabase() {
  if (!existsSync(databasePath)) {
    throw new Error(`找不到数据库，请在实际部署的项目中运行。路径：${databasePath}`);
  }

  const sqlite = process.getBuiltinModule?.('node:sqlite');
  if (sqlite) {
    const url = pathToFileURL(databasePath);
    url.searchParams.set('mode', 'rw');
    return new sqlite.DatabaseSync(url.href);
  }

  const Database = require('better-sqlite3');
  return new Database(databasePath, { fileMustExist: true });
}

function resetPassword() {
  const db = openDatabase();
  try {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('123456', 10);
    db.exec('PRAGMA busy_timeout = 5000');
    const result = db.prepare(`
      UPDATE "user" SET password = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE username = 'admin' AND role = 'admin'
    `).run(hash);

    if (result.changes !== 1) {
      throw new Error('数据库中没有找到用户名和角色均为 admin 的账号。');
    }
  } finally {
    db.close();
  }
}

try {
  resetPassword();
  console.log('重置成功。用户名：admin  密码：123456');
} catch (error) {
  console.error('重置失败：', error.message);
  process.exitCode = 1;
}
