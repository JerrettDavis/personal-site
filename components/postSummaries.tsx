import utilStyles from "../styles/utils.module.css";
import Link from "next/link";
import Date from "./date";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faImage} from "@fortawesome/free-solid-svg-icons";
import {PostSummary} from "../lib/posts";
import styled from "@emotion/styled";
import Image from "next/image";


const Tag = styled.div`
  display: inline-block;
  color: var(--color-link-deemphasized);
  padding-right: 4px;
  margin-right: 8px;
  font-size: .7em;
`;

const CurrentTag = styled(Tag)`
  font-weight: bold;
`;

const PostContainer = styled.div`
  display: flex;
  flex-direction: row;
`;

const PostContent = styled.div`
  flex: 2 1 auto;
`;

const FeatureImageContainer = styled.div`
  flex: 1 1 auto;
  width: 100%;
  position: relative;
  max-width: 400px;
  min-width: 200px;
  max-height: 250px;
`;

const PlaceholderImage = styled.div`
  height: 100%;
  width: 100%;
  background-color: var(--color-bg-deemphasized);
  background-image: linear-gradient(45deg, var(--color-placeholder-bg-start), var(--color-placeholder-bg-end));
  color: var(--color-text-deemphasized);
  border-radius: 4px;
  border: 1px solid var(--color-border);
  text-align: center;
`;

const FeaturedImage = styled(Image)`
  border-radius: 4px;
  border: 1px solid var(--color-border);
`;


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
                <li className={utilStyles.listItem} key={id} style={{marginBottom: '2em'}}>
                    <PostContainer>
                        <PostContent>
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
                                {tags.map((t) => (
                                    <Link href={`/blog/tags/${t}`} key={t}>
                                        { t === selectedTag
                                            ? <CurrentTag key={t}>#{t}</CurrentTag>
                                            : <Tag key={t}>#{t}</Tag> }
                                    </Link>
                                ))}
                            </div>
                        </PostContent>
                        <FeatureImageContainer style={{position: 'relative'}}>
                            {!!featured &&
                                <FeaturedImage src={featured} alt="Featured Image for the Post" fill/>}
                            {!featured && <PlaceholderImage>
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    opacity: '0.25',
                                    padding: '16px'
                                }}>
                                    <FontAwesomeIcon icon={faImage} size="lg" style={{
                                        marginRight: '8px',
                                        height: '100%',
                                        width: '100%',
                                        filter: 'drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4))'
                                    }}/>
                                </div>
                            </PlaceholderImage>}
                        </FeatureImageContainer>
                    </PostContainer>
                </li>
            ))}
        </ul>

    );
}