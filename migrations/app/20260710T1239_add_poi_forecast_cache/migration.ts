#!/usr/bin/env -S node
import { Migration, MigrationCLI, col, primaryKey } from '@prisma-next/postgres/migration';

export default class M extends Migration {
  override describe() {
    return {
      from: 'sha256:eecde426704ea1d784f61e03e451b8afb1c012b44a676cd5efc164c37f6c5ecd',
      to: 'sha256:6db32dad783ebe8c5fe3b4002e502e8cac6ab10cc4b8dc4142c035372063be2a',
    };
  }

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'poiForecast',
        columns: [
          col('fetchedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
          col('hourly', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
          col('model', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('poiId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('staleAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz@1' },
          }),
        ],
        constraints: [primaryKey(['poiId'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'poiForecast',
        index: 'poiForecast_poiId_idx',
        columns: ['poiId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'poiForecast',
        foreignKey: {
          name: 'poiForecast_poiId_fkey',
          columns: ['poiId'],
          references: { schema: 'public', table: 'poi', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
