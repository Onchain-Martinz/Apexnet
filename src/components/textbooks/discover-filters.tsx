"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ACADEMIC_LEVELS } from "@/lib/textbooks/discover";

interface DepartmentOption {
  id: string;
  name: string;
}

const selectClass = "h-11 w-full rounded-input border border-border bg-input px-2 text-[12px] font-medium text-foreground appearance-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:shadow-glow";

export function DiscoverFilters({ departments }: { departments: DepartmentOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounce search input so we don't navigate on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      const current = searchParams.get("q") ?? "";
      if (q !== current) updateParam("q", q);
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, course code, or topic"
          className="h-12 w-full rounded-input border border-border bg-input pl-11 pr-4 text-[16px] sm:text-[15px] text-foreground placeholder:text-muted-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:shadow-glow"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select
          value={searchParams.get("level") ?? ""}
          onChange={(e) => updateParam("level", e.target.value)}
          className={cn(selectClass, !searchParams.get("level") && "text-muted-foreground")}
          aria-label="Filter by level"
        >
          <option value="">All levels</option>
          {ACADEMIC_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level} Level
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("department") ?? ""}
          onChange={(e) => updateParam("department", e.target.value)}
          className={cn(selectClass, !searchParams.get("department") && "text-muted-foreground")}
          aria-label="Filter by department"
        >
          <option value="">All departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>

        <select
          value={searchParams.get("sort") ?? "newest"}
          onChange={(e) => updateParam("sort", e.target.value)}
          className={selectClass}
          aria-label="Sort textbooks"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
}
