import {useEffect, useRef, useState, type DependencyList, type RefObject} from 'react';

interface HeadingItem {
    id: string;
    label: string;
    level: number;
}

interface HeadingIndexOptions {
    selector?: string;
    targetRatio?: number;
}

const getHeadingLabel = (heading: HTMLElement, fallback: string) => {
    const text = heading.textContent?.trim();
    return text && text.length > 0 ? text : fallback;
};

export const useHeadingIndex = (
    containerRef: RefObject<HTMLElement | null>,
    {selector = 'h2, h3', targetRatio = 0.25}: HeadingIndexOptions = {},
    deps: DependencyList = [],
) => {
    const [items, setItems] = useState<HeadingItem[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeIdRef = useRef<string | null>(null);
    const headingsRef = useRef<HTMLElement[]>([]);
    const itemsRef = useRef<HeadingItem[]>([]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || typeof window === 'undefined') return;

        let rafId = 0;
        let observer: MutationObserver | null = null;

        const refreshHeadings = () => {
            const headings = Array.from(container.querySelectorAll(selector))
                .filter((heading): heading is HTMLElement => heading instanceof HTMLElement);
            if (headings.length === 0) {
                headingsRef.current = [];
                setItems([]);
                setActiveId(null);
                activeIdRef.current = null;
                return;
            }

            const nextItems = headings.map((heading, index) => {
                const fallbackLabel = `Section ${index + 1}`;
                const label = getHeadingLabel(heading, fallbackLabel);
                let id = heading.id;
                if (!id) {
                    id = `heading-${index + 1}`;
                    heading.id = id;
                }
                const level = heading.tagName === 'H3' ? 3 : 2;
                return {id, label, level};
            });

            headingsRef.current = headings;
            itemsRef.current = nextItems;
            setItems(nextItems);
            activeIdRef.current = null;
            updateActive();
        };

        const updateActive = () => {
            rafId = 0;
            const headings = headingsRef.current;
            if (headings.length === 0) return;
            const targetLine = window.innerHeight * targetRatio;
            let activeHeading = headings[0];
            headings.forEach((heading) => {
                const rect = heading.getBoundingClientRect();
                if (rect.top - targetLine <= 0) {
                    activeHeading = heading;
                }
            });
            const nextId = activeHeading?.id ?? itemsRef.current[0]?.id ?? null;
            if (activeIdRef.current === nextId) return;
            activeIdRef.current = nextId;
            setActiveId(nextId);
        };

        const onScroll = () => {
            if (rafId) return;
            rafId = window.requestAnimationFrame(updateActive);
        };

        refreshHeadings();

        const scrollTargets: Array<Window | HTMLElement> = [window];
        if (container.scrollHeight > container.clientHeight) {
            scrollTargets.push(container);
        }
        scrollTargets.forEach((target) => {
            target.addEventListener('scroll', onScroll, {passive: true});
        });
        window.addEventListener('resize', onScroll);

        if ('MutationObserver' in window) {
            observer = new MutationObserver(() => {
                refreshHeadings();
            });
            observer.observe(container, {childList: true, subtree: true});
        }

        return () => {
            scrollTargets.forEach((target) => {
                target.removeEventListener('scroll', onScroll);
            });
            window.removeEventListener('resize', onScroll);
            if (observer) observer.disconnect();
            if (rafId) window.cancelAnimationFrame(rafId);
        };
    }, [containerRef, selector, targetRatio, ...deps]);

    return {items, activeId};
};
