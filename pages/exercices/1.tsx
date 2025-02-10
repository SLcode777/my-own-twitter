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
        displayName: z
          .string()
          .nullable()
          .transform((val) => val ?? null),
        username: z.string(),
        avatarUrl: z
          .string()
          .url()
          .nullable()
          .transform((val) => val ?? null),
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

// Dans ClientConfig on récupère le params T
export type ClientConfig<T> = {
  data?: unknown;
  // On utilise T dans le zod schema
  // Ce qui va faire que notre fetch va être automatiquement être typé en fonction du schéma
  zodSchema?: z.ZodSchema<T>;
  method?: 'DELETE' | 'GET' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT';
  headers?: HeadersInit;
  // Pour pouvoir override la config
  customConfig?: RequestInit;
  signal?: AbortSignal;
};

// On utilise un générique ici pour automatiquement typer le retour de la fonction
export async function client<T>(
  url: string,
  {
    data,
    zodSchema,
    method,
    headers: customHeaders,
    signal,
    customConfig,
  }: ClientConfig<T> = {} // On passe T en paramètre de ClientConfig
): Promise<T> {
  // On retourne Promise<T> pour que le type soit automatiquement déduit
  const config: RequestInit = {
    // S'il n'y a pas de method on utilise POST s'il y a des données et GET sinon
    method: method ?? (data ? 'POST' : 'GET'),
    // On stringify les données s'il y en a
    body: data ? JSON.stringify(data) : null,
    headers: {
      'Content-Type': data ? 'application/json' : '',
      Accept: 'application/json',
      // Mais on laisse l'utilisateur override les headers
      ...customHeaders,
    },
    signal,
    // On laisse l'utilisateur override la config
    // S'il passe body, method, headers, etc... on les écrasera
    ...customConfig,
  };

  return window.fetch(url, config).then(async (response) => {
    // on gère le status 401 en arrêtant directement la request
    if (response.status === 401) {
      return Promise.reject(new Error("You're not authenticated"));
    }

    let result = null;
    // 🦁 à toi de parse le json dans un try catch
    try {
      result = response.status == 204 ? null : await response.json();
    } catch (error: unknown) {
      return Promise.reject(error);
    }

    if (response.ok) {
      // 🦁 s'il y a un `zodSchema`, on parse `result` sinon on retourne `result`
      return zodSchema && result ? zodSchema.parse(result) : result;
    } else {
      // 🦁 on reject la promesse avec le `result`
      return Promise.reject(result);
    }
  });
}

const getTweets = async (signal: AbortSignal) =>
  client(`/api/tweets`, {
    signal,
    zodSchema: TweetsScheme,
  });
// .then((res) => res.json())
// .then((data) => TweetsScheme.parse(data));

export default function FetchAllTweets() {
  const [tweets, setTweets] = useState<TlTweets | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getTweets(controller.signal)
      .then((data) => {
        setTweets(data.tweets);
      })
      .catch((err) => {
        if (err.name == 'AbortError') return;

        setTweets([]);
        notifyFailed();
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
