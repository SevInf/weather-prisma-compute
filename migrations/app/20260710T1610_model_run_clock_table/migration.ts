#!/usr/bin/env -S node
import { Migration, MigrationCLI, col, primaryKey } from '@prisma-next/postgres/migration';

export default class M extends Migration {
  override describe() {
    return {
      from: 'sha256:5b7560591ee16833ad8365ce8d2ece976b73e35b67f9f4a475fab15b80dfc504',
      to: 'sha256:8cdd9fa423bf6f78bfcf8f95129725ce07ce2f3289f216c5289214a1ae7e3cbe',
    };
  }

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'poiForecast', column: 'staleAt' }),
      this.createTable({
        schema: 'public',
        table: 'modelRun',
        columns: [
          col('availableAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('checkedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('model', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updateIntervalSeconds', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [primaryKey(['model'])],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'modelRun',
        constraint: 'modelRun_model_check',
        column: 'model',
        values: ['dwd_icon_d2', 'dwd_icon_eu', 'dwd_icon'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
