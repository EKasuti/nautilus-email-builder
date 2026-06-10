export function EmailFooter() {
  return (
    <div className="border-t border-gray-200 bg-gray-50 px-8 py-6 text-center">
      <p className="text-[13px] font-semibold text-gray-800 mb-1">Nautilus Car Wash</p>
      <p className="text-[12px] text-gray-500 leading-relaxed">
        1200 Marina Blvd, Suite 200, San Diego, CA 92101
      </p>
      <p className="text-[12px] text-gray-500 leading-relaxed mt-1">
        You're receiving this email because you're a Nautilus member.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] text-gray-400">
        {["Unsubscribe", "Manage preferences", "Visit website", "View in browser"].map((link, i, arr) => (
          <span key={link} className="contents">
            <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-cyan-500 transition-colors">
              {link}
            </a>
            {i < arr.length - 1 && <span className="text-gray-300">·</span>}
          </span>
        ))}
      </div>

      <p className="text-[11px] text-gray-400/70 mt-4">
        © 2026 Nautilus Car Wash. All rights reserved.
      </p>
    </div>
  );
}
