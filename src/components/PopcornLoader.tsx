import { Loader2 } from "lucide-react";

export default function PopcornLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-white animate-spin" />
      <p className="text-gray-500 text-sm font-medium animate-pulse">Loading...</p>
    </div>
  );
}
