import React from "react";

export default function FAB({ onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed bottom-20 right-4 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center z-40 touch-manipulation"
      aria-label={label}
    >
      {Icon ? <Icon className="w-6 h-6 text-white" /> : null}
    </button>
  );
}