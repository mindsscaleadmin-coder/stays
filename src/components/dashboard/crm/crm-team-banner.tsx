import { Users } from "lucide-react";

export function CrmTeamBanner() {
  return (
    <div className="bg-gradient-to-r from-green-800 to-green-700 rounded-2xl p-4 sm:p-5 text-white">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Built for your whole team</p>
          <p className="text-xs text-green-100 mt-1 max-w-2xl">
            Search any guest, assign staff, message from the record, and track what needs attention —
            stays, experiences, dining, and confirmed events in one workflow.
          </p>
        </div>
      </div>
    </div>
  );
}
