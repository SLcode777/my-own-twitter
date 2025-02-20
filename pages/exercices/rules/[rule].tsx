import Markdown from 'markdown-to-jsx';
import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import type { Rule } from '~/lib/fs/rules';
import { getAllRules, getRule } from '~/lib/fs/rules';

type RuleProps = {
  rule: Rule;
};

export default function RulePage({ rule }: RuleProps) {
  return (
    <div className="prose prose-invert mt-4 p-2">
      <Link href="/solutions/rules">Back</Link>
      <Markdown>{rule.body}</Markdown>
    </div>
  );
}

export const getStaticPaths: GetStaticPaths<{ rule: string }> = async () => {
  // 🦁 Utilise `getAllRules` pour récupérer toutes les règles

  const rules = await getAllRules();

  return {
    // 🦁 Utilise `rules` pour générer les chemins possibles
    paths: rules.map((rule) => ({
      params: { rule: rule.title },
    })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<
  RuleProps,
  { rule: string }
  // 🦁 Ajoute un type pour les paramètres de la route
> = async ({ params }) => {
  if (!params.rule) {
    return {
      notFound: true,
    };
  }

  // 🦁 Récupère le paramètre de la route
  // 🦁 Utilise `getRule` pour récupérer le contenu de la règle

  const rule = await getRule(params.rule as string);

  return {
    props: {
      // 🦁 Ajoute la règle
      rule,
    },
  };
};
