import {useEffect, type DependencyList, type RefObject} from 'react';

interface SectionGridOptions {
    sectionClassName: string;
    activeClassName: string;
    rootMargin?: string;
    threshold?: number;
}

export const useSectionGrid = (
    containerRef: RefObject<HTMLElement | null>,
    {
        sectionClassName,
        activeClassName,
        rootMargin = '0px 0px -55% 0px',
        threshold = 0.2,
    }: SectionGridOptions,
    deps: DependencyList = [],
) => {
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const sections = Array.from(container.querySelectorAll('section'));
        if (sections.length === 0) return;

        sections.forEach((section) => {
            section.classList.add(sectionClassName);
        });

        if (typeof IntersectionObserver === 'undefined') {
            return () => {
                sections.forEach((section) => {
                    section.classList.remove(sectionClassName, activeClassName);
                });
            };
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    entry.target.classList.toggle(activeClassName, entry.isIntersecting);
                });
            },
            {rootMargin, threshold},
        );

        sections.forEach((section) => observer.observe(section));

        return () => {
            observer.disconnect();
            sections.forEach((section) => {
                section.classList.remove(sectionClassName, activeClassName);
            });
        };
    }, [activeClassName, containerRef, rootMargin, sectionClassName, threshold, ...deps]);
};
