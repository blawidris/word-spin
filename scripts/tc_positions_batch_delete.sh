#!/usr/bin/env bash
# Batch deletion script for Aurora MySQL (RDS)
# Keeps a date range and deletes everything else in batches.

set -euo pipefail
IFS=$'\n\t'

VERSION="v5.1"

DEFAULT_TABLE="tc_positions"
DEFAULT_TIME_COLUMN="devicetime"
DEFAULT_KEEP_START="2026-01-01 00:00:00"
DEFAULT_KEEP_END="2026-02-01 08:00:00"
DEFAULT_BATCH_SIZE=100000
DEFAULT_SLEEP=1
DEFAULT_MAX_RETRIES=3
DEFAULT_SSL_MODE="REQUIRED"

DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-}"
DB_USER="${DB_USER:-}"
DB_PASS="${DB_PASS:-}"

TABLE_NAME="${TABLE_NAME:-$DEFAULT_TABLE}"
TIME_COLUMN="${TIME_COLUMN:-$DEFAULT_TIME_COLUMN}"
KEEP_START="${KEEP_START:-$DEFAULT_KEEP_START}"
KEEP_END="${KEEP_END:-$DEFAULT_KEEP_END}"
KEEP_START_MONTH="${KEEP_START_MONTH:-}"
KEEP_END_MONTH="${KEEP_END_MONTH:-}"
BATCH_SIZE="${BATCH_SIZE:-$DEFAULT_BATCH_SIZE}"
SLEEP_BETWEEN_BATCHES="${SLEEP_BETWEEN_BATCHES:-$DEFAULT_SLEEP}"
MAX_RETRIES="${MAX_RETRIES:-$DEFAULT_MAX_RETRIES}"
SSL_MODE="${SSL_MODE:-$DEFAULT_SSL_MODE}"
SSL_CA="${SSL_CA:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-$SCRIPT_DIR/deletion_logs}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
LOG_FILE="${LOG_DIR}/deletion_${TIMESTAMP}.log"

MYSQL_CMD=""
MYSQL_CNF=""

USE_IAM="false"
AWS_REGION_OVERRIDE="${AWS_REGION_OVERRIDE:-}"
DRY_RUN="false"
AUTO_CONFIRM="false"
PASSWORD_FILE=""
PROMPT_PASSWORD="false"
KEEP_RANGE_SOURCE="explicit"

usage() {
    cat <<'EOF'
Usage: tc_positions_batch_delete.sh [options]

Required:
  --db-host HOST
  --db-name NAME
  --db-user USER

Auth options (choose one):
  --prompt-password           Prompt for DB password (recommended)
  --password-file FILE        Read DB password from file
  --iam                       Use IAM auth (requires aws cli)

Optional:
  --db-port PORT              Default: 3306
  --table NAME                Default: tc_positions
  --time-column COLUMN        Default: devicetime
  --keep-start "YYYY-MM-DD HH:MM:SS"
  --keep-end   "YYYY-MM-DD HH:MM:SS"
  --keep-start-month "YYYY-MM"
  --keep-end-month   "YYYY-MM"
    If month options are used, the keep range is:
      start = first day of start month 00:00:00
      end   = first day of month after end month 00:00:00 (exclusive)
  --batch-size N              Default: 100000
  --sleep SECONDS             Default: 1
  --max-retries N             Default: 3
  --ssl-mode MODE             Default: REQUIRED (DISABLED|PREFERRED|REQUIRED|VERIFY_CA|VERIFY_IDENTITY)
  --ssl-ca PATH               CA bundle for VERIFY_CA / VERIFY_IDENTITY
  --aws-region REGION         If using --iam, otherwise optional
  --dry-run                   Show counts only, no deletes
  --yes                       Skip confirmation prompt
  --log-dir DIR               Default: ./deletion_logs

Environment alternatives:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
  TABLE_NAME, TIME_COLUMN, KEEP_START, KEEP_END
  KEEP_START_MONTH, KEEP_END_MONTH
  BATCH_SIZE, SLEEP_BETWEEN_BATCHES, MAX_RETRIES
  SSL_MODE, SSL_CA
EOF
}

