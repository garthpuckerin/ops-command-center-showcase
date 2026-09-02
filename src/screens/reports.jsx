// LMS Ops Command Center — reports screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState, useEffect } from 'react'
import { LMS_DATA as D } from '../data.js'
import * as LMS_API from '../api-client.js'
import { cls, Eyebrow, Rule, Pill, Bar, Card, Button } from '../components.jsx'
import { Cell, KV, PageHeader, Row, Table, campaignById, pct, riskPill } from './_shared.jsx'

function ReportsScreen({ campaignId, onDataChanged }) {
  // Campaign-scoped only — a report without a campaign is not "everyone's",
  // it is nobody's; the old global fallback rendered St. Anne's package under
  // every other campaign.
  const scopedReports = D.reports.filter(r => r.campaign_id === campaignId);
  const [activeId, setActiveId] = React.useState(scopedReports[0]?.id);
  const [showBuilder, setShowBuilder] = React.useState(false);
  const [builder, setBuilder] = React.useState({
    title: "At-Risk Learners",
    report_type: "at_risk_learners",
    risk_level: "critical",
    columns: "name,email,department,risk_level",
  });
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (scopedReports.length && !scopedReports.some(r => r.id === activeId)) {
      setActiveId(scopedReports[0].id);
    }
  }, [campaignId, activeId, scopedReports]);
  const active = scopedReports.find(r => r.id === activeId) || scopedReports[0] || null;
  const campaign = campaignById(campaignId);

  async function saveBuilderReport() {
    if (!LMS_API?.createCampaignReport) return;
    setSaving(true);
    const columnKeys = String(builder.columns || "")
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);
    const effectiveColumns = builder.report_type === "daily_readiness" ? ["metric", "value"] : columnKeys;
    try {
      const created = await LMS_API.createCampaignReport(campaignId, {
        title: builder.title,
        report_type: builder.report_type,
        description: "Built from Report Builder Lite.",
        filter_config: builder.report_type === "at_risk_learners" && builder.risk_level ? { risk_level: [builder.risk_level] } : {},
        column_config: effectiveColumns.map(key => ({ key, label: humanizeColumn(key) })),
        grouping_config: builder.report_type === "at_risk_learners" ? { key: "department" } : {},
        sort_config: effectiveColumns.includes("name") ? [{ key: "name", direction: "asc" }] : [],
        export_formats: ["csv", "xlsx"],
      });
      setActiveId(created.id);
      setShowBuilder(false);
      onDataChanged?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Reports"
        title="Readiness reporting package."
        sub={`${campaign.name}: executive, manager, and operator-ready exports generated from scoped campaign data.`}
        action={<Button kind="solid" icon="plus" onClick={() => setShowBuilder(v => !v)}>Report</Button>}
      />
      {showBuilder && (
        <Card padded>
          <div className="form-grid">
            <label className="field">
              <span className="field-label mono">Title</span>
              <input value={builder.title} onChange={(e) => setBuilder({ ...builder, title: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label mono">Type</span>
              <select value={builder.report_type} onChange={(e) => setBuilder({ ...builder, report_type: e.target.value })}>
                <option value="at_risk_learners">At-risk learners</option>
                <option value="daily_readiness">Daily readiness</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label mono">Risk filter</span>
              <select value={builder.risk_level} onChange={(e) => setBuilder({ ...builder, risk_level: e.target.value })}>
                <option value="">Any risk</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label mono">Columns</span>
              <input value={builder.columns} onChange={(e) => setBuilder({ ...builder, columns: e.target.value })} />
            </label>
          </div>
          <div className="focal-actions">
            <Button kind="solid" onClick={saveBuilderReport} disabled={saving}>{saving ? "Saving" : "Save report"}</Button>
            <Button kind="ghost" onClick={() => setShowBuilder(false)}>Cancel</Button>
          </div>
        </Card>
      )}
      {!active && (
        <Card>
          <Eyebrow n={1}>No reports yet</Eyebrow>
          <h2 className="display-sm">This campaign has no reporting package.</h2>
          <p className="muted small">Campaigns created from a template arrive with their default reports; use the Report builder above to add one here.</p>
        </Card>
      )}
      {active && (
      <div className="report-layout">
        <div className="report-picker">
          {scopedReports.map(r => (
            <button key={r.id} className={cls("report-card", activeId === r.id && "report-card-on")} onClick={() => setActiveId(r.id)}>
              <div className="role-head">
                <Pill tone={r.format === "csv" ? "ink" : "muted"} mono>{r.format}</Pill>
                <span className="mono small">{r.cadence}</span>
              </div>
              <h3 className="role-title">{r.title}</h3>
              <p className="muted small">{r.desc}</p>
              <Rule />
              <div className="report-meta">
                <span>{r.audience}</span>
                <span>{r.owner}</span>
              </div>
            </button>
          ))}
        </div>
        <ReportPreview report={active} />
      </div>
      )}
    </div>
  );
}

function ReportPreview({ report }) {
  const preview = report.preview;
  const [exported, setExported] = React.useState(false);

  React.useEffect(() => { setExported(false); }, [report.id]);

  function exportCsv() {
    const rows = buildCsvRows(report);
    const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const filename = `${csvSlug(report.title)}.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExported(true);
  }

  return (
    <Card className="report-preview">
      <div className="report-preview-head">
        <div>
          <Eyebrow>Preview · {report.format}</Eyebrow>
          <h2 className="display-sm">{report.title}</h2>
          <p className="page-sub">{report.desc}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <Button kind="solid" size="sm" icon="ext" onClick={exportCsv}>{exported ? "Exported ✓" : "Export"}</Button>
          {exported && <span className="mono mono-dim small">{csvSlug(report.title)}.csv downloaded</span>}
        </div>
      </div>
      <Rule />
      {report.format === "csv" ? <CsvPreview preview={preview} /> : <GraphicalReportPreview report={report} />}
    </Card>
  );
}

function GraphicalReportPreview({ report }) {
  const p = report.preview;
  return (
    <div className="report-doc">
      <div className="report-doc-title">
        <span className="mono small">{report.audience} · {report.cadence}</span>
        <h3>{p.headline}</h3>
        <p>{p.summary}</p>
      </div>
      <div className="report-metric-grid">
        {p.metrics.map(m => (
          <div key={m.label} className="report-metric">
            <div className="report-metric-value">{m.value}</div>
            <div className="report-metric-label mono">{m.label}</div>
            <span className={cls("report-swatch", `report-swatch-${m.tone}`)} />
          </div>
        ))}
      </div>
      {p.scoringExplanation && (
        <div className="kv-list">
          <KV k="Scoring drivers" v={(p.scoringExplanation.drivers || []).join(", ") || "No risk drivers"} />
          <KV k="Penalties" v={Object.entries(p.scoringExplanation.penalties || {}).map(([k, v]) => `${k}:${v}`).join(", ")} />
        </div>
      )}
      {p.bars && (
        <div className="report-bars">
          {p.bars.map(b => (
            <div key={b.label} className="report-bar-row">
              <span className="report-bar-label">{b.label}</span>
              <Bar value={b.max ? (b.value / b.max) * 100 : b.value} tone={b.tone} />
              <span className="mono small">{b.max ? b.value : pct(b.value)}</span>
            </div>
          ))}
        </div>
      )}
      {p.table && (
        <div className="report-mini-table">
          <Table columns={["Role", "Required", "Complete", "In progress", "Not started", "Risk"]} widths={["1.2fr", "80px", "80px", "90px", "90px", "90px"]}>
            {p.table.map(row => (
              <Row key={row.join("-")}>
                {row.map((cell, idx) => <Cell key={idx}>{idx === 5 ? riskPill(cell) : <span className={idx > 0 ? "mono small" : ""}>{cell}</span>}</Cell>)}
              </Row>
            ))}
          </Table>
        </div>
      )}
    </div>
  );
}

function CsvPreview({ preview }) {
  return (
    <div className="sheet-preview">
      <div className="sheet-toolbar">
        <div>
          <div className="strong">Spreadsheet export preview</div>
          <div className="muted small">CSV opens as a workbook-style table for coordinators and data teams.</div>
        </div>
        <Pill tone="ink" mono>.csv</Pill>
      </div>
      <div className="sheet-frame">
        <div className="sheet-corner" />
        {preview.columns.map((_, idx) => (
          <div key={`col-${idx}`} className="sheet-col-head mono">{String.fromCharCode(65 + idx)}</div>
        ))}
        <div className="sheet-row-head mono">1</div>
        {preview.columns.map(col => (
          <div key={col} className="sheet-cell sheet-header" title={humanizeColumn(col)}>{humanizeColumn(col)}</div>
        ))}
        {preview.rows.map((row, idx) => (
          <React.Fragment key={idx}>
            <div className="sheet-row-head mono">{idx + 2}</div>
            {row.map((cell, cIdx) => (
              <div key={`${idx}-${cIdx}`} className="sheet-cell" title={cell == null ? undefined : String(cell)}>{cell}</div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function humanizeColumn(value) {
  return String(value).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function buildCsvRows(report) {
  const p = report.preview || {};
  // Tabular (csv-format) reports carry columns + rows directly.
  if (Array.isArray(p.columns) && Array.isArray(p.rows)) {
    return [p.columns.map(humanizeColumn), ...p.rows];
  }
  // Graphical reports: export the headline metrics as a two-column sheet.
  if (Array.isArray(p.metrics)) {
    return [["Metric", "Value"], ...p.metrics.map(m => [m.label, m.value])];
  }
  return [["Report"], [report.title]];
}

function csvCell(value) {
  const s = value == null ? "" : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csvSlug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "report";
}


export {
  ReportsScreen, ReportPreview, GraphicalReportPreview, CsvPreview, humanizeColumn,
};
