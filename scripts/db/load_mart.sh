#!/usr/bin/env bash
# Load mart CSVs into ClickHouse by swapping tables, so the screen never sees a half-loaded table.
# For each <table>.csv: create <table>_new like <table> → insert → EXCHANGE TABLES → drop the old one.
#
# Usage (connection info comes from .env.local; never commit it):
#   set -a; source .env.local; set +a
#   scripts/db/load_mart.sh path/to/mart_csv_dir    # e.g. analysts' data/export/mart
# If REVALIDATE_URL and REVALIDATE_TOKEN are set, the Next.js cache is cleared at the end.
#
# Tables must already exist (scripts/db/mart_schema.sql). A CSV file name = its table name,
# header row = column names (CSVWithNames). NULL is written as \N.
set -euo pipefail

# No defaults on purpose: a missing variable stops the script instead of loading somewhere else.
CSV_DIR="${1:?CSV 폴더를 지정하세요 (예: scripts/db/load_mart.sh data/export/mart)}"
URL="${CLICKHOUSE_URL:?CLICKHOUSE_URL이 없습니다 (.env.local)}"
USER="${CLICKHOUSE_USER:?CLICKHOUSE_USER가 없습니다 (.env.local)}"
PASSWORD="${CLICKHOUSE_PASSWORD:-}"
DB="${CLICKHOUSE_DB:?CLICKHOUSE_DB가 없습니다 (.env.local)}"

run() {
  # SQL goes in the POST body, so it needs no URL encoding.
  curl -sS --fail-with-body --user "$USER:$PASSWORD" "$URL/?database=$DB" --data-binary "$1"
}

shopt -s nullglob
files=("$CSV_DIR"/*.csv)
if [ ${#files[@]} -eq 0 ]; then
  echo "CSV가 없습니다: $CSV_DIR" >&2
  exit 1
fi

echo "적재 대상: $URL / $DB"
for file in "${files[@]}"; do
  table="$(basename "$file" .csv)"
  run "DROP TABLE IF EXISTS ${table}_new"
  run "CREATE TABLE ${table}_new AS ${table}"
  # For INSERT the body is the data, so the query goes in the URL.
  curl -sS --fail-with-body --user "$USER:$PASSWORD" \
    "$URL/?database=$DB&query=INSERT%20INTO%20${table}_new%20FORMAT%20CSVWithNames" \
    --data-binary @"$file"
  run "EXCHANGE TABLES ${table}_new AND ${table}"
  run "DROP TABLE ${table}_new"
  rows="$(run "SELECT count() FROM ${table}")"
  echo "  ${table}: ${rows}행"
done

if [ -n "${REVALIDATE_URL:-}" ] && [ -n "${REVALIDATE_TOKEN:-}" ]; then
  echo "캐시 비우기: $REVALIDATE_URL"
  curl -sS --fail-with-body -X POST -H "x-revalidate-token: $REVALIDATE_TOKEN" "$REVALIDATE_URL"
  echo
fi
echo "완료"
