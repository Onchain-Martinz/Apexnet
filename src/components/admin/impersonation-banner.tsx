"use client";

import { useState } from "react";
import { routes } from "@/config/routes";

// Persistent strip shown while an admin is impersonating another account.
export function ImpersonationBanner() {
  const [loading, setLoading] = useState(false);

  async function returnToAdmin() {
    setLoading(true);
    try {
      const res = await fetch(routes.api.admin.returnToAdmin, { method: "POST" });
      if (res.ok) {
        window.location.href = routes.admin.root;
        return;
      }
    } catch {
      // fall through to reset loading state
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-slate-900 px-page py-2 text-white">
      <p className="text-[12px] font-medium">Viewing as this user</p>
      <button
        type="button"
        onClick={returnToAdmin}
        disabled={loading}
        className="flex-shrink-0 rounded-button bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-900 transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
      >
        {loading ? "Returning…" : "Return to Admin"}
      </button>
    </div>
  );
}