log() {
    local level="$1"
    shift
    local ts
    ts="$(date +'%Y-%m-%d %H:%M:%S')"
    printf '[%s] [%s] %s\n' "$ts" "$level" "$*" | tee -a "$LOG_FILE"
}

log_warn() { log "WARN" "$@"; }
log_info() { log "INFO" "$@"; }
log_error() { log "ERROR" "$@" >&2; }

die() {
    log_error "$*"
    exit 1
}

require_cmd() {
    command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

format_number() {
    printf "%'d" "$1" 2>/dev/null || printf "%s" "$1"
}

validate_year_month() {
    local ym="$1"
    [[ "$ym" =~ ^[0-9]{4}-[0-9]{2}$ ]] || return 1
    date -d "${ym}-01" +%Y-%m-%d >/dev/null 2>&1
}

resolve_keep_range() {
    if [[ -n "$KEEP_START_MONTH" || -n "$KEEP_END_MONTH" ]]; then
        require_cmd date
        if [[ -z "$KEEP_START_MONTH" || -z "$KEEP_END_MONTH" ]]; then
            die "Both --keep-start-month and --keep-end-month are required when using month-based ranges."
        fi
        validate_year_month "$KEEP_START_MONTH" || die "Invalid --keep-start-month. Use YYYY-MM."
        validate_year_month "$KEEP_END_MONTH" || die "Invalid --keep-end-month. Use YYYY-MM."

        local start_epoch
        local end_epoch
        start_epoch="$(date -d "${KEEP_START_MONTH}-01 00:00:00" +%s)"
        end_epoch="$(date -d "${KEEP_END_MONTH}-01 00:00:00" +%s)"
        if [[ "$end_epoch" -lt "$start_epoch" ]]; then
            die "--keep-end-month must be the same as or after --keep-start-month."
        fi

        KEEP_START="$(date -d "${KEEP_START_MONTH}-01" '+%Y-%m-%d 00:00:00')"
        KEEP_END="$(date -d "${KEEP_END_MONTH}-01 +1 month" '+%Y-%m-%d 00:00:00')"
        KEEP_RANGE_SOURCE="month ${KEEP_START_MONTH}..${KEEP_END_MONTH} (end exclusive)"
    fi
}

validate_keep_range() {
    require_cmd date
    [[ -n "$KEEP_START" && -n "$KEEP_END" ]] || die "KEEP_START and KEEP_END must be set."
    local start_epoch
    local end_epoch
    start_epoch="$(date -d "$KEEP_START" +%s 2>/dev/null)" || die "Invalid KEEP_START format."
    end_epoch="$(date -d "$KEEP_END" +%s 2>/dev/null)" || die "Invalid KEEP_END format."
    if [[ "$end_epoch" -le "$start_epoch" ]]; then
        die "KEEP_END must be after KEEP_START."
    fi
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --db-host) DB_HOST="$2"; shift 2 ;;
            --db-port) DB_PORT="$2"; shift 2 ;;
            --db-name) DB_NAME="$2"; shift 2 ;;
            --db-user) DB_USER="$2"; shift 2 ;;
            --password) DB_PASS="$2"; shift 2 ;;
            --password-file) PASSWORD_FILE="$2"; shift 2 ;;
            --prompt-password) PROMPT_PASSWORD="true"; shift ;;
            --table) TABLE_NAME="$2"; shift 2 ;;
            --time-column) TIME_COLUMN="$2"; shift 2 ;;
            --keep-start) KEEP_START="$2"; shift 2 ;;
            --keep-end) KEEP_END="$2"; shift 2 ;;
            --keep-start-month) KEEP_START_MONTH="$2"; shift 2 ;;
            --keep-end-month) KEEP_END_MONTH="$2"; shift 2 ;;
            --batch-size) BATCH_SIZE="$2"; shift 2 ;;
            --sleep) SLEEP_BETWEEN_BATCHES="$2"; shift 2 ;;
            --max-retries) MAX_RETRIES="$2"; shift 2 ;;
            --ssl-mode) SSL_MODE="$2"; shift 2 ;;
            --ssl-ca) SSL_CA="$2"; shift 2 ;;
            --aws-region) AWS_REGION_OVERRIDE="$2"; shift 2 ;;
            --iam) USE_IAM="true"; shift ;;
            --dry-run) DRY_RUN="true"; shift ;;
            --yes|--confirm) AUTO_CONFIRM="true"; shift ;;
            --log-dir) LOG_DIR="$2"; shift 2 ;;
            -h|--help) usage; exit 0 ;;
            *) die "Unknown argument: $1" ;;
        esac
    done
}

