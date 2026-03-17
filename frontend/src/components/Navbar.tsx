"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      setIsLoggedIn(true);
      try {
        const userData = JSON.parse(user);
        const fullName = [userData.firstName, userData.lastName].filter(Boolean).join(" ");
        setUserName(fullName || "User");
        setUserRole(userData.role || "");
      } catch {
        setUserName("User");
      }
    } else {
      setIsLoggedIn(false);
      setUserName("");
      setUserRole("");
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserName("");
    setUserRole("");
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
    router.push("/login");
  };

  const dashboardHref =
    userRole === "ADMIN" ? "/admin/programs" : "/user/learning";

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white sticky top-0 z-50 shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-25 items-center">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-1 group">
              <img src="/logo.png" alt="Latitude" className="h-21 w-auto object-contain group-hover:scale-105 transition-all duration-300" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-2">
            <Link
              href="/"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("/")
                  ? "text-blue-600 bg-blue-50 shadow-sm"
                  : "text-gray-700 hover:text-blue-600 hover:bg-blue-50/50"
              }`}
            >
              Home
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href={dashboardHref}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    pathname.startsWith("/admin") || pathname.startsWith("/user")
                      ? "text-blue-600 bg-blue-50 shadow-sm"
                      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50/50"
                  }`}
                >
                  Dashboard
                </Link>

                {/* Profile Dropdown */}
                <div className="relative ml-3">
                  <button
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="User menu"
                    aria-expanded={profileDropdownOpen}
                  >
                    {userName ? userName.charAt(0).toUpperCase() : "U"}
                  </button>

                  {profileDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setProfileDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-fade-in">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">
                            {userName}
                          </p>
                          <p className="text-xs text-gray-500 capitalize mt-0.5">
                            {userRole?.replace("_", " ")}
                          </p>
                        </div>

                        {/* Go to Dashboard */}
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            router.push(dashboardHref);
                          }}
                          className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 mr-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                            />
                          </svg>
                          My Dashboard
                        </button>

                        {/* Logout */}
                        <button
                          onClick={() => {
                            setProfileDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                        >
                          <svg
                            className="w-5 h-5 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    isActive("/login")
                      ? "text-blue-600 bg-blue-50 shadow-sm"
                      : "text-gray-700 hover:text-blue-600 hover:bg-blue-50/50"
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 btn-glow"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {!mobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive("/")
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
              }`}
            >
              Home
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                >
                  Dashboard
                </Link>

                {/* User info in mobile */}
                <div className="border-t border-gray-200 mt-2 pt-2 px-3">
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                      {userName ? userName.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {userName}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {userRole?.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive("/login")
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-blue-600 hover:bg-blue-50"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
