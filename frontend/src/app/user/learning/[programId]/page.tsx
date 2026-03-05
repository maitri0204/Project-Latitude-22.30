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
  const [currentUser, setCurrentUser] = useState<{ firstName: string; middleName?: string; lastName: string } | null>(null);

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
  const [previewMat, setPreviewMat] = useState<{ url: string; type: "pdf" | "image"; name: string } | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  // Load current user from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try { setCurrentUser(JSON.parse(userStr)); } catch {}
      }
    }
  }, []);

  // ─── Block DevTools / Console ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Block keyboard shortcuts that open DevTools
    const blockKeys = (e: KeyboardEvent) => {
      const key = e.key;
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      // F12
      if (key === "F12") { e.preventDefault(); e.stopPropagation(); return false; }
      // Ctrl/Cmd + Shift + I / J / C
      if (ctrl && shift && (key === "I" || key === "i" || key === "J" || key === "j" || key === "C" || key === "c")) {
        e.preventDefault(); e.stopPropagation(); return false;
      }
      // Ctrl/Cmd + U (view source)
      if (ctrl && (key === "U" || key === "u")) {
        e.preventDefault(); e.stopPropagation(); return false;
      }
    };

    // Disable right-click context menu
    const blockContext = (e: MouseEvent) => { e.preventDefault(); return false; };

    // DevTools detection via debugger pause timing
    let devtoolsInterval: ReturnType<typeof setInterval> | null = null;
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        document.body.innerHTML = "";
        window.location.replace("/user/learning");
      }
    };
    devtoolsInterval = setInterval(detectDevTools, 1000);

    // Disable debugger-bypassing via Function.prototype.toString override
    const _desc = Object.getOwnPropertyDescriptor(window, "console");
    try {
      const handler: ProxyHandler<typeof console> = {
        get(target, prop) {
          if (prop === "clear") return () => {};
          return (target as any)[prop];
        },
      };
      const consoleProxy = new Proxy(console, handler);
      Object.defineProperty(window, "console", { get: () => consoleProxy, configurable: true });
    } catch {}

    document.addEventListener("keydown", blockKeys, true);
    document.addEventListener("contextmenu", blockContext, true);

    return () => {
      document.removeEventListener("keydown", blockKeys, true);
      document.removeEventListener("contextmenu", blockContext, true);
      if (devtoolsInterval) clearInterval(devtoolsInterval);
      // Restore original console descriptor on unmount
      if (_desc) { try { Object.defineProperty(window, "console", _desc); } catch {} }
    };
  }, []);

  // Block right-click and keyboard shortcuts while material preview is open
  useEffect(() => {
    if (!previewMat) return;
    const preventMenu = (e: MouseEvent) => e.preventDefault();
    const preventKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["s", "p", "c", "u", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", preventMenu);
    document.addEventListener("keydown", preventKeys);
    return () => {
      document.removeEventListener("contextmenu", preventMenu);
      document.removeEventListener("keydown", preventKeys);
    };
  }, [previewMat]);

  // Fetch material as authenticated blob URL to avoid cross-origin iframe issues
  useEffect(() => {
    if (!previewMat) {
      // Clean up previous blob URL
      setPreviewBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewBlobUrl(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    fetch(previewMat.url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        setPreviewBlobUrl(blobUrl);
      })
      .catch(() => { if (!cancelled) toast.error("Failed to load material"); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [previewMat]);

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
                <p className="text-gray-200 mt-2 text-base whitespace-pre-line">{program.brief}</p>
                <div className="flex items-center gap-4 mt-4 text-gray-300 text-base flex-wrap">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    {program.author}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {program.totalDuration}
                  </span>
                  <span>{program.courses.length} chapters · {totalLessons} lessons · {totalTests} tests</span>
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
                      <span className="text-base text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sample Video Preview */}
            {((program as any).sampleVideoOneDriveItemId || program.sampleVideoPath || program.sampleVideoUrl) && (() => {
              const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
              const hasUploadedSample = !!(( program as any).sampleVideoOneDriveItemId || program.sampleVideoPath);
              const sampleStreamUrl = hasUploadedSample
                ? `${BASE_URL}/api/lms/stream-sample-video/${program._id}${token ? `?token=${token}` : ""}`
                : null;
              return (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </span>
                    Course Preview
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">Watch a free preview of this course</p>
                  <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
                    {sampleStreamUrl ? (
                      <video
                        src={sampleStreamUrl}
                        controls
                        controlsList="nodownload noplaybackrate"
                        disablePictureInPicture
                        onContextMenu={(e) => e.preventDefault()}
                        className="w-full aspect-video bg-black"
                      />
                    ) : program.sampleVideoUrl ? (
                      <div className="video-container">
                        <iframe
                          src={getEmbedUrl(program.sampleVideoUrl)}
                          title="Course Preview"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}

            {/* Course Curriculum */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Course Curriculum</h2>
              <p className="text-sm text-gray-500 mb-5">
                {program.courses.length} chapters · {totalLessons} lessons · {totalTests} quizzes
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
                        <span className="font-medium text-gray-900 text-base">{course.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-700">
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
                            <span className="text-sm text-gray-800 flex-1">{v.title}</span>
                            <span className="text-sm text-gray-600">Video</span>
                          </div>
                        ))}
                        {course.tests.map((t, tIdx) => (
                          <div key={tIdx} className="flex items-center gap-3 px-5 py-3">
                            <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm text-gray-800 flex-1">{t.title}</span>
                            <span className="text-sm text-gray-600">{t.questions.length} Qs</span>
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
                  <div className="flex items-center gap-2 text-base text-gray-800">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {program.totalDuration} total duration
                  </div>
                  <div className="flex items-center gap-2 text-base text-gray-800">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {totalLessons} video lessons
                  </div>
                  <div className="flex items-center gap-2 text-base text-gray-800">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    {totalTests} quizzes
                  </div>
                  <div className="flex items-center gap-2 text-base text-gray-800">
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
                          <div className="flex justify-between text-sm text-gray-800 mb-1">
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
                      onClick={() => {
                        setMainView("learn");
                        // Give time for the learn view to mount, then scroll to certificate
                        setTimeout(() => {
                          const el = document.getElementById("certificate-section");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }, 300);
                      }}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
                    >
                      {enrollment.status === "COMPLETED" ? "🎓 View Certificate" : "Continue Learning →"}
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
                  Continue to Next Chapter →
                </button>
              ) : enrollment?.status === "COMPLETED" ? (
                <button
                  onClick={() => {
                    setLearnView("course");
                    setTimeout(() => {
                      const el = document.getElementById("certificate-section");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }, 200);
                  }}
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
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    // Stream proxy is used for both OneDrive-stored and locally-stored videos
    const isUploadedVideo = !!(activeVideo.oneDriveItemId || activeVideo.filePath);
    const streamUrl = isUploadedVideo
      ? `${BASE_URL}/api/lms/stream-video/${programId}/${activeCourseIdx}/${activeVideoIdx}${token ? `?token=${token}` : ""}`
      : null;

    return (
      <div className="animate-fade-in">
        <button onClick={() => setLearnView("course")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3">
            <div className="bg-black rounded-2xl overflow-hidden shadow-lg">
              {streamUrl ? (
                <video
                  key={`${activeCourseIdx}-${activeVideoIdx}`}
                  src={streamUrl}
                  controls
                  autoPlay
                  controlsList="nodownload noplaybackrate"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  className="w-full aspect-video"
                />
              ) : activeVideo.link ? (
                <div className="video-container">
                  <iframe src={getEmbedUrl(activeVideo.link)} title={activeVideo.title} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                </div>
              ) : (
                <div className="flex items-center justify-center aspect-video text-gray-400">
                  <p>No video available</p>
                </div>
              )}
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
        <button onClick={() => router.push("/user/learning")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Programs
        </button>
        <div className="flex items-center gap-3">
          <span className="text-base text-gray-800">{progressPercent()}% complete</span>
          <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progressPercent()}%` }} />
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-2xl font-bold">{program.name}</h1>
        <p className="text-blue-100 text-base mt-1">by {program.author}</p>
        <div className="flex items-center gap-4 mt-3 text-base text-blue-100">
          <span>{program.courses.length} chapters</span>
          <span>·</span>
          <span>{totalLessons} videos</span>
          <span>·</span>
          <span>{enrollment?.passedTests.length ?? 0}/{totalTests} tests passed</span>
        </div>
      </div>

      {/* Certificate Banner */}
      {enrollment?.status === "COMPLETED" && (
        <>
          <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎓</div>
              <div>
                <h2 className="font-bold text-lg">Congratulations! You completed this program.</h2>
                <p className="text-white/80 text-sm mt-0.5">
                  Certificate issued on {enrollment.certificateIssuedAt ? new Date(enrollment.certificateIssuedAt).toLocaleDateString() : ""}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById("certificate-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-white text-amber-600 font-semibold text-sm hover:bg-amber-50 transition-colors shadow-md"
            >
              View Certificate
            </button>
          </div>

          {/* Certificate */}
          <div id="certificate-section" className="mb-6">
            <div className="bg-white rounded-2xl border border-amber-200 shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <h3 className="font-bold text-amber-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                  </svg>
                  Certificate of Completion
                </h3>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
                  </svg>
                  Print / Save PDF
                </button>
              </div>

              {/* Certificate body */}
              <div
                id="printable-certificate"
                className="relative min-h-[420px] flex flex-col items-center justify-center p-10 text-center overflow-hidden"
              >
                {/* Decorative certificate background */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
                  {/* Border decoration */}
                  <div className="absolute inset-3 border-4 border-amber-300/40 rounded-2xl pointer-events-none" />
                  <div className="absolute inset-5 border border-amber-200/30 rounded-xl pointer-events-none" />
                </div>

                <div className="relative z-10 space-y-4">
                  {/* Seal */}
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-400 shadow-lg mb-2">
                    <span className="text-3xl">🏆</span>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-amber-700 uppercase tracking-widest mb-1">This is to certify that</p>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
                      {currentUser
                        ? `${currentUser.firstName}${currentUser.middleName ? " " + currentUser.middleName : ""} ${currentUser.lastName}`
                        : "Participant"
                      }
                    </h1>
                  </div>

                  <p className="text-gray-600 text-base">has successfully completed the course</p>

                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-blue-700">{program.name}</h2>
                    {program.totalDuration && (
                      <p className="text-base text-gray-700 mt-1">{program.totalDuration} · by {program.author}</p>
                    )}
                  </div>

                  <div className="pt-4">
                    <div className="inline-block border-t-2 border-gray-400 pt-2">
                      <p className="text-sm text-gray-700">Date of Completion</p>
                      <p className="text-base font-semibold text-gray-900">
                        {enrollment.certificateIssuedAt
                          ? new Date(enrollment.certificateIssuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                          : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Course list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sidebar course nav */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm">Course Chapters</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {program.courses.map((course, cIdx) => {
                const unlocked = isCourseUnlocked(cIdx);
                const completed = isCourseCompleted(course._id);
                const active = activeCourseIdx === cIdx;
                return (
                  <button
                    key={cIdx}
                    onClick={() => { if (unlocked) setActiveCourseIdx(cIdx); else toast.error("Complete previous chapter's tests to unlock this."); }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${active ? "bg-blue-50 border-r-2 border-blue-600" : "hover:bg-gray-50"} ${!unlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${completed ? "bg-emerald-100 text-emerald-600" : active ? "bg-blue-100 text-blue-600" : !unlocked ? "bg-gray-100 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                      {completed ? "✓" : !unlocked ? "🔒" : cIdx + 1}
                    </div>
                    <span className="text-base font-medium text-gray-900 truncate">{course.title}</span>
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
                    {activeCourse.description && <p className="text-sm text-gray-500">{activeCourse.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-700 mt-2 pl-11">
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
                  <div
                    className="divide-y divide-gray-100"
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ userSelect: "none" } as React.CSSProperties}
                  >
                    {activeCourse.materials.map((mat, mIdx) => {
                      const isPDF = mat.mimeType === "application/pdf";
                      const isImage = mat.mimeType === "image/jpeg" || mat.mimeType === "image/png";
                      const fileUrl = `${BASE_URL}${mat.filePath}`;
                      return (
                        <button
                          key={mIdx}
                          onClick={() => {
                            if (isPDF || isImage) {
                              setPreviewMat({ url: fileUrl, type: isPDF ? "pdf" : "image", name: mat.originalName });
                            }
                          }}
                          onContextMenu={(e) => e.preventDefault()}
                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-all text-left"
                          draggable={false}
                        >
                          <span className="text-xl flex-shrink-0">
                            {isPDF ? "📄" : isImage ? "🖼️" : "📎"}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">{mat.originalName}</p>
                            <p className="text-xs text-gray-400">{(mat.fileSize / 1024 / 1024).toFixed(2)} MB · {isPDF ? "PDF" : isImage ? "Image" : "File"}</p>
                          </div>
                          <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                          </svg>
                        </button>
                      );
                    })}
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
                  Next Chapter →
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Protected Material Preview Modal ── */}
      {previewMat && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ userSelect: "none", WebkitUserSelect: "none" } as React.CSSProperties}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-gray-900 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl flex-shrink-0">{previewMat.type === "pdf" ? "📄" : "🖼️"}</span>
              <span className="text-white font-medium text-sm truncate">{previewMat.name}</span>
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded flex-shrink-0">🔒 Protected</span>
            </div>
            <button
              onClick={() => setPreviewMat(null)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors flex-shrink-0 ml-4"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>

          {/* Content area */}
          <div
            className="flex-1 relative overflow-hidden bg-gray-950"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            {previewLoading || !previewBlobUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-4 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Loading material...</p>
              </div>
            ) : previewMat.type === "pdf" ? (
              <div className="relative w-full h-full">
                <iframe
                  src={`${previewBlobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  className="w-full h-full border-0"
                  title={previewMat.name}
                />
                {/* Overlay with pointer-events: none allows scroll/pointer events through,
                    while document-level handlers block right-click and copy globally */}
                <div
                  className="absolute inset-0 z-10"
                  style={{ background: "transparent", pointerEvents: "none" }}
                />
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                <div className="relative">
                  <img
                    src={previewBlobUrl}
                    alt={previewMat.name}
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    className="max-w-[90vw] max-h-[85vh] object-contain rounded shadow-2xl"
                    style={{ userSelect: "none", WebkitUserDrag: "none" } as React.CSSProperties}
                  />
                  {/* Transparent overlay prevents right-click & drag on the image */}
                  <div
                    className="absolute inset-0 z-10"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    style={{ background: "transparent" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
