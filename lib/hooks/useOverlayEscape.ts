import {useEffect} from 'react';
import {shouldIgnoreKeyEvent} from '../dom';

interface OverlayEscapeOptions {
    isOpen: boolean;
    onClose: () => void;
    ignoreInputs?: boolean;
}

export const useOverlayEscape = ({isOpen, onClose, ignoreInputs = true}: OverlayEscapeOptions) => {
    useEffect(() => {
        if (!isOpen) return;
        const handler = (event: KeyboardEvent) => {
            if (ignoreInputs && shouldIgnoreKeyEvent(event.target)) return;
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [ignoreInputs, isOpen, onClose]);
};
