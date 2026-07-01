import { useState } from "react";
import {
  useGetDashboardStats,
  useGetRecentActivity,
  useListTasks,
  useUpdateTask,
  getListTasksQueryKey
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FolderKanban, Users, TrendingUp, IndianRupee, Clock, BarChart3, CheckCircle2, UserCircle2
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatDistanceToNow, isToday, isBefore, parseISO } from "date-fns";

const RANGE_OPTIONS = [
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "12m", label: "12M" },
  { key: "ytd", label: "YTD" },
];

function StatCard({
  label, value, icon, trend, color = "primary",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}) {
  return (
    <Card className="scale-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1.5 text-2xl font-bold font-heading text-foreground">{value}</p>
            {trend && <p className="mt-1 text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-primary/10 text-primary`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [chartRange, setChartRange] = useState<string>("6m");
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { token } = useAuth();
  const { data: revenueChart, isLoading: chartLoading } = useQuery<{ month: string; amount: number }[]>({
    queryKey: ["revenue-chart", chartRange],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/revenue-chart?range=${chartRange}`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      if (!res.ok) throw new Error("Failed to fetch revenue chart");
      return res.json();
    },
    enabled: !!token,
  });
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: allTasks, isLoading: tasksLoading } = useListTasks();

  const updateTaskMutation = useUpdateTask({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
      }
    }
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const isAdmin = user?.systemRole === "SUPER_ADMIN" || user?.systemRole === "MANAGER";

  // Filter My Tasks
  const taskList = Array.isArray(allTasks) ? allTasks : ((allTasks as any)?.items ?? []);
  const myTasks = taskList.filter((t: any) => t.assigneeId === user?.id && t.status !== "DONE");
  
  // Filter Team Tasks (Admin only)
  const teamTasks = taskList.filter((t: any) => t.assigneeId !== user?.id && t.status !== "DONE");

  const toggleTaskStatus = (taskId: string, currentStatus: string, taskTitle: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    updateTaskMutation.mutate({ id: taskId, data: { title: taskTitle, status: newStatus } });
    if (newStatus === "DONE") {
      toast.success("Task completed!");
    }
  };

  const renderTaskList = (tasks: any[], emptyMessage: string) => {
    if (tasksLoading) return <Skeleton className="h-32" />;
    if (tasks.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">{emptyMessage}</p>;

    return (
      <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {tasks.map(task => (
          <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/30 transition-colors group">
            <Checkbox 
              checked={task.status === "DONE"} 
              onCheckedChange={() => toggleTaskStatus(task.id, task.status, task.title)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.status === "DONE" ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                {task.projectName && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">{task.projectName}</Badge>
                )}
                {task.dueDate && isToday(parseISO(task.dueDate)) && (
                  <span className="text-[10px] font-semibold text-rose-500">Due Today</span>
                )}
                {task.dueDate && isBefore(parseISO(task.dueDate), new Date()) && !isToday(parseISO(task.dueDate)) && (
                  <span className="text-[10px] font-semibold text-rose-600">Overdue</span>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <UserCircle2 className="h-3 w-3" /> Assigned by Admin
                </span>
                {task.assigneeName && task.assigneeId !== user?.id && (
                  <span className="text-[10px] text-primary flex items-center gap-1">
                    Assignee: {task.assigneeName}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 animated-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">
            {greeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Here is what is happening at Blink Beyond today.
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              label="Active Projects"
              value={stats?.activeProjects ?? 0}
              icon={<FolderKanban className="h-5 w-5" />}
            />
            <StatCard
              label="Total Clients"
              value={stats?.totalClients ?? 0}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Open Leads"
              value={stats?.openLeads ?? 0}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              label="Revenue Collected"
              value={`₹${((stats?.revenuePaid ?? 0) / 100000).toFixed(1)}L`}
              icon={<IndianRupee className="h-5 w-5" />}
              trend={`₹${((stats?.outstanding ?? 0) / 100000).toFixed(1)}L outstanding`}
            />
            <StatCard
              label="Tasks Due"
              value={stats?.tasksDue ?? 0}
              icon={<Clock className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Daily Tasks Panel */}
        <Card className="xl:col-span-1 border-primary/20 bg-primary/5 shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <CheckCircle2 className="h-5 w-5" /> Daily Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Tabs defaultValue="mine" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="mine">My To-Do List</TabsTrigger>
                {isAdmin && <TabsTrigger value="team">Team Tasks</TabsTrigger>}
              </TabsList>
              
              <TabsContent value="mine" className="mt-0">
                {renderTaskList(myTasks, "You have no pending tasks today. Great job!")}
              </TabsContent>
              
              {isAdmin && (
                <TabsContent value="team" className="mt-0">
                  {renderTaskList(teamTasks, "No pending team tasks.")}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Revenue Overview
              </CardTitle>
              <div className="flex gap-1">
                {RANGE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.key}
                    size="sm"
                    variant={chartRange === opt.key ? "default" : "ghost"}
                    className="h-6 px-2 text-[10px] font-semibold"
                    onClick={() => setChartRange(opt.key)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={revenueChart ?? []} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.01 240)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "oklch(0.48 0.02 240)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "oklch(0.48 0.02 240)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid oklch(0.91 0.01 240)" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="oklch(0.55 0.22 260)"
                    strokeWidth={2.5}
                    dot={{ fill: "oklch(0.55 0.22 260)", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activityLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <Skeleton className="h-8 flex-1" />
                </div>
              ))
            ) : (activity ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
            ) : (
              (activity ?? []).slice(0, 8).map((item) => (
                <div key={item.id} className="flex gap-2.5 items-start">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-primary uppercase">
                      {(item.type?.[0] ?? "S").toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-foreground leading-snug line-clamp-2">{item.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
