// src/components/Modal.jsx
import { useEffect } from "react";
import { createPortal } from "react-dom";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnBackdropClick = true,
  showCloseButton = true,
}) => {
  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }

    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-opacity-30 backdrop-blur-sm"
        onClick={closeOnBackdropClick ? onClose : undefined}
      ></div>

      <div className={`relative w-full ${sizes[size]} mx-auto animate-fadeIn`}>
        <div className="bg-white/95 backdrop-blur-md dark:bg-gray-800/95 rounded-lg shadow-2xl">

          <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="p-5">{children}</div>

          {footer && (
            <div className="flex p-5 border-t dark:border-gray-700">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;