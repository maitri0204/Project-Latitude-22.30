"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { lmsAPI } from "@/lib/api";
import { Category } from "@/types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");
  const [addingSub, setAddingSub] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lmsAPI.getCategories();
      setCategories(res.data.categories);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    try {
      await lmsAPI.createCategory({ name: newCategoryName.trim() });
      toast.success("Category added");
      setNewCategoryName("");
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add category");
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!confirm(`Delete "${cat.name}" and all its sub-categories?`)) return;
    try {
      await lmsAPI.deleteCategory(cat._id);
      toast.success("Category deleted");
      if (expandedId === cat._id) setExpandedId(null);
      fetchCategories();
    } catch {
      toast.error("Failed to delete category");
    }
  };

  const handleAddSubCategory = async (categoryId: string) => {
    if (!newSubName.trim()) return;
    setAddingSub(true);
    try {
      await lmsAPI.addSubCategory(categoryId, { subCategory: newSubName.trim() });
      toast.success("Sub-category added");
      setNewSubName("");
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add sub-category");
    } finally {
      setAddingSub(false);
    }
  };

  const handleDeleteSubCategory = async (categoryId: string, sub: string) => {
    try {
      await lmsAPI.deleteSubCategory(categoryId, sub);
      toast.success("Sub-category removed");
      fetchCategories();
    } catch {
      toast.error("Failed to remove sub-category");
    }
  };

  const totalSubs = categories.reduce((sum, c) => sum + c.subCategories.length, 0);

  return (
    <div className="animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <p className="text-base text-gray-600 mt-1">
          Manage program categories and sub-categories used across all programs.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Categories</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : categories.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Sub-categories</p>
            <p className="text-2xl font-bold text-gray-900">{loading ? "—" : totalSubs}</p>
          </div>
        </div>
      </div>

      {/* Add Category Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Add New Category</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-base text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Technology, Finance, Design..."
          />
          <button
            onClick={handleAddCategory}
            disabled={addingCategory || !newCategoryName.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        </div>
      </div>

      {/* Category List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="spinner" />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <p className="font-semibold text-gray-800 text-base">No categories yet</p>
          <p className="text-sm text-gray-500 mt-1">Add your first category using the form above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isExpanded = expandedId === cat._id;
            return (
              <div key={cat._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Category Row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-base">{cat.name}</p>
                      <p className="text-sm text-gray-500">
                        {cat.subCategories.length === 0
                          ? "No sub-categories"
                          : `${cat.subCategories.length} sub-categor${cat.subCategories.length === 1 ? "y" : "ies"}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setExpandedId(isExpanded ? null : cat._id);
                        setNewSubName("");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {isExpanded ? "Close" : "Manage"}
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors border border-red-100"
                      title="Delete category"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    {/* Sub-category tags */}
                    {cat.subCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {cat.subCategories.map((sub) => (
                          <span
                            key={sub}
                            className="inline-flex items-center gap-1.5 text-sm font-medium bg-white border border-gray-200 text-gray-800 px-3 py-1 rounded-full shadow-sm"
                          >
                            {sub}
                            <button
                              onClick={() => handleDeleteSubCategory(cat._id, sub)}
                              className="w-4 h-4 rounded-full bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-600 flex items-center justify-center text-xs font-bold transition-colors flex-shrink-0"
                              title={`Remove "${sub}"`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Add sub-category */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSubCategory(cat._id)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        placeholder="New sub-category name..."
                      />
                      <button
                        onClick={() => handleAddSubCategory(cat._id)}
                        disabled={addingSub || !newSubName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Sub-category
                      </button>
                    </div>
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
