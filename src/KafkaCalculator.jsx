import React, { useMemo, useState } from "react";

// ---- Blueprint tokens ----
// bg: #0B1220 (deep blueprint navy) / grid: #1B2A44 / accent: #64D9C7 (cyan-mint) / warn: #E8A33D (amber)
// display face: ui-monospace stack throughout (this is a spec sheet, not prose)

const fmt = (n, d = 1) => {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(d) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(d) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(d) + "K";
  return n.toFixed(d);
};

const bytesFmt = (bytes) => {
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 2 : 1)} ${units[i]}`;
};

function Field({ label, unit, value, onChange, min = 0, step = 1, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <label
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7C93B8",
          }}
        >
          {label}
        </label>
        {unit && (
          <span style={{ fontSize: 11, color: "#4A5D7E", fontFamily: "ui-monospace, monospace" }}>
            {unit}
          </span>
        )}
      </div>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
        style={{
          width: "100%",
          background: "#0F1B30",
          border: "1px solid #22314F",
          borderRadius: 4,
          color: "#E9EEF7",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 18,
          padding: "10px 12px",
          outline: "none",
          boxSizing: "border-box",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#64D9C7")}
        onBlur={(e) => (e.target.style.borderColor = "#22314F")}
      />
      {hint && (
        <div style={{ fontSize: 11, color: "#4A5D7E", marginTop: 4, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Readout({ label, value, sub, flag }) {
  const color = flag === "warn" ? "#E8A33D" : flag === "bad" ? "#E85D5D" : "#64D9C7";
  return (
    <div
      style={{
        borderLeft: `2px solid ${flag ? color : "#22314F"}`,
        paddingLeft: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#5C7297",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 22,
          color: flag ? color : "#E9EEF7",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#5C7297", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Section({ n, title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            color: "#3A4C6E",
            border: "1px solid #22314F",
            borderRadius: 3,
            padding: "2px 6px",
          }}
        >
          {n}
        </span>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#9AB0D4",
            fontWeight: 600,
          }}
        >
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: "#1B2A44" }} />
      </div>
      {children}
    </div>
  );
}

export default function KafkaCalculator() {
  const [msgPerSec, setMsgPerSec] = useState(5000);
  const [msgSizeKB, setMsgSizeKB] = useState(1);
  const [retentionDays, setRetentionDays] = useState(7);
  const [replication, setReplication] = useState(3);
  const [brokers, setBrokers] = useState(3);
  const [consumers, setConsumers] = useState(6);
  const [partitionThroughputMB, setPartitionThroughputMB] = useState(10);
  const [consumeThroughputMB, setConsumeThroughputMB] = useState(10);
  const [peakMultiplier, setPeakMultiplier] = useState(3);

  const calc = useMemo(() => {
    const bytesPerMsg = msgSizeKB * 1024;
    const ingestBytesPerSec = msgPerSec * bytesPerMsg;
    const peakBytesPerSec = ingestBytesPerSec * peakMultiplier;
    const dailyBytes = ingestBytesPerSec * 86400;
    const rawRetentionBytes = dailyBytes * retentionDays;
    const totalStorageBytes = rawRetentionBytes * replication;
    const perBrokerBytes = brokers > 0 ? totalStorageBytes / brokers : 0;

    const partitionThroughputBytes = partitionThroughputMB * 1024 * 1024;
    const consumeThroughputBytes = consumeThroughputMB * 1024 * 1024;

    const partitionsForProduce = Math.max(
      1,
      Math.ceil(peakBytesPerSec / partitionThroughputBytes)
    );
    const partitionsForConsume = Math.max(
      1,
      Math.ceil(peakBytesPerSec / consumeThroughputBytes)
    );
    const partitionsForConsumers = Math.max(1, consumers);
    const recommendedPartitions = Math.max(
      partitionsForProduce,
      partitionsForConsume,
      partitionsForConsumers
    );

    const idleConsumers = Math.max(0, consumers - recommendedPartitions);
    const msgsPerPartitionPerSec = msgPerSec / recommendedPartitions;

    return {
      ingestBytesPerSec,
      peakBytesPerSec,
      dailyBytes,
      rawRetentionBytes,
      totalStorageBytes,
      perBrokerBytes,
      partitionsForProduce,
      partitionsForConsume,
      partitionsForConsumers,
      recommendedPartitions,
      idleConsumers,
      msgsPerPartitionPerSec,
    };
  }, [
    msgPerSec,
    msgSizeKB,
    retentionDays,
    replication,
    brokers,
    consumers,
    partitionThroughputMB,
    consumeThroughputMB,
    peakMultiplier,
  ]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(#0B1220,#0B1220), repeating-linear-gradient(0deg, transparent, transparent 31px, #12203A 31px, #12203A 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, #12203A 31px, #12203A 32px)",
        color: "#E9EEF7",
        padding: "28px 18px 60px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      }}
    >
      <style>{`
        .kc-layout { max-width: 1040px; margin: 0 auto; }
        .kc-grid { display: grid; grid-template-columns: 1fr; gap: 32px; }
        .kc-results { position: static; }
        @media (min-width: 800px) {
          .kc-grid { grid-template-columns: minmax(320px, 400px) 1fr; align-items: start; }
          .kc-results { position: sticky; top: 24px; }
        }
      `}</style>
      <div className="kc-layout">
        {/* Header */}
        <div style={{ marginBottom: 30 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: "#4A5D7E",
              marginBottom: 6,
            }}
          >
            SPEC-SHEET // KAFKA-CLUSTER
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#F2F6FC", letterSpacing: "-0.01em" }}>
            Kafka Cluster Calculator
          </div>
          <div style={{ fontSize: 12.5, color: "#6C82A8", marginTop: 6, lineHeight: 1.5 }}>
            Size storage, partitions, and consumer parallelism from throughput inputs.
            Rule-of-thumb estimates — validate against real produce/consume benchmarks.
          </div>
        </div>

        <div className="kc-grid">
          {/* LEFT: Config */}
          <div>
            <Section n="01" title="Message Throughput">
              <Field
                label="Messages per second"
                unit="msg/s"
                value={msgPerSec}
                onChange={setMsgPerSec}
                step={100}
              />
              <Field
                label="Average message size"
                unit="KB"
                value={msgSizeKB}
                onChange={setMsgSizeKB}
                step={0.1}
              />
              <Field
                label="Peak multiplier"
                unit="× sustained"
                value={peakMultiplier}
                onChange={setPeakMultiplier}
                step={0.5}
                hint="Traffic spikes above steady-state — drives partition sizing, not storage."
              />
            </Section>

            <Section n="02" title="Retention & Storage">
              <Field
                label="Retention period"
                unit="days"
                value={retentionDays}
                onChange={setRetentionDays}
                step={1}
              />
              <Field
                label="Replication factor"
                unit="copies"
                value={replication}
                onChange={setReplication}
                min={1}
                step={1}
              />
              <Field
                label="Broker count"
                unit="brokers"
                value={brokers}
                onChange={setBrokers}
                min={1}
                step={1}
              />
            </Section>

            <Section n="03" title="Partitions & Consumers">
              <Field
                label="Consumer group size"
                unit="instances"
                value={consumers}
                onChange={setConsumers}
                min={1}
                step={1}
                hint="Max useful parallelism = partition count. Extra consumers sit idle."
              />
              <Field
                label="Throughput per partition (produce)"
                unit="MB/s"
                value={partitionThroughputMB}
                onChange={setPartitionThroughputMB}
                step={1}
                hint="How fast one partition can accept writes. Confluent's own guidance is just 'tens of MB/s' — benchmark on your hardware rather than trust a default. 10 is conservative; modern brokers with tuning often hit 50–100+."
              />
              <Field
                label="Throughput per partition (consume)"
                unit="MB/s"
                value={consumeThroughputMB}
                onChange={setConsumeThroughputMB}
                step={1}
                hint="How fast a single consumer instance can process one partition's messages — bounded by your application logic (DB writes, API calls, transforms), not by Kafka. If consumption is slow, this constraint bites before the produce or idle-consumer ones. Measure it; don't guess."
              />
            </Section>
          </div>

          {/* RIGHT: Results */}
          <div className="kc-results">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 11,
                  color: "#3A4C6E",
                  border: "1px solid #22314F",
                  borderRadius: 3,
                  padding: "2px 6px",
                }}
              >
                OUT
              </span>
              <span
                style={{
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#9AB0D4",
                  fontWeight: 600,
                }}
              >
                Results
              </span>
              <div style={{ flex: 1, height: 1, background: "#1B2A44" }} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px 16px",
                marginBottom: 24,
              }}
            >
              <Readout label="Sustained ingest" value={bytesFmt(calc.ingestBytesPerSec) + "/s"} />
              <Readout label="Peak ingest" value={bytesFmt(calc.peakBytesPerSec) + "/s"} />
              <Readout label="Daily volume" value={bytesFmt(calc.dailyBytes)} />
              <Readout
                label="Retained (×replication)"
                value={bytesFmt(calc.totalStorageBytes)}
                sub={`raw ${bytesFmt(calc.rawRetentionBytes)} before RF`}
              />
              <Readout
                label="Storage per broker"
                value={bytesFmt(calc.perBrokerBytes)}
                sub={`across ${brokers} broker${brokers === 1 ? "" : "s"}`}
              />
              <Readout
                label="Msgs / partition / s"
                value={fmt(calc.msgsPerPartitionPerSec, 0)}
              />
            </div>

            <div
              style={{
                background: "#0F1B30",
                border: "1px solid #22314F",
                borderRadius: 6,
                padding: 18,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#5C7297",
                  marginBottom: 12,
                }}
              >
                Recommended partition count
              </div>
              <div style={{ fontSize: 40, color: "#64D9C7", lineHeight: 1, marginBottom: 12 }}>
                {calc.recommendedPartitions}
              </div>
              <div style={{ fontSize: 12, color: "#8DA1C4", lineHeight: 1.6 }}>
                produce-bound: <strong style={{ color: "#C7D4EA" }}>{calc.partitionsForProduce}</strong>
                &nbsp;·&nbsp; consume-bound:{" "}
                <strong style={{ color: "#C7D4EA" }}>{calc.partitionsForConsume}</strong>
                &nbsp;·&nbsp; consumer-count floor:{" "}
                <strong style={{ color: "#C7D4EA" }}>{calc.partitionsForConsumers}</strong>
              </div>
              {calc.idleConsumers > 0 && (
                <div style={{ fontSize: 12, color: "#E8A33D", marginTop: 10 }}>
                  ⚠ {calc.idleConsumers} consumer{calc.idleConsumers === 1 ? "" : "s"} will sit
                  idle — partition count is the parallelism ceiling.
                </div>
              )}
            </div>

            <div style={{ fontSize: 11, color: "#3A4C6E", lineHeight: 1.6 }}>
              Formulas: ingest = msgs/s × avg size · daily = ingest × 86400s · retained = daily
              × retention days × replication factor · partitions = max(t/p, t/c, consumer
              count) — Confluent's canonical formula, where t = peak throughput, p =
              per-partition produce rate, c = per-partition consume rate.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}