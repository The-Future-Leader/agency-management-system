import { useState } from "react";
import {
  useGetTodayAttendance,
  useCheckIn,
  useCheckOut,
  useListAttendance,
  getGetTodayAttendanceQueryKey,
  getListAttendanceQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MapPin, Clock, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { format } from "date-fns";

export default function AttendancePage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: todayStatus, isLoading: todayLoading } = useGetTodayAttendance();
  const { data: attendanceHistory, isLoading: historyLoading } = useListAttendance();

  const isUserAdminOrManager = user?.systemRole === "SUPER_ADMIN" || user?.systemRole === "MANAGER";

  const checkInMutation = useCheckIn({
    mutation: {
      onSuccess: () => {
        toast.success("Checked in successfully");
        qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to check in");
      },
    },
  });

  const checkOutMutation = useCheckOut({
    mutation: {
      onSuccess: () => {
        toast.success("Checked out successfully");
        qc.invalidateQueries({ queryKey: getGetTodayAttendanceQueryKey() });
        qc.invalidateQueries({ queryKey: getListAttendanceQueryKey() });
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to check out");
      },
    },
  });

  // Filter attendance history to get checked-in users for today
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const liveBoardUsers = isUserAdminOrManager
    ? (attendanceHistory ?? []).filter((r) => r.date === todayDateStr && r.checkOutAt === null)
    : [];

  const handleCheckIn = () => {
    checkInMutation.mutate();
  };

  const handleCheckOut = () => {
    checkOutMutation.mutate();
  };

  return (
    <div className="p-6 space-y-6 animated-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daily check-in, live board & history logs
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Check In / Out Control Card */}
        <Card className="md:col-span-1 shadow-sm border border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Daily Check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !todayStatus?.checkedIn ? (
              <div className="space-y-4 text-center py-4">
                <p className="text-sm text-muted-foreground">
                  You are not checked in for today. Click below to mark your attendance.
                </p>
                <Button
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending}
                  className="w-full btn-micro-anim"
                  data-testid="check-in-btn"
                >
                  {checkInMutation.isPending ? "Checking in..." : "Check In Now"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>Checked In</span>
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                    <p>
                      <strong>Time:</strong>{" "}
                      {todayStatus.checkInAt ? format(new Date(todayStatus.checkInAt), "p") : "—"}
                    </p>
                    {todayStatus.checkOutAt && (
                      <p>
                        <strong>Checked Out:</strong>{" "}
                        {format(new Date(todayStatus.checkOutAt), "p")}
                      </p>
                    )}
                  </div>
                </div>

                {!todayStatus.checkOutAt && (
                  <Button
                    variant="outline"
                    onClick={handleCheckOut}
                    disabled={checkOutMutation.isPending}
                    className="w-full btn-micro-anim text-destructive hover:text-destructive hover:bg-destructive/10"
                    data-testid="check-out-btn"
                  >
                    {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Board */}
        {isUserAdminOrManager && (
          <Card className="md:col-span-2 shadow-sm border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Live Board — Checked in now ({liveBoardUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-full" />
                  ))}
                </div>
              ) : liveBoardUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No team members checked in currently.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {liveBoardUsers.map((r) => (
                    <Badge key={r.id} variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5">
                      <span className="font-medium">{r.userName ?? "Unknown"}</span>
                      {r.isLate && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 scale-95 origin-center font-bold">
                          LATE
                        </Badge>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* History Table */}
      <Card className="shadow-sm border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Your Recent Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (attendanceHistory ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No attendance logs found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(attendanceHistory ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {format(new Date(r.checkInAt), "PP")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(r.checkInAt), "p")}
                    </TableCell>
                    <TableCell>
                      {r.checkOutAt ? format(new Date(r.checkOutAt), "p") : "—"}
                    </TableCell>
                    <TableCell>
                      {r.overtimeMin && r.overtimeMin > 0 ? `${r.overtimeMin} min` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.isLate ? (
                        <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50 dark:bg-rose-950/20">
                          <AlertTriangle className="h-3 w-3 mr-1 shrink-0" />
                          Late
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20">
                          On time
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
