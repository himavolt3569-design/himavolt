"use client";

import { useEffect } from "react";

/**
 * The master admin panel is always presented in the light theme, regardless of
 * the site-wide theme toggle. The global `.dark` class lives on <html> (set by
 * ThemeContext), so we strip it while the admin is mounted and restore the
 * user's chosen theme when they navigate away.
 */
export default function AdminThemeLock() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");

    return () => {
      if (localStorage.getItem("theme") === "dark") {
        root.classList.add("dark");
      }
    };
  }, []);

  return null;
}
