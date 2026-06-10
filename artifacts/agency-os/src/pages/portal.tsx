import { useState } from "react";
import { useListContentPosts, useGetClient } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Instagram, Youtube, Facebook, Linkedin, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  IDEA: { label: "Idea", className: "bg-slate-100 text-slate-600 border-slate-200" },
  SCRIPTING: { label: "Scripting", className: "bg-blue-100 text-blue-700 border-blue-200" },
  DESIGNING: { label: "Designing", className: "bg-violet-100 text-violet-700 border-violet-200" },
  IN_REVIEW: { label: "In Review", className: "bg-amber-100 text-amber-700 border-amber-200" },
  ADMIN_APPROVED: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  SCHEDULED: { label: "Scheduled", className: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  PUBLISHED: { label: "Published", className: "bg-green-100 text-green-700 border-green-200" },
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="h-4 w-4 text-pink-500" />,
  YOUTUBE: <Youtube className="h-4 w-4 text-red-500" />,
  FACEBOOK: <Facebook className="h-4 w-4 text-blue-500" />,
  LINKEDIN: <Linkedin className="h-4 w-4 text-blue-600" />,
};

export default function ClientPortalPage({ clientId }: { clientId: string }) {
  const [currentMonth] = useState(new Date());
  const month = format(currentMonth, "yyyy-MM");

  const { data: posts, isLoading } = useListContentPosts({
    clientId,
    month,
  });

  return (
    <div className="min-h-screen bg-muted/20 py-10 px-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 animated-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-heading text-foreground">Content Calendar</h1>
          <p className="text-muted-foreground">View your planned and upcoming content for {format(currentMonth, "MMMM yyyy")}</p>
        </div>

        {/* Content List */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : (posts ?? []).length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border shadow-sm">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20 text-muted-foreground" />
              <p className="font-medium text-foreground">No posts scheduled yet</p>
              <p className="text-sm text-muted-foreground">We are preparing content for you.</p>
            </div>
          ) : (
            (posts ?? []).map((post) => {
              const sc = STATUS_CONFIG[post.status ?? "IDEA"];
              return (
                <Card key={post.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex border-l-4 border-primary">
                    <CardContent className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="mt-1 p-2 rounded-full bg-muted/50 shrink-0">
                            {PLATFORM_ICON[post.platform ?? "INSTAGRAM"]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge variant="outline" className="text-xs uppercase tracking-wider">{post.contentType}</Badge>
                              <Badge variant="outline" className={cn("text-xs border", sc.className)}>{sc.label}</Badge>
                              {post.scheduledAt && (
                                <span className="text-sm font-medium text-foreground bg-muted px-2 py-0.5 rounded-md">
                                  {format(new Date(post.scheduledAt), "dd MMM, EEE")}
                                </span>
                              )}
                            </div>
                            <p className="text-base text-foreground leading-relaxed">
                              {post.caption || <span className="text-muted-foreground italic">Caption is being drafted...</span>}
                            </p>
                            {post.hashtags && (
                              <p className="text-sm text-primary/70 mt-2">{post.hashtags}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
