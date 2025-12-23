import utilStyles from "../styles/utils.module.css";
import Link from "next/link";
import Date from "./date";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faImage} from "@fortawesome/free-solid-svg-icons";
import type {PostSummary} from "../lib/posts";
import Image from "next/image";
import styles from "./postSummaries.module.css";


export default function PostSummaries(
    {
        postSummaries,
        selectedTag
    }: {
        postSummaries: PostSummary[],
        selectedTag?: string | null | undefined
    }) {
    return (
        <ul className={utilStyles.list}>
            {postSummaries.map(({id, stub, date, title, featured, tags}) => (
                <li className={`${utilStyles.listItem} ${styles.postItem}`} key={id}>
                    <div className={styles.postContainer}>
                        <div className={styles.postContent}>
                            <Link href={`/blog/posts/${id}`}>
                                {title}
                            </Link>
                            <br/>
                            <small className={utilStyles.lightText}>
                                <Date dateString={date}/>
                            </small>
                            <br/>
                            <div>{stub}</div>
                            <div>
                                {(tags ?? []).map((t) => (
                                    <Link href={`/blog/tags/${t}`} key={t}>
                                        <span className={`${styles.tag} ${t === selectedTag ? styles.tagActive : ''}`}>
                                            #{t}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className={styles.featureImageContainer}>
                            {!!featured &&
                                <Image className={styles.featuredImage} src={featured} alt="Featured Image for the Post" fill/>}
                            {!featured && (
                                <div className={styles.placeholderImage}>
                                    <div className={styles.placeholderIcon}>
                                        <FontAwesomeIcon
                                            icon={faImage}
                                            size="lg"
                                            className={styles.placeholderIconSvg}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </li>
            ))}
        </ul>

    );
}
