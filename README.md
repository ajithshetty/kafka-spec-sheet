# Kafka Cluster Calculator

A single-file interactive React artifact for sizing Kafka storage, partitions, and
consumer parallelism from basic throughput inputs. Blueprint-style spec sheet UI —
no backend, no dependencies beyond React.

## What it computes

| Output | From |
|---|---|
| Sustained / peak ingest rate | `msgs/sec × avg message size`, peak = sustained × peak multiplier |
| Daily data volume | `ingest bytes/sec × 86400` |
| Retained storage (raw) | `daily volume × retention days` |
| Retained storage (with replication) | `raw retention × replication factor` |
| Storage per broker | `total storage ÷ broker count` (assumes even distribution) |
| Recommended partition count | `max(t/p, t/c, consumer count)` |
| Messages per partition per second | `msgs/sec ÷ recommended partitions` |

## Partition formula

This follows Confluent's canonical partition-sizing guidance:

```
partitions = max(t/p, t/c, consumer_count)
```

- **t** — target peak throughput (bytes/sec)
- **p** — throughput one partition can sustain on the *produce* side
- **c** — throughput one consumer instance can sustain on the *consume* side, per partition
- **consumer_count** — a hard floor, since partition count is the ceiling on
  useful consumer parallelism (extra consumers beyond partition count sit idle)

The calculator shows all three sub-results (produce-bound, consume-bound,
consumer-count floor) so you can see which one is actually driving the
recommendation, rather than just the max.

## Inputs

**Message throughput**
- Messages per second
- Average message size (KB)
- Peak multiplier — spikes above steady-state; affects partition sizing, not storage

**Retention & storage**
- Retention period (days)
- Replication factor
- Broker count

**Partitions & consumers**
- Consumer group size (instances)
- Throughput per partition — produce (MB/s)
- Throughput per partition — consume (MB/s)

## Known assumptions & limitations

Read this before trusting the numbers for a real sizing decision:

- **Storage is uncompressed and unindexed.** No adjustment for compression codec,
  Kafka's own index/log-segment overhead, or per-record protocol overhead
  (headers, keys). Compression alone can cut real disk usage 2–4x depending on
  codec and payload; this tool won't reflect that.
- **Partition throughput defaults are rules of thumb, not measurements.**
  10 MB/s per partition is conservative — Confluent's own docs just say "tens
  of MB/s," and modern brokers with tuning often exceed 50–100 MB/s per
  partition. Benchmark your actual produce/consume path and update the fields;
  don't trust the defaults for capacity planning.
- **Consume throughput is about your application, not Kafka.** It's bounded by
  whatever your consumer does per message — DB writes, downstream API calls,
  transforms. If that's slow, it will be the binding constraint before produce
  throughput or idle-consumer math ever come into play.
- **Assumes even distribution.** Storage-per-broker and messages-per-partition
  assume balanced partition placement and uniform key distribution. Real-world
  key skew (hot keys, uneven partitioning) will unbalance both.
- **Doesn't model partition-count ceilings.** Very high partition counts hit
  real limits this tool ignores entirely: file descriptors (roughly two per
  log segment per partition), `vm.max_map_count`, controller/metadata
  overhead, and longer leader-election/recovery times during broker restarts.
  Don't treat "more partitions" as free just because the throughput formula
  says so.
- **Peak multiplier is a manual estimate.** There's no traffic-pattern modeling
  behind it — it's whatever multiple of sustained throughput you expect during
  spikes, entered by hand.

## Usage

This is a self-contained React component (`kafka-calculator.jsx`) with no
external state or API calls — safe to drop into any React environment or
render directly as a Claude artifact. All calculation logic lives in a single
`useMemo` block if you want to adapt the formulas or add fields (e.g. a
compression ratio input)