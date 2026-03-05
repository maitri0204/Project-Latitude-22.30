"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { lmsAPI } from "@/lib/api";
import { WishlistItem, LMSProgram } from "@/types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5000";

export default function MyListPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lmsAPI.getWishlist();
      setWishlist(res.data.wishlist);
    } catch {
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const handleRemove = async (programId: string) => {
    try {
      await lmsAPI.removeFromWishlist(programId);
      toast.success("Removed from My List");
      setWishlist((prev) => prev.filter((w) => {
        const id = typeof w.programId === "string" ? w.programId : (w.programId as LMSProgram)._id;
        return id !== programId;
      }));
    } catch {
      toast.error("Failed to remove");
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
        <h1 className="text-2xl font-bold text-gray-900">My List</h1>
        <p className="text-sm text-gray-500 mt-1">Programs you&apos;ve saved for later</p>
      </div>

      {wishlist.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 border border-gray-200 text-center">
          <div className="text-5xl mb-4">💛</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Your list is empty</h3>
          <p className="text-sm text-gray-500 mb-4">
            Browse programs and add them to your list for future enrollment.
          </p>
          <button
            onClick={() => router.push("/user/learning")}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all"
          >
            Browse Programs
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {wishlist.map((item) => {
            const program = item.programId as LMSProgram;
            if (!program || typeof program === "string") return null;
            const totalLessons = program.courses?.reduce((acc, c) => acc + c.videos.length, 0) || 0;

            return (
              <div
                key={item._id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer group"
                onClick={() => router.push(`/user/learning/${program._id}`)}
              >
                {/* Thumbnail */}
                <div className="relative h-40 bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 overflow-hidden flex-shrink-0">
                  {program.thumbnailPath ? (
                    <img
                      src={`${BASE_URL}${program.thumbnailPath}`}
                      alt={program.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl font-black text-blue-200/70 select-none">
                        {program.name?.[0]}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    {program.fees === 0 ? (
                      <span className="bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">Free</span>
                    ) : (
                      <span className="bg-white/90 backdrop-blur text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow">
                        ₹{program.fees?.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-gray-900 text-base leading-snug mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {program.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">by {program.author}</p>

                  <div className="flex items-center gap-3 text-sm text-gray-700 mb-3 flex-wrap">
                    <span>{program.courses?.length || 0} chapters</span>
                    <span>·</span>
                    <span>{totalLessons} lessons</span>
                    <span>·</span>
                    <span>{program.totalDuration}</span>
                  </div>

                  <p className="text-xs text-gray-400 mb-3">
                    Added {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  <div className="flex-1" />

                  <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/user/learning/${program._id}`); }}
                      className="flex-1 py-2.5 rounded-lg border border-blue-600 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition-all"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(program._id); }}
                      className="px-3 py-2.5 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-all"
                      title="Remove from list"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
