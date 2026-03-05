"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { lmsAPI } from "@/lib/api";
import { DashboardEnrollment } from "@/types";

type FilterTab = "ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [notStarted, setNotStarted] = useState(0);
  const [enrollments, setEnrollments] = useState<DashboardEnrollment[]>([]);
  const [activeBox, setActiveBox] = useState<FilterTab>("ALL");
  const [search, setSearch] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lmsAPI.getDashboardStats();
      setTotal(res.data.total);
      setCompleted(res.data.completed);
      setInProgress(res.data.inProgress);
      setNotStarted(res.data.notStarted);
      setEnrollments(res.data.enrollments);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const filtered = enrollments.filter((e) => {
    const matchTab = activeBox === "ALL" || e.status === activeBox;
    const q = search.toLowerCase();
    const userName = `${e.user?.firstName || ""} ${e.user?.middleName || ""} ${e.user?.lastName || ""}`.toLowerCase();
    const matchSearch = !q || userName.includes(q) || (e.program?.name || "").toLowerCase().includes(q) || (e.user?.email || "").toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const boxes = [
    { key: "ALL" as FilterTab, label: "Total Students Enrolled", value: total, color: "bg-blue-600", light: "bg-blue-50", text: "text-blue-600", icon: "👥" },
    { key: "NOT_STARTED" as FilterTab, label: "Not Started", value: notStarted, color: "bg-amber-500", light: "bg-amber-50", text: "text-amber-600", icon: "⏳" },
    { key: "IN_PROGRESS" as FilterTab, label: "In Progress", value: inProgress, color: "bg-indigo-600", light: "bg-indigo-50", text: "text-indigo-600", icon: "📚" },
    { key: "COMPLETED" as FilterTab, label: "Completed", value: completed, color: "bg-emerald-600", light: "bg-emerald-50", text: "text-emerald-600", icon: "✅" },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-emerald-50 text-emerald-700";
      case "IN_PROGRESS": return "bg-blue-50 text-blue-700";
      default: return "bg-amber-50 text-amber-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-base text-gray-500 mt-1">Overview of student enrollments and progress</p>
      </div>

      {/* Stat Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {boxes.map((box) => (
          <button
            key={box.key}
            onClick={() => setActiveBox(box.key)}
            className={`relative bg-white rounded-2xl border-2 p-5 text-left transition-all hover:shadow-lg ${
              activeBox === box.key ? `border-current ${box.text} shadow-lg` : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-xl ${box.light} flex items-center justify-center`}>
                <span className="text-xl">{box.icon}</span>
              </div>
              <div>
                <p className={`text-3xl font-bold ${activeBox === box.key ? box.text : "text-gray-900"}`}>
                  {box.value}
                </p>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">{box.label}</p>
            {activeBox === box.key && (
              <div className={`absolute bottom-0 left-4 right-4 h-1 ${box.color} rounded-t-full`} />
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or program..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            {activeBox === "ALL" ? "All Enrollments" : activeBox.replace("_", " ")} ({filtered.length})
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-1">No records found</p>
            <p className="text-sm">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Student Name</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Program</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Progress</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Enrolled On</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, idx) => (
                  <tr key={e._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-xs">
                            {(e.user?.firstName?.[0] || "")}{(e.user?.lastName?.[0] || "")}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {e.user?.firstName} {e.user?.middleName ? `${e.user.middleName} ` : ""}{e.user?.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{e.user?.email}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium">{e.program?.name || "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${e.status === "COMPLETED" ? "bg-emerald-500" : e.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-gray-300"}`}
                            style={{ width: `${e.totalCourses ? Math.round((e.completedCourses / e.totalCourses) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{e.completedCourses}/{e.totalCourses}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(e.status)}`}>
                        {e.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {new Date(e.enrolledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
