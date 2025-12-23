import {useEffect, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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

    return mounted ? createPortal(overlay, document.body) : null;
}
