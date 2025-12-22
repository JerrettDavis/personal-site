import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import styles from './commandPalette.module.css';
import {COMMAND_ITEMS, CommandItem} from '../data/commandPalette';

const normalize = (value: string) => value.trim().toLowerCase();

const buildSearchText = (item: CommandItem) =>
    [
        item.label,
        item.description,
        item.section,
        item.href,
        ...(item.keywords ?? []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

const shouldIgnoreKeyEvent = (target: EventTarget | null) => {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return target.isContentEditable;
};

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [shortcutLabel, setShortcutLabel] = useState('Ctrl K');
    const [mounted, setMounted] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) {
            setShortcutLabel('Cmd K');
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        inputRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (shouldIgnoreKeyEvent(event.target)) return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsOpen((prev) => !prev);
                return;
            }
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const filteredItems = useMemo(() => {
        const normalizedQuery = normalize(query);
        if (!normalizedQuery) return COMMAND_ITEMS;
        return COMMAND_ITEMS.filter((item) =>
            buildSearchText(item).includes(normalizedQuery)
        );
    }, [query]);

    const groupedItems = useMemo(() => {
        const groups = new Map<string, CommandItem[]>();
        filteredItems.forEach((item) => {
            const current = groups.get(item.section) ?? [];
            current.push(item);
            groups.set(item.section, current);
        });
        return Array.from(groups.entries());
    }, [filteredItems]);

    const closePalette = () => {
        setIsOpen(false);
        setQuery('');
    };

    const overlay = isOpen ? (
        <div className={styles.overlay} role="dialog" aria-modal="true">
            <button
                type="button"
                className={styles.scrim}
                onClick={closePalette}
                aria-label="Close command palette"
            />
            <div className={styles.panel}>
                <div className={styles.headerRow}>
                    <div className={styles.title}>Command palette</div>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={closePalette}
                    >
                        Close
                    </button>
                </div>
                <input
                    ref={inputRef}
                    className={styles.searchInput}
                    type="search"
                    placeholder="Search pages, docs, and repo files..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
                <div className={styles.results}>
                    {groupedItems.length === 0 ? (
                        <div className={styles.emptyState}>
                            No matches. Try a different keyword.
                        </div>
                    ) : (
                        groupedItems.map(([section, items]) => (
                            <div className={styles.section} key={section}>
                                <div className={styles.sectionTitle}>{section}</div>
                                <div className={styles.sectionList}>
                                    {items.map((item) =>
                                        item.external ? (
                                            <a
                                                key={item.id}
                                                href={item.href}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={styles.resultRow}
                                                onClick={closePalette}
                                            >
                                                <span className={styles.resultLabel}>{item.label}</span>
                                                <span className={styles.resultDescription}>{item.description}</span>
                                            </a>
                                        ) : (
                                            <Link
                                                key={item.id}
                                                href={item.href}
                                                className={styles.resultRow}
                                                onClick={closePalette}
                                            >
                                                <span className={styles.resultLabel}>{item.label}</span>
                                                <span className={styles.resultDescription}>{item.description}</span>
                                            </Link>
                                        )
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className={styles.footerRow}>
                    Tip: Press {shortcutLabel} to open from anywhere.
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <button
                type="button"
                className={`${styles.commandButton} glowable`}
                onClick={() => setIsOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                Command
                <span className={styles.shortcut}>{shortcutLabel}</span>
            </button>
            {mounted && overlay ? createPortal(overlay, document.body) : null}
        </>
    );
}
