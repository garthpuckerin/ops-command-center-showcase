// LMS Ops Command Center — sessions screens.
// Split from screens.jsx (pure code-move); screens.jsx re-exports as a barrel.
import React, { useState } from 'react'
import { cls, statusLabel, fmtDate, Eyebrow, Pill, Avatar, Icon, Card, Button } from '../components.jsx'
import { Cell, FilterSelect, PageHeader, Row, Segmented, Table, addDays, campaignData, dateKey, facilityById, facilityNameById, formatSessionStart, riskPill, sessionTime, todayDate, userById } from './_shared.jsx'

function SessionsScreen({ me, role, campaignId }) {
  const [view, setView] = React.useState(initialSessionView());
  const [anchorDate, setAnchorDate] = React.useState(() => initialSessionAnchor());
  const [filters, setFilters] = React.useState(defaultSessionFilters());
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const scoped = campaignData(campaignId);
  const baseRows = role === "trainer" ? scoped.sessions.filter(s => s.trainer_id === me.id) : scoped.sessions;
  const rows = filterSessions(baseRows, filters);
  const isCalendar = view !== "list";
  return (
    <div className="screen">
      <PageHeader
        eyebrow="Session Operations"
        title="Trainer, classroom, and capacity control."
        sub="Flags overbooked sessions, trainer conflicts, underfilled labs, and classroom constraints."
      />
      <SessionControlBar
        view={view}
        setView={setView}
        anchorDate={anchorDate}
        setAnchorDate={setAnchorDate}
      />
      <SessionFilterBar
        rows={baseRows}
        filters={filters}
        setFilters={setFilters}
        canFilterTrainer={role !== "trainer"}
        open={filtersOpen}
        setOpen={setFiltersOpen}
      />
      {view === "list" ? <SessionsList rows={rows} /> : <SessionsCalendar rows={rows} view={view} anchorDate={anchorDate} />}
    </div>
  );
}

function defaultSessionFilters() {
  return { facility: "all", trainer: "all", risk: "all", conflict: "all", date: "all", search: "" };
}

function initialSessionView() {
  const value = new URLSearchParams(window.location.search).get("sessionsView");
  if (["5day", "7day", "month"].includes(value)) return value;
  if (value === "calendar") return "7day";
  return "list";
}

function initialSessionAnchor() {
  return todayDate();
}

