import type { ConnectionOptions } from "mysql2/promise";
import mysql from "mysql2/promise";
import mariadb, { type ConnectionConfig, type PoolConfig } from "mariadb";

export type DatabaseTarget = {
  database?: string;
};

export type DatabaseConfig = {
  driver?: "mariadb" | "mysql2";
  host: string;
  password: string;
  port: number;
  user: string;
};

export type CompatibleDbConnection = {
  end(): Promise<void>;
  execute<TResult = unknown>(sql: string, values?: unknown[]): Promise<[TResult, unknown]>;
};

export type CompatibleDbPool = {
  end(): Promise<void>;
  execute<TResult = unknown>(sql: string, values?: unknown[]): Promise<[TResult, unknown]>;
};

export type DatabaseConnector = {
  connect(target?: DatabaseTarget): Promise<CompatibleDbConnection>;
};

export function createMysqlConnector(config: DatabaseConfig): DatabaseConnector {
  return createDatabaseConnector({
    ...config,
    driver: "mysql2"
  });
}

export function createDatabaseConnector(config: DatabaseConfig): DatabaseConnector {
  if (config.driver === "mysql2") {
    return createMysql2Connector(config);
  }

  return createMariaDbConnector(config);
}

export function createDatabasePool(config: DatabaseConfig & DatabaseTarget): CompatibleDbPool {
  const driver = config.driver ?? "mariadb";

  if (driver === "mysql2") {
    const options: mysql.PoolOptions = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
    if (config.database) {
      options.database = config.database;
    }

    const pool = mysql.createPool(options);

    return {
      async end() {
        await pool.end();
      },
      async execute<TResult = unknown>(sql: string, values?: unknown[]) {
        const result =
          values === undefined
            ? await pool.execute(sql)
            : await pool.execute(sql, values as never[]);
        return result as unknown as [TResult, unknown];
      }
    };
  }

  const options: PoolConfig = {
    allowPublicKeyRetrieval: true,
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    connectionLimit: 10
  };
  if (config.database) {
    options.database = config.database;
  }

  const pool = mariadb.createPool(options);

  return {
    async end() {
      await pool.end();
    },
    async execute<TResult = unknown>(sql: string, values?: unknown[]) {
      const result = await pool.query(sql, values);
      return [result as TResult, undefined];
    }
  };
}

function createMysql2Connector(config: DatabaseConfig): DatabaseConnector {
  return {
    async connect(target) {
      const options: ConnectionOptions = {
        host: config.host,
        multipleStatements: false,
        password: config.password,
        port: config.port,
        user: config.user
      };

      if (target?.database) {
        options.database = target.database;
      }

      const connection = await mysql.createConnection(options);
      return connection as unknown as CompatibleDbConnection;
    }
  };
}

function createMariaDbConnector(config: DatabaseConfig): DatabaseConnector {
  return {
    async connect(target) {
      const options: ConnectionConfig = {
        allowPublicKeyRetrieval: true,
        host: config.host,
        password: config.password,
        port: config.port,
        user: config.user
      };

      if (target?.database) {
        options.database = target.database;
      }

      const connection = await mariadb.createConnection(options);

      return {
        async end() {
          await connection.end();
        },
        async execute<TResult = unknown>(sql: string, values?: unknown[]) {
          const result = await connection.query(sql, values);
          return [result as TResult, undefined];
        }
      };
    }
  };
}
