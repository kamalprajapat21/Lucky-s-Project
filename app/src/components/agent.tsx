"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import { Activity, AlertTriangle, Brain, Calendar, Heart, Hospital, MessageSquare, TrendingUp, Users, Zap } from "lucide-react";

export function Agent() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) {
      toast.error("Please enter your query", {
        closeButton: true,
        duration: 3000
      });
      return;
    }

    setIsLoading(true);

    try {
      const apiResponse = await fetch("http://localhost:3101/api/langbase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() })
      });

      // Parse the response (with fallback for non-JSON)
      let data;
      const contentType = apiResponse.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await apiResponse.json();
      } else {
        data = await apiResponse.text();
      }

      // Check for ANY error condition
      if (!apiResponse.ok || (data && typeof data === 'object' && (data.success === false || data.error))) {
        // Extract the most specific error message
        let errorMessage = data.error || data.message || `Error: ${apiResponse.status}`;
        
        // Handle specific API key error
        if (errorMessage.includes("Incorrect API key provided") || errorMessage.includes("401")) {
          errorMessage = "API configuration error: Please check your API keys in the environment settings. The system may be using an incorrect API key format.";
        }
        
        throw new Error(errorMessage);
      }

      // ONLY for successful responses, update the response
      if (typeof data === 'string') {
        setResponse({ conversational_response: data });
      } else if (data && typeof data === 'object') {
        setResponse(data);
      } else {
        setResponse({ conversational_response: String(data) });
      }

      // ONLY for successful responses, show success toast
      toast.success("Analysis completed successfully", {
        closeButton: true,
        duration: 3000
      });

    } catch (error) {
      console.error("Error processing request:", error);

      // Show error toast with specific message
      toast.error(error.message || "An error occurred while processing your request", {
        closeButton: true,
        duration: Infinity
      });

      // DON'T clear existing response on error
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              HEAL-EYE
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            AI-Powered Predictive Healthcare Agent for Indian Hospitals
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Predict
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Prepare
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Hospital className="h-3 w-3" />
              Protect
            </Badge>
          </div>
        </div>

        {/* API Configuration Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> If you encounter API key errors, please ensure your environment variables are properly configured with valid OpenAI or Google API keys.
          </AlertDescription>
        </Alert>

        {/* Input Form */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Healthcare Query
            </CardTitle>
            <CardDescription>
              Ask about patient surge predictions, hospital recommendations, or health trends (Hindi/English supported)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Example: Next week ICU load kitna hoga? / What's the expected patient surge during Diwali?"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="min-h-[100px] resize-none"
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? (
                  <>
                    <Zap className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Analyze Healthcare Data
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Response Display */}
        {response && (
          <div className="space-y-6">
            {/* System Status */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    <span className="font-medium">System Status: Active</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date().toLocaleDateString()}
                    </Badge>
                    {response.confidence_level && (
                      <Badge className={`${getConfidenceColor(response.confidence_level)} text-white`}>
                        Confidence: {response.confidence_level}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Response */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  HEAL-EYE Response
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>
                    {response.conversational_response || "No response available"}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Analysis Tabs */}
            {response.detailed_analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Detailed Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="predictions" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="predictions" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Predictions
                      </TabsTrigger>
                      <TabsTrigger value="recommendations" className="flex items-center gap-1">
                        <Hospital className="h-3 w-3" />
                        Actions
                      </TabsTrigger>
                      <TabsTrigger value="alerts" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Alerts
                      </TabsTrigger>
                      <TabsTrigger value="data" className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Data
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="predictions" className="mt-4">
                      <ScrollArea className="h-[400px] w-full">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>
                            {response.detailed_analysis.predictions || "No predictions available"}
                          </ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="recommendations" className="mt-4">
                      <ScrollArea className="h-[400px] w-full">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>
                            {response.detailed_analysis.recommendations || "No recommendations available"}
                          </ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="alerts" className="mt-4">
                      <ScrollArea className="h-[400px] w-full">
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>
                                {response.detailed_analysis.public_alerts || "No alerts available"}
                              </ReactMarkdown>
                            </div>
                          </AlertDescription>
                        </Alert>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="data" className="mt-4">
                      <ScrollArea className="h-[400px] w-full">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>
                            {response.detailed_analysis.data_analysis || "No data analysis available"}
                          </ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">System Status</p>
                      <p className="text-2xl font-bold text-green-500">Active</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Confidence Level</p>
                      <p className="text-2xl font-bold">{response.confidence_level || "High"}</p>
                    </div>
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                      <p className="text-sm font-bold">
                        {response.timestamp ? new Date(response.timestamp).toLocaleTimeString() : "Now"}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Features Overview */}
        {!response && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">Surge Prediction</h3>
                    <p className="text-sm text-muted-foreground">15-30 day forecasts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Hospital className="h-8 w-8 text-green-500" />
                  <div>
                    <h3 className="font-semibold">Smart Recommendations</h3>
                    <p className="text-sm text-muted-foreground">Staffing & supplies</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                  <div>
                    <h3 className="font-semibold">Public Alerts</h3>
                    <p className="text-sm text-muted-foreground">Hindi & English</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Activity className="h-8 w-8 text-red-500" />
                  <div>
                    <h3 className="font-semibold">Real-time Data</h3>
                    <p className="text-sm text-muted-foreground">AQI, weather, trends</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}