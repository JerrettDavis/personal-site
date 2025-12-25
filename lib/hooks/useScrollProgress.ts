import {useEffect, type DependencyList} from 'react';

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const useScrollProgress = (deps: DependencyList = []) => {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const root = document.documentElement;
        let rafId = 0;
        let lastValue = '';

        const update = () => {
            rafId = 0;
            const scrollTop = window.scrollY || root.scrollTop || 0;
            const maxScroll = Math.max(root.scrollHeight - window.innerHeight, 1);
            const progress = clamp(scrollTop / maxScroll);
            const nextValue = progress.toFixed(4);
            if (nextValue === lastValue) return;
            lastValue = nextValue;
            root.style.setProperty('--scroll-progress', nextValue);
        };

        const onScroll = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (rafId) window.cancelAnimationFrame(rafId);
            root.style.removeProperty('--scroll-progress');
            lastValue = '';
        };
    }, deps);
};
