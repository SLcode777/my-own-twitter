import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader } from '~/components/Loader';
import { client } from '~/lib/client/client';
import { TweetsScheme } from '~/lib/scheme/tweets';
import { AddTweetForm } from '../../src/components/tweets/AddTweetForm';
import { LikeButton } from '../../src/components/tweets/LikeButton';
import { RepliesButton } from '../../src/components/tweets/RepliesButton';
import { Tweet } from '../../src/components/tweets/Tweet';
import TwitterLayout from '../../src/components/TwitterLayout';



const notifyFailed = () => toast.error("Couldn't fetch tweet...");

const getTweets = async (signal?: AbortSignal) =>
  client(`/api/tweets`, { signal, zodSchema: TweetsScheme });

export default function FetchAllTweets() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tweets'],
    queryFn: async () => getTweets(),
  });

  if (isLoading) {
    return <Loader />;
  }

  if (isError) {
    return notifyFailed();
  }

  const tweets = data?.tweets || [];

  return (
    <TwitterLayout>
      <AddTweetForm />
      {tweets.map((tweet) => (
        <Tweet key={tweet.id} tweet={tweet}>
          <RepliesButton count={tweet._count.replies} />
          <LikeButton count={tweet._count.likes} liked={tweet.liked} />
        </Tweet>
      ))}
    </TwitterLayout>
  );
}
