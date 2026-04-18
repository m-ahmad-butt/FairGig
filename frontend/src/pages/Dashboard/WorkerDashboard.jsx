import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
	AlertTriangle,
	ArrowRight,
	BadgeCheck,
	BriefcaseBusiness,
	Car,
	Clock3,
	HandCoins,
	Truck,
	X
} from 'lucide-react';
import authService from '../../services/api/authService';
import earningsService from '../../services/api/earningsService';
import { initNotificationSocket } from '../../utils/socket';
import FairGigLogo from '../../components/Brand/FairGigLogo';
import Navbar from '../../components/Navigation/Navbar';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-PK')}`;

function formatPlatformLabel(platform) {
	return String(platform || '')
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (character) => character.toUpperCase()) || 'Platform';
}

function formatDateLabel(dateValue) {
	if (!dateValue) {
		return '-';
	}

	const current = new Date();
	const date = new Date(dateValue);
	const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
	const yesterdayStart = new Date(dayStart);
	yesterdayStart.setDate(dayStart.getDate() - 1);
	const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

	if (dateStart.getTime() === dayStart.getTime()) {
		return 'Today';
	}

	if (dateStart.getTime() === yesterdayStart.getTime()) {
		return 'Yesterday';
	}

	return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatTimeRange(startTime, endTime) {
	if (!startTime || !endTime) {
		return '-';
	}

	const start = new Date(startTime);
	const end = new Date(endTime);

	return `${start.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	})} - ${end.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit'
	})}`;
}

function formatDuration(hoursWorked) {
	const numericHours = Number(hoursWorked || 0);
	const totalMinutes = Math.max(0, Math.round(numericHours * 60));
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;

	return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function getShiftType(platform) {
	const normalized = String(platform || '').toLowerCase();

	if (
		normalized.includes('delivery') ||
		normalized.includes('food') ||
		normalized.includes('grocery') ||
		normalized.includes('courier')
	) {
		return { label: 'Delivery', icon: Truck };
	}

	if (
		normalized.includes('upwork') ||
		normalized.includes('fiverr') ||
		normalized.includes('freelancer') ||
		normalized.includes('workana') ||
		normalized.includes('guru') ||
		normalized.includes('people per hour')
	) {
		return { label: 'Freelance', icon: BriefcaseBusiness };
	}

	return { label: 'Ride Share', icon: Car };
}

function getActivityStatus(session) {
	const gross = Number(session.earning?.gross_earned || 0);
	const deduction = Number(session.earning?.platform_deductions || 0);
	const percentage = gross > 0 ? (deduction / gross) * 100 : 0;
	const evidence = session.evidance || session.evidence;
	const isVerified = evidence?.verified === true;

	if (isVerified) {
		return {
			label: 'VERIFIED',
			className: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
		};
	}

	if (percentage >= 30) {
		return {
			label: 'FLAGGED',
			className: 'bg-amber-100 text-amber-700 border border-amber-200'
		};
	}

	return {
		label: 'PENDING',
		className: 'bg-zinc-100 text-zinc-700 border border-zinc-200'
	};
}

function buildTrendPath(points) {
	if (points.length === 0) {
		return { path: '', circles: [] };
	}

	const values = points.map((point) => point.value);
	const allSame = values.every((value) => value === values[0]);

	if (allSame) {
		const circles = points.map((_, index) => {
			const x = (index / Math.max(points.length - 1, 1)) * 100;
			return { x, y: 52 };
		});

		const path = circles
			.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
			.join(' ');

		return { path, circles };
	}

	const max = Math.max(...values, 1);
	const min = Math.min(...values, 0);
	const range = max - min || 1;

	const circles = points.map((point, index) => {
		const x = (index / Math.max(points.length - 1, 1)) * 100;
		const y = 100 - ((point.value - min) / range) * 100;
		return { x, y };
	});

	const path = circles
		.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
		.join(' ');

	return { path, circles };
}

export default function WorkerDashboardPage() {
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [sessions, setSessions] = useState([]);
	const [notifications, setNotifications] = useState([]);
	const [stats, setStats] = useState({
		totalEarnings: 0,
		verifiedCount: 0,
		unverifiedCount: 0,
		verifiedEarnings: 0,
		anomalyCount: 0
	});
	const [topAnomaly, setTopAnomaly] = useState(null);
	const [anomalies, setAnomalies] = useState([]);

	useEffect(() => {
		loadData();
		setupNotificationListener();
	}, []);

	const loadData = async () => {
		try {
			const profile = await authService.getMe();
			setUser(profile);

			if (profile.role !== 'worker') {
				navigate('/');
				return;
			}

			const workerId = profile.id || profile._id;
			const rawSessions = await earningsService.getWorkSessions(workerId);
			const allEarnings = await earningsService.getEarningsByWorker(workerId);

			// Fetch anomalies from anomaly service
			let anomalyData = { anomalies: [], count: 0 };
			try {
				anomalyData = await earningsService.getWorkerAnomalies(workerId, 20);
			} catch (error) {
				console.warn('Failed to fetch anomalies:', error);
			}

			const merged = rawSessions
				.map((session) => {
					const earning = allEarnings.find((item) => item.session_id === session.id);
					const gross = Number(earning?.gross_earned || 0);
					const deduction = Number(earning?.platform_deductions || 0);
					const deductionPercent = gross > 0 ? (deduction / gross) * 100 : 0;

					return {
						...session,
						earning: earning || null,
						deductionPercent
					};
				})
				.sort((left, right) => new Date(right.session_date) - new Date(left.session_date));

			setSessions(merged);


			const verifiedEarnings = merged
				.filter((session) => {
					const evidence = session.evidance || session.evidence;
					return session.earning && evidence?.verified === true;
				})
				.reduce((sum, session) => sum + Number(session.earning?.net_received || 0), 0);

			const verifiedCount = merged.filter((session) => {
				const evidence = session.evidance || session.evidence;
				return session.earning && evidence?.verified === true;
			}).length;
			const unverifiedCount = merged.filter((session) => {
				const evidence = session.evidance || session.evidence;
				return session.earning && evidence?.verified !== true;
			}).length;

			const anomalySessions = merged
				.filter((session) => session.deductionPercent >= 30)
				.sort((left, right) => right.deductionPercent - left.deductionPercent);

			// Use real anomaly data if available, otherwise fall back to deduction-based detection
			const detectedAnomalies = anomalyData.anomalies.filter((a) => a.anomaly_detected);
			const anomalyCount = detectedAnomalies.length > 0 ? detectedAnomalies.length : anomalySessions.length;
			
			setAnomalies(detectedAnomalies);
			
			// Find the most recent or highest priority anomaly
			let primaryAnomaly = null;
			if (detectedAnomalies.length > 0) {
				// Use the most recent anomaly from the service
				primaryAnomaly = detectedAnomalies[0];
			} else if (anomalySessions.length > 0) {
				// Fall back to deduction-based detection
				primaryAnomaly = anomalySessions[0];
			}

			setTopAnomaly(primaryAnomaly);

			setStats({
				totalEarnings: merged.reduce((sum, session) => sum + Number(session.earning?.net_received || 0), 0),
				verifiedCount,
				unverifiedCount,
				verifiedEarnings,
				anomalyCount
			});
		} catch (error) {
			console.error('Failed to load dashboard:', error);
		} finally {
			setLoading(false);
		}
	};

	const setupNotificationListener = () => {
		try {
			const socket = initNotificationSocket();
			
			socket.on('new_notification', (data) => {
				if (data && data.notification) {
					const notification = data.notification;
					
					setNotifications(prev => {
						const updated = [notification, ...prev];
						return updated.slice(0, 10);
					});

					setTimeout(() => {
						setNotifications(prev => 
							prev.filter(n => n.id !== notification.id)
						);
					}, 6000);
				}
			});

			return () => {
				socket.off('new_notification');
			};
		} catch (error) {
			console.error('Failed to setup notification listener:', error);
		}
	};

	const dismissNotification = (notificationId) => {
		setNotifications(prev => prev.filter(n => n.id !== notificationId));
	};

	const weeklyTrend = useMemo(() => {
		const grouped = new Map();

		sessions.forEach((session) => {
			if (!session.earning) {
				return;
			}

			const date = new Date(session.session_date);
			const key = date.toISOString().slice(0, 10);

			if (!grouped.has(key)) {
				grouped.set(key, {
					key,
					label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
					value: 0
				});
			}

			grouped.get(key).value += Number(session.earning?.net_received || 0);
		});

		const sorted = Array.from(grouped.values()).sort((left, right) => new Date(left.key) - new Date(right.key));
		if (sorted.length > 0) {
			return sorted.slice(-7);
		}

		const today = new Date();
		return Array.from({ length: 7 }).map((_, index) => {
			const date = new Date(today);
			date.setDate(today.getDate() - (6 - index));
			return {
				key: date.toISOString().slice(0, 10),
				label: date.toLocaleDateString('en-US', { weekday: 'short' }),
				value: 0
			};
		});
	}, [sessions]);

	const trendDrawing = useMemo(() => buildTrendPath(weeklyTrend), [weeklyTrend]);
	const hasTrendData = useMemo(() => weeklyTrend.some((point) => point.value > 0), [weeklyTrend]);

	const recentSessions = useMemo(() => sessions.slice(0, 10), [sessions]);
	const firstName = user?.name?.trim()?.split(' ')[0] || 'Worker';

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-zinc-100">
				<div className="text-zinc-600">Loading dashboard...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-zinc-100 pb-8">
			<Navbar user={user} />

			<div className="fixed top-20 right-4 z-50 space-y-2">
				{notifications.map((notification) => (
					<div
						key={notification.id}
						className={`rounded-lg shadow-lg p-4 text-white max-w-sm animate-in fade-in slide-in-from-top ${
							notification.type === 'evidence_verified'
								? 'bg-green-500'
								: notification.type === 'evidence_flagged'
								? 'bg-red-500'
								: 'bg-amber-500'
						}`}
					>
						<div className="flex items-start justify-between gap-3">
							<div className="flex-1">
								<p className="font-semibold">{notification.title}</p>
								<p className="text-sm mt-1 opacity-90">{notification.message}</p>
							</div>
							<button
								onClick={() => dismissNotification(notification.id)}
								className="text-white hover:opacity-75 flex-shrink-0"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</div>
				))}
			</div>

			<div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 lg:px-8">
				<div className="mb-4">
					<h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Welcome back, {firstName}!</h1>
					<p className="mt-1 text-sm text-zinc-600">Your weekly performance and recent activity.</p>
				</div>

				<div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
					<div className="rounded-xl border border-[#2f3f5a] bg-gradient-to-br from-[#1b273c] via-[#2d3e5a] to-[#374559] p-5 text-white shadow-lg">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-200/90">Verified Earnings</p>
						<div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
							<div>
								<p className="text-4xl font-extrabold tracking-tight sm:text-5xl">{formatCurrency(stats.verifiedEarnings)}</p>
								<p className="mt-2 inline-flex items-center gap-2 rounded-md bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">
									<BadgeCheck className="h-3.5 w-3.5" />
									Verified {stats.verifiedCount} sessions
								</p>
							</div>

							<div className="h-40 w-full max-w-[340px] rounded-lg border border-white/10 bg-white/5 p-2">
								{hasTrendData ? (
									<svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="Weekly trend">
										<defs>
											<linearGradient id="trendStroke" x1="0%" y1="0%" x2="100%" y2="0%">
												<stop offset="0%" stopColor="#f5d0aa" />
												<stop offset="100%" stopColor="#f8f8f8" />
											</linearGradient>
										</defs>
										<path d={trendDrawing.path} fill="none" stroke="url(#trendStroke)" strokeWidth="2.2" strokeLinecap="round" />
										{trendDrawing.circles.map((point, index) => (
											<circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="2.4" fill="#f5d0aa" stroke="#1f2937" strokeWidth="1" />
										))}
									</svg>
								) : (
									<div className="flex h-full items-center justify-center text-xs text-zinc-200/80">No earnings trend yet</div>
								)}
							</div>
						</div>

						<div className="mt-5 flex flex-wrap gap-3">
							<button
								type="button"
								onClick={() => navigate('/worker/analytics')}
								className="rounded-lg bg-[#f6d7bf] px-4 py-2.5 text-sm font-semibold text-[#2a2a2a] transition-colors hover:bg-[#f2c9aa]"
							>
								View Analytics
							</button>
							<button
								type="button"
								onClick={() => navigate('/worker/certificate')}
								className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
							>
								Get Certificate
							</button>
						</div>
					</div>

					<div className="space-y-4">
						<div className="rounded-xl border border-red-200 bg-[#fbe7e7] p-4 text-red-800 shadow-sm">
							<div className="flex items-start gap-3">
								<AlertTriangle className="mt-0.5 h-5 w-5" />
								<div>
									<p className="font-semibold">Anomaly Detected</p>
									{topAnomaly ? (
										topAnomaly.explanation ? (
											// Real anomaly from service
											<p className="mt-1 text-sm">{topAnomaly.explanation}</p>
										) : (
											// Fallback deduction-based anomaly
											<p className="mt-1 text-sm">
												Unusual deduction detected on {formatDateLabel(topAnomaly.session_date)} - {Math.round(topAnomaly.deductionPercent)}% vs your usual.
											</p>
										)
									) : (
										<p className="mt-1 text-sm">No high-risk deductions detected in recent sessions.</p>
									)}
								</div>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
								<p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Verification</p>
								<div className="mt-3 space-y-2">
									<div className="flex items-center justify-between rounded-md bg-emerald-50 px-2.5 py-1.5 text-sm text-emerald-700">
										<span className="inline-flex items-center gap-1">
											<BadgeCheck className="h-4 w-4" />
											Verified
										</span>
										<strong>{stats.verifiedCount}</strong>
									</div>
									<div className="flex items-center justify-between rounded-md bg-amber-50 px-2.5 py-1.5 text-sm text-amber-700">
										<span className="inline-flex items-center gap-1">
											<Clock3 className="h-4 w-4" />
											Pending
										</span>
										<strong>{stats.unverifiedCount}</strong>
									</div>
								</div>
							</div>

							<button
								type="button"
								onClick={() => navigate('/worker/log-earnings')}
								className="rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-colors hover:bg-zinc-50"
							>
								<div className="inline-flex rounded-lg bg-[#1f2d42] p-2.5">
									<FairGigLogo size={28} showWordmark={false} />
								</div>
								<p className="mt-3 text-lg font-semibold text-zinc-900">Log a Shift</p>
								<p className="mt-1 text-sm text-zinc-600">Record manually</p>
							</button>
						</div>
					</div>
				</div>

				<div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
					<div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-5">
						<h2 className="text-xl font-semibold text-zinc-900">Recent Activity</h2>
						<button
							type="button"
							onClick={() => {
								const activitySection = document.querySelector('.activity-table-container');
								if (activitySection) {
									activitySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
								}
							}}
							className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
						>
							View All Activity
							<ArrowRight className="h-4 w-4" />
						</button>
					</div>

					{recentSessions.length > 0 ? (
						<div className="activity-table-container overflow-x-auto">
							<table className="w-full min-w-[900px] text-sm">
								<thead className="bg-zinc-50 text-zinc-500">
									<tr>
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Platform & Shift</th>
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Date & Time</th>
										<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Duration</th>
										<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Gross</th>
										<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Deductions</th>
										<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Net Earned</th>
										<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Status</th>
									</tr>
								</thead>
								<tbody>
									{recentSessions.map((session, index) => {
										const shift = getShiftType(session.platform);
										const gross = Number(session.earning?.gross_earned || 0);
										const deduction = Number(session.earning?.platform_deductions || 0);
										const deductionPercent = gross > 0 ? (deduction / gross) * 100 : 0;
										const status = getActivityStatus(session);
										const netValue = Number(session.earning?.net_received || 0);
										const RowIcon = shift.icon;

										return (
											<tr key={session.id || `${session.session_date}-${index}`} className="border-t border-zinc-100 text-zinc-800">
												<td className="px-4 py-3">
													<div className="flex items-center gap-3">
														<span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
															<RowIcon className="h-4 w-4" />
														</span>
														<div>
															<p className="font-semibold text-zinc-900">{shift.label} Shift</p>
															<p className="text-xs text-zinc-500">{formatPlatformLabel(session.platform)}</p>
														</div>
													</div>
												</td>
												<td className="px-4 py-3">
													<p>{formatDateLabel(session.session_date)}</p>
													<p className="text-xs text-zinc-500">{formatTimeRange(session.start_time, session.end_time)}</p>
												</td>
												<td className="px-4 py-3">{formatDuration(session.hours_worked)}</td>
												<td className="px-4 py-3 text-right">{formatCurrency(gross)}</td>
												<td className="px-4 py-3 text-right text-red-600">
													- {formatCurrency(deduction)}
													<span className="ml-1 text-xs">({Math.round(deductionPercent)}%)</span>
												</td>
												<td className="px-4 py-3 text-right font-semibold">{formatCurrency(netValue)}</td>
												<td className="px-4 py-3 text-right">
													<span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
														{status.label === 'VERIFIED' && <BadgeCheck className="h-3.5 w-3.5" />}
														{status.label === 'FLAGGED' && <AlertTriangle className="h-3.5 w-3.5" />}
														{status.label === 'PENDING' && <Clock3 className="h-3.5 w-3.5" />}
														{status.label}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : (
						<div className="px-5 py-10 text-center">
							<p className="text-zinc-600">No recent activity found.</p>
							<Link
								to="/worker/log-earnings"
								className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
							>
								<HandCoins className="h-4 w-4" />
								Log your first shift
							</Link>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}