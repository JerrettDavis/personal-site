import {useEffect} from 'react';

export const useGlowHotspot = (selector = '.glowable') => {
    useEffect(() => {
        let rafId = 0;
        let lastTarget: HTMLElement | null = null;
        let latestEvent: PointerEvent | null = null;

        const update = () => {
            rafId = 0;
            if (!latestEvent) return;
            const target = (latestEvent.target as HTMLElement | null)?.closest(selector) as HTMLElement | null;
            if (target) {
                const rect = target.getBoundingClientRect();
                const x = ((latestEvent.clientX - rect.left) / rect.width) * 100;
                const y = ((latestEvent.clientY - rect.top) / rect.height) * 100;
                target.style.setProperty('--glow-x', `${x}%`);
                target.style.setProperty('--glow-y', `${y}%`);
            }

            if (lastTarget && lastTarget !== target) {
                lastTarget.style.removeProperty('--glow-x');
                lastTarget.style.removeProperty('--glow-y');
            }

            if (!target && lastTarget) {
                lastTarget.style.removeProperty('--glow-x');
                lastTarget.style.removeProperty('--glow-y');
            }

            lastTarget = target ?? null;
        };

        const handlePointerMove = (event: PointerEvent) => {
            latestEvent = event;
            if (rafId) return;
            rafId = window.requestAnimationFrame(update);
        };

        const clearGlow = () => {
            if (lastTarget) {
                lastTarget.style.removeProperty('--glow-x');
                lastTarget.style.removeProperty('--glow-y');
                lastTarget = null;
            }
        };

        document.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('blur', clearGlow);

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('blur', clearGlow);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [selector]);
};
