import Link from 'next/link';
import type {PostSummary} from '../lib/posts';

interface RelatedPostsClasses {
    details: string;
    summary: string;
    content: string;
    contentInner: string;
    list: string;
}

interface RelatedPostsProps {
    posts: PostSummary[];
    label: string;
    classes: RelatedPostsClasses;
    linkClassName?: string;
}

export default function RelatedPosts({posts, label, classes, linkClassName = 'glowable'}: RelatedPostsProps) {
    if (!posts || posts.length === 0) return null;
    const summaryLabel = `${label} (${posts.length})`;
    return (
        <details className={classes.details}>
            <summary className={classes.summary}>
                {summaryLabel}
            </summary>
            <div className={classes.content}>
                <div className={classes.contentInner}>
                    <ul className={classes.list}>
                        {posts.map((post) => (
                            <li key={post.id}>
                                <Link href={`/blog/posts/${post.id}`} className={linkClassName}>
                                    {post.title}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </details>
    );
}
