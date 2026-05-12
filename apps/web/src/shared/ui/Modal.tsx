import { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className={`bg-white rounded-lg shadow-xl w-full ${maxWidth}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">{title}</h2>
          <button className="text-slate-500 hover:text-slate-800" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="p-4 space-y-3 max-h-[70vh] overflow-auto">{children}</div>
        {footer && <div className="px-4 py-3 border-t bg-slate-50 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
