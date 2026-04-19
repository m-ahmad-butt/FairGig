import math
import os
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any

import requests
from fastapi import FastAPI, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

service_name = os.getenv('SERVICE_NAME', 'analytics-service')
port = int(os.getenv('PORT', '8001'))
db_url = os.getenv('DATABASE_URL', 'mongodb://mongo:27017/analytics_service')

auth_service_url = os.getenv('AUTH_SERVICE_INTERNAL_URL', 'http://auth-service:4001').rstrip('/')
earnings_service_url = os.getenv('EARNINGS_SERVICE_INTERNAL_URL', 'http://earnings-service:4002').rstrip('/')
grievance_service_url = os.getenv('GRIEVANCE_SERVICE_INTERNAL_URL', 'http://grievance-service:4003').rstrip('/')
request_timeout_seconds = int(os.getenv('REQUEST_TIMEOUT_SECONDS', '15'))

app = FastAPI(title=service_name)
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)


def _to_number(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0

    return parsed if math.isfinite(parsed) else 0.0


def _parse_date(value: Any) -> date | None:
    if value is None:
        return None

    raw = str(value).strip()
    if not raw:
        return None

    candidate = f'{raw}T00:00:00' if re.fullmatch(r'\d{4}-\d{2}-\d{2}', raw) else raw

    try:
        parsed = datetime.fromisoformat(candidate.replace('Z', '+00:00'))
    except ValueError:
        return None

    return parsed.date()


def _format_platform_label(value: Any) -> str:
    cleaned = re.sub(r'[_-]+', ' ', str(value or 'Other')).strip()
    if not cleaned:
        return 'Other'

    return ' '.join(token.capitalize() for token in cleaned.split())


def _to_change_percent(current: float, previous: float) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0

    return ((current - previous) / previous) * 100.0


def _to_worker_alias(worker_id: Any) -> str:
    safe_id = str(worker_id or 'unknown')
    return f'Worker-{safe_id[-4:].upper()}'


def _normalize_workers_payload(result: Any) -> list[dict[str, Any]]:
    if isinstance(result, dict):
        workers = result.get('workers')
        if isinstance(workers, list):
            return [item for item in workers if isinstance(item, dict)]

        worker = result.get('worker')
        if isinstance(worker, dict):
            return [worker]

    return []


def _merge_sessions_with_earnings(
    sessions: list[dict[str, Any]],
    earnings: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    earnings_by_session_id: dict[str, dict[str, Any]] = {}

    for item in earnings:
        if not isinstance(item, dict):
            continue
        session_id = item.get('session_id')
        if session_id is None:
            continue
        earnings_by_session_id[str(session_id)] = item

    merged: list[dict[str, Any]] = []
    for session in sessions:
        if not isinstance(session, dict):
            continue

        session_id = session.get('id')
        if session_id is None:
            continue

        earning = earnings_by_session_id.get(str(session_id))
        if not isinstance(earning, dict):
            continue

        session_date = _parse_date(session.get('session_date'))
        if session_date is None:
            continue

        gross = _to_number(earning.get('gross_earned'))
        deductions = _to_number(earning.get('platform_deductions'))

        merged.append({
            'id': str(session_id),
            'workerId': str(session.get('worker_id') or ''),
            'platform': session.get('platform'),
            'sessionDate': session_date,
            'gross': gross,
            'deductions': deductions,
            'net': _to_number(earning.get('net_received')),
            'deductionRate': (deductions / gross) * 100.0 if gross > 0 else 0.0
        })

    merged.sort(key=lambda item: item['sessionDate'], reverse=True)
    return merged


def _month_start_from_offset(current: date, offset_months: int) -> date:
    total_months = (current.year * 12) + (current.month - 1) + offset_months
    target_year, target_month_index = divmod(total_months, 12)
    return date(target_year, target_month_index + 1, 1)


def _compute_advocate_payload(
    workers: list[dict[str, Any]],
    records: list[dict[str, Any]],
    clusters: list[dict[str, Any]],
    range_days: int
) -> dict[str, Any]:
    worker_map: dict[str, dict[str, Any]] = {
        str(item.get('id')): item
        for item in workers
        if isinstance(item, dict) and item.get('id')
    }

    now = date.today()
    cutoff = now - timedelta(days=range_days)
    current_period_start = cutoff
    previous_period_start = current_period_start - timedelta(days=range_days)

    filtered_records = [
        record for record in records if record['sessionDate'] >= cutoff
    ]
    previous_period_records = [
        record for record in records
        if previous_period_start <= record['sessionDate'] < current_period_start
    ]

    current_gross = sum(record['gross'] for record in filtered_records)
    current_deductions = sum(record['deductions'] for record in filtered_records)
    current_net = sum(record['net'] for record in filtered_records)

    previous_gross = sum(record['gross'] for record in previous_period_records)
    previous_deductions = sum(record['deductions'] for record in previous_period_records)
    previous_net = sum(record['net'] for record in previous_period_records)

    active_workers = len({record['workerId'] for record in filtered_records})

    current_commission = (current_deductions / current_gross) * 100.0 if current_gross > 0 else 0.0
    previous_commission = (previous_deductions / previous_gross) * 100.0 if previous_gross > 0 else 0.0

    summary = {
        'activeWorkers': active_workers,
        'payoutVolume': current_net,
        'avgCommission': current_commission,
        'payoutDelta': _to_change_percent(current_net, previous_net),
        'commissionDelta': _to_change_percent(current_commission, previous_commission)
    }

    current_month_start = date(now.year, now.month, 1)
    previous_month_start = _month_start_from_offset(current_month_start, -1)

    grouped_worker_income: dict[str, dict[str, float]] = {}
    for record in records:
        if record['sessionDate'] < previous_month_start:
            continue

        worker_id = record['workerId']
        if worker_id not in grouped_worker_income:
            grouped_worker_income[worker_id] = {
                'previousMonth': 0.0,
                'currentMonth': 0.0
            }

        if record['sessionDate'] >= current_month_start:
            grouped_worker_income[worker_id]['currentMonth'] += record['net']
        elif record['sessionDate'] >= previous_month_start:
            grouped_worker_income[worker_id]['previousMonth'] += record['net']

    vulnerability_list: list[dict[str, Any]] = []
    for worker_id, totals in grouped_worker_income.items():
        previous_month = totals['previousMonth']
        current_month = totals['currentMonth']
        drop_percent = ((previous_month - current_month) / previous_month) * 100.0 if previous_month > 0 else 0.0
        worker = worker_map.get(worker_id, {})

        if drop_percent > 20:
            vulnerability_list.append({
                'workerId': worker_id,
                'alias': _to_worker_alias(worker_id),
                'city': worker.get('city') or 'Unknown',
                'zone': worker.get('zone') or 'Unknown',
                'previousMonth': previous_month,
                'currentMonth': current_month,
                'dropPercent': drop_percent
            })

    vulnerability_list.sort(key=lambda item: item['dropPercent'], reverse=True)

    grouped_zones: dict[str, dict[str, Any]] = {}
    for record in filtered_records:
        worker = worker_map.get(record['workerId'], {})
        zone = worker.get('zone') or 'Unknown Zone'

        if zone not in grouped_zones:
            grouped_zones[zone] = {
                'zone': zone,
                'net': 0.0,
                'workers': set()
            }

        grouped_zones[zone]['net'] += record['net']
        grouped_zones[zone]['workers'].add(record['workerId'])

    zone_distribution = [
        {
            'zone': bucket['zone'],
            'net': bucket['net'],
            'workers': len(bucket['workers'])
        }
        for bucket in grouped_zones.values()
    ]
    zone_distribution.sort(key=lambda item: item['net'], reverse=True)
    zone_distribution = zone_distribution[:8]

    gross_by_platform: dict[str, float] = {}
    for record in filtered_records:
        platform = _format_platform_label(record.get('platform'))
        gross_by_platform[platform] = gross_by_platform.get(platform, 0.0) + record['gross']

    top_platforms = [
        platform for platform, _ in sorted(
            gross_by_platform.items(),
            key=lambda entry: entry[1],
            reverse=True
        )[:4]
    ]

    month_buckets: list[dict[str, Any]] = []
    month_map: dict[str, dict[str, Any]] = {}

    for offset in range(5, -1, -1):
        month_start = _month_start_from_offset(now, -offset)
        key = month_start.strftime('%Y-%m')
        row: dict[str, Any] = {
            'key': key,
            'label': month_start.strftime('%b %y')
        }

        for platform in top_platforms:
            row[platform] = 0.0

        month_buckets.append(row)
        month_map[key] = row

    for record in filtered_records:
        platform = _format_platform_label(record.get('platform'))
        if platform not in top_platforms:
            continue

        record_month_key = date(
            record['sessionDate'].year,
            record['sessionDate'].month,
            1
        ).strftime('%Y-%m')
        row = month_map.get(record_month_key)
        if row is None:
            continue

        weighted_key = f'{platform}_weighted'
        gross_key = f'{platform}_gross'

        current_weighted = _to_number(row.get(weighted_key))
        current_gross_for_platform = _to_number(row.get(gross_key))

        row[weighted_key] = current_weighted + (record['deductionRate'] * record['gross'])
        row[gross_key] = current_gross_for_platform + record['gross']
        row[platform] = (
            row[weighted_key] / row[gross_key]
            if row[gross_key] > 0
            else 0.0
        )

    trend_rows: list[dict[str, Any]] = []
    for row in month_buckets:
        clean_row = {'label': row['label']}
        for platform in top_platforms:
            clean_row[platform] = _to_number(row.get(platform))
        trend_rows.append(clean_row)

    commission_trend = {
        'platforms': top_platforms,
        'data': trend_rows
    }

    data_coverage = {
        'sessionsInRange': len(filtered_records),
        'platformsTracked': len(top_platforms),
        'activeZones': len(zone_distribution),
        'latestSessionDate': filtered_records[0]['sessionDate'].isoformat() if filtered_records else None
    }

    return {
        'rangeDays': range_days,
        'workersCount': len(workers),
        'summary': summary,
        'vulnerabilityList': vulnerability_list,
        'zoneDistribution': zone_distribution,
        'commissionTrend': commission_trend,
        'clusters': clusters,
        'dataCoverage': data_coverage
    }


def _request_json(
    url: str,
    headers: dict[str, str] | None = None,
    params: dict[str, Any] | None = None
) -> Any:
    try:
        response = requests.get(
            url,
            headers=headers,
            params=params,
            timeout=request_timeout_seconds
        )
    except requests.RequestException as exc:
        raise RuntimeError(f'Request failed for {url}: {exc}') from exc

    if response.status_code >= 400:
        details = response.text.strip() or 'unknown upstream error'
        raise RuntimeError(f'Upstream call failed ({response.status_code}) for {url}: {details}')

    try:
        return response.json()
    except ValueError as exc:
        raise RuntimeError(f'Non-JSON upstream response for {url}') from exc


def _forward_headers(authorization: str | None) -> dict[str, str]:
    headers = {'x-service-name': service_name}
    if authorization and authorization.strip():
        headers['Authorization'] = authorization
    return headers


@app.get('/health')
def health_check():
    db = 'down'
    try:
        client = MongoClient(db_url, serverSelectionTimeoutMS=1500)
        client.admin.command('ping')
        db = 'up'
    except Exception:
        db = 'down'

    return {
        'service': service_name,
        'status': 'ok',
        'db': db,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }


@app.get('/advocate/dashboard')
def get_advocate_dashboard(
    range_days: int = Query(default=90, alias='range', ge=1, le=3650),
    max_clusters: int = Query(default=6, ge=1, le=100),
    authorization: str | None = Header(default=None)
):
    warnings: list[str] = []
    source_status = {
        'workers': 'up',
        'sessions': 'up',
        'earnings': 'up',
        'clusters': 'up'
    }

    workers: list[dict[str, Any]] = []
    sessions: list[dict[str, Any]] = []
    earnings: list[dict[str, Any]] = []
    clusters: list[dict[str, Any]] = []

    headers = _forward_headers(authorization)

    try:
        workers_payload = _request_json(f'{auth_service_url}/api/auth/workers/on-platform', headers=headers)
        workers = _normalize_workers_payload(workers_payload)
    except Exception:
        warnings.append('Workers channel unavailable')
        source_status['workers'] = 'down'

    try:
        sessions_payload = _request_json(f'{earnings_service_url}/work-sessions', headers=headers)
        sessions = [item for item in sessions_payload if isinstance(item, dict)] if isinstance(sessions_payload, list) else []
    except Exception:
        warnings.append('Work sessions channel unavailable')
        source_status['sessions'] = 'down'

    try:
        earnings_payload = _request_json(f'{earnings_service_url}/earnings', headers=headers)
        earnings = [item for item in earnings_payload if isinstance(item, dict)] if isinstance(earnings_payload, list) else []
    except Exception:
        warnings.append('Earnings channel unavailable')
        source_status['earnings'] = 'down'

    try:
        clusters_payload = _request_json(
            f'{grievance_service_url}/community/posts/clusters',
            headers=headers,
            params={'max_clusters': max_clusters}
        )
        if isinstance(clusters_payload, dict) and isinstance(clusters_payload.get('clusters'), list):
            clusters = [item for item in clusters_payload['clusters'] if isinstance(item, dict)]
    except Exception:
        warnings.append('Grievance clustering channel unavailable')
        source_status['clusters'] = 'down'

    records = _merge_sessions_with_earnings(sessions, earnings)
    payload = _compute_advocate_payload(
        workers=workers,
        records=records,
        clusters=clusters,
        range_days=range_days
    )

    payload['warning'] = (
        'Some data channels are unavailable. Dashboard shows best-effort analytics from reachable services.'
        if warnings
        else ''
    )
    payload['warnings'] = warnings
    payload['sourceStatus'] = source_status

    return payload


@app.get('/')
def root():
    return {
        'message': f'{service_name} is running',
        'endpoints': {
            'health': '/health',
            'advocate_dashboard': '/advocate/dashboard'
        }
    }
