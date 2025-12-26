import {useEffect, useLayoutEffect, type DependencyList, type RefObject} from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const progressFromRatio = (ratio: number, isLarge: boolean) => {
    if (ratio <= 0) return 0;
    if (isLarge) return 1;
    const normalized = clamp(ratio / 0.66);
    return 0.2 + (0.8 * normalized);
};

const collectRevealTargets = (container: HTMLElement) => {
    const targets = new Set<HTMLElement>();
    const containers = Array.from(container.querySelectorAll('section, article')) as HTMLElement[];

    const addChildren = (element: HTMLElement) => {
        Array.from(element.children).forEach((child) => {
            if (!(child instanceof HTMLElement)) return;
            if (child.getAttribute('aria-hidden') === 'true') return;
            targets.add(child);
        });
    };

    containers.forEach(addChildren);

    Array.from(container.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        const tag = child.tagName.toLowerCase();
        if (tag === 'section' || tag === 'article') return;
        if (child.getAttribute('aria-hidden') === 'true') return;
        targets.add(child);
    });

    return Array.from(targets);
};

export const useReveal = (containerRef: RefObject<HTMLElement | null>, deps: DependencyList = []) => {
    useIsomorphicLayoutEffect(() => {
        const container = containerRef.current;
        if (!container || typeof window === 'undefined') return;

        const revealTargets = collectRevealTargets(container);
        if (revealTargets.length === 0) return;

        const root = document.documentElement;

        const prefersCoarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
        const setProgress = (element: HTMLElement, ratio: number, elementHeight: number, viewportHeight: number) => {
            const isLarge = elementHeight > viewportHeight * 1.15;
            const progress = prefersCoarsePointer
                ? (ratio > 0 ? 1 : 0)
                : progressFromRatio(ratio, isLarge);
            element.style.setProperty('--reveal-progress', progress.toFixed(3));
        };

        const getVisibleRatio = (element: HTMLElement) => {
            const rect = element.getBoundingClientRect();
            const viewportHeight = window.visualViewport?.height
                ?? window.innerHeight
                ?? document.documentElement.clientHeight;
            const visible = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
            if (rect.height <= 0) return 0;
            const basis = Math.min(rect.height, viewportHeight);
            const ratio = clamp(visible / basis);
            setProgress(element, ratio, rect.height, viewportHeight);
            return ratio;
        };

        revealTargets.forEach((element) => {
            element.setAttribute('data-reveal', 'true');
            element.style.setProperty('--reveal-progress', '0');
        });
        root.dataset.revealReady = 'true';

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
            revealTargets.forEach((element) => setProgress(element, 1, 0, 1));
            return () => {
                revealTargets.forEach((element) => {
                    element.removeAttribute('data-reveal');
                    element.style.removeProperty('--reveal-progress');
                });
                delete root.dataset.revealReady;
            };
        }

        const updateAll = () => {
            revealTargets.forEach((element) => getVisibleRatio(element));
        };

        let rafId = 0;
        const scheduleUpdate = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(() => {
                rafId = 0;
                updateAll();
            });
        };

        rafId = window.requestAnimationFrame(() => {
            rafId = window.requestAnimationFrame(() => {
                rafId = 0;
                updateAll();
            });
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const boundsHeight = entry.rootBounds?.height
                        ?? window.visualViewport?.height
                        ?? window.innerHeight
                        ?? 0;
                    const targetHeight = entry.boundingClientRect?.height ?? 0;
                    const basis = Math.min(targetHeight, boundsHeight);
                    const ratio = basis > 0 ? entry.intersectionRect.height / basis : 0;
                    setProgress(entry.target as HTMLElement, ratio, targetHeight, boundsHeight);
                });
            },
            {threshold: [0, 0.2, 0.4, 0.66, 1]},
        );

        revealTargets.forEach((element) => observer.observe(element));

        const handleResize = () => scheduleUpdate();
        const handleScroll = () => scheduleUpdate();
        const handleTouchMove = () => scheduleUpdate();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, {passive: true});
        window.addEventListener('touchmove', handleTouchMove, {passive: true});
        window.visualViewport?.addEventListener('resize', handleResize);
        window.visualViewport?.addEventListener('scroll', handleScroll);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('touchmove', handleTouchMove);
            window.visualViewport?.removeEventListener('resize', handleResize);
            window.visualViewport?.removeEventListener('scroll', handleScroll);
            if (rafId) window.cancelAnimationFrame(rafId);
            revealTargets.forEach((element) => {
                element.removeAttribute('data-reveal');
                element.style.removeProperty('--reveal-progress');
            });
            delete root.dataset.revealReady;
        };
    }, [containerRef, ...deps]);
};
