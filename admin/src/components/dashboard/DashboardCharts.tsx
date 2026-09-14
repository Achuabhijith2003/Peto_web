import React, { useState } from "react";
import {
  UserGrowthPoint,
  ContentCreationPoint,
  EngagementPoint,
  ReportsTrendPoint,
} from "../../types/admin";
import { TrendingUp, Layers, Activity, ShieldAlert } from "lucide-react";

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
            <stop offset="0%" stopColor="#0058be" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0058be" stopOpacity="0.0" />
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
                stroke="#e2e8f8"
                strokeDasharray="4 4"
              />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-[#534434] font-mono">
                {val}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPathTotal} fill="url(#userTotalGrad)" />

        {/* Lines */}
        <path d={linePathTotal} fill="none" stroke="#0058be" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d={linePathNew} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />

        {/* Interactive points & X labels */}
        {pointsTotal.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === idx ? 6 : 3.5}
              fill="#0058be"
              stroke="#ffffff"
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
                className="text-[10px] fill-[#534434] font-mono"
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
              stroke="#bed7fc"
              strokeDasharray="2 2"
              opacity="0.8"
            />
            <rect
              x={pointsTotal[hoverIndex].x > width - 130 ? -125 : 10}
              y={-50}
              width={115}
              height={52}
              rx={8}
              fill="#ffffff"
              stroke="#e2e8f8"
              filter="drop-shadow(0 4px 10px rgba(21, 28, 39, 0.12))"
            />
            <text
              x={pointsTotal[hoverIndex].x > width - 130 ? -68 : 67}
              y={-34}
              textAnchor="middle"
              className="text-[10px] fill-[#534434] font-medium"
            >
              {pointsTotal[hoverIndex].label}
            </text>
            <text
              x={pointsTotal[hoverIndex].x > width - 130 ? -68 : 67}
              y={-18}
              textAnchor="middle"
              className="text-[11px] fill-[#0058be] font-bold font-mono"
            >
              Total: {pointsTotal[hoverIndex].val}
            </text>
            <text
              x={pointsTotal[hoverIndex].x > width - 130 ? -68 : 67}
              y={-4}
              textAnchor="middle"
              className="text-[9px] fill-[#855300] font-mono font-semibold"
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
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="#e2e8f8" strokeDasharray="4 4" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-[#534434] font-mono">
                {val}
              </text>
            </g>
          );
        })}

        <path d={linePathPosts} fill="none" stroke="#006c49" strokeWidth="2.5" strokeLinecap="round" />
        <path d={linePathComments} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />

        {pointsPosts.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === idx ? 6 : 3.5}
              fill="#006c49"
              stroke="#ffffff"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            />
            {idx % Math.ceil(data.length / 8) === 0 && (
              <text
                x={p.x}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                className="text-[10px] fill-[#534434] font-mono"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}

        {hoverIndex !== null && pointsPosts[hoverIndex] && (
          <g transform={`translate(${pointsPosts[hoverIndex].x}, ${pointsPosts[hoverIndex].y})`}>
            <rect
              x={pointsPosts[hoverIndex].x > width - 130 ? -125 : 10}
              y={-60}
              width={115}
              height={58}
              rx={8}
              fill="#ffffff"
              stroke="#e2e8f8"
              filter="drop-shadow(0 4px 10px rgba(21, 28, 39, 0.12))"
            />
            <text
              x={pointsPosts[hoverIndex].x > width - 130 ? -68 : 67}
              y={-44}
              textAnchor="middle"
              className="text-[10px] fill-[#534434] font-medium"
            >
              {pointsPosts[hoverIndex].label}
            </text>
            <text
              x={pointsPosts[hoverIndex].x > width - 130 ? -68 : 67}
              y={-28}
              textAnchor="middle"
              className="text-[11px] fill-[#006c49] font-bold font-mono"
            >
              Posts: {pointsPosts[hoverIndex].posts}
            </text>
            <text
              x={pointsPosts[hoverIndex].x > width - 130 ? -68 : 67}
              y={-12}
              textAnchor="middle"
              className="text-[10px] fill-[#855300] font-mono font-semibold"
            >
              Comments: {pointsPosts[hoverIndex].comments}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Render Engagement Breakdown Bar Chart
  const renderEngagementChart = () => {
    const data = engagement || [];
    if (data.length === 0) return <EmptyChart message="No engagement data for this period" />;

    const maxVal = Math.max(5, ...data.map((d) => d.totalInteractions));
    const stepX = chartWidth / data.length;
    const barWidth = Math.max(6, Math.min(22, stepX * 0.6));

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = padding.top + chartHeight * p;
          const val = Math.round(maxVal * (1 - p));
          return (
            <g key={idx}>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="#e2e8f8" strokeDasharray="4 4" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-[#534434] font-mono">
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
            <g
              key={i}
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx={4}
                className={`transition-colors ${
                  hoverIndex === i ? "fill-[#0058be]" : "fill-[#0058be]/80 hover:fill-[#0058be]"
                }`}
              />
              {i % Math.ceil(data.length / 8) === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={padding.top + chartHeight + 20}
                  textAnchor="middle"
                  className="text-[10px] fill-[#534434] font-mono"
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
            }, ${padding.top + chartHeight - (data[hoverIndex].totalInteractions / maxVal) * chartHeight})`}
          >
            <rect
              x={hoverIndex > data.length / 2 ? -120 : 10}
              y={-45}
              width={110}
              height={42}
              rx={8}
              fill="#ffffff"
              stroke="#e2e8f8"
              filter="drop-shadow(0 4px 10px rgba(21, 28, 39, 0.12))"
            />
            <text
              x={hoverIndex > data.length / 2 ? -65 : 65}
              y={-30}
              textAnchor="middle"
              className="text-[10px] fill-[#534434] font-medium"
            >
              {data[hoverIndex].date}
            </text>
            <text
              x={hoverIndex > data.length / 2 ? -65 : 65}
              y={-14}
              textAnchor="middle"
              className="text-[11px] fill-[#0058be] font-bold font-mono"
            >
              {data[hoverIndex].totalInteractions} Interactions
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Render Reports & Resolutions Trend Chart
  const renderReportsChart = () => {
    const data = reports || [];
    if (data.length === 0) return <EmptyChart message="No reports filed during this period" />;

    const maxVal = Math.max(5, ...data.map((d) => Math.max(d.reports, d.resolved)));
    const stepX = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

    const pointsFiled = data.map((d, i) => ({
      x: padding.left + (data.length > 1 ? i * stepX : chartWidth / 2),
      y: padding.top + chartHeight - (d.reports / maxVal) * chartHeight,
      reports: d.reports,
      resolved: d.resolved,
      label: d.date,
    }));

    const linePathFiled = pointsFiled.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const linePathResolved = data
      .map((d, i) => {
        const x = padding.left + (data.length > 1 ? i * stepX : chartWidth / 2);
        const y = padding.top + chartHeight - (d.resolved / maxVal) * chartHeight;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
          const y = padding.top + chartHeight * p;
          const val = Math.round(maxVal * (1 - p));
          return (
            <g key={idx}>
              <line x1={padding.left} y1={y} x2={padding.left + chartWidth} y2={y} stroke="#e2e8f8" strokeDasharray="4 4" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-[#534434] font-mono">
                {val}
              </text>
            </g>
          );
        })}

        <path d={linePathFiled} fill="none" stroke="#ba1a1a" strokeWidth="2.5" strokeLinecap="round" />
        <path d={linePathResolved} fill="none" stroke="#006c49" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />

        {pointsFiled.map((p, idx) => (
          <g key={idx}>
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === idx ? 6 : 3.5}
              fill="#ba1a1a"
              stroke="#ffffff"
              strokeWidth="2"
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoverIndex(idx)}
              onMouseLeave={() => setHoverIndex(null)}
            />
            {idx % Math.ceil(data.length / 8) === 0 && (
              <text
                x={p.x}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                className="text-[10px] fill-[#534434] font-mono"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 space-y-6">
      {/* Chart Header & Tab Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e8f8] pb-4">
        <div>
          <h2 className="text-base font-bold text-[#151c27] font-heading tracking-tight">Platform Operational Trends</h2>
          <p className="text-xs text-[#534434] mt-0.5">Time-series data mapped to the active date filter window.</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#f0f3ff] border border-[#e2e8f8] overflow-x-auto">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "users" ? "bg-[#0058be] text-white shadow-xs font-semibold" : "text-[#534434] hover:text-[#151c27]"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>User Growth</span>
          </button>

          <button
            onClick={() => setActiveTab("content")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "content" ? "bg-[#0058be] text-white shadow-xs font-semibold" : "text-[#534434] hover:text-[#151c27]"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Content Velocity</span>
          </button>

          <button
            onClick={() => setActiveTab("engagement")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "engagement"
                ? "bg-[#0058be] text-white shadow-xs font-semibold"
                : "text-[#534434] hover:text-[#151c27]"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Engagement</span>
          </button>

          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === "reports" ? "bg-[#0058be] text-white shadow-xs font-semibold" : "text-[#534434] hover:text-[#151c27]"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Moderation</span>
          </button>
        </div>
      </div>

      {/* Active Chart Legend */}
      <div className="flex items-center space-x-6 text-xs text-[#534434] px-2">
        {activeTab === "users" && (
          <>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#0058be]"></span>
              <span>Cumulative Total Users</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-0.5 border-b border-dashed border-[#f59e0b]"></span>
              <span>New Users in Period</span>
            </div>
          </>
        )}
        {activeTab === "content" && (
          <>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#006c49]"></span>
              <span>Posts & Reels Velocity</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-0.5 border-b border-dashed border-[#f59e0b]"></span>
              <span>Comments</span>
            </div>
          </>
        )}
        {activeTab === "engagement" && (
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-sm bg-[#0058be]"></span>
            <span>Total Interactions (Likes + Comments + Bookmarks)</span>
          </div>
        )}
        {activeTab === "reports" && (
          <>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-[#ba1a1a]"></span>
              <span>Reports Filed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-0.5 border-b border-dashed border-[#006c49]"></span>
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
    </div>
  );
};

const EmptyChart: React.FC<{ message: string }> = ({ message }) => (
  <div className="h-56 flex flex-col items-center justify-center text-[#534434] text-xs italic space-y-2">
    <span>{message}</span>
  </div>
);
