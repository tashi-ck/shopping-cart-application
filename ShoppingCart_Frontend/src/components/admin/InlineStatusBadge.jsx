import { useEffect, useRef, useState } from "react";
import { FULFILLMENT_OPTIONS, fulfillmentStatusStyles } from "../../utils/statusStyles";

export default function InlineStatusBadge({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`text-xs font-medium px-2.5 py-1 rounded-full transition disabled:opacity-50 ${
          disabled ? "" : "hover:ring-2 hover:ring-offset-1 hover:ring-gray-300"
        } ${fulfillmentStatusStyles[value] ?? "bg-gray-100 text-gray-700"}`}
      >
        {disabled ? "Updating..." : value}
      </button>

      {open && (
        <div className="absolute z-10 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px]">
          {FULFILLMENT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                opt === value ? "font-semibold text-indigo-600" : "text-gray-700"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}