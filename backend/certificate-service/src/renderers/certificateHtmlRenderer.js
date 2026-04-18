const { formatCurrency, formatDateForDisplay, toNumber } = require('../utils/format');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderCertificateHtml(data, workerName) {
  const safeName = escapeHtml(workerName || 'Worker');
  const summary = data.summary || {};
  const periodRows = Array.isArray(data.period_breakdown) ? data.period_breakdown : [];
  const sessionRows = Array.isArray(data.sessions) ? data.sessions : [];

  const periodTableRows =
    periodRows.length > 0
      ? periodRows
          .map(
            (item) => `
          <tr>
            <td>${escapeHtml(item.label)}</td>
            <td class="right">${toNumber(item.sessions)}</td>
            <td class="right">${toNumber(item.hours).toFixed(1)}</td>
            <td class="right">${formatCurrency(item.net)}</td>
          </tr>`
          )
          .join('')
      : '<tr><td colspan="4" class="muted">No verified earnings found in selected range.</td></tr>';

  const sessionTableRows =
    sessionRows.length > 0
      ? sessionRows
          .map(
            (session) => `
          <tr>
            <td>${formatDateForDisplay(session.session_date)}</td>
            <td>${escapeHtml(String(session.platform || '-').replace(/[_-]+/g, ' '))}</td>
            <td class="right">${toNumber(session.hours_worked).toFixed(1)}</td>
            <td class="right">${formatCurrency(session.earning?.gross_earned)}</td>
            <td class="right">${formatCurrency(session.earning?.platform_deductions)}</td>
            <td class="right strong">${formatCurrency(session.earning?.net_received)}</td>
          </tr>`
          )
          .join('')
      : '<tr><td colspan="6" class="muted">No verified sessions found in selected range.</td></tr>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FairGig Income Certificate</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: Arial, sans-serif; background: #f3f4f6; color: #111827; }
    .certificate { max-width: 980px; margin: 0 auto; background: #fff; border: 1px solid #d1d5db; border-radius: 14px; padding: 28px; }
    .heading { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
    .heading h1 { margin: 0; font-size: 30px; letter-spacing: 0.08em; text-transform: uppercase; }
    .heading p { margin: 8px 0 0; color: #4b5563; }
    .meta { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .meta .value { font-size: 20px; font-weight: 700; }
    .muted { color: #6b7280; }
    .cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
    .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; text-align: center; }
    .card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
    .card .value { margin-top: 6px; font-size: 26px; font-weight: 700; }
    h2 { margin: 16px 0 10px; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; }
    th { background: #f9fafb; text-align: left; }
    .right { text-align: right; }
    .strong { font-weight: 700; }
    .footer { margin-top: 22px; border-top: 1px solid #d1d5db; padding-top: 12px; text-align: center; color: #4b5563; font-size: 12px; }
    @media print {
      body { background: #fff; padding: 0; }
      .certificate { border: none; border-radius: 0; max-width: none; margin: 0; padding: 18px; }
    }
  </style>
</head>
<body>
  <main class="certificate">
    <header class="heading">
      <h1>FairGig</h1>
      <p>Income Certificate</p>
      <p>${escapeHtml(data.range_label)} (${escapeHtml(data.from_date)} to ${escapeHtml(data.to_date)})</p>
    </header>

    <section class="meta">
      <div>
        <div class="muted">Worker Name</div>
        <div class="value">${safeName}</div>
      </div>
      <div class="right">
        <div class="muted">Generated On</div>
        <div class="strong">${formatDateForDisplay(data.generated_at)}</div>
        <div class="muted" style="margin-top: 4px;">Certificate ID: ${escapeHtml(data.certificate_id)}</div>
      </div>
    </section>

    <section class="cards">
      <div class="card">
        <div class="label">Verified Sessions</div>
        <div class="value">${toNumber(summary.total_sessions)}</div>
      </div>
      <div class="card">
        <div class="label">Total Hours</div>
        <div class="value">${toNumber(summary.total_hours).toFixed(1)}</div>
      </div>
      <div class="card">
        <div class="label">Net Verified Income</div>
        <div class="value">${formatCurrency(summary.total_net)}</div>
      </div>
    </section>

    <section>
      <h2>Period Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th class="right">Sessions</th>
            <th class="right">Hours</th>
            <th class="right">Net Income</th>
          </tr>
        </thead>
        <tbody>${periodTableRows}</tbody>
      </table>
    </section>

    <section>
      <h2>Verified Session Details</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Platform</th>
            <th class="right">Hours</th>
            <th class="right">Gross</th>
            <th class="right">Deductions</th>
            <th class="right">Net</th>
          </tr>
        </thead>
        <tbody>${sessionTableRows}</tbody>
      </table>
    </section>

    <footer class="footer">
      This certificate is generated from verified earnings data on the FairGig platform.
    </footer>
  </main>
</body>
</html>`;
}

module.exports = {
  renderCertificateHtml
};
