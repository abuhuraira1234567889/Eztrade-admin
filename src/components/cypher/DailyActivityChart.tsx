"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type DailyPoint = { date: string; signups: number; deposits: number };

/**
 * Dual-line activity chart for admin analytics. No chart-lib dependency -
 * inline SVG. Left axis = signups (purple), right axis = deposits in USD (green).
 */
export function DailyActivityChart({ data, height = 160 }: { data: DailyPoint[]; height?: number }) {
 const { t } = useTranslation("common");
 const { points, maxSignups, maxDeposits, totalSignups, totalDeposits } = useMemo(() => {
 if (data.length === 0) return { points: [], maxSignups: 0, maxDeposits: 0, totalSignups: 0, totalDeposits: 0 };
 const maxS = Math.max(1, ...data.map((d) => d.signups));
 const maxD = Math.max(1, ...data.map((d) => d.deposits));
 const totS = data.reduce((s, d) => s + d.signups, 0);
 const totD = data.reduce((s, d) => s + d.deposits, 0);
 return { points: data, maxSignups: maxS, maxDeposits: maxD, totalSignups: totS, totalDeposits: totD };
 }, [data]);

 if (points.length < 2) {
 return (
 <div className="rounded-xl border border-border bg-surface p-6 text-center">
 <div className="text-xs text-muted-foreground">{t("activityChart.empty")}</div>
 </div>
 );
 }

 const W = 600;
 const H = height;
 const padX = 8;
 const padY = 16;
 const innerW = W - padX * 2;
 const innerH = H - padY * 2;
 const xStep = innerW / Math.max(1, points.length - 1);

 const ySignup = (v: number) => padY + ((maxSignups - v) / maxSignups) * innerH;
 const yDep = (v: number) => padY + ((maxDeposits - v) / maxDeposits) * innerH;

 const sPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(padX + i * xStep).toFixed(1)} ${ySignup(p.signups).toFixed(1)}`).join(" ");
 const dPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(padX + i * xStep).toFixed(1)} ${yDep(p.deposits).toFixed(1)}`).join(" ");

 return (
 <div className="rounded-xl border border-border bg-surface p-4">
 <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
 <div>
 <div className="eyebrow eyebrow--muted">{t("activityChart.title")}</div>
 <div className="text-xs text-muted-foreground mt-0.5">{t("activityChart.days", { count: points.length })}</div>
 </div>
 <div className="flex items-center gap-4 text-xs">
 <div className="flex items-center gap-1.5">
 <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple" />
 <span className="">{t("activityChart.signups", { count: totalSignups })}</span>
 </div>
 <div className="flex items-center gap-1.5">
 <span className="inline-block w-2.5 h-2.5 rounded-full bg-green" />
 <span className="">{t("activityChart.deposits", { amount: totalDeposits.toLocaleString(undefined, { maximumFractionDigits: 0 }) })}</span>
 </div>
 </div>
 </div>

 <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
 <defs>
 <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
 <stop offset="0%" stopColor="#9236da" stopOpacity="0.30" />
 <stop offset="100%" stopColor="#9236da" stopOpacity="0" />
 </linearGradient>
 <linearGradient id="dg" x1="0" x2="0" y1="0" y2="1">
 <stop offset="0%" stopColor="#26A69A" stopOpacity="0.30" />
 <stop offset="100%" stopColor="#26A69A" stopOpacity="0" />
 </linearGradient>
 </defs>

 {/* Grid baseline */}
 <line x1={padX} x2={W - padX} y1={H - padY} y2={H - padY} stroke="rgba(20,20,30,0.06)" />

 {/* Signups area */}
 <path
 d={`${sPath} L ${(padX + (points.length - 1) * xStep).toFixed(1)} ${H - padY} L ${padX} ${H - padY} Z`}
 fill="url(#sg)"
 />
 {/* Deposits area */}
 <path
 d={`${dPath} L ${(padX + (points.length - 1) * xStep).toFixed(1)} ${H - padY} L ${padX} ${H - padY} Z`}
 fill="url(#dg)"
 />

 {/* Lines */}
 <path d={sPath} fill="none" stroke="#9236da" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
 <path d={dPath} fill="none" stroke="#26A69A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

 {/* End-point dots */}
 {points.length > 0 && (
 <>
 <circle cx={padX + (points.length - 1) * xStep} cy={ySignup(points[points.length - 1].signups)} r="3.5" fill="#9236da" />
 <circle cx={padX + (points.length - 1) * xStep} cy={yDep(points[points.length - 1].deposits)} r="3.5" fill="#26A69A" />
 </>
 )}
 </svg>
 </div>
 );
}
