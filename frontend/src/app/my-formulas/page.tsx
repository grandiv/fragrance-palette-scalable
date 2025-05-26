"use client";

import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

interface Formula {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  topNote: string;
  middleNote: string;
  baseNote: string;
  mixing: string;
  fragranceFamily: {
    name: string;
    description: string;
  };
}

interface FormulasResponse {
  formulas: Formula[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function MyFormulas() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, token } = useAuth();
  const router = useRouter();

  // Define fetchFormulas function
  const fetchFormulas = async (page: number = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.formulas.getUserFormulas(page, 10);
      const data: FormulasResponse = response.data;

      setFormulas(data.formulas);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Failed to fetch formulas:", err);
      setError(
        err.response?.data?.error || err.message || "Failed to fetch formulas"
      );

      // If unauthorized, redirect to login
      if (err.response?.status === 401) {
        router.push("/login");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fixed useEffect without fetchFormulas in dependency array
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user || !token) {
      router.push("/login");
      return;
    }

    // Call fetchFormulas directly
    fetchFormulas();
  }, [user, token, router]); // Removed fetchFormulas from dependencies

  const handlePageChange = (newPage: number) => {
    fetchFormulas(newPage);
  };

  // Show loading spinner while checking auth
  if (!user || !token) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">My Fragrance Formulas</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">My Fragrance Formulas</h1>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
          <p>{error}</p>
          <button
            onClick={() => fetchFormulas()}
            className="mt-2 text-red-800 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Fragrance Formulas</h1>
        <button
          onClick={() => router.push("/generate")}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Create New Formula
        </button>
      </div>

      {formulas.length === 0 ? (
        <div className="text-center py-10">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">🧪</div>
            <h2 className="text-xl font-semibold mb-2">No formulas yet</h2>
            <p className="text-gray-500 mb-6">
              You haven&apos;t created any fragrance formulas yet. Start by
              describing your dream scent!
            </p>
            <button
              onClick={() => router.push("/generate")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Formula
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {formulas.map((formula) => (
              <Card
                key={formula.id}
                className="p-6 hover:shadow-lg transition-all duration-200 border border-gray-200"
              >
                <div className="mb-4 flex justify-between items-start">
                  <h3 className="font-bold text-xl text-gray-900 leading-tight">
                    {formula.name}
                  </h3>
                  <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full">
                    {formula.fragranceFamily.name}
                  </span>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {formula.description}
                </p>

                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">
                    Fragrance Notes
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-1">
                        <span className="block text-yellow-700 font-medium text-xs">
                          Top
                        </span>
                        <span className="text-gray-800">{formula.topNote}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-1">
                        <span className="block text-green-700 font-medium text-xs">
                          Middle
                        </span>
                        <span className="text-gray-800">
                          {formula.middleNote}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 mb-1">
                        <span className="block text-purple-700 font-medium text-xs">
                          Base
                        </span>
                        <span className="text-gray-800">
                          {formula.baseNote}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2">
                    Mixing Instructions
                  </h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                    {formula.mixing}
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <span>
                    Created {new Date(formula.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-gray-400">#{formula.id.slice(-6)}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-center items-center mt-8 space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      page === pagination.page
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          <div className="text-center mt-4 text-sm text-gray-500">
            Showing {formulas.length} of {pagination.total} formulas
          </div>
        </>
      )}
    </div>
  );
}