function SessionFilterBar({ rows, filters, setFilters, canFilterTrainer, open, setOpen }) {
  const facilities = uniqueBy(rows.map(s => facilityById(s.facility_id)).filter(Boolean), "id");
  const trainers = uniqueBy(rows.map(s => userById(s.trainer_id)).filter(Boolean), "id");
  const dates = [...new Set(rows.map(s => s.starts.slice(0, 10)))].sort();
  const set = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  const reset = () => setFilters(defaultSessionFilters());
  const activeCount = activeSessionFilterCount(filters);

  return (
    <Card className={cls("filterbar", "session-filterbar", open && "session-filterbar-open")}>
      <div className="session-filterbar-head">
        <button className="session-filter-toggle" onClick={() => setOpen(!open)}>
          <Icon name="search" size={14} />
          <span>Filters</span>
          <Pill tone={activeCount ? "terracotta" : "muted"} mono>{activeCount ? `${activeCount} active` : "none"}</Pill>
          <Icon name="chev" size={12} />
        </button>
        {!open && <span className="muted small">{sessionFilterSummary(filters)}</span>}
      </div>
      {open && (
        <div className="filterbar-row session-filterbar-body">
          <label className="search session-search">
            <Icon name="search" size={14} />
            <input value={filters.search} onChange={(e) => set("search", e.target.value)} placeholder="Search sessions" />
          </label>
          <FilterSelect label="Facility" value={filters.facility} onChange={(v) => set("facility", v)}>
            <option value="all">All facilities</option>
            {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </FilterSelect>
          {canFilterTrainer && (
            <FilterSelect label="Trainer" value={filters.trainer} onChange={(v) => set("trainer", v)}>
              <option value="all">All trainers</option>
              {trainers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </FilterSelect>
          )}
          <FilterSelect label="Risk" value={filters.risk} onChange={(v) => set("risk", v)}>
            <option value="all">All risk</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </FilterSelect>
          <FilterSelect label="Conflicts" value={filters.conflict} onChange={(v) => set("conflict", v)}>
            <option value="all">All sessions</option>
            <option value="conflicts">Conflicts only</option>
            <option value="clear">No conflict</option>
          </FilterSelect>
          <FilterSelect label="Date" value={filters.date} onChange={(v) => set("date", v)}>
            <option value="all">All dates</option>
            {dates.map(date => <option key={date} value={date}>{fmtDate(date)}</option>)}
          </FilterSelect>
          <div className="filterbar-spacer" />
          <Button size="sm" kind="ghost" onClick={reset}>Reset</Button>
        </div>
      )}
    </Card>
  );
}

function activeSessionFilterCount(filters) {
  return Object.entries(filters).filter(([key, value]) => key === "search" ? value.trim() : value !== "all").length;
}

function sessionFilterSummary(filters) {
  const active = [];
  if (filters.search.trim()) active.push(`Search "${filters.search.trim()}"`);
  if (filters.facility !== "all") active.push("Facility");
  if (filters.trainer !== "all") active.push("Trainer");
  if (filters.risk !== "all") active.push(statusLabel(filters.risk));
  if (filters.conflict !== "all") active.push(filters.conflict === "conflicts" ? "Conflicts only" : "No conflict");
  if (filters.date !== "all") active.push(fmtDate(filters.date));
  return active.length ? active.join(" · ") : "Showing all sessions in your allowed scope.";
}


function filterSessions(rows, filters) {
  const q = filters.search.trim().toLowerCase();
  return rows.filter(s => {
    const trainer = userById(s.trainer_id);
    const facility = facilityById(s.facility_id);
    const text = `${s.title} ${s.room} ${facility?.name || ""} ${trainer?.first_name || ""} ${trainer?.last_name || ""}`.toLowerCase();
    if (filters.facility !== "all" && s.facility_id !== filters.facility) return false;
    if (filters.trainer !== "all" && s.trainer_id !== filters.trainer) return false;
    if (filters.risk !== "all" && s.risk !== filters.risk) return false;
    if (filters.conflict === "conflicts" && !s.conflict) return false;
    if (filters.conflict === "clear" && s.conflict) return false;
    if (filters.date !== "all" && !s.starts.startsWith(filters.date)) return false;
    if (q && !text.includes(q)) return false;
    return true;
  });
}

function uniqueBy(items, key) {
  return items.filter((item, idx, arr) => arr.findIndex(other => other[key] === item[key]) === idx);
}

function SessionsList({ rows }) {
  return (
    <Card padded={false}>
      <Table columns={["Session", "Trainer", "Facility", "Room", "Starts", "Capacity", "Risk"]} widths={["1.5fr", "1fr", "1.2fr", "1fr", "130px", "100px", "100px"]}>
        {rows.map(s => {
          const trainer = userById(s.trainer_id);
          return (
            <Row key={s.id}>
              <Cell><span className="strong">{s.title}</span><div className="muted small">{s.conflict || "No conflict flagged"}</div></Cell>
              <Cell><span className="meta-stack"><Avatar user={trainer} size={24} /><span>{trainer.first_name} {trainer.last_name}</span></span></Cell>
              <Cell><span className="muted">{facilityNameById(s.facility_id)}</span></Cell>
              <Cell><span>{s.room}</span></Cell>
              <Cell><span className="mono small">{formatSessionStart(s.starts)}</span></Cell>
              <Cell><span className="mono">{s.registered}/{s.capacity}</span></Cell>
              <Cell>{riskPill(s.risk)}</Cell>
            </Row>
          );
        })}
      </Table>
    </Card>
  );
}

function SessionControlBar({ view, setView, anchorDate, setAnchorDate }) {
  const isCalendar = view !== "list";
  const label = calendarRangeLabel(view, anchorDate);
  const move = direction => setAnchorDate(current => shiftCalendarAnchor(current, view, direction));
  return (
    <Card className="calendar-toolbar">
      <div>
        <Eyebrow>{isCalendar ? (view === "month" ? "Month schedule" : "Schedule window") : "Display mode"}</Eyebrow>
        <div className="calendar-toolbar-title">{isCalendar ? label : "Session list"}</div>
      </div>
      <div className="calendar-toolbar-actions">
        <Segmented value={view} onChange={setView} options={[
          { value: "list", label: "List" },
          { value: "5day", label: "5 Day" },
          { value: "7day", label: "7 Day" },
          { value: "month", label: "Month" },
        ]} />
        {isCalendar && (
          <div className="calendar-nav">
            <Button size="sm" kind="ghost" onClick={() => move(-1)}>Previous</Button>
            <Button size="sm" kind="ghost" onClick={() => setAnchorDate(todayDate())}>Today</Button>
            <Button size="sm" kind="solid" onClick={() => move(1)}>Next</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function SessionsCalendar({ rows, view, anchorDate }) {
  const days = calendarDays(rows, view, anchorDate);
  const isMonth = view === "month";
  return (
    <Card className={cls("session-calendar", `session-calendar-${view}`, isMonth && "session-calendar-month")} padded={false}>
      <div className="session-calendar-head">
        <div>
          <Eyebrow>{view === "month" ? "Month view" : `${view.replace("day", "")}-day view`}</Eyebrow>
          <div className="strong">Scheduled training sessions</div>
        </div>
        <div className="session-calendar-legend">
          <span><i className="legend-dot legend-low" />Low</span>
          <span><i className="legend-dot legend-medium" />Medium</span>
          <span><i className="legend-dot legend-high" />High</span>
          <span><i className="legend-dot legend-critical" />Critical</span>
        </div>
      </div>
      <div className="session-calendar-grid">
        {days.map(day => (
          <div key={day.key} className={cls("session-day", day.outsideMonth && "session-day-muted", day.isToday && "session-day-today")}>
            <div className="session-day-head">
              <span className="mono">{day.weekday}</span>
              <strong>{isMonth ? day.dayNumber : day.label}</strong>
              {day.isToday && <span className="today-marker mono">Today</span>}
            </div>
            <div className="session-day-body">
              {day.sessions.length === 0 && !isMonth && <div className="session-empty">No sessions</div>}
              {day.sessions.map(s => {
                const trainer = userById(s.trainer_id);
                return (
                  <button key={s.id} className={cls("session-event", `session-event-${s.risk}`)} title={s.conflict || "No conflict flagged"}>
                    <span className="session-event-time mono">{sessionTime(s.starts)}</span>
                    <span className="session-event-title">{s.title}</span>
                    <span className="session-event-meta">{facilityNameById(s.facility_id)} · {s.room}</span>
                    <span className="session-event-meta">{trainer.first_name} {trainer.last_name} · {s.registered}/{s.capacity}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function calendarDays(rows, view, anchorDate) {
  const sorted = [...rows].sort((a, b) => new Date(a.starts.replace(" ", "T")) - new Date(b.starts.replace(" ", "T")));
  const range = calendarRange(view, anchorDate);
  const todayKey = dateKey(todayDate());
  return range.map(date => {
    const key = dateKey(date);
    const visibleMonth = view !== "month" || date.getMonth() === anchorDate.getMonth();
    return {
      key,
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      dayNumber: String(date.getDate()),
      outsideMonth: !visibleMonth,
      isToday: key === todayKey,
      sessions: sorted.filter(s => s.starts.startsWith(key)),
    };
  });
}

function calendarRange(view, anchorDate) {
  if (view === "month") {
    const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
    const last = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
    const start = addDays(first, -first.getDay());
    const end = addDays(last, 6 - last.getDay());
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Array.from({ length: days }, (_, idx) => addDays(start, idx));
  }
  if (view === "7day") {
    const start = addDays(anchorDate, -anchorDate.getDay());
    return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
  }
  const length = view === "5day" ? 5 : 7;
  return Array.from({ length }, (_, idx) => addDays(anchorDate, idx));
}

function calendarRangeLabel(view, anchorDate) {
  if (view === "month") {
    return anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const days = calendarRange(view, anchorDate);
  const first = days[0];
  const last = days[days.length - 1];
  const sameMonth = first.getMonth() === last.getMonth();
  const firstLabel = first.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lastLabel = sameMonth
    ? last.toLocaleDateString("en-US", { day: "numeric" })
    : last.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${firstLabel} - ${lastLabel}, ${last.getFullYear()}`;
}

function shiftCalendarAnchor(date, view, direction) {
  if (view === "month") return new Date(date.getFullYear(), date.getMonth() + direction, 1);
  return addDays(date, direction * (view === "5day" ? 5 : 7));
}


export {
  SessionsScreen, defaultSessionFilters, initialSessionView, initialSessionAnchor, SessionFilterBar, activeSessionFilterCount, sessionFilterSummary, filterSessions, uniqueBy, SessionsList, SessionControlBar, SessionsCalendar, calendarDays, calendarRange, calendarRangeLabel, shiftCalendarAnchor,
};
