import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Instagram, Facebook, Youtube, Linkedin, Link as LinkIcon, CheckCircle2, AlertCircle,
  BarChart3, UploadCloud, Send, FileOutput, Flame
} from "lucide-react";

export default function HawanHubPage() {
  const [activeTab, setActiveTab] = useState("accounts");
  const [postContent, setPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const ACCOUNTS = [
    { name: "Instagram", icon: <Instagram className="h-5 w-5 text-pink-500" />, connected: true, username: "@blinkbeyond" },
    { name: "Facebook", icon: <Facebook className="h-5 w-5 text-blue-500" />, connected: true, username: "Blink Beyond Agency" },
    { name: "YouTube", icon: <Youtube className="h-5 w-5 text-red-500" />, connected: false, username: null },
    { name: "LinkedIn", icon: <Linkedin className="h-5 w-5 text-blue-600" />, connected: true, username: "Blink Beyond" },
  ];

  const handlePost = () => {
    if (!postContent) {
      toast.error("Please enter some content to post.");
      return;
    }
    setIsPosting(true);
    setTimeout(() => {
      setIsPosting(false);
      setPostContent("");
      toast.success("Successfully pushed to 3 platforms via Hawan Hub! 🔥");
    }, 1500);
  };

  const generateReport = () => {
    toast.success("Generating Monthly Analytics Report... Please wait.", { icon: <FileOutput className="h-4 w-4" /> });
  };

  return (
    <div className="p-6 space-y-6 animated-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" /> Hawan Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Centralized Social Media Engine & Analytics</p>
        </div>
        <Button onClick={generateReport} variant="outline" className="gap-2">
          <FileOutput className="h-4 w-4" /> Export Monthly Report
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="accounts">Connections</TabsTrigger>
          <TabsTrigger value="publish">One-Click Post</TabsTrigger>
          <TabsTrigger value="analytics">Live Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ACCOUNTS.map((acc) => (
              <Card key={acc.name} className="scale-hover">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-xl">{acc.icon}</div>
                    <div>
                      <h3 className="font-semibold text-foreground">{acc.name}</h3>
                      {acc.connected ? (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {acc.username}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Not connected
                        </p>
                      )}
                    </div>
                  </div>
                  <Button variant={acc.connected ? "outline" : "default"} size="sm" className="gap-2">
                    <LinkIcon className="h-3.5 w-3.5" />
                    {acc.connected ? "Reconnect" : "Connect"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="publish" className="mt-6">
          <Card className="max-w-2xl border-primary/20 bg-primary/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" /> Blast to All Platforms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea 
                  placeholder="Write your post caption here... It will be pushed everywhere instantly." 
                  className="min-h-[150px] resize-none bg-background"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4 p-4 border border-border rounded-lg bg-background">
                <div className="flex-1 flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">Attach Media (Images/Video)</span>
                </div>
                <Input type="file" className="max-w-[250px] cursor-pointer" multiple />
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-pink-100 text-pink-700">Instagram</Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">Facebook</Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">LinkedIn</Badge>
                </div>
                <Button onClick={handlePost} disabled={isPosting} className="gap-2 px-8">
                  {isPosting ? <span className="animate-pulse">Igniting...</span> : <><Flame className="h-4 w-4" /> Ignite Post</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-pink-500/10 to-transparent">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500" /> IG Reach
                </p>
                <p className="text-3xl font-bold mt-2">124.5K</p>
                <p className="text-xs text-emerald-500 mt-1 font-medium">+12.5% this month</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-500" /> FB Engagement
                </p>
                <p className="text-3xl font-bold mt-2">45.2K</p>
                <p className="text-xs text-emerald-500 mt-1 font-medium">+5.2% this month</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-600/10 to-transparent">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-600" /> LI Impressions
                </p>
                <p className="text-3xl font-bold mt-2">89.1K</p>
                <p className="text-xs text-emerald-500 mt-1 font-medium">+22.4% this month</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Audience Growth (Live)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
                <p className="text-muted-foreground font-medium">Interactive Chart Data Rendered Here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
