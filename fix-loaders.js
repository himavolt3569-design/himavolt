const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const r of replacements) {
    if (content.includes(r.search)) {
      content = content.replace(r.search, r.replace);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
}

// 1. StaffManagementTab.tsx
replaceInFile('src/components/dashboard/StaffManagementTab.tsx', [
  {
    search: `} from "@/context/RestaurantContext";\nimport { apiFetch } from "@/lib/api-client";`,
    replace: `} from "@/context/RestaurantContext";\nimport { SkeletonTable } from "@/components/shared/Skeleton";\nimport { apiFetch } from "@/lib/api-client";`
  },
  {
    search: `  if (loading) {\n    return (\n      <div className="flex items-center justify-center py-20 gap-2 text-[var(--text-3)]">\n        <Loader2 className="h-5 w-5 animate-spin" />\n        <span className="text-sm font-medium">Loading attendance…</span>\n      </div>\n    );\n  }`,
    replace: `  if (loading) {\n    return (\n      <div className="py-8">\n        <SkeletonTable rows={5} />\n      </div>\n    );\n  }`
  }
]);

// 2. PaymentSettingsTab.tsx
replaceInFile('src/components/dashboard/PaymentSettingsTab.tsx', [
  {
    search: `import { Loader2 } from "lucide-react";`,
    replace: `import { Loader2 } from "lucide-react";\nimport { SkeletonTable } from "@/components/shared/Skeleton";`
  },
  {
    search: `  if (loading) {\n    return (\n      <div className="flex items-center justify-center py-20">\n        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-3)]" />\n      </div>\n    );\n  }`,
    replace: `  if (loading) {\n    return (\n      <div className="py-8">\n        <SkeletonTable rows={3} />\n      </div>\n    );\n  }`
  }
]);

// 3. ManualBillingTab.tsx
replaceInFile('src/components/dashboard/ManualBillingTab.tsx', [
  {
    search: `import { SkeletonCard } from "@/components/shared/Skeleton";`,
    replace: `import { SkeletonCard, SkeletonGrid } from "@/components/shared/Skeleton";`
  },
  {
    search: `        {loading ? (\n          <div className="flex items-center justify-center py-12">\n            <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />\n          </div>\n        ) : (`,
    replace: `        {loading ? (\n          <div className="py-6">\n            <SkeletonGrid rows={2} cols={3} cardClass="h-28 rounded-xl" />\n          </div>\n        ) : (`
  }
]);

console.log("Done");