detect_mysql() {
    if command -v mysql >/dev/null 2>&1; then
        MYSQL_CMD="$(command -v mysql)"
        return 0
    fi
    return 1
}

load_password() {
    if [[ -n "$PASSWORD_FILE" ]]; then
        [[ -f "$PASSWORD_FILE" ]] || die "Password file not found: $PASSWORD_FILE"
        DB_PASS="$(tr -d '\r\n' < "$PASSWORD_FILE")"
    fi

    if [[ "$PROMPT_PASSWORD" == "true" && -z "$DB_PASS" ]]; then
        read -r -s -p "Enter DB password: " DB_PASS
        echo ""
    fi
}

region_from_host() {
    local host="$1"
    local region=""
    region="$(echo "$host" | awk -F. '{
        for (i=1;i<=NF;i++) {
            if ($i ~ /^[a-z]{2}-[a-z]+-[0-9]+$/) { print $i; exit }
        }
    }')"
    echo "$region"
}

generate_iam_token() {
    require_cmd aws
    local region="${AWS_REGION_OVERRIDE:-${AWS_REGION:-${AWS_DEFAULT_REGION:-}}}"
    if [[ -z "$region" ]]; then
        region="$(region_from_host "$DB_HOST")"
    fi
    [[ -n "$region" ]] || die "AWS region not set. Use --aws-region or AWS_REGION."
    aws rds generate-db-auth-token \
        --hostname "$DB_HOST" \
        --port "$DB_PORT" \
        --username "$DB_USER" \
        --region "$region"
}

create_mysql_cnf() {
    MYSQL_CNF="$(mktemp "/tmp/.mysql_delete.${TIMESTAMP}.XXXXXX.cnf")"
    cat > "$MYSQL_CNF" <<EOF
[client]
host=$DB_HOST
port=$DB_PORT
user=$DB_USER
database=$DB_NAME
connect-timeout=30
ssl-mode=$SSL_MODE
EOF
    if [[ -n "$SSL_CA" ]]; then
        echo "ssl-ca=$SSL_CA" >> "$MYSQL_CNF"
    fi
    if [[ "$USE_IAM" != "true" ]]; then
        printf 'password=%s\n' "$DB_PASS" >> "$MYSQL_CNF"
    fi
    chmod 600 "$MYSQL_CNF"
}

cleanup() {
    if [[ -n "$MYSQL_CNF" && -f "$MYSQL_CNF" ]]; then
        rm -f "$MYSQL_CNF"
    fi
}
trap cleanup EXIT

