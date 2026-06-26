# Reports

Admin-only analytics at `/admin/reports`
([app/admin/reports/page.tsx](../app/admin/reports/page.tsx)).

## Data source

A single function, `get_admin_reports(start, end)` (migration
`0005_reports.sql`), returns one JSON object. It is `SECURITY DEFINER` and
admin-only. The default range is the **last 30 days** when no dates are passed.

## Metrics returned

| Field | Meaning |
|-------|---------|
| `total_check_ins` | Walk-in visits in range |
| `completed` / `no_show` / `canceled` | Check-in outcomes |
| `total_appointments` | Booked appointments in range |
| `unique_customers` | Distinct customers served |
| `returning_customers` | Customers with more than one visit |
| `by_dow` | Visit counts by day of week |
| `by_hour` | Visit counts by hour |
| `by_barber` | `[{ name, count }]` per barber |
| `by_service` | `[{ name, count }]` per service |

## Visualization

The page renders stat cards plus simple CSS bar charts for `by_dow`, `by_hour`,
`by_barber`, and `by_service` (no chart library needed).

## CSV export

Links on the page hit `GET /api/admin/export?type=check_ins|customers` to
download raw rows for spreadsheets or accounting. The check-ins export
disambiguates the served-by barber via the
`check_ins_served_by_barber_id_fkey` relationship.

## Basis: check-ins, not appointments

Reporting is primarily based on `check_ins` (actual visits) so walk-ins and
booked customers who showed up are both counted. Appointment counts are reported
separately.
