"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { lmsAPI } from "@/lib/api";
import { LMSProgram, LMSCourse, LMSTest, LMSTestQuestion, LMSVideo, LMSCourseMaterial } from "@/types";

type ViewMode = "list" | "create" | "edit" | "detail";

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<LMSProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProgram, setSelectedProgram] = useState<LMSProgram | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    brief: "",
    totalDuration: "",
    author: "",
    whatYouLearn: [""],
    fees: 0,
    sampleVideoUrl: "",
    thumbnailPath: "",
    certificateTemplatePath: "",
    courses: [] as LMSCourse[],
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lmsAPI.getPrograms();
      setPrograms(res.data.programs);
    } catch (error: any) {
      toast.error("Failed to fetch programs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const resetForm = () => {
    setFormData({
      name: "",
      brief: "",
      totalDuration: "",
      author: "",
      whatYouLearn: [""],
      fees: 0,
      sampleVideoUrl: "",
      thumbnailPath: "",
      certificateTemplatePath: "",
      courses: [],
    });
  };

  const handleCreate = () => {
    resetForm();
    setViewMode("create");
  };

  const handleEdit = (program: LMSProgram) => {
    setSelectedProgram(program);
    setFormData({
      name: program.name,
      brief: program.brief,
      totalDuration: program.totalDuration,
      author: program.author,
      whatYouLearn: program.whatYouLearn.length > 0 ? program.whatYouLearn : [""],
      fees: program.fees,
      sampleVideoUrl: program.sampleVideoUrl || "",
      thumbnailPath: (program as any).thumbnailPath || "",
      certificateTemplatePath: (program as any).certificateTemplatePath || "",
      courses: program.courses,
    });
    setViewMode("edit");
  };

  const handleDetail = (program: LMSProgram) => {
    setSelectedProgram(program);
    setViewMode("detail");
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.brief.trim() || !formData.totalDuration.trim() || !formData.author.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        whatYouLearn: formData.whatYouLearn.filter((w) => w.trim()),
      };

      if (viewMode === "create") {
        await lmsAPI.createProgram(data);
        toast.success("Program created successfully");
      } else {
        await lmsAPI.updateProgram(selectedProgram!._id, data);
        toast.success("Program updated successfully");
      }
      setViewMode("list");
      fetchPrograms();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save program");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this program?")) return;
    try {
      await lmsAPI.deleteProgram(id);
      toast.success("Program deleted");
      fetchPrograms();
    } catch (error: any) {
      toast.error("Failed to delete program");
    }
  };

  const handleTogglePublish = async (id: string) => {
    try {
      const res = await lmsAPI.togglePublish(id);
      toast.success(res.data.message);
      fetchPrograms();
    } catch (error: any) {
      toast.error("Failed to toggle publish status");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string, file: any) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await lmsAPI.uploadFile(fd);
      callback(res.data.url, { originalName: file.name, fileName: res.data.filename, filePath: res.data.url, fileSize: file.size, mimeType: file.type });
      toast.success("File uploaded");
    } catch (error: any) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string, file: any) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPEG, PNG and PDF files are allowed for course materials");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await lmsAPI.uploadMaterial(fd);
      callback(res.data.url, { originalName: file.name, fileName: res.data.filename, filePath: res.data.url, fileSize: file.size, mimeType: file.type });
      toast.success("Material uploaded");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Upload failed — only JPEG, PNG, PDF allowed");
    } finally {
      setUploading(false);
    }
  };

  // ─── Course management helpers ───
  const addCourse = () => {
    setFormData({
      ...formData,
      courses: [
        ...formData.courses,
        {
          title: "",
          description: "",
          order: formData.courses.length,
          videos: [],
          tests: [],
          materials: [],
        },
      ],
    });
  };

  const updateCourse = (idx: number, field: string, value: any) => {
    const courses = [...formData.courses];
    (courses[idx] as any)[field] = value;
    setFormData({ ...formData, courses });
  };

  const removeCourse = (idx: number) => {
    setFormData({
      ...formData,
      courses: formData.courses.filter((_, i) => i !== idx),
    });
  };

  // Video helpers
  const addVideo = (courseIdx: number) => {
    const courses = [...formData.courses];
    courses[courseIdx].videos.push({ title: "", link: "", order: courses[courseIdx].videos.length });
    setFormData({ ...formData, courses });
  };

  const updateVideo = (courseIdx: number, vidIdx: number, field: string, value: any) => {
    const courses = [...formData.courses];
    (courses[courseIdx].videos[vidIdx] as any)[field] = value;
    setFormData({ ...formData, courses });
  };

  const removeVideo = (courseIdx: number, vidIdx: number) => {
    const courses = [...formData.courses];
    courses[courseIdx].videos = courses[courseIdx].videos.filter((_, i) => i !== vidIdx);
    setFormData({ ...formData, courses });
  };

  // Test helpers
  const addTest = (courseIdx: number) => {
    const courses = [...formData.courses];
    courses[courseIdx].tests.push({ title: "", questions: [], minimumPassingMarks: 0 });
    setFormData({ ...formData, courses });
  };

  const updateTest = (courseIdx: number, testIdx: number, field: string, value: any) => {
    const courses = [...formData.courses];
    (courses[courseIdx].tests[testIdx] as any)[field] = value;
    setFormData({ ...formData, courses });
  };

  const removeTest = (courseIdx: number, testIdx: number) => {
    const courses = [...formData.courses];
    courses[courseIdx].tests = courses[courseIdx].tests.filter((_, i) => i !== testIdx);
    setFormData({ ...formData, courses });
  };

  // Question helpers
  const addQuestion = (courseIdx: number, testIdx: number) => {
    const courses = [...formData.courses];
    courses[courseIdx].tests[testIdx].questions.push({
      questionText: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
      score: 1,
      negativeMarking: 0,
    });
    setFormData({ ...formData, courses });
  };

  const updateQuestion = (courseIdx: number, testIdx: number, qIdx: number, field: string, value: any) => {
    const courses = [...formData.courses];
    (courses[courseIdx].tests[testIdx].questions[qIdx] as any)[field] = value;
    setFormData({ ...formData, courses });
  };

  const updateOption = (courseIdx: number, testIdx: number, qIdx: number, optIdx: number, value: string) => {
    const courses = [...formData.courses];
    courses[courseIdx].tests[testIdx].questions[qIdx].options[optIdx] = value;
    setFormData({ ...formData, courses });
  };

  const removeQuestion = (courseIdx: number, testIdx: number, qIdx: number) => {
    const courses = [...formData.courses];
    courses[courseIdx].tests[testIdx].questions = courses[courseIdx].tests[testIdx].questions.filter((_, i) => i !== qIdx);
    setFormData({ ...formData, courses });
  };

  // ─── LIST VIEW ───
  if (viewMode === "list") {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Programs</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your learning programs</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Program
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="spinner" />
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No programs yet</h3>
            <p className="text-sm text-gray-500">Create your first program to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {programs.map((program) => {
              const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";
              const totalLessons = program.courses.reduce((sum: number, c: any) => sum + c.videos.length, 0);
              const totalTests = program.courses.reduce((sum: number, c: any) => sum + c.tests.length, 0);
              return (
                <div key={program._id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-300 flex flex-col group">
                  {/* Thumbnail */}
                  <div className="relative h-40 bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden flex-shrink-0">
                    {program.thumbnailPath ? (
                      <img
                        src={`${BASE_URL}${program.thumbnailPath}`}
                        alt={program.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl font-black text-white/20">{program.name[0]}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {/* Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm ${program.fees === 0 ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>
                        {program.fees === 0 ? "Free" : `₹${program.fees.toLocaleString()}`}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shadow-sm ${program.isPublished ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}>
                        {program.isPublished ? "Live" : "Draft"}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-4">
                    <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1.5">{program.name}</h3>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{program.brief}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      <span className="truncate">{program.author}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mb-4 flex-wrap">
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                        {program.courses.length} modules
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        {totalLessons} lessons
                      </span>
                      {totalTests > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          {totalTests} quizzes
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {program.totalDuration}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center gap-1.5">
                      <button
                        onClick={() => handleDetail(program)}
                        className="flex-1 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                        title="View Details"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(program)}
                        className="flex-1 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleTogglePublish(program._id)}
                        className={`p-1.5 rounded-lg transition-colors ${program.isPublished ? "hover:bg-amber-50 text-amber-500 border border-amber-200" : "hover:bg-emerald-50 text-emerald-500 border border-emerald-200"}`}
                        title={program.isPublished ? "Unpublish" : "Publish"}
                      >
                        {program.isPublished ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(program._id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 border border-red-100 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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

  // ─── DETAIL VIEW ───
  if (viewMode === "detail" && selectedProgram) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setViewMode("list")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Programs
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedProgram.name}</h1>
              <p className="text-gray-500 mt-1">{selectedProgram.brief}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedProgram.isPublished ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {selectedProgram.isPublished ? "Published" : "Draft"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Author</p>
              <p className="font-semibold text-gray-900 mt-1">{selectedProgram.author}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Duration</p>
              <p className="font-semibold text-gray-900 mt-1">{selectedProgram.totalDuration}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Courses</p>
              <p className="font-semibold text-gray-900 mt-1">{selectedProgram.courses.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Fees</p>
              <p className="font-semibold text-gray-900 mt-1">{selectedProgram.fees > 0 ? `₹${selectedProgram.fees}` : "Free"}</p>
            </div>
          </div>

          {selectedProgram.whatYouLearn.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">What You&apos;ll Learn</h3>
              <ul className="space-y-1">
                {selectedProgram.whatYouLearn.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Courses ({selectedProgram.courses.length})</h3>
            <div className="space-y-3">
              {selectedProgram.courses.map((course, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">{course.title}</h4>
                  {course.description && <p className="text-sm text-gray-500 mt-1">{course.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>🎥 {course.videos.length} videos</span>
                    <span>📝 {course.tests.length} tests</span>
                    <span>📎 {course.materials.length} materials</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── CREATE / EDIT VIEW ───
  return (
    <div className="animate-fade-in">
      <button
        onClick={() => setViewMode("list")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Programs
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {viewMode === "create" ? "Create New Program" : "Edit Program"}
        </h2>

        {/* Basic Info */}
        <div className="space-y-4 mb-8">
          <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm outline-none"
                placeholder="e.g., Full Stack Development"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Author <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm outline-none"
                placeholder="e.g., John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brief Description <span className="text-red-500">*</span></label>
            <textarea
              value={formData.brief}
              onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm outline-none"
              rows={3}
              placeholder="Describe your program..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Duration <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.totalDuration}
                onChange={(e) => setFormData({ ...formData, totalDuration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm outline-none"
                placeholder="e.g., 3 months"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fees (₹)</label>
              <input
                type="number"
                value={formData.fees}
                onChange={(e) => setFormData({ ...formData, fees: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm outline-none"
                min={0}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sample Video URL</label>
              <input
                type="url"
                value={formData.sampleVideoUrl}
                onChange={(e) => setFormData({ ...formData, sampleVideoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Thumbnail & Certificate uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thumbnail
                <span className="ml-1 text-xs text-gray-400 font-normal">(Recommended: 1280 × 720 px, JPG/PNG)</span>
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                {formData.thumbnailPath ? (
                  <div className="flex flex-col items-center gap-1 px-3 text-center">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-emerald-600 font-medium">Uploaded</span>
                    <span className="text-xs text-gray-400 truncate max-w-full">{formData.thumbnailPath.split("/").pop()}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-gray-500">Click to upload thumbnail</span>
                    <span className="text-xs text-gray-400">1280 × 720 px</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      setFormData({ ...formData, thumbnailPath: url });
                    })
                  }
                />
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certificate Template
                <span className="ml-1 text-xs text-gray-400 font-normal">(Recommended: 1920 × 1080 px, PNG/PDF)</span>
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                {formData.certificateTemplatePath ? (
                  <div className="flex flex-col items-center gap-1 px-3 text-center">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-emerald-600 font-medium">Uploaded</span>
                    <span className="text-xs text-gray-400 truncate max-w-full">{formData.certificateTemplatePath.split("/").pop()}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs text-gray-500">Click to upload certificate</span>
                    <span className="text-xs text-gray-400">1920 × 1080 px (A4 landscape)</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) =>
                    handleFileUpload(e, (url) => {
                      setFormData({ ...formData, certificateTemplatePath: url });
                    })
                  }
                />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">What You&apos;ll Learn</label>
            {formData.whatYouLearn.map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const updated = [...formData.whatYouLearn];
                    updated[i] = e.target.value;
                    setFormData({ ...formData, whatYouLearn: updated });
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm outline-none"
                  placeholder="Learning outcome..."
                />
                {formData.whatYouLearn.length > 1 && (
                  <button
                    onClick={() => setFormData({ ...formData, whatYouLearn: formData.whatYouLearn.filter((_, idx) => idx !== i) })}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-400"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setFormData({ ...formData, whatYouLearn: [...formData.whatYouLearn, ""] })}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add item
            </button>
          </div>
        </div>

        {/* Courses Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Courses</h3>
            <button
              onClick={addCourse}
              className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Course
            </button>
          </div>

          {formData.courses.map((course, cIdx) => (
            <div key={cIdx} className="bg-gray-50 rounded-lg p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Course {cIdx + 1}</h4>
                <button onClick={() => removeCourse(cIdx)} className="text-red-400 hover:text-red-600 text-sm">
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <input
                  type="text"
                  value={course.title}
                  onChange={(e) => updateCourse(cIdx, "title", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm outline-none"
                  placeholder="Course title"
                />
                <input
                  type="text"
                  value={course.description || ""}
                  onChange={(e) => updateCourse(cIdx, "description", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm outline-none"
                  placeholder="Course description"
                />
              </div>

              {/* Videos */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">VIDEOS</span>
                  <button onClick={() => addVideo(cIdx)} className="text-xs text-blue-600 hover:underline">
                    + Add Video
                  </button>
                </div>
                {course.videos.map((vid, vIdx) => (
                  <div key={vIdx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={vid.title}
                      onChange={(e) => updateVideo(cIdx, vIdx, "title", e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900"
                      placeholder="Video title"
                    />
                    <input
                      type="url"
                      value={vid.link}
                      onChange={(e) => updateVideo(cIdx, vIdx, "link", e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900"
                      placeholder="Video URL"
                    />
                    <button onClick={() => removeVideo(cIdx, vIdx)} className="text-red-400 text-xs px-2">
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Materials upload */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">MATERIALS</span>
                  <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                    + Upload Material
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) =>
                        handleMaterialUpload(e, (url, fileInfo) => {
                          const courses = [...formData.courses];
                          courses[cIdx].materials.push({
                            ...fileInfo,
                            uploadedAt: new Date().toISOString(),
                          });
                          setFormData({ ...formData, courses });
                        })
                      }
                    />
                  </label>
                </div>
                {course.materials.map((mat, mIdx) => (
                  <div key={mIdx} className="flex items-center gap-2 mb-1 text-xs text-gray-500">
                    <span>📎 {mat.originalName}</span>
                    <button
                      onClick={() => {
                        const courses = [...formData.courses];
                        courses[cIdx].materials = courses[cIdx].materials.filter((_, i) => i !== mIdx);
                        setFormData({ ...formData, courses });
                      }}
                      className="text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Tests */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">TESTS</span>
                  <button onClick={() => addTest(cIdx)} className="text-xs text-blue-600 hover:underline">
                    + Add Test
                  </button>
                </div>
                {course.tests.map((test, tIdx) => (
                  <div key={tIdx} className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        value={test.title}
                        onChange={(e) => updateTest(cIdx, tIdx, "title", e.target.value)}
                        className="font-medium text-sm border-b border-transparent focus:border-blue-500 outline-none"
                        placeholder="Test title"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={test.minimumPassingMarks || 0}
                          onChange={(e) => updateTest(cIdx, tIdx, "minimumPassingMarks", Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg border border-gray-300 text-xs text-gray-900"
                          placeholder="Min marks"
                        />
                        <button onClick={() => removeTest(cIdx, tIdx)} className="text-red-400 text-xs">
                          Remove
                        </button>
                      </div>
                    </div>

                    {test.questions.map((q, qIdx) => (
                      <div key={qIdx} className="bg-gray-50 rounded-lg p-3 mb-2">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-medium text-gray-400 mt-1">Q{qIdx + 1}</span>
                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => updateQuestion(cIdx, tIdx, qIdx, "questionText", e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-900"
                            placeholder="Question text"
                          />
                          <button onClick={() => removeQuestion(cIdx, tIdx, qIdx)} className="text-red-400 text-xs mt-1">
                            ×
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center gap-1">
                              <input
                                type="radio"
                                name={`correct-${cIdx}-${tIdx}-${qIdx}`}
                                checked={q.correctOptionIndex === oIdx}
                                onChange={() => updateQuestion(cIdx, tIdx, qIdx, "correctOptionIndex", oIdx)}
                                className="accent-blue-600"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => updateOption(cIdx, tIdx, qIdx, oIdx, e.target.value)}
                                className="flex-1 px-2 py-1 rounded-lg border border-gray-300 text-xs text-gray-900"
                                placeholder={`Option ${oIdx + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-gray-400">Score:</label>
                            <input
                              type="number"
                              value={q.score}
                              onChange={(e) => updateQuestion(cIdx, tIdx, qIdx, "score", Number(e.target.value))}
                              className="w-14 px-2 py-0.5 rounded-lg border border-gray-300 text-xs text-gray-900"
                              min={0}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <label className="text-xs text-gray-400">Negative:</label>
                            <input
                              type="number"
                              value={q.negativeMarking}
                              onChange={(e) => updateQuestion(cIdx, tIdx, qIdx, "negativeMarking", Number(e.target.value))}
                              className="w-14 px-2 py-0.5 rounded-lg border border-gray-300 text-xs text-gray-900"
                              min={0}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => addQuestion(cIdx, tIdx)}
                      className="text-xs text-blue-600 hover:underline mt-1"
                    >
                      + Add Question
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="px-8 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : viewMode === "create" ? "Create Program" : "Save Changes"}
          </button>
          <button
            onClick={() => setViewMode("list")}
            className="px-8 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