mysql_exec() {
    local query="$1"
    local args=(--defaults-file="$MYSQL_CNF" --batch --skip-column-names --silent --protocol=TCP)
    local output
    local err
    err="$(mktemp)"

    if [[ "$USE_IAM" == "true" ]]; then
        local token
        token="$(generate_iam_token)"
        if output=$(MYSQL_PWD="$token" "$MYSQL_CMD" "${args[@]}" --enable-cleartext-plugin -e "$query" 2>"$err"); then
            rm -f "$err"
            printf '%s\n' "$output"
            return 0
        fi
    else
        if output=$("$MYSQL_CMD" "${args[@]}" -e "$query" 2>"$err"); then
            rm -f "$err"
            printf '%s\n' "$output"
            return 0
        fi
    fi

    local err_msg
    err_msg="$(<"$err")"
    rm -f "$err"
    log_error "MySQL error: $err_msg"
    return 1
}

validate_config() {
    [[ -n "$DB_HOST" ]] || die "DB_HOST is required"
    [[ -n "$DB_NAME" ]] || die "DB_NAME is required"
    [[ -n "$DB_USER" ]] || die "DB_USER is required"

    if [[ "$USE_IAM" == "true" ]]; then
        if [[ "$SSL_MODE" == "DISABLED" ]]; then
            die "IAM auth requires SSL. Set --ssl-mode REQUIRED."
        fi
    else
        [[ -n "$DB_PASS" ]] || die "DB_PASS is required (or use --prompt-password / --password-file)"
    fi

    [[ "$BATCH_SIZE" =~ ^[0-9]+$ ]] || die "BATCH_SIZE must be numeric"
    [[ "$MAX_RETRIES" =~ ^[0-9]+$ ]] || die "MAX_RETRIES must be numeric"
    [[ "$SLEEP_BETWEEN_BATCHES" =~ ^[0-9]+$ ]] || die "SLEEP_BETWEEN_BATCHES must be numeric"
}

test_connection() {
    log_info "Testing database connection..."
    if mysql_exec "SELECT 1" >/dev/null; then
        log_info "Connection ok."
        return 0
    fi
    log_error "Failed to connect to database."
    log_error "If you see ERROR 1045: check user/host grants and password handling."
    return 1
}

verify_table() {
    log_info "Checking table and column..."
    if ! mysql_exec "SHOW TABLES LIKE '$TABLE_NAME'" | grep -q "$TABLE_NAME"; then
        die "Table not found: $TABLE_NAME"
    fi
    if ! mysql_exec "SHOW COLUMNS FROM $TABLE_NAME LIKE '$TIME_COLUMN'" | grep -q "$TIME_COLUMN"; then
        die "Column not found: $TIME_COLUMN"
    fi
}

check_index() {
    local count
    count="$(mysql_exec "
        SELECT COUNT(*)
        FROM information_schema.statistics
        WHERE table_schema = '$DB_NAME'
          AND table_name = '$TABLE_NAME'
          AND column_name = '$TIME_COLUMN';
    ")"
    if [[ "${count:-0}" -eq 0 ]]; then
        log_warn "No index on $TIME_COLUMN. Batch deletes may be slow."
    fi
}

get_stats() {
    local stats
    stats="$(mysql_exec "
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN $TIME_COLUMN < '$KEEP_START' THEN 1 ELSE 0 END) AS old_rows,
            SUM(CASE WHEN $TIME_COLUMN >= '$KEEP_END' THEN 1 ELSE 0 END) AS future_rows,
            SUM(CASE WHEN $TIME_COLUMN >= '$KEEP_START' AND $TIME_COLUMN < '$KEEP_END' THEN 1 ELSE 0 END) AS keep_rows
        FROM $TABLE_NAME;
    ")"
    IFS=$'\t' read -r TOTAL_ROWS OLD_ROWS FUTURE_ROWS KEEP_ROWS <<< "$stats"
}

delete_batch() {
    local condition="$1"
    local order="$2"
    local limit="$3"
    local output
    output="$(mysql_exec "DELETE FROM $TABLE_NAME WHERE $condition ORDER BY $TIME_COLUMN $order LIMIT $limit; SELECT ROW_COUNT();")"
    echo "$output" | awk 'END{print $1}'
}

