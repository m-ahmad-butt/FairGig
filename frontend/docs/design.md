# FairGig — Design Brief

## 1. What is FairGig?

A platform for Pakistan's gig economy workers — ride-hailing drivers, food delivery riders, freelance designers, domestic workers. They earn across multiple platforms with no unified record, no payslip, and no protection when platforms silently change commission rates or deactivate accounts.

FairGig lets workers **log, verify, and understand** their earnings. It gives labour advocates a dashboard to **spot systemic unfairness at scale**. It also gives workers a **community** to share rate intelligence and file grievances.

**Core tension to reflect in design**: this must feel trustworthy and professional enough for a bank or landlord to take seriously — but also approachable enough for a non-tech-savvy delivery rider on a mid-range Android phone.

---

## 2. Design Direction

- **Aesthetic**: Clean, utilitarian-professional. Think civic tech meets fintech. Not corporate cold — warm and empowering. Workers should feel the app is _on their side_.
- **Tone**: Honest, direct, no jargon. Data-forward. Badge/status-driven (verified ✓, flagged ⚠, anomaly 🔴).
- **Palette**: Black and white. High contrast, clean, accessible.
  - Primary: Black (#000000) or Dark Slate (#1F2937)
  - Background: White (#FFFFFF) or Light Gray (#F9FAFB)
  - Card: White (#FFFFFF)
  - Text: Dark gray (#1F2937)
  - Secondary text: Medium gray (#6B7280)
  - Status colors: Green = verified, Amber = flagged, Red = anomaly/blocked
- **Typography**: Clear hierarchy. Large readable numbers for earnings figures. Urdu-script readiness (RTL-compatible layout thinking, even if not implemented yet).
- **Mobile-first**: Worker-facing screens must work on a 375px viewport. Advocate/verifier screens can assume desktop.
- **Key motif**: A "verification badge" system — workers build a verified earnings history over time, similar to how a credit score works. This should feel like progress.

---

## 3. The Four User Roles & Their Dashboards

### 3A — Gig Worker Dashboard

The most important role. Must be simple, empowering, and mobile-friendly.

| #   | Screen                 | Key UI Elements                                                                                                                                               |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Home / Overview**    | Earnings this week card, verified vs unverified badge count, anomaly alert banner (if any), quick-log CTA                                                     |
| 2   | **Log a Shift**        | Form: platform selector, date, hours worked, gross earned, platform deductions, net received. Simple enough for a rider to fill in 60 seconds                 |
| 3   | **Bulk CSV Import**    | Upload zone, column-mapping preview table, import confirmation                                                                                                |
| 4   | **Screenshot Upload**  | Drag-and-drop / camera upload, verification status tracker (pending / verified ✓ / flagged ⚠ / unverifiable)                                                  |
| 5   | **Income Analytics**   | Weekly/monthly earnings trend (line chart), effective hourly rate over time, platform commission rate tracker (per platform), city-wide median comparison bar |
| 6   | **Heat Map**           | Interactive city zone map showing high-earning areas by hour/day. AI-predicted hot zones highlighted. Historical zone comparison toggle                       |
| 7   | **AI Recommendations** | Weekly personalised income tips panel. "Your commission rate is 3% above city median on Bykea." Opt-out toggle                                                |
| 8   | **Anomaly Alerts**     | Card/banner: "Unusual deduction detected on 14 Apr — 34% vs your usual 18%." Human-readable explanation. Severity badge                                       |
| 9   | **Income Certificate** | Date range picker, preview of printable certificate, Download / Print button                                                                                  |
| 10  | **Notifications**      | Verification updates, anomaly alerts, recommendation pings                                                                                                    |

---

### 3B — Verifier Dashboard

Reviews screenshot evidence. Needs clarity and speed — verifiers process a queue.

| #   | Screen              | Key UI Elements                                                                                                                                                               |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Review Queue**    | List of pending submissions, oldest-first, filterable by platform and date. Queue stats: pending / reviewed today / flagged this week                                         |
| 2   | **Review Detail**   | Side-by-side: uploaded screenshot (left) vs logged earnings figures (right). Action buttons: ✅ Confirm · ⚠ Flag Discrepancy · ❌ Mark Unverifiable. Note field when flagging |
| 3   | **Search & Filter** | Filter queue by worker ID, platform, date range                                                                                                                               |

---

### 3C — Advocate Dashboard

Data-heavy. Desktop-first. This is where systemic patterns are spotted.

| #   | Screen                 | Key UI Elements                                                                                                                                                             |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Analytics Overview** | Commission rate trends (multi-line chart per platform), income distribution heatmap by city zone, top complaint categories this week (bar chart), vulnerability flags count |
| 2   | **Vulnerability List** | Table of workers with >20% month-on-month income drop. Export to CSV button                                                                                                 |
| 3   | **Grievance Board**    | All complaints. Tag, cluster similar, escalate, resolve. Filter by platform / category / status                                                                             |
| 4   | **Forum Moderation**   | Pin, lock, remove posts and polls from the community forum                                                                                                                  |
| 5   | **Platform Scorecard** | Per-platform health: avg commission %, complaint volume, income drop rate                                                                                                   |

---

### 3D — Community / Worker Forum

Reddit-style. Anonymous-friendly. The social layer of the platform.

| #   | Screen            | Key UI Elements                                                                                                                |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Forum Feed**    | Posts sorted by Trending / New / Top. Trending sidebar (top 10 this week)                                                      |
| 2   | **Post Detail**   | Title, body, platform tag, category tag. Upvote/downvote. Nested 2-level comment thread. Poll results if attached              |
| 3   | **Create Post**   | Title, body, platform tag, category (Rate Cut / Deactivation / Tips / General), optional poll builder (binary or multi-choice) |
| 4   | **Poll View**     | Live % results, voter count, vote CTA                                                                                          |
| 5   | **Search**        | Search by keyword, platform, or category                                                                                       |
| 6   | **Notifications** | Replies to your posts, poll results                                                                                            |

---

## 4. Shared / Global UI Components

These appear across all roles — design them once, use everywhere:

- **Top nav / sidebar** — adapts per role. Worker: simple bottom nav (mobile). Advocate/Verifier: left sidebar (desktop).
- **Auth screens** — Login, Register with role selection (Worker / Verifier / Advocate). Clean, welcoming.
- **Verification badge** — Three states: ✅ Verified (green), ⚠ Flagged (amber), ❌ Unverifiable (grey). Used on profiles, certificates, and log entries.
- **Anomaly alert card** — Red-bordered card with severity badge (Low / Medium / High) and plain-language explanation text.
- **Status pills** — Reusable: Not Started / In Progress / Done / Blocked / Escalated / Resolved.
- **Income certificate page** — Standalone print-friendly page. No nav, no sidebar. Clean letterhead-style layout. Shows: worker name, date range, platform breakdown, total verified earnings, FairGig verification stamp. `@media print` optimised.
- **Empty states** — Friendly, not clinical. "No shifts logged yet — tap + to add your first."
- **Toast / notification system** — Non-intrusive. Top-right on desktop, bottom on mobile.

---

## 5. Auth Screens Specification

### Roles

- **Worker** — Auto-approved on registration
- **Verifier** — Requires admin approval
- **Advocate** — Requires admin approval

### Design Principles

- Friendly, approachable UI suitable for non-tech-savvy users
- Clear role selection with visual differentiation
- Accessible form inputs with helpful placeholders
- Welcoming tone throughout (copy, colors, spacing)

---

### Login Page (`LoginPage.jsx`)

**Layout:**

- Centered card layout on light background
- Logo/brand at top
- Form fields stacked vertically
- "Forgot password?" link below email
- Submit button full-width
- Link to Register page at bottom

**Form Fields:**

1. **Email** — input type="email", placeholder "your@email.com"
2. **Password** — input type="password", placeholder "Enter your password"

**Actions:**

- "Sign In" button (primary)
- "Forgot password?" link
- "Don't have an account? Sign up" link

---

### Register Page (`RegisterPage.jsx`)

**Layout:**

- Centered card layout matching Login page
- Clear heading: "Create your account"
- Subheading: "Join FairGig"
- Form fields with role selection prominently displayed

**Form Fields:**

1. **Full Name** — text input
2. **Email** — email input
3. **Role Selection** — visual cards:
   - 🧑‍💼 **Worker** — "Log shifts, track earnings, generate income reports"
   - 🔍 **Verifier** — "Review screenshots, approve or dispute earnings records"
   - 📊 **Advocate** — "Monitor trends, aggregate data, manage grievances"
4. **Password** — min 6 characters
5. **Confirm Password** — must match

**Role Card Design:**

```
┌─────────────────────────────────────┐
│  🧑‍💼  Worker                        │
│  Auto-approved on signup            │
│  Log shifts, track earnings...      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  🔍  Verifier                       │
│  Requires approval                  │
│  Review screenshots...              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  📊  Advocate                       │
│  Requires approval                  │
│  Monitor trends, aggregate data... │
└─────────────────────────────────────┘
```

**Actions:**

- "Create Account" button (primary)
- "Already have an account? Sign in" link

---

## 6. Color Palette (Black & White)

- **Primary:** Black (#000000) or Dark Slate (#1F2937)
- **Background:** White (#FFFFFF) or Light Gray (#F9FAFB)
- **Card:** White (#FFFFFF)
- **Text:** Dark gray (#1F2937)
- **Secondary text:** Medium gray (#6B7280)
- **Accent/hover:** Darker shade of primary
- **Status — Verified:** Green (#10B981)
- **Status — Flagged:** Amber (#F59E0B)
- **Status — Anomaly/Blocked:** Red (#EF4444)

---

## 7. Responsive Behavior

- Worker screens: mobile-first, 375px viewport optimized
- Verifier/Advocate: desktop-first
- Cards max-width: 400px on desktop
- Full-width with padding on mobile

---

## 8. Implementation Notes

- Use existing Tailwind setup
- Maintain component structure
- Keep validation logic as-is (password match, min length)
- Role cards can use CSS grid/flexbox for layout
- Design auth screens first to establish design DNA, then apply to other screens
