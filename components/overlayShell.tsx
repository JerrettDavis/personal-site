import {type ReactNode} from 'react';

interface OverlayShellProps {
    isOpen: boolean;
    onClose: () => void;
    ariaLabel: string;
    overlayClassName: string;
    panelClassName: string;
    scrimClassName: string;
    scrimLabel?: string;
    children: ReactNode;
}

export default function OverlayShell({
    isOpen,
    onClose,
    ariaLabel,
    overlayClassName,
    panelClassName,
    scrimClassName,
    scrimLabel = 'Close dialog',
    children,
}: OverlayShellProps) {
    if (!isOpen) return null;

    const overlay = (
        <div className={overlayClassName} role="dialog" aria-modal="true" aria-label={ariaLabel}>
            <button
                type="button"
                className={scrimClassName}
                onClick={onClose}
                aria-label={scrimLabel}
            />
            <div className={panelClassName}>
                {children}
            </div>
        </div>
    );

    return overlay;
}
