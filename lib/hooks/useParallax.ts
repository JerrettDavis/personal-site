import {useEffect} from 'react';
import type {RefObject} from 'react';

interface ParallaxOptions {
    max?: number;
    factor?: number;
    cssVar?: string;
}

export const useParallax = (
    ref: RefObject<HTMLElement | null>,
    {max = 160, factor = 0.12, cssVar = '--hero-parallax'}: ParallaxOptions = {}
) => {
    useEffect(() => {
        const target = ref.current;
        if (!target || typeof window === 'undefined') return;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
            target.style.setProperty(cssVar, '0px');
            return;
        }

        let rafId = 0;
        const update = () => {
            rafId = 0;
            const offset = Math.min(max, window.scrollY * factor);
            target.style.setProperty(cssVar, `${offset}px`);
        };

        const onScroll = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', onScroll, {passive: true});
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [ref, max, factor, cssVar]);
};
