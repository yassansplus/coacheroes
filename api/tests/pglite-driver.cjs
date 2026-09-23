const { EventEmitter } = require('node:events');
const { PGlite } = require('@electric-sql/pglite');
// Executes the production TypeORM queries on PostgreSQL WASM, without a live database.
// One leased connection at a time, as PGlite has a single backend connection.
exports.createTestDriver = () => {
  const postgres = new PGlite();
  class Connection extends EventEmitter {
    async query(sql, parameters = []) {
      const command = sql.trim().split(/\s+/)[0].toUpperCase();
      const result = parameters.length ? await postgres.query(sql, parameters) : (await postgres.exec(sql)).at(-1);
      return { rows: result?.rows ?? [], rowCount: result?.affectedRows ?? result?.rows?.length ?? 0, command };
    }
  }
  class Pool extends EventEmitter {
    constructor() { super(); this.connection = new Connection(); this.queue = []; this.leased = false; }
    connect(callback) {
      const acquire = () => {
        this.leased = true;
        let released = false;
        callback(null, this.connection, () => {
          if (released) return;
          released = true;
          this.leased = false;
          this.queue.shift()?.();
        });
      };
      if (this.leased) this.queue.push(acquire); else acquire();
    }
    end(callback) { postgres.close().then(() => callback(), callback); }
  }
  return { Pool };
};
