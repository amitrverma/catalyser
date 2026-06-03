import pg from 'pg';

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function scalar(sql) {
  const result = await client.query(sql);
  return result.rows[0];
}

async function columnType(tableName, columnName) {
  const result = await client.query(
    `
      select data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
        and column_name = $2
    `,
    [tableName, columnName],
  );
  return result.rows[0]?.data_type || null;
}

await client.connect();

const counts = {};
for (const tableName of ['projects', 'contacts', 'payments', 'documents', 'company_settings', 'staff_salaries']) {
  counts[tableName] = Number((await scalar(`select count(*) as count from public.${tableName}`)).count);
}

const idTypes = {};
for (const tableName of ['projects', 'contacts', 'payments', 'documents']) {
  idTypes[tableName] = await columnType(tableName, 'id');
}

const projectRefTypes = {
  payments_project_id: await columnType('payments', 'project_id'),
  documents_project_id: await columnType('documents', 'project_id'),
};

const orphanChecks = {
  payments: Number(
    (
      await scalar(`
        select count(*) as count
        from public.payments payment
        left join public.projects project on project.id = payment.project_id
        where project.id is null
      `)
    ).count,
  ),
  documents: Number(
    (
      await scalar(`
        select count(*) as count
        from public.documents document
        left join public.projects project on project.id = document.project_id
        where project.id is null
      `)
    ).count,
  ),
};

const constraints = await client.query(`
  select conname, contype
  from pg_constraint
  where conrelid in ('public.projects'::regclass, 'public.contacts'::regclass, 'public.payments'::regclass, 'public.documents'::regclass)
  order by conname
`);

console.log(
  JSON.stringify(
    {
      counts,
      idTypes,
      projectRefTypes,
      orphanChecks,
      constraints: constraints.rows,
    },
    null,
    2,
  ),
);

await client.end();
