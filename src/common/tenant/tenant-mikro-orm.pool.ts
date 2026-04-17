export function quotePgIdent(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

type PgPoolConn = { query: (sql: string, cb: (err?: Error) => void) => void };
type AfterCreate = (conn: PgPoolConn, done: (err?: Error) => void) => void;

/**
  Run the query in the selected schem
 */
export function mergePoolWithTenantSearchPath(
  basePool: object | undefined,
  schemaName: string,
): object & { afterCreate: AfterCreate } {
  const base = { ...(basePool ?? {}) } as { afterCreate?: AfterCreate };
  const existingAfterCreate = base.afterCreate;

  return {
    ...base,
    afterCreate: (conn, done) => {
      conn.query(
        `SET search_path TO ${quotePgIdent(schemaName)}, public`,
        (err?: Error) => {
          if (err) {
            done(err);
            return;
          }
          if (existingAfterCreate) {
            existingAfterCreate(conn, done);
          } else {
            done();
          }
        },
      );
    },
  };
}
