import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const targetProfileName = "Test";
const profileCountsQuery = `
  select
    profile.id,
    profile.name,
    profile.sort_order,
    auth_user.id is not null as has_auth_user,
    (
      select count(*)
      from public.workout_sessions as session
      where session.performed_by = auth_user.id
        and session.status = 'completed'
    ) as completed_sessions,
    (
      select count(*)
      from public.completed_workouts as completion
      where completion.completed_by = auth_user.id
    ) as completed_workouts
  from public.profiles as profile
  left join auth.users as auth_user
    on auth_user.email = 'profile-' || profile.id::text || '@broshfit.invalid'
  order by profile.sort_order;
`;

function runSupabaseQuery(sql, { confirm = false } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const args = [
      "db",
      "query",
      "--linked",
      "--output-format",
      "json",
      ...(confirm ? ["--yes"] : []),
      "--",
      sql,
    ];
    const process = spawn("supabase", args, {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    process.stdout.setEncoding("utf8");
    process.stderr.setEncoding("utf8");
    process.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    process.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    process.on("error", (error) => {
      rejectPromise(
        new Error(
          `Could not start the Supabase CLI. Run this with npm so the project CLI is available.\n${error.message}`,
        ),
      );
    });
    process.on("close", (code) => {
      if (code !== 0) {
        rejectPromise(
          new Error(
            stderr.trim() ||
              stdout.trim() ||
              `Supabase CLI exited with status ${code}.`,
          ),
        );
        return;
      }

      resolvePromise({ stdout, stderr });
    });
  });
}

function findRows(value) {
  if (Array.isArray(value)) {
    if (
      value.length === 1 &&
      value[0] !== null &&
      typeof value[0] === "object" &&
      ["rows", "results", "data", "result"].some((key) => key in value[0])
    ) {
      return findRows(value[0]);
    }

    if (
      value.length === 0 ||
      value.every((row) => row !== null && typeof row === "object")
    ) {
      return value;
    }

    for (const item of value) {
      const rows = findRows(item);
      if (rows !== null) return rows;
    }
  } else if (value !== null && typeof value === "object") {
    for (const key of ["rows", "results", "data", "result"]) {
      if (key in value) {
        const rows = findRows(value[key]);
        if (rows !== null) return rows;
      }
    }
  }

  return null;
}

function parseQueryRows(stdout) {
  let result;

  try {
    result = JSON.parse(stdout);
  } catch {
    throw new Error(
      `Could not read the Supabase CLI's JSON response.\n${stdout.trim()}`,
    );
  }

  const rows = findRows(result);
  if (rows === null) {
    throw new Error("The Supabase CLI response did not contain query rows.");
  }

  return rows;
}

function sqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function makeCopySql(template, sourceProfileName) {
  const sourceProfileDeclaration = /^  source_profile_name text := .*;$/m;
  if (!sourceProfileDeclaration.test(template)) {
    throw new Error("Could not set the source profile in the SQL script.");
  }

  let sql = template.replace(
    sourceProfileDeclaration,
    `  source_profile_name text := ${sqlLiteral(sourceProfileName)};`,
  );

  const dryRunDeclaration = /^  apply_copy constant boolean := false;$/m;
  if (!dryRunDeclaration.test(sql)) {
    throw new Error("Could not enable the confirmed copy operation.");
  }
  sql = sql.replace(dryRunDeclaration, "  apply_copy constant boolean := true;");
  return sql;
}

function profileLabel(profile) {
  return `${profile.name} (${profile.completed_sessions} completed sessions, ${profile.completed_workouts} completion records)`;
}

async function main() {
  const { stdout, stderr } = await runSupabaseQuery(profileCountsQuery);
  if (stderr.trim()) process.stderr.write(`${stderr.trim()}\n`);

  const profiles = parseQueryRows(stdout);
  const targetProfiles = profiles.filter(
    (profile) => profile.name.trim().toLowerCase() === targetProfileName.toLowerCase(),
  );
  if (targetProfiles.length !== 1) {
    throw new Error(
      `Expected exactly one "${targetProfileName}" target profile, found ${targetProfiles.length}.`,
    );
  }

  const targetProfile = targetProfiles[0];
  if (!targetProfile.has_auth_user) {
    throw new Error(
      `The "${targetProfileName}" profile does not have its matching Auth user.`,
    );
  }

  const sourceProfiles = profiles.filter(
    (profile) =>
      profile.name.trim().toLowerCase() !== targetProfileName.toLowerCase() &&
      profile.has_auth_user,
  );
  if (sourceProfiles.length === 0) {
    throw new Error("No source profiles with matching Auth users were found.");
  }
  const sourceNames = new Set();
  for (const profile of sourceProfiles) {
    const normalizedName = profile.name.trim().toLowerCase();
    if (sourceNames.has(normalizedName)) {
      throw new Error(
        `More than one source profile is named "${profile.name}"; the SQL copy script requires unique profile names.`,
      );
    }
    sourceNames.add(normalizedName);
  }

  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  let selectedProfile;

  try {
    console.log(`\nChoose a source profile to copy into ${targetProfileName} (Ginyu):`);
    sourceProfiles.forEach((profile, index) => {
      console.log(`  ${index + 1}. ${profileLabel(profile)}`);
    });
    console.log(
      `  Target currently has ${profileLabel({
        ...targetProfile,
        name: targetProfileName,
      })}.`,
    );

    const selection = await readline.question("\nProfile number (or q to cancel): ");
    if (selection.trim().toLowerCase() === "q") {
      console.log("Cancelled; no data was changed.");
      return;
    }

    const selectedIndex = Number(selection) - 1;
    if (
      !Number.isInteger(selectedIndex) ||
      selectedIndex < 0 ||
      selectedIndex >= sourceProfiles.length
    ) {
      throw new Error("Choose one of the listed profile numbers.");
    }

    selectedProfile = sourceProfiles[selectedIndex];
    const confirmation = await readline.question(
      `\nThis will replace ${targetProfileName}'s completed history with ${selectedProfile.name}'s. Type COPY to continue: `,
    );
    if (confirmation !== "COPY") {
      console.log("Cancelled; no data was changed.");
      return;
    }
  } finally {
    readline.close();
  }

  const sqlPath = resolve(
    projectRoot,
    "supabase/scripts/copy-completed-workout-history.sql",
  );
  const sqlTemplate = await readFile(sqlPath, "utf8");
  const copySql = makeCopySql(sqlTemplate, selectedProfile.name);
  const copyResult = await runSupabaseQuery(copySql, { confirm: true });

  if (copyResult.stderr.trim()) {
    process.stderr.write(`${copyResult.stderr.trim()}\n`);
  }
  if (copyResult.stdout.trim()) {
    process.stdout.write(`${copyResult.stdout.trim()}\n`);
  }
  console.log(
    `\nCompleted history copied from ${selectedProfile.name} to ${targetProfileName}.`,
  );
}

main().catch((error) => {
  console.error(`\nWorkout history copy failed: ${error.message}`);
  process.exitCode = 1;
});
