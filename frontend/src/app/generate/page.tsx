"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export default function Generate() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const pollTaskStatus = async (id: string) => {
    try {
      const response = await api.formulas.getStatus(id);
      const data = response.data;

      if (data.status === "completed") {
        setIsLoading(false);
        router.push("/my-formulas");
      } else if (data.status === "failed") {
        setError(data.message || "Generation failed");
        setIsLoading(false);
      } else if (data.status === "processing") {
        setProgress(data.progress || 0);
        setTimeout(() => pollTaskStatus(id), 2000);
      } else {
        setTimeout(() => pollTaskStatus(id), 2000);
      }
    } catch (err) {
      setError("Failed to check generation status");
      console.error("Polling error:", err);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const response = await api.formulas.generate(description);
      const data = response.data;
      setTaskId(data.taskId);
      pollTaskStatus(data.taskId);
    } catch (err) {
      setError("Failed to generate formula");
      console.log(err);
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6">Generate Fragrance Formula</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Describe your desired fragrance</Label>
            <p className="text-sm text-gray-500 mb-2">
              Describe the kind of scent you want (e.g., &quot;Fresh citrus with
              woody base&quot;)
            </p>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-md min-h-[120px]"
              placeholder="Describe your desired fragrance..."
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Generating formula...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? `Generating... ${progress}%` : "Generate"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
