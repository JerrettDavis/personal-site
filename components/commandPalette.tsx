import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import styles from './commandPalette.module.css';
import {COMMAND_ITEMS, CommandItem} from '../data/commandPalette';
import {shouldIgnoreKeyEvent} from '../lib/dom';
import {useBodyScrollLock} from '../lib/hooks/useBodyScrollLock';
import {useOverlayEscape} from '../lib/hooks/useOverlayEscape';
import OverlayShell from './overlayShell';

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

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [shortcutLabel, setShortcutLabel] = useState('Ctrl K');
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)) {
            setShortcutLabel('Cmd K');
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        inputRef.current?.focus();
    }, [isOpen]);

    useBodyScrollLock(isOpen);

    const closePalette = useCallback(() => {
        setIsOpen(false);
        setQuery('');
    }, []);

    useOverlayEscape({isOpen, onClose: closePalette, ignoreInputs: true});

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (shouldIgnoreKeyEvent(event.target)) return;
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsOpen((prev) => !prev);
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
            <OverlayShell
                isOpen={isOpen}
                onClose={closePalette}
                ariaLabel="Command palette"
                overlayClassName={styles.overlay}
                scrimClassName={styles.scrim}
                panelClassName={styles.panel}
                scrimLabel="Close command palette"
            >
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
            </OverlayShell>
        </>
    );
}
