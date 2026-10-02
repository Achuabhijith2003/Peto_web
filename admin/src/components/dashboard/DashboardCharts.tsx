import React, { useState } from "react";
import {
  UserGrowthPoint,
  ContentCreationPoint,
  EngagementPoint,
  ReportsTrendPoint,
} from "../../types/admin";
import { TrendingUp, Layers, Activity, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardChartsProps {
  userGrowth: UserGrowthPoint[];
  contentCreation: ContentCreationPoint[];
  engagement: EngagementPoint[];
  reports: ReportsTrendPoint[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  userGrowth,
  contentCreation,
  engagement,
  reports,
}) => {
  const [activeTab, setActiveTab] = useState<"users" | "content" | "engagement" | "reports">("users");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // SVG Chart Dimensions
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Render User Growth Chart
  const renderUserGrowthChart = () => {
    const data = userGrowth || [];
    if (data.length === 0) return <EmptyChart message="No user growth data for this period" />;

    const maxVal = Math.max(5, ...data.map((d) => Math.max(d.totalUsers, d.newUsers * 2)));
    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

    const pointsTotal = data.map((d, i) => {
      const x = padding.left + (data.length > 1 ? i * stepX : chartWidth / 2);
      const y = padding.top + chartHeight - (d.totalUsers / maxVal) * chartHeight;
      return { x, y, val: d.totalUsers, label: d.date, newUsers: d.newUsers };
    });

    const pointsNew = data.map((d, i) => {
      const x = padding.left + (data.length > 1 ? i * stepX : chartWidth / 2);
      const y = padding.top + chartHeight - ((d.newUsers * 2) / maxVal) * chartHeight;
      return { x, y, val: d.newUsers };
    });

    const linePathTotal = pointsTotal.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPathTotal = `${linePathTotal} L ${pointsTotal[pointsTotal.length - 1].x} ${
      padding.top + chartHeight
    } L ${pointsTotal[0].x} ${padding.top + chartHeight} Z`;

    const linePathNew = pointsNew.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="userTotalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = padding.top + chartHeight * p;
          const val = Math.round(maxVal * (1 - p));
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="currentColor"
                className="text-border"
                strokeDasharray="4 4"
              />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPathTotal} fill="url(#userTotalGrad)" />

        {/* Lines */}
        <path d={linePathTotal} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={linePathNew} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />

        {/* Interactive points & X labels */}
        {pointsTotal.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === idx ? 6 : 3.5}
              fill="var(--color-primary)"
              stroke="var(--color-card)"
              strokeWidth="2"
              className="transition-all cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            />
            {idx % Math.ceil(data.length / 8) === 0 && (
              <text
                x={p.x}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground font-mono"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}

        {/* Tooltip Overlay */}
        {hoverIndex !== null && pointsTotal[hoverIndex] && (
          <g transform={`translate(${pointsTotal[hoverIndex].x}, ${pointsTotal[hoverIndex].y})`}>
            <line
              x1={0}
              y1={-pointsTotal[hoverIndex].y + padding.top}
              x2={0}
              y2={chartHeight - (pointsTotal[hoverIndex].y - padding.top)}
              stroke="currentColor"
              className="text-primary/60"
              strokeDasharray="2 2"
            />
            <rect
              x={pointsTotal[hoverIndex].x > width - 130 ? -125 : 10}
              y={-50}
              width={115}
              height={52}
              rx={8}
              className="fill-popover stroke-border shadow-lg"
            />
            <text
              x={pointsTotal[hoverIndex].x > width - 130 ? -68 : 67}
              y={-34}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground font-medium"
            >
              {pointsTotal[hoverIndex].label}
            </text>
            <text
              x={pointsTotal[hoverIndex].x > width - 130 ? -68 : 67}
              y={-18}
              textAnchor="middle"
              className="text-[11px] fill-primary font-bold font-mono"
            >
              Total: {pointsTotal[hoverIndex].val}
            </text>
            <text
              x={pointsTotal[hoverIndex].x > width - 130 ? -68 : 67}
              y={-4}
              textAnchor="middle"
              className="text-[9px] fill-amber-600 dark:text-amber-400 font-mono font-semibold"
            >
              New: +{pointsTotal[hoverIndex].newUsers}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Render Content Creation Multi-Bar / Line Chart
  const renderContentChart = () => {
    const data = contentCreation || [];
    if (data.length === 0) return <EmptyChart message="No content creation data for this period" />;

    const maxVal = Math.max(5, ...data.map((d) => Math.max(d.posts, d.reels, d.comments)));
    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

    const pointsPosts = data.map((d, i) => ({
      x: padding.left + (data.length > 1 ? i * stepX : chartWidth / 2),
      y: padding.top + chartHeight - (d.posts / maxVal) * chartHeight,
      posts: d.posts,
      reels: d.reels,
      comments: d.comments,
      label: d.date,
    }));

    const linePathPosts = pointsPosts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const linePathComments = data
      .map((d, i) => {
        const x = padding.left + (data.length > 1 ? i * stepX : chartWidth / 2);
        const y = padding.top + chartHeight - (d.comments / maxVal) * chartHeight;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = padding.top + chartHeight * p;
          const val = Math.round(maxVal * (1 - p));
          return (
            <g key={idx}>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="currentColor" className="text-border" strokeDasharray="4 4" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">
                {val}
              </text>
            </g>
          );
        })}

        <path d={linePathPosts} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
        <path d={linePathComments} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />

        {pointsPosts.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === idx ? 6 : 3.5}
              fill="#10b981"
              stroke="var(--color-card)"
              strokeWidth="2"
              className="transition-all cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            />
            {idx % Math.ceil(data.length / 8) === 0 && (
              <text
                x={p.x}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground font-mono"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}

        {hoverIndex !== null && pointsPosts[hoverIndex] && (
          <g transform={`translate(${pointsPosts[hoverIndex].x}, ${pointsPosts[hoverIndex].y})`}>
            <line
              x1={0}
              y1={-pointsPosts[hoverIndex].y + padding.top}
              x2={0}
              y2={chartHeight - (pointsPosts[hoverIndex].y - padding.top)}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="2 2"
            />
            <rect
              x={pointsPosts[hoverIndex].x > width - 130 ? -125 : 10}
              y={-58}
              width={115}
              height={60}
              rx={8}
              className="fill-popover stroke-border shadow-lg"
            />
            <text
              x={pointsPosts[hoverIndex].x > width - 130 ? -68 : 67}
              y={-42}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground font-medium"
            >
              {pointsPosts[hoverIndex].label}
            </text>
            <text
              x={pointsPosts[hoverIndex].x > width - 130 ? -68 : 67}
              y={-26}
              textAnchor="middle"
              className="text-[11px] fill-emerald-600 dark:text-emerald-400 font-bold font-mono"
            >
              Posts: {pointsPosts[hoverIndex].posts}
            </text>
            <text
              x={pointsPosts[hoverIndex].x > width - 130 ? -68 : 67}
              y={-12}
              textAnchor="middle"
              className="text-[9px] fill-amber-600 dark:text-amber-400 font-mono font-semibold"
            >
              Reels: {pointsPosts[hoverIndex].reels} · Comments: {pointsPosts[hoverIndex].comments}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Render Engagement Multi-Bar Chart
  const renderEngagementChart = () => {
    const data = engagement || [];
    if (data.length === 0) return <EmptyChart message="No engagement data for this period" />;

    const maxVal = Math.max(5, ...data.map((d) => d.totalInteractions));
    const barWidth = Math.max(4, Math.min(24, (chartWidth / data.length) * 0.6));
    const stepX = chartWidth / data.length;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = padding.top + chartHeight * p;
          const val = Math.round(maxVal * (1 - p));
          return (
            <g key={idx}>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="currentColor" className="text-border" strokeDasharray="4 4" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">
                {val}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = padding.left + i * stepX + (stepX - barWidth) / 2;
          const barHeight = (d.totalInteractions / maxVal) * chartHeight;
          const y = padding.top + chartHeight - barHeight;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx={3}
                fill={hoverIndex === i ? "var(--color-primary)" : "var(--color-primary)"}
                opacity={hoverIndex === i ? 1 : 0.8}
                className="transition-all cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
              {i % Math.ceil(data.length / 8) === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  className="text-[10px] fill-muted-foreground font-mono"
                >
                  {d.date}
                </text>
              )}
            </g>
          );
        })}

        {hoverIndex !== null && data[hoverIndex] && (
          <g
            transform={`translate(${
              padding.left + hoverIndex * stepX + stepX / 2
            }, ${
              padding.top + chartHeight - (data[hoverIndex].totalInteractions / maxVal) * chartHeight
            })`}
          >
            <rect
              x={hoverIndex > data.length / 2 ? -120 : 10}
              y={-48}
              width={110}
              height={46}
              rx={8}
              className="fill-popover stroke-border shadow-lg"
            />
            <text
              x={hoverIndex > data.length / 2 ? -65 : 65}
              y={-30}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground font-medium"
            >
              {data[hoverIndex].date}
            </text>
            <text
              x={hoverIndex > data.length / 2 ? -65 : 65}
              y={-14}
              textAnchor="middle"
              className="text-[11px] fill-primary font-bold font-mono"
            >
              {data[hoverIndex].totalInteractions} Interactions
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Render Reports / Moderation Trend Chart
  const renderReportsChart = () => {
    const data = reports || [];
    if (data.length === 0) return <EmptyChart message="No moderation reports filed for this period" />;

    const maxVal = Math.max(5, ...data.map((d) => Math.max(d.reports, d.resolved)));
    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

    const pointsFiled = data.map((d, i) => ({
      x: padding.left + (data.length > 1 ? i * stepX : chartWidth / 2),
      y: padding.top + chartHeight - (d.reports / maxVal) * chartHeight,
      val: d.reports,
      resolved: d.resolved,
      label: d.date,
    }));

    const pointsResolved = data.map((d, i) => ({
      x: padding.left + (data.length > 1 ? i * stepX : chartWidth / 2),
      y: padding.top + chartHeight - (d.resolved / maxVal) * chartHeight,
      val: d.resolved,
    }));

    const linePathFiled = pointsFiled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const linePathResolved = pointsResolved.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = padding.top + chartHeight * p;
          const val = Math.round(maxVal * (1 - p));
          return (
            <g key={idx}>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="currentColor" className="text-border" strokeDasharray="4 4" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground font-mono">
                {val}
              </text>
            </g>
          );
        })}

        <path d={linePathFiled} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        <path d={linePathResolved} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />

        {pointsFiled.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === idx ? 6 : 3.5}
              fill="#ef4444"
              stroke="var(--color-card)"
              strokeWidth="2"
              className="transition-all cursor-pointer"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            />
            {idx % Math.ceil(data.length / 8) === 0 && (
              <text
                x={p.x}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground font-mono"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}

        {hoverIndex !== null && pointsFiled[hoverIndex] && (
          <g transform={`translate(${pointsFiled[hoverIndex].x}, ${pointsFiled[hoverIndex].y})`}>
            <rect
              x={pointsFiled[hoverIndex].x > width - 130 ? -125 : 10}
              y={-50}
              width={115}
              height={50}
              rx={8}
              className="fill-popover stroke-border shadow-lg"
            />
            <text
              x={pointsFiled[hoverIndex].x > width - 130 ? -68 : 67}
              y={-34}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground font-medium"
            >
              {pointsFiled[hoverIndex].label}
            </text>
            <text
              x={pointsFiled[hoverIndex].x > width - 130 ? -68 : 67}
              y={-18}
              textAnchor="middle"
              className="text-[11px] fill-destructive font-bold font-mono"
            >
              Filed: {pointsFiled[hoverIndex].val}
            </text>
            <text
              x={pointsFiled[hoverIndex].x > width - 130 ? -68 : 67}
              y={-4}
              textAnchor="middle"
              className="text-[9px] fill-emerald-600 dark:text-emerald-400 font-mono font-semibold"
            >
              Resolved: {pointsFiled[hoverIndex].resolved}
            </text>
          </g>
        )}
      </svg>
    );
  };

  return (
    <Card className="shadow-xs overflow-hidden">
      <CardHeader className="border-b border-border pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base font-bold font-heading">
            Platform Operational Trends
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Time-series data mapped to the active date filter window.
          </CardDescription>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              activeTab === "users" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="size-3.5 text-primary" />
            <span>User Growth</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              activeTab === "content" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="size-3.5 text-emerald-500" />
            <span>Content Velocity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("engagement")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              activeTab === "engagement" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Activity className="size-3.5 text-blue-500" />
            <span>Engagement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
              activeTab === "reports" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldAlert className="size-3.5 text-destructive" />
            <span>Moderation</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Active Chart Legend */}
        <div className="flex items-center gap-6 text-xs text-muted-foreground px-1 flex-wrap">
          {activeTab === "users" && (
            <>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-primary" />
                <span>Cumulative Total Users</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 border-b border-dashed border-amber-500" />
                <span>New Users in Period</span>
              </div>
            </>
          )}
          {activeTab === "content" && (
            <>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <span>Posts & Reels Velocity</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 border-b border-dashed border-amber-500" />
                <span>Comments</span>
              </div>
            </>
          )}
          {activeTab === "engagement" && (
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-sm bg-primary" />
              <span>Total Interactions (Likes + Comments + Bookmarks)</span>
            </div>
          )}
          {activeTab === "reports" && (
            <>
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-destructive" />
                <span>Reports Filed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 border-b border-dashed border-emerald-500" />
                <span>Resolved</span>
              </div>
            </>
          )}
        </div>

        {/* Main SVG Chart Container */}
        <div className="w-full min-h-[260px] flex items-center justify-center">
          {activeTab === "users" && renderUserGrowthChart()}
          {activeTab === "content" && renderContentChart()}
          {activeTab === "engagement" && renderEngagementChart()}
          {activeTab === "reports" && renderReportsChart()}
        </div>
      </CardContent>
    </Card>
  );
};

const EmptyChart: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-56 flex flex-col items-center justify-center text-muted-foreground text-xs italic space-y-2">
    <span>{message}</span>
  </div>
);

export default DashboardCharts;
