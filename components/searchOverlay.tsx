import {useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import Link from 'next/link';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faMagnifyingGlass, faXmark} from '@fortawesome/free-solid-svg-icons';
import styles from './searchOverlay.module.css';
import type {PageResult, PostResult} from '../lib/search';
import {shouldIgnoreKeyEvent} from '../lib/dom';
import {useBodyScrollLock} from '../lib/hooks/useBodyScrollLock';

interface SearchIndexPayload {
    pages: PageResult[];
    posts: PostResult[];
}

interface SearchOverlayProps {
    className?: string;
    label?: string;
}

const normalize = (value: string) => value.trim().toLowerCase();

const matchesQuery = (query: string, fields: string[]) => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return false;
    return fields.some((field) => normalize(field).includes(normalizedQuery));
};

const getSearchIndexUrl = () => {
    if (typeof document === 'undefined') return '/api/search-index';
    const nextData = document.getElementById('__NEXT_DATA__')?.textContent;
    if (!nextData) return '/api/search-index';
    try {
        const parsed = JSON.parse(nextData);
        const buildId = parsed?.buildId;
        if (!buildId) return '/api/search-index';
        return `/_next/data/${buildId}/search.json`;
    } catch (error) {
        return '/api/search-index';
    }
};

export default function SearchOverlay({className, label = 'Search'}: SearchOverlayProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [data, setData] = useState<SearchIndexPayload | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [mounted, setMounted] = useState(false);
    const fetchInFlight = useRef(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        inputRef.current?.focus();
    }, [isOpen]);

    useBodyScrollLock(isOpen);

    useEffect(() => {
        if (!isOpen || data || fetchInFlight.current) return;
        const controller = new AbortController();
        fetchInFlight.current = true;
        setIsLoading(true);
        setHasError(false);

        const fetchIndex = async () => {
            const urls = [getSearchIndexUrl(), '/api/search-index'];
            for (const url of urls) {
                try {
                    const response = await fetch(url, {signal: controller.signal});
                    if (!response.ok) throw new Error('Search index fetch failed');
                    const payload = await response.json();
                    if (payload?.pageProps) {
                        const pageProps = payload.pageProps;
                        if (pageProps?.pages && pageProps?.posts) {
                            setData({pages: pageProps.pages, posts: pageProps.posts});
                            return;
                        }
                    }
                    if (payload?.pages && payload?.posts) {
                        setData(payload as SearchIndexPayload);
                        return;
                    }
                } catch (error) {
                    if (error?.name === 'AbortError') return;
                }
            }

            setHasError(true);
        };

        fetchIndex()
            .finally(() => {
                fetchInFlight.current = false;
                setIsLoading(false);
            });

        return () => {
            controller.abort();
            fetchInFlight.current = false;
        };
    }, [isOpen, data]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (shouldIgnoreKeyEvent(event.target)) return;
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const pageResults = useMemo(() => {
        if (!data || !query.trim()) return [];
        return data.pages.filter((page) =>
            matchesQuery(query, [page.label, page.description, ...page.keywords])
        );
    }, [data, query]);

    const postResults = useMemo(() => {
        if (!data || !query.trim()) return [];
        return data.posts.filter((post) =>
            matchesQuery(query, [
                post.title,
                post.summary,
                ...post.tags,
                ...post.categories,
            ])
        );
    }, [data, query]);

    const closeOverlay = () => {
        setIsOpen(false);
        setQuery('');
    };

    const overlay = isOpen ? (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Search">
            <button
                type="button"
                className={styles.scrim}
                onClick={closeOverlay}
                aria-label="Close search"
            />
            <div className={styles.panel}>
                <div className={styles.headerRow}>
                    <div>
                        <p className={styles.kicker}>Search</p>
                        <h2 className={styles.title}>Find anything fast</h2>
                    </div>
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={closeOverlay}
                        aria-label="Close search"
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
                <div className={styles.inputRow}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} className={styles.inputIcon} />
                    <input
                        ref={inputRef}
                        className={styles.searchInput}
                        type="search"
                        placeholder="Search posts, pages, and docs..."
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </div>
                <div className={styles.results}>
                    {isLoading && (
                        <div className={styles.emptyState}>Loading search index...</div>
                    )}
                    {hasError && (
                        <div className={styles.emptyState}>Search index unavailable. Try again soon.</div>
                    )}
                    {!isLoading && !hasError && query.trim().length === 0 && (
                        <div className={styles.emptyState}>
                            Start typing to search. Results update instantly.
                        </div>
                    )}
                    {!isLoading && !hasError && query.trim().length > 0 && (
                        <>
                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>Pages</div>
                                {pageResults.length > 0 ? (
                                    <div className={styles.sectionList}>
                                        {pageResults.map((page) => (
                                            <Link
                                                key={page.href}
                                                href={page.href}
                                                className={styles.resultRow}
                                                onClick={closeOverlay}
                                            >
                                                <span className={styles.resultLabel}>{page.label}</span>
                                                <span className={styles.resultDescription}>{page.description}</span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyResult}>No matching pages.</div>
                                )}
                            </div>
                            <div className={styles.section}>
                                <div className={styles.sectionTitle}>Posts</div>
                                {postResults.length > 0 ? (
                                    <div className={styles.sectionList}>
                                        {postResults.map((post) => (
                                            <Link
                                                key={post.id}
                                                href={`/blog/posts/${post.id}`}
                                                className={styles.resultRow}
                                                onClick={closeOverlay}
                                            >
                                                <span className={styles.resultLabel}>{post.title}</span>
                                                <span className={styles.resultDescription}>{post.summary}</span>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyResult}>No matching posts.</div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className={styles.footerRow}>
                    <Link href="/search" onClick={closeOverlay}>
                        Open full search page
                    </Link>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <>
            <button
                type="button"
                className={className}
                onClick={() => setIsOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={label}
                title={label}
            >
                <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
            {mounted && overlay ? createPortal(overlay, document.body) : null}
        </>
    );
}
