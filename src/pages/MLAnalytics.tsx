import { MLDashboard } from "@/components/MLDashboard";
import { AccuracyDashboard } from "@/components/AccuracyDashboard";
import { MLDatasetTesting } from "@/components/MLDatasetTesting";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Target, Zap } from "lucide-react";

const MLAnalytics = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              ML Performance
            </TabsTrigger>
            <TabsTrigger value="accuracy" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Detection Accuracy
            </TabsTrigger>
            <TabsTrigger value="realtime" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Real-Time Testing
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="analytics">
            <MLDashboard />
          </TabsContent>
          
          <TabsContent value="accuracy">
            <AccuracyDashboard />
          </TabsContent>
          
          <TabsContent value="realtime">
            <MLDatasetTesting />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MLAnalytics;