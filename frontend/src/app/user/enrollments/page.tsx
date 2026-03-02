"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { lmsAPI } from "@/lib/api";
import { LMSEnrollment } from "@/types";

export default function EnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<LMSEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ENROLLED" | "IN_PROGRESS" | "COMPLETED">("ALL");

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const res = await lmsAPI.getEnrollments();
      setEnrollments(res.data.enrollments);
    } catch (error: any) {
      toast.error("Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === "ALL"
    ? enrollments
    : enrollments.filter((e) => e.status === filter);

  const getProgressPercent = (enrollment: LMSEnrollment): number => {
    const program = enrollment.programId as any;
    if (!program?.courses?.length) return 0;
    const total = program.courses.length;
    const done = enrollment.completedCourses.length;
    return Math.round((done / total) * 100);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-600";
      case "IN_PROGRESS":
        return "bg-blue-50 text-blue-600";
      default:
        return "bg-amber-50 text-amber-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Enrollments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your learning progress
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {enrollments.length} enrollment{enrollments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["ALL", "ENROLLED", "IN_PROGRESS", "COMPLETED"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
              filter === f
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <span className="text-lg">📚</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {enrollments.filter((e) => e.status === "IN_PROGRESS").length}
              </p>
              <p className="text-xs text-gray-400">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <span className="text-lg">✅</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {enrollments.filter((e) => e.status === "COMPLETED").length}
              </p>
              <p className="text-xs text-gray-400">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {enrollments.reduce((sum, e) => sum + e.passedTests.length, 0)}
              </p>
              <p className="text-xs text-gray-400">Tests Passed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enrollment List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <div className="text-5xl mb-4">📖</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No enrollments found
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {filter === "ALL"
              ? "Start exploring programs and enroll in one!"
              : `No ${filter.replace("_", " ").toLowerCase()} programs.`}
          </p>
          <button
            onClick={() => router.push("/user/learning")}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all"
          >
            Browse Programs
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((enrollment) => {
            const program = enrollment.programId as any;
            const progress = getProgressPercent(enrollment);
            const programIdStr = typeof program === "object" ? program._id : program;

            return (
              <div
                key={enrollment._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-lg hover:shadow-blue-100/20 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {program?.name || "Unknown Program"}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(
                          enrollment.status
                        )}`}
                      >
                        {enrollment.status.replace("_", " ")}
                      </span>
                    </div>

                    {program?.brief && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {program.brief}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                      {program?.author && <span>👤 {program.author}</span>}
                      {program?.courses && (
                        <span>📚 {program.courses.length} courses</span>
                      )}
                      <span>
                        📅 Enrolled{" "}
                        {new Date(enrollment.enrolledAt).toLocaleDateString()}
                      </span>
                      <span>
                        ✅ {enrollment.completedCourses.length} / {program?.courses?.length || 0} done
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${progress}%`,
                            background:
                              progress === 100
                                ? "linear-gradient(135deg, #10b981, #059669)"
                                : "linear-gradient(135deg, #2d5bff, #5b8def)",
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-500 w-10 text-right">
                        {progress}%
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/user/learning/${programIdStr}`)}
                    className="ml-4 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all flex-shrink-0"
                  >
                    {enrollment.status === "COMPLETED"
                      ? "Review"
                      : "Continue"}
                  </button>
                </div>

                {/* Test scores summary */}
                {enrollment.testScores.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">
                      Test Results: {enrollment.passedTests.length} passed,{" "}
                      {enrollment.testScores.length - enrollment.passedTests.length} failed
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