delete_phase() {
    local condition="$1"
    local order="$2"
    local target="$3"
    local label="$4"

    if [[ "$target" -eq 0 ]]; then
        log_info "No $label data to delete."
        echo "0"
        return 0
    fi

    log_info "Deleting $label data in batches of $(format_number "$BATCH_SIZE")..."
    local total_deleted=0
    local batch=0
    local start_ts
    start_ts="$(date +%s)"

    while true; do
        batch=$((batch + 1))
        local attempt=0
        local affected=""
        local success="false"

        while [[ $attempt -lt $MAX_RETRIES ]]; do
            attempt=$((attempt + 1))
            if affected="$(delete_batch "$condition" "$order" "$BATCH_SIZE")"; then
                success="true"
                break
            fi
            log_warn "Batch $batch failed (attempt $attempt/$MAX_RETRIES). Retrying..."
            sleep $((attempt * 2))
        done

        if [[ "$success" != "true" ]]; then
            die "Batch $batch failed after $MAX_RETRIES attempts."
        fi

        if [[ "${affected:-0}" -eq 0 ]]; then
            break
        fi

        total_deleted=$((total_deleted + affected))
        local elapsed
        elapsed=$(( $(date +%s) - start_ts ))
        local rate=0
        if [[ $elapsed -gt 0 ]]; then
            rate=$(( total_deleted / elapsed ))
        fi
        local percent
        percent="$(awk "BEGIN {printf \"%.2f\", ($total_deleted * 100.0 / $target)}")"
        log_info "Batch $batch | Deleted: $(format_number "$total_deleted")/$(format_number "$target") | ${percent}% | Rate: $(format_number "$rate")/s"

        sleep "$SLEEP_BETWEEN_BATCHES"
    done

    echo "$total_deleted"
}

main() {
    parse_args "$@"

    mkdir -p "$LOG_DIR"

    require_cmd awk
    if ! detect_mysql; then
        die "mysql client not found. Install mysql-client and retry."
    fi

    load_password
    resolve_keep_range
    validate_keep_range
    validate_config
    create_mysql_cnf

    log_info "Batch deletion script $VERSION"
    log_info "Host: $DB_HOST"
    log_info "Database: $DB_NAME"
    log_info "Table: $TABLE_NAME"
    log_info "Time column: $TIME_COLUMN"
    log_info "Keep range: $KEEP_START to $KEEP_END ($KEEP_RANGE_SOURCE)"
    log_info "Batch size: $(format_number "$BATCH_SIZE")"
    log_info "SSL mode: $SSL_MODE"
    log_info "Log file: $LOG_FILE"

    test_connection || exit 1
    verify_table
    check_index
    get_stats

    log_info "Total rows:   $(format_number "$TOTAL_ROWS")"
    log_info "Old rows:     $(format_number "$OLD_ROWS")"
    log_info "Future rows:  $(format_number "$FUTURE_ROWS")"
    log_info "Keep rows:    $(format_number "$KEEP_ROWS")"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Dry run requested. Exiting without deletes."
        exit 0
    fi

    if [[ "$AUTO_CONFIRM" != "true" ]]; then
        echo ""
        read -r -p "Type 'DELETE' to proceed: " reply
        if [[ "$reply" != "DELETE" ]]; then
            log_info "Aborted by user."
            exit 0
        fi
    fi

    local old_deleted
    local future_deleted
    old_deleted="$(delete_phase "$TIME_COLUMN < '$KEEP_START'" "ASC" "$OLD_ROWS" "old")"
    future_deleted="$(delete_phase "$TIME_COLUMN >= '$KEEP_END'" "DESC" "$FUTURE_ROWS" "future")"

    log_info "Deletion completed."
    log_info "Old deleted:    $(format_number "$old_deleted")"
    log_info "Future deleted: $(format_number "$future_deleted")"
}

main "$@"
