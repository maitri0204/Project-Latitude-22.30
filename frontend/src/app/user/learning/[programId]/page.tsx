"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { lmsAPI } from "@/lib/api";
import { LMSProgram, LMSEnrollment, LMSCourse } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

// ─── Helper ──────────────────────────────────────────────────────────────────

const getEmbedUrl = (url: string) => {
  if (url.includes("youtube.com/watch")) {
    const id = new URL(url).searchParams.get("v");
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes("youtu.be/")) {
    return `https://www.youtube.com/embed/${url.split("youtu.be/")[1]?.split("?")[0]}`;
  }
  return url;
};

// ─────────────────────────────────────────────────────────────────────────────

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const programId = params.programId as string;

  const [program, setProgram] = useState<LMSProgram | null>(null);
  const [enrollment, setEnrollment] = useState<LMSEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  // "details" = landing/info page | "learn" = actual learning view
  const [mainView, setMainView] = useState<"details" | "learn">(
    searchParams.get("view") === "learn" ? "learn" : "details"
  );

  // Curriculum accordion open state
  const [openCourse, setOpenCourse] = useState<number | null>(null);

  // Learning view sub-state
  type LearnView = "course" | "video" | "test" | "results";
  const [learnView, setLearnView] = useState<LearnView>("course");
  const [activeCourseIdx, setActiveCourseIdx] = useState(0);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);

  // Test state
  const [activeTestIdx, setActiveTestIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [programRes, enrollmentRes] = await Promise.all([
        lmsAPI.getProgram(programId),
        lmsAPI.getEnrollment(programId).catch(() => null),
      ]);
      setProgram(programRes.data.program);
      if (enrollmentRes) setEnrollment(enrollmentRes.data.enrollment);
    } catch {
      toast.error("Failed to load program");
      router.push("/user/learning");
    } finally {
      setLoading(false);
    }
  }, [programId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Enrollment helpers ───────────────────────────────────────────────────

  const isTestPassed = (testId?: string) =>
    testId ? (enrollment?.passedTests?.includes(testId) ?? false) : false;

  const getTestScore = (testId?: string) =>
    testId ? enrollment?.testScores?.find((ts) => ts.testId === testId) : undefined;

  const getPrevAnswers = (testId?: string): number[] | undefined => {
    if (!testId) return undefined;
    return (enrollment as any)?.testAnswers?.find((ta: any) => ta.testId === testId)?.answers;
  };

  const isCourseUnlocked = (cIdx: number): boolean => {
    if (!enrollment) return false;
    if (cIdx === 0) return true;
    // Previous course must have all its tests passed
    const prevCourse = program?.courses[cIdx - 1];
    if (!prevCourse) return true;
    if (!prevCourse.tests.length) return true; // no tests → auto-unlocked
    return prevCourse.tests.every((t) => isTestPassed(t._id));
  };

  const isCourseCompleted = (courseId?: string) =>
    courseId ? (enrollment?.completedCourses?.includes(courseId) ?? false) : false;

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await lmsAPI.enrollInProgram(programId);
      toast.success("Enrolled successfully!");
      await fetchData();
      setMainView("learn");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to enroll");
    } finally {
      setEnrolling(false);
    }
  };

  const startTest = (testIdx: number, usePrevious = false) => {
    const test = program?.courses[activeCourseIdx]?.tests[testIdx];
    if (!test) return;
    setActiveTestIdx(testIdx);
    if (usePrevious) {
      const prev = getPrevAnswers(test._id);
      setAnswers(prev ?? new Array(test.questions.length).fill(-1));
      setShowPrevious(true);
    } else {
      setAnswers(new Array(test.questions.length).fill(-1));
      setShowPrevious(false);
    }
    setTestResult(null);
    setLearnView("test");
  };

  const handleSubmitTest = async () => {
    const activeCourse = program?.courses[activeCourseIdx];
    if (!activeCourse?._id || !activeCourse.tests[activeTestIdx]?._id) return;
    if (answers.includes(-1)) { toast.error("Please answer all questions"); return; }

    setSubmitting(true);
    try {
      const res = await lmsAPI.submitTest(programId, {
        courseId: activeCourse._id,
        testId: activeCourse.tests[activeTestIdx]._id!,
        answers,
      });
      setTestResult(res.data);
      setEnrollment(res.data.enrollment);
      setLearnView("results");
      if (res.data.passed) toast.success("🎉 You passed!");
      else toast.error("Didn't pass — try again.");
    } catch {
      toast.error("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const progressPercent = () => {
    if (!program || !enrollment) return 0;
    if (enrollment.status === "COMPLETED") return 100;
    const total = program.courses.reduce((a, c) => a + c.tests.length, 0);
    if (!total) return 0;
    return Math.round((enrollment.passedTests.length / total) * 100);
  };

  const totalLessons = program?.courses.reduce((a, c) => a + c.videos.length, 0) ?? 0;
  const totalTests = program?.courses.reduce((a, c) => a + c.tests.length, 0) ?? 0;
  const activeCourse = program?.courses[activeCourseIdx];
  const activeVideo = activeCourse?.videos[activeVideoIdx];

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center py-32"><div className="spinner" /></div>
  );

  if (!program) return (
    <div className="text-center py-20"><p className="text-gray-500">Program not found</p></div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DETAILS VIEW — Udemy/Coursera style landing page
  // ══════════════════════════════════════════════════════════════════════════
  if (mainView === "details") {
    return (
      <div className="animate-fade-in">
        {/* Back */}
        <button
          onClick={() => router.push("/user/learning")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Courses
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero */}
            <div className="rounded-2xl overflow-hidden relative bg-gradient-to-br from-gray-900 to-gray-800">
              {program.thumbnailPath ? (
                <img src={`${BASE_URL}${program.thumbnailPath}`} alt={program.name} className="w-full h-72 object-cover opacity-70" />
              ) : (
                <div className="w-full h-72 flex items-center justify-center">
                  <span className="text-9xl font-black text-white/10">{program.name[0]}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${program.fees === 0 ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>
                    {program.fees === 0 ? "Free" : `₹${program.fees.toLocaleString()}`}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{program.name}</h1>
                <p className="text-gray-300 mt-2 text-sm">{program.brief}</p>
                <div className="flex items-center gap-4 mt-4 text-gray-300 text-sm flex-wrap">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    {program.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {program.totalDuration}
                  </span>
                  <span>{program.courses.length} modules · {totalLessons} lessons · {totalTests} tests</span>
                </div>
              </div>
            </div>

            {/* What you'll learn */}
            {program.whatYouLearn.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">What You&apos;ll Learn</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {program.whatYouLearn.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Curriculum */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Course Curriculum</h2>
              <p className="text-sm text-gray-500 mb-5">
                {program.courses.length} sections · {totalLessons} lessons · {totalTests} quizzes
              </p>
              <div className="space-y-2">
                {program.courses.map((course, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenCourse(openCourse === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-gray-900 text-sm">{course.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{course.videos.length} lessons</span>
                        <span>{course.tests.length} quizzes</span>
                        <svg className={`w-4 h-4 transition-transform ${openCourse === idx ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {openCourse === idx && (
                      <div className="divide-y divide-gray-100">
                        {course.description && (
                          <p className="px-4 py-3 text-xs text-gray-500">{course.description}</p>
                        )}
                        {course.videos.map((v, vIdx) => (
                          <div key={vIdx} className="flex items-center gap-3 px-5 py-3">
                            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            <span className="text-sm text-gray-700 flex-1">{v.title}</span>
                            <span className="text-xs text-gray-400">Video</span>
                          </div>
                        ))}
                        {course.tests.map((t, tIdx) => (
                          <div key={tIdx} className="flex items-center gap-3 px-5 py-3">
                            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-700 flex-1">{t.title}</span>
                            <span className="text-xs text-gray-400">{t.questions.length} Qs</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — sticky enroll card */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              {program.thumbnailPath && (
                <img src={`${BASE_URL}${program.thumbnailPath}`} alt={program.name} className="w-full h-40 object-cover" />
              )}
              <div className="p-6">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {program.fees === 0 ? "Free" : `₹${program.fees.toLocaleString()}`}
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {program.totalDuration} total duration
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {totalLessons} video lessons
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    {totalTests} quizzes
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                    Certificate on completion
                  </div>
                </div>

                {enrollment ? (
                  <div className="space-y-3">
                    {enrollment.status === "COMPLETED" ? (
                      <div className="text-center py-2 text-emerald-600 font-semibold text-sm">✓ Completed</div>
                    ) : (
                      <>
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{progressPercent()}% complete</span>
                            <span>{enrollment.passedTests.length}/{totalTests} tests passed</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progressPercent()}%` }} />
                          </div>
                        </div>
                      </>
                    )}
                    <button
                      onClick={() => setMainView("learn")}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
                    >
                      {enrollment.status === "COMPLETED" ? "View Certificate" : "Continue Learning →"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-60"
                  >
                    {enrolling ? "Enrolling..." : program.fees === 0 ? "Enroll for Free" : "Buy & Enroll"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LEARNING VIEW
  // ══════════════════════════════════════════════════════════════════════════

  // ─── TEST RESULTS ──────────────────────────────────────────────────────
  if (learnView === "results" && testResult) {
    const test = activeCourse?.tests[activeTestIdx];
    const prevAnswers = getPrevAnswers(test?._id);

    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <button onClick={() => setLearnView("course")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Course
        </button>

        {/* Score card */}
        <div className={`rounded-2xl p-8 text-center mb-6 ${testResult.passed ? "bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200" : "bg-gradient-to-br from-red-50 to-orange-50 border border-red-200"}`}>
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${testResult.passed ? "bg-emerald-100" : "bg-red-100"}`}>
            {testResult.passed ? (
              <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {testResult.passed ? "🎉 Congratulations!" : "Keep Trying!"}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {testResult.passed ? "You passed this test. The next course is now unlocked." : `You need at least ${testResult.minimumPassingMarks} marks to pass. You scored ${testResult.score}.`}
          </p>
          <div className="flex justify-center gap-10 mb-2">
            <div><p className="text-3xl font-bold text-blue-600">{testResult.score}</p><p className="text-xs text-gray-500">Your Score</p></div>
            <div><p className="text-3xl font-bold text-gray-400">{testResult.totalScore}</p><p className="text-xs text-gray-500">Total</p></div>
            <div><p className="text-3xl font-bold text-amber-500">{testResult.minimumPassingMarks}</p><p className="text-xs text-gray-500">Passing</p></div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center mb-8">
          {testResult.passed ? (
            <>
              {/* Check if there's a next course */}
              {activeCourseIdx < (program.courses.length - 1) ? (
                <button
                  onClick={() => { setActiveCourseIdx(activeCourseIdx + 1); setLearnView("course"); }}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all"
                >
                  Continue to Next Module →
                </button>
              ) : enrollment?.status === "COMPLETED" ? (
                <button
                  onClick={() => setLearnView("course")}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all"
                >
                  🎓 View Certificate
                </button>
              ) : null}
              <button onClick={() => setLearnView("course")} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all">
                Back to Course
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => startTest(activeTestIdx)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all"
              >
                Retake Test
              </button>
              <button onClick={() => setLearnView("course")} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-all">
                Back to Course
              </button>
            </>
          )}
        </div>

        {/* Review Answers */}
        {test && prevAnswers && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Answer Review</h3>
            <div className="space-y-4">
              {test.questions.map((q, qIdx) => {
                const yourAnswer = prevAnswers[qIdx];
                const correct = q.correctOptionIndex;
                return (
                  <div key={qIdx} className="bg-gray-50 rounded-xl p-4">
                    <p className="font-medium text-gray-900 text-sm mb-3">{qIdx + 1}. {q.questionText}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm border ${
                          oIdx === correct ? "bg-emerald-50 border-emerald-300 text-emerald-800" :
                          oIdx === yourAnswer && oIdx !== correct ? "bg-red-50 border-red-300 text-red-800" :
                          "border-gray-200 text-gray-600"
                        }`}>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${oIdx === correct ? "bg-emerald-500 text-white" : oIdx === yourAnswer && oIdx !== correct ? "bg-red-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                            {oIdx === correct ? "✓" : oIdx === yourAnswer && oIdx !== correct ? "✗" : String.fromCharCode(65 + oIdx)}
                          </span>
                          {opt}
                          {oIdx === yourAnswer && oIdx !== correct && <span className="ml-auto text-xs text-red-600">Your answer</span>}
                          {oIdx === correct && <span className="ml-auto text-xs text-emerald-600">Correct</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── TEST VIEW ──────────────────────────────────────────────────────────
  if (learnView === "test" && activeCourse) {
    const test = activeCourse.tests[activeTestIdx];
    const isPassed = isTestPassed(test._id);

    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <button onClick={() => setLearnView("course")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Course
        </button>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{test.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {test.questions.length} questions · Min. {test.minimumPassingMarks || 0} marks to pass
              </p>
            </div>
            {isPassed && !showPrevious && (
              <div className="flex gap-2">
                <button onClick={() => startTest(activeTestIdx, true)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                  Review Previous
                </button>
                <button onClick={() => startTest(activeTestIdx)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  Retake
                </button>
              </div>
            )}
          </div>

          {showPrevious && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Showing your previous responses. You cannot change them in review mode.
            </div>
          )}

          <div className="space-y-6">
            {test.questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{qIdx + 1}</span>
                  <p className="font-medium text-gray-900">{q.questionText}</p>
                </div>
                <div className="space-y-2 ml-10">
                  {q.options.map((opt, oIdx) => (
                    <label
                      key={oIdx}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                        answers[qIdx] === oIdx
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-gray-200 hover:border-blue-400/60 hover:bg-white"
                      } ${showPrevious ? "pointer-events-none" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`q-${qIdx}`}
                        checked={answers[qIdx] === oIdx}
                        onChange={() => {
                          if (showPrevious) return;
                          const newA = [...answers];
                          newA[qIdx] = oIdx;
                          setAnswers(newA);
                        }}
                        className="accent-blue-600"
                        readOnly={showPrevious}
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 ml-10 text-xs text-gray-400">
                  +{q.score} pts{q.negativeMarking > 0 && ` / −${q.negativeMarking} negative`}
                </div>
              </div>
            ))}
          </div>

          {!showPrevious && (
            <div className="mt-8 flex justify-between items-center">
              <p className="text-sm text-gray-400">
                {answers.filter(a => a !== -1).length} / {test.questions.length} answered
              </p>
              <button
                onClick={handleSubmitTest}
                disabled={submitting || answers.includes(-1)}
                className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Test"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── VIDEO VIEW ──────────────────────────────────────────────────────────
  if (learnView === "video" && activeVideo) {
    return (
      <div className="animate-fade-in">
        <button onClick={() => setLearnView("course")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3">
            <div className="bg-black rounded-2xl overflow-hidden shadow-lg">
              <div className="video-container">
                <iframe src={getEmbedUrl(activeVideo.link)} title={activeVideo.title} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 mt-4 p-5">
              <h2 className="font-semibold text-gray-900">{activeVideo.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{activeCourse?.title} · Video {activeVideoIdx + 1} of {activeCourse?.videos.length}</p>
            </div>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Course Videos</h3>
              <div className="space-y-1">
                {activeCourse?.videos.map((vid, vIdx) => (
                  <button key={vIdx} onClick={() => setActiveVideoIdx(vIdx)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-all ${activeVideoIdx === vIdx ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    <span className="truncate">{vIdx + 1}. {vid.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── COURSE VIEW (main learn view) ────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      {/* Top nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setMainView("details")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Course Details
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{progressPercent()}% complete</span>
          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progressPercent()}%` }} />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-xl font-bold">{program.name}</h1>
        <p className="text-blue-100 text-sm mt-1">by {program.author}</p>
        <div className="flex items-center gap-4 mt-3 text-xs text-blue-200">
          <span>{program.courses.length} modules</span>
          <span>·</span>
          <span>{totalLessons} videos</span>
          <span>·</span>
          <span>{enrollment?.passedTests.length ?? 0}/{totalTests} tests passed</span>
        </div>
      </div>

      {/* Certificate Banner */}
      {enrollment?.status === "COMPLETED" && (
        <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white flex items-center gap-4">
          <div className="text-4xl">🎓</div>
          <div>
            <h2 className="font-bold text-lg">Congratulations! You completed this program.</h2>
            <p className="text-white/80 text-sm mt-0.5">
              Certificate issued on {enrollment.certificateIssuedAt ? new Date(enrollment.certificateIssuedAt).toLocaleDateString() : ""}
            </p>
          </div>
        </div>
      )}

      {/* Course list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sidebar course nav */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">Course Modules</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {program.courses.map((course, cIdx) => {
                const unlocked = isCourseUnlocked(cIdx);
                const completed = isCourseCompleted(course._id);
                const active = activeCourseIdx === cIdx;
                return (
                  <button
                    key={cIdx}
                    onClick={() => { if (unlocked) setActiveCourseIdx(cIdx); else toast.error("Complete previous module's tests to unlock this."); }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${active ? "bg-blue-50 border-r-2 border-blue-600" : "hover:bg-gray-50"} ${!unlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${completed ? "bg-emerald-100 text-emerald-600" : active ? "bg-blue-100 text-blue-600" : !unlocked ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                      {completed ? "✓" : !unlocked ? "🔒" : cIdx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-800 truncate">{course.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {activeCourse && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isCourseCompleted(activeCourse._id) ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}>
                    {isCourseCompleted(activeCourse._id) ? "✓" : activeCourseIdx + 1}
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">{activeCourse.title}</h2>
                    {activeCourse.description && <p className="text-xs text-gray-500">{activeCourse.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 mt-2 pl-11">
                  <span>{activeCourse.videos.length} videos</span>
                  <span>{activeCourse.tests.length} quizzes</span>
                  <span>{activeCourse.materials.length} materials</span>
                </div>
              </div>

              {/* Videos */}
              {activeCourse.videos.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Video Lessons</h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {activeCourse.videos.map((vid, vIdx) => (
                      <button key={vIdx} onClick={() => { setActiveVideoIdx(vIdx); setLearnView("video"); }}
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-all text-left group">
                        <div className="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                        <span className="text-sm text-gray-700 flex-1">{vid.title}</span>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials */}
              {activeCourse.materials.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Study Materials</h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {activeCourse.materials.map((mat, mIdx) => (
                      <a key={mIdx} href={`${BASE_URL}${mat.filePath}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-all">
                        <span className="text-xl">📎</span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{mat.originalName}</p>
                          <p className="text-xs text-gray-400">{(mat.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Tests */}
              {activeCourse.tests.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quizzes & Tests</h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {activeCourse.tests.map((test, tIdx) => {
                      const passed = isTestPassed(test._id);
                      const score = getTestScore(test._id);
                      const prevAnsw = getPrevAnswers(test._id);
                      return (
                        <div key={tIdx} className="flex items-center justify-between px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${passed ? "bg-emerald-100 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                              {passed ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{test.title}</p>
                              <p className="text-xs text-gray-400">
                                {test.questions.length} questions · Pass: {test.minimumPassingMarks || 0} marks
                                {score && ` · Last: ${score.score}/${score.totalScore}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {passed && prevAnsw && (
                              <button
                                onClick={() => startTest(tIdx, true)}
                                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-all"
                              >
                                Review
                              </button>
                            )}
                            <button
                              onClick={() => startTest(tIdx)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                passed
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              }`}
                            >
                              {passed ? "✓ Passed · Retake" : score ? "Retry" : "Take Test"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* If course has no tests, show next module button */}
              {activeCourse.tests.length === 0 && activeCourseIdx < program.courses.length - 1 && enrollment && (
                <button
                  onClick={() => setActiveCourseIdx(activeCourseIdx + 1)}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all"
                >
                  Next Module →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
