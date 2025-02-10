import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Error } from '~/components/Error';
import { Loader } from '~/components/Loader';
import { useUser } from '~/hooks/UserProvider';
import { client } from '~/lib/client/client';
import { TweetsScheme } from '~/lib/scheme/tweets';
import { tweetKeys } from '~/lib/tweets/query.tweet';
import { AddTweetForm } from '../../src/components/tweets/AddTweetForm';
import { LikeButton } from '../../src/components/tweets/LikeButton';
import { RepliesButton } from '../../src/components/tweets/RepliesButton';
import { Tweet } from '../../src/components/tweets/Tweet';
import TwitterLayout from '../../src/components/TwitterLayout';

const notifyFailed = () => toast.error("Couldn't fetch tweet...");

const getTweets = async (page: number, signal?: AbortSignal) =>
  client(
    `/api/tweets?page=${page}
    `,
    { signal, zodSchema: TweetsScheme }
  );

type AddTweetProps = { tweetId?: string };

const AddTweet = ({ tweetId }: AddTweetProps) => {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation(
    (content: string) =>
      client(`/api/tweets`, { method: 'POST', data: { content, tweetId } }),
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: tweetId ? tweetKeys.getById(tweetId) : tweetKeys.all,
        });
      },
    }
  );

  if (!user) {
    return <p>Please login to add a tweet</p>;
  }

  const handleSubmit = (content: string) => mutation.mutate(content);

  return <AddTweetForm disabled={mutation.isLoading} onSubmit={handleSubmit} />;
};

// type FetchAllTweetsProps = {
//   page: number;
// };

export default function FetchAllTweets() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['tweets'],
    queryFn: async ({ pageParam = 1 }) => getTweets(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage ?? null,
    onError: () => {
      notifyFailed();
    },
  });

  const observerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!observerRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return <Error error="couldn't fetch tweets..." reset={refetch} />;
  }

  const tweets = data.pages.flatMap((page) => page.tweets);

  const nextPageStatus = hasNextPage ? 'Load More' : 'noNextPage';

  return (
    <TwitterLayout>
      <AddTweet />
      {tweets.map((tweet) => (
        <Tweet key={tweet.id} tweet={tweet}>
          <RepliesButton count={tweet._count.replies} />
          <LikeButton count={tweet._count.likes} liked={tweet.liked} />
        </Tweet>
      ))}
      <div ref={observerRef} style={{ height: '10px' }} />
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} className="block py-4">
          {isFetchingNextPage ? 'Loading more...' : nextPageStatus}
        </button>
      )}
    </TwitterLayout>
  );
}
