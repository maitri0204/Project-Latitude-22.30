"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { lmsAPI } from "@/lib/api";
import { LMSProgram, LMSEnrollment } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function LearningHubPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<LMSProgram[]>([]);
  const [enrollments, setEnrollments] = useState<LMSEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<"all" | "enrolled" | "free" | "paid">("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [programsRes, enrollmentsRes] = await Promise.all([
        lmsAPI.getPrograms(),
        lmsAPI.getEnrollments(),
      ]);
      setPrograms(programsRes.data.programs);
      setEnrollments(enrollmentsRes.data.enrollments);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getEnrollment = (programId: string) =>
    enrollments.find(
      (e) =>
        (typeof e.programId === "string" ? e.programId : (e.programId as any)._id) ===
        programId
    );

  const isEnrolled = (programId: string) => !!getEnrollment(programId);

  const handleEnroll = async (programId: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setEnrolling(programId);
    try {
      await lmsAPI.enrollInProgram(programId);
      toast.success("Enrolled successfully!");
      await fetchData();
      router.push(`/user/learning/${programId}?view=learn`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to enroll");
    } finally {
      setEnrolling(null);
    }
  };

  const filteredPrograms = programs.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brief.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q);
    const matchCat =
      category === "all"
        ? true
        : category === "enrolled"
        ? isEnrolled(p._id)
        : category === "free"
        ? p.fees === 0
        : p.fees > 0;
    return matchSearch && matchCat;
  });

  const totalLessons = (program: LMSProgram) =>
    program.courses.reduce((acc, c) => acc + c.videos.length, 0);

  const getProgressPercent = (program: LMSProgram) => {
    const enr = getEnrollment(program._id);
    if (!enr) return 0;
    if (enr.status === "COMPLETED") return 100;
    if (!program.courses.length) return 0;
    return Math.round((enr.completedCourses.length / program.courses.length) * 100);
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
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-8 mb-8 overflow-hidden">
        <div className="absolute -top-6 -right-6 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-cyan-400/10 rounded-full blur-xl" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-white">Explore Courses</h1>
          <p className="text-blue-100 mt-2 text-base max-w-md">
            Build real-world skills with expert-led programs. Learn at your own pace.
          </p>
          <div className="mt-5 max-w-lg relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search programs, topics, instructors..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-gray-900 text-sm outline-none border-0 shadow-lg placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-6 text-base text-gray-700">
        <span><strong className="text-gray-900">{programs.length}</strong> Programs</span>
        <span className="w-px h-4 bg-gray-200" />
        <span><strong className="text-gray-900">{enrollments.length}</strong> Enrolled</span>
        <span className="w-px h-4 bg-gray-200" />
        <span><strong className="text-gray-900">{programs.filter(p => p.fees === 0).length}</strong> Free</span>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "enrolled", "free", "paid"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setCategory(tab)}
            className={`px-4 py-1.5 rounded-full text-base font-medium transition-all ${
              category === tab
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {tab === "all" ? "All Courses" : tab === "enrolled" ? "My Courses" : tab === "free" ? "Free" : "Paid"}
          </button>
        ))}
      </div>

      {filteredPrograms.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No programs found</h3>
          <p className="text-base text-gray-600">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPrograms.map((program) => {
            const enrolled = isEnrolled(program._id);
            const enrollment = getEnrollment(program._id);
            const progress = getProgressPercent(program);
            const lessons = totalLessons(program);

            return (
              <div
                key={program._id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer group"
                onClick={() => router.push(enrolled ? `/user/learning/${program._id}?view=learn` : `/user/learning/${program._id}`)}
              >
                {/* Thumbnail */}
                <div className="relative h-44 bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 overflow-hidden flex-shrink-0">
                  {program.thumbnailPath ? (
                    <img
                      src={`${BASE_URL}${program.thumbnailPath}`}
                      alt={program.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl font-black text-blue-200/70 select-none">
                        {program.name[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    {program.fees === 0 ? (
                      <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Free</span>
                    ) : (
                      <span className="bg-white/90 backdrop-blur text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                        ₹{program.fees.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {enrolled && (
                    <div className="absolute top-3 right-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${enrollment?.status === "COMPLETED" ? "bg-emerald-500 text-white" : "bg-blue-600 text-white"}`}>
                        {enrollment?.status === "COMPLETED" ? "✓ Completed" : "Enrolled"}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl">
                      <svg className="w-5 h-5 text-blue-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {program.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">by {program.author}</p>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-2">
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} className={`w-3.5 h-3.5 ${s <= 4 ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
                      </svg>
                    ))}
                    <span className="text-xs text-gray-400 ml-1">(4.0)</span>
                  </div>

                  <div className="flex items-center gap-3 text-base text-gray-700 mb-3 flex-wrap">
                    <span>{program.courses.length} chapters</span>
                    <span>·</span>
                    <span>{lessons} lessons</span>
                    <span>·</span>
                    <span>{program.totalDuration}</span>
                  </div>

                  {enrolled && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{progress}% complete</span>
                        {enrollment?.status === "COMPLETED" && <span className="text-emerald-600 font-medium">Done!</span>}
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${enrollment?.status === "COMPLETED" ? "bg-emerald-500" : "bg-blue-600"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex-1" />

                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    {enrolled ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/user/learning/${program._id}?view=learn`); }}
                        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${enrollment?.status === "COMPLETED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                      >
                        {enrollment?.status === "COMPLETED" ? "🎓 View Certificate" : "Continue Learning →"}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/user/learning/${program._id}`); }}
                          className="flex-1 py-2.5 rounded-lg border border-blue-600 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-all"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => handleEnroll(program._id, e)}
                          disabled={enrolling === program._id}
                          className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-60"
                        >
                          {enrolling === program._id ? (
                            <span className="flex items-center justify-center gap-1">
                              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                              Enrolling
                            </span>
                          ) : "Enroll Now"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
