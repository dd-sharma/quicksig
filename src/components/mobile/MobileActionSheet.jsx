import React from "react";

export default function MobileActionSheet({ title, actions = [], open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3" />
        <div className="p-4">
          {title && <h3 className="font-semibold mb-3">{title}</h3>}
          <div className="divide-y">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => { action.onClick?.(); onClose?.(); }}
                className="w-full py-3 text-left flex items-center gap-3 hover:bg-gray-50 min-h-[44px]"
              >
                {action.icon && <action.icon className="w-5 h-5" />}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}