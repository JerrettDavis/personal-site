import {useEffect, useRef, useState, type DependencyList, type RefObject} from 'react';

interface SectionIndexItem {
    id: string;
    label: string;
}

interface SectionIndexOptions {
    selector?: string;
    activeClassName?: string;
    targetRatio?: number;
}

const getSectionLabel = (section: HTMLElement, fallback: string) => {
    const labeled = section.getAttribute('data-section-label') ?? section.getAttribute('aria-label');
    if (labeled && labeled.trim().length > 0) return labeled.trim();
    const heading = section.querySelector('h2, h3');
    const text = heading?.textContent?.trim();
    return text && text.length > 0 ? text : fallback;
};

export const useSectionIndex = (
    containerRef: RefObject<HTMLElement | null>,
    {selector = 'section, article', activeClassName = '', targetRatio = 0.35}: SectionIndexOptions = {},
    deps: DependencyList = [],
) => {
    const [items, setItems] = useState<SectionIndexItem[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeIdRef = useRef<string | null>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof window === 'undefined') return;

        const allSections = Array.from(container.querySelectorAll(selector))
            .filter((section): section is HTMLElement => section instanceof HTMLElement);
        const sections = allSections.filter((section) => {
            const ancestor = section.parentElement?.closest(selector);
            return !ancestor || !container.contains(ancestor);
        });
        if (sections.length === 0) {
            setItems([]);
            setActiveId(null);
            activeIdRef.current = null;
            return;
        }

        const nextItems = sections.map((section, index) => {
            const fallbackLabel = `Section ${index + 1}`;
            const label = getSectionLabel(section, fallbackLabel);
            let id = section.id;
            if (!id) {
                id = `section-${index + 1}`;
                section.id = id;
            }
            section.setAttribute('data-section-index', `${index + 1}`);
            return {id, label};
        });

        setItems(nextItems);
        activeIdRef.current = null;

        let rafId = 0;
        const updateActive = () => {
            rafId = 0;
            const targetLine = window.innerHeight * targetRatio;
            let activeSection = sections[0];
            sections.forEach((section) => {
                const rect = section.getBoundingClientRect();
                if (rect.top - targetLine <= 0) {
                    activeSection = section;
                }
            });
            const nextId = activeSection?.id ?? nextItems[0]?.id ?? null;
            if (activeIdRef.current === nextId) return;
            activeIdRef.current = nextId;
            setActiveId(nextId);
        };

        const onScroll = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(updateActive);
        };

        updateActive();
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [containerRef, selector, activeClassName, ...deps]);

    return {items, activeId};
};
