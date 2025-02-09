import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { Loader } from '~/components/Loader';
import type { TlTweets } from '~/lib/scheme/tweets';
import { AddTweetForm } from '../../src/components/tweets/AddTweetForm';
import { LikeButton } from '../../src/components/tweets/LikeButton';
import { RepliesButton } from '../../src/components/tweets/RepliesButton';
import { Tweet } from '../../src/components/tweets/Tweet';
import TwitterLayout from '../../src/components/TwitterLayout';

const notifyFailed = () => toast.error("Couldn't fetch tweet...");

// 🦁 Créer un schéma zod appelé TweetsScheme qui correspond à la réponse de l'API
// Tu peux `console.log` la réponse de l'API pour voir la structure attendue
// Tu pourrais utiliser zod transform pour modifier directement dans le schéma la date
const TweetsScheme = z.object({
  tweets: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      createdAt: z.string().datetime(),
      user: z.object({
        id: z.string(),
        displayName: z.string().nullable().default(null),
        username: z.string(),
        avatarUrl: z.string().url().nullable().default(null),
      }),
      likes: z.array(z.string()),
      _count: z.object({
        likes: z.number(),
        replies: z.number(),
      }),
      liked: z.boolean(),
    })
  ),
});

export default function FetchAllTweets() {
  const [tweets, setTweets] = useState<TlTweets | null>(null);

  useEffect(() => {
    // 🦁 Créer un abort controller pour annuler la requête si l'utilisateur quitte la page

    const controller = new AbortController();
    const signal = controller.signal;

    // 🦁 Passer le signal à la requête fetch
    fetch('/api/tweets', { signal }) // ℹ️ tu peux remplacer l'url par `/api/tweets?error=erreur` pour voir le problème
      .then((res) => res.json())
      .then((data) => {
        // 🦁 Utiliser le schéma TweetsScheme pour valider la réponse de l'API
        const parsed = TweetsScheme.safeParse(data);

        if (!parsed.success) {
          console.error('Erreur de validation Zod:', parsed.error);
          notifyFailed();
          return;
        }

        setTweets(parsed.data.tweets);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Erreur Fetch', error);
          notifyFailed(); // 🦁 Ajouter un catch pour gérer les erreurs
        }
      });

    // 🦁 Créer la cleanup fonction qui annule la requête
    return () => controller.abort();
  }, []);

  if (!tweets) return <Loader />;

  return (
    <TwitterLayout>
      <AddTweetForm />
      {tweets.map((tweet) => (
        <Tweet key={tweet.id} tweet={tweet}>
          <RepliesButton count={tweet._count.replies} />
          <LikeButton count={tweet._count.likes} />
        </Tweet>
      ))}
    </TwitterLayout>
  );
}
