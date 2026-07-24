#!/usr/bin/env -S node
import { Migration, MigrationCLI } from '@prisma-next/postgres/migration';

export default class M extends Migration {
  override describe() {
    return {
      from: 'sha256:6db32dad783ebe8c5fe3b4002e502e8cac6ab10cc4b8dc4142c035372063be2a',
      to: 'sha256:5b7560591ee16833ad8365ce8d2ece976b73e35b67f9f4a475fab15b80dfc504',
    };
  }

  override get operations() {
    return [
      this.addCheckConstraint({
        schema: 'public',
        table: 'poiForecast',
        constraint: 'poiForecast_model_check',
        column: 'model',
        values: ['dwd_icon_d2', 'dwd_icon_eu', 'dwd_icon'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
