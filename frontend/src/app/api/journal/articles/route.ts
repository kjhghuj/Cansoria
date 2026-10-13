import { NextResponse } from 'next/server';
import { resolveJournalArticles } from '@/lib/cms';

export const dynamic = 'force-dynamic';

/**
 * The final journal content set (healthy CMS authoritative, otherwise the
 * built-in editorial fallback) for client-side search. Only listing fields
 * are exposed; full article bodies are served by the journal pages.
 */
export async function GET() {
  try {
    const { articles } = await resolveJournalArticles();
    return NextResponse.json(
      {
        articles: articles.map(({ id, slug, title, category, readTime }) => ({
          id,
          slug,
          title,
          category,
          readTime,
        })),
      },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ articles: [] }, { status: 503 });
  }
}
