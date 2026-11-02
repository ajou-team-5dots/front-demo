-- Mart tables the dashboard reads (spec: 분석 저장소 docs/backend/api_spec.md 2장).
-- Analysts compute every row; the screen only reads. No wallet address, playerId, actorId,
-- actor_hash, chat text or transaction hash may appear in any table.
-- Every mart carries heavy ('incl'/'excl') and, where it applies, period ('current'/'all').
-- No database name here: run it against CLICKHOUSE_DB (see docs/BACKEND_GUIDE.md).
-- The analyst/backend owner applies this on the server; the app itself never runs DDL.

CREATE TABLE IF NOT EXISTS dim_monster
(
    monster_id    String,
    role          LowCardinality(String), -- normal / midboss / boss
    grade         LowCardinality(String), -- weak / medium / strong / -
    dungeon_stage UInt8,
    is_boss       UInt8,
    peer_group    String                  -- e.g. midboss/medium
)
ENGINE = MergeTree ORDER BY monster_id;

CREATE TABLE IF NOT EXISTS dim_patch
(
    patch_id         String,
    applied_at       DateTime,
    title            String,
    changed_monsters Array(String)
)
ENGINE = MergeTree ORDER BY patch_id;

CREATE TABLE IF NOT EXISTS mart_monster_summary
(
    monster_id          String,
    period              LowCardinality(String),
    heavy               LowCardinality(String),
    period_from         Date,
    period_to           Date,
    encounters          UInt32,
    deaths              UInt32,
    expected_risk_ratio Float32,
    risk_rank           UInt16
)
ENGINE = MergeTree ORDER BY (period, heavy, monster_id);

CREATE TABLE IF NOT EXISTS mart_profile
(
    monster_id  String,
    period      LowCardinality(String),
    heavy       LowCardinality(String),
    axis        LowCardinality(String), -- race_med / hits_med / hpcost_mean / escape_rate / avoid_rate
    value       Float32,
    peer_median Float32,
    z           Float32
)
ENGINE = MergeTree ORDER BY (period, heavy, monster_id, axis);

CREATE TABLE IF NOT EXISTS mart_h1_readiness
(
    monster_id   String,
    period       LowCardinality(String),
    heavy        LowCardinality(String),
    condition    LowCardinality(String), -- low_level / no_weapon / wood_weapon / no_armor
    killer_share Float32,
    death_share  Float32,
    diff_pp      Float32,
    rate_cond    Nullable(Float32),
    rate_ready   Nullable(Float32),
    rate_ratio   Nullable(Float32),      -- NULL when the denominator is 0
    enc_cond     UInt32,
    death_cond   UInt32,
    enc_ready    UInt32,
    death_ready  UInt32
)
ENGINE = MergeTree ORDER BY (period, heavy, monster_id, condition);

CREATE TABLE IF NOT EXISTS mart_h2_patch
(
    monster_id   String,
    patch_id     String,
    heavy        LowCardinality(String),
    status       LowCardinality(String), -- changed / unchanged / low_sample / no_control
    intent_check UInt8,
    pre_enc      UInt32,
    pre_risk     UInt32,
    post_enc     UInt32,
    post_risk    UInt32,
    pre_per100   Float32,
    post_per100  Float32,
    adj_ratio    Nullable(Float32),      -- NULL when the sample is too small
    adj_lo       Nullable(Float32),
    adj_hi       Nullable(Float32),
    group_ratio  Nullable(Float32)
)
ENGINE = MergeTree ORDER BY (heavy, patch_id, monster_id);

CREATE TABLE IF NOT EXISTS mart_h2_daily
(
    monster_id  String,
    heavy       LowCardinality(String),
    day         Date,
    encounters  UInt32,
    risk_events UInt32
)
ENGINE = MergeTree ORDER BY (heavy, monster_id, day);

CREATE TABLE IF NOT EXISTS mart_h3_skill
(
    boss_id     String,
    skill_id    String,
    heavy       LowCardinality(String),
    window_sec  UInt8,                   -- 5 or 2
    death_with  UInt32,
    death_total UInt32,
    surv_with   UInt32,
    surv_total  UInt32,
    diff_pp     Float32,
    status      LowCardinality(String)   -- signal / none / low_sample
)
ENGINE = MergeTree ORDER BY (heavy, boss_id, skill_id, window_sec);

CREATE TABLE IF NOT EXISTS mart_h3_timeline
(
    boss_id   String,
    heavy     LowCardinality(String),
    death_seq UInt32,                    -- 1-based order. Never an account id
    skill_id  String,
    offset_ms Int32                      -- negative: ms before the death
)
ENGINE = MergeTree ORDER BY (heavy, boss_id, death_seq, offset_ms);

CREATE TABLE IF NOT EXISTS mart_aux
(
    monster_id        String,
    period            LowCardinality(String),
    heavy             LowCardinality(String),
    unanswered_deaths UInt32,
    deaths            UInt32,
    big_hit_enc       Nullable(UInt32),  -- bosses only
    damaged_enc       Nullable(UInt32)
)
ENGINE = MergeTree ORDER BY (period, heavy, monster_id);

CREATE TABLE IF NOT EXISTS mart_flow
(
    period        LowCardinality(String),
    heavy         LowCardinality(String),
    level_bucket  LowCardinality(String), -- low / mid / high
    weapon_bucket LowCardinality(String), -- none / wood / other
    armor_bucket  LowCardinality(String), -- none / some
    monster_group String,
    encounters    UInt32,
    deaths        UInt32
)
ENGINE = MergeTree ORDER BY (period, heavy, level_bucket, weapon_bucket, armor_bucket, monster_group);
