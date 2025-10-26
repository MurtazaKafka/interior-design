'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { v4 as uuid } from 'uuid';

import {
  API_BASE,
  fetchArtworks,
  postTasteUpdate,
  postTasteSummary,
  postRoomRender,
  Artwork,
  TasteSummaryResponse,
  RoomRenderResponse,
  coerceTasteSummary,
} from '../../lib/api';
import styles from './styles.module.css';

interface ChoicePair {
  a: Artwork;
  b: Artwork;
}

interface TasteState {
  vector: number[] | null;
  comparisons: number;
  loading: boolean;
  error: string | null;
  history: Array<{ win: string; lose: string }>;
  summary: TasteSummaryResponse | null;
  summaryLoading: boolean;
  summaryError: string | null;
}

interface RenderState {
  status: 'idle' | 'rendering' | 'complete' | 'error';
  error: string | null;
  result: RoomRenderResponse | null;
}

const TARGET_COMPARISONS = 12;

function pickRandomPairs(artworks: Artwork[]): ChoicePair[] {
  const shuffled = [...artworks].sort(() => Math.random() - 0.5);
  const pairs: ChoicePair[] = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push({ a: shuffled[i], b: shuffled[i + 1] });
  }
  return pairs;
}

function isRecentDuplicate(history: Array<{ win: string; lose: string }>, a: Artwork, b: Artwork): boolean {
  const last = history[history.length - 1];
  if (!last) return false;
  const pairIds = [a.id, b.id];
  const lastIds = [last.win, last.lose];
  return (
    (pairIds[0] === lastIds[0] && pairIds[1] === lastIds[1]) ||
    (pairIds[0] === lastIds[1] && pairIds[1] === lastIds[0])
  );
}

export default function OnboardingPage() {
  const [userId] = useState(() => uuid());
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [pairs, setPairs] = useState<ChoicePair[]>([]);
  const [taste, setTaste] = useState<TasteState>({
    vector: null,
    comparisons: 0,
    loading: false,
    error: null,
    history: [],
    summary: null,
    summaryLoading: false,
    summaryError: null,
  });
  const [roomFile, setRoomFile] = useState<File | null>(null);
  const [render, setRender] = useState<RenderState>({ status: 'idle', error: null, result: null });
  const renderInputRef = useRef<HTMLInputElement | null>(null);
  const summaryRequested = useRef(false);

  const currentPair = useMemo(() => pairs[taste.comparisons] ?? null, [pairs, taste.comparisons]);
  const progress = useMemo(() => taste.comparisons / TARGET_COMPARISONS, [taste.comparisons]);
  const completed = taste.comparisons >= TARGET_COMPARISONS;

  useEffect(() => {
    fetchArtworks()
      .then((items) => {
        setArtworks(items);
        setPairs(pickRandomPairs(items));
      })
      .catch((err) => {
        console.error(err);
        setTaste((prev) => ({ ...prev, error: 'Failed to load artworks. Please retry.' }));
      });
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.log('Render state', render);
  }, [render]);

useEffect(() => {
  if (!completed || !taste.vector || summaryRequested.current) {
    return;
  }

  summaryRequested.current = true;

  let cancelled = false;

  const run = async () => {
    setRender({ status: 'idle', error: null, result: null });
    setTaste((prev) => ({
      ...prev,
      summaryLoading: true,
      summaryError: null,
    }));

    try {
      const summaryRes = await postTasteSummary({ user_id: userId, top_k: 6, vector_preview: 12 });
      if (cancelled) return;
      const summaryPayload =
        summaryRes.summary || coerceTasteSummary(summaryRes.raw_summary) || undefined;
      setTaste((prev) => ({
        ...prev,
        summary: summaryPayload ? { ...summaryRes, summary: summaryPayload } : summaryRes,
        summaryLoading: false,
        summaryError: summaryPayload ? null : 'We could not parse your style brief yet.',
      }));
    } catch (err) {
      console.error(err);
      if (cancelled) return;
      summaryRequested.current = false;
      setTaste((prev) => ({
        ...prev,
        summaryLoading: false,
        summaryError: 'Could not summarize your taste yet.',
      }));
    }
  };

  run();

  return () => {
    cancelled = true;
  };
}, [completed, taste.vector, userId]);

  const replenishPairs = useCallback(() => {
    setPairs((prevPairs) => {
      const next = pickRandomPairs(artworks);
      return [...prevPairs, ...next];
    });
    console.log('Replenished pairs');
  }, [artworks]);

  const handleChoice = useCallback(
    async (win: Artwork, lose: Artwork) => {
      if (taste.loading || completed) {
        return;
      }
      setTaste((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await postTasteUpdate({
          user_id: userId,
          win_id: win.id,
          lose_id: lose.id,
        });

        setTaste((prev) => {
          const nextComparisons = prev.comparisons + 1;
          const updatedHistory = [...prev.history, { win: win.id, lose: lose.id }];
          return {
            vector: response.vector,
            comparisons: nextComparisons,
            loading: false,
            error: null,
            history: updatedHistory,
            summary: prev.summary,
            summaryLoading: prev.summaryLoading,
            summaryError: null,
          };
        });
      } catch (err) {
        console.error(err);
        setTaste((prev) => ({ ...prev, loading: false, error: 'Could not record your choice. Try again.' }));
      }
    },
    [completed, taste.loading, userId],
  );

  useEffect(() => {
    if (!currentPair && !completed && artworks.length >= 2) {
      replenishPairs();
    }
  }, [currentPair, completed, artworks.length, replenishPairs]);

  const restart = useCallback(() => {
    setPairs(pickRandomPairs(artworks));
    setTaste({
      vector: null,
      comparisons: 0,
      loading: false,
      error: null,
      history: [],
      summary: null,
      summaryLoading: false,
      summaryError: null,
    });
    setRoomFile(null);
    setRender({ status: 'idle', error: null, result: null });
    summaryRequested.current = false;
  }, [artworks]);

  const pairForRender = useMemo(() => {
    if (!currentPair) return null;
    if (isRecentDuplicate(taste.history, currentPair.a, currentPair.b)) {
      replenishPairs();
      return null;
    }
    return currentPair;
  }, [currentPair, replenishPairs, taste.history]);

  const parsedSummary = useMemo(() => {
    if (!taste.summary) return null;

    const summary = taste.summary.summary && Object.keys(taste.summary.summary).length > 0
      ? taste.summary.summary
      : coerceTasteSummary(taste.summary.raw_summary);

    if (!summary || Object.keys(summary).length === 0) {
      return null;
    }

    const name = String(summary.name ?? taste.summary.user_id ?? 'Inspiration').trim();
    const imageUrl = String(summary.image_url ?? summary.hero_image ?? '').trim();
    const palette = Array.isArray(summary.palette_colors)
      ? summary.palette_colors
      : Array.isArray(summary.palette)
      ? summary.palette
      : null;

    return {
      ...summary,
      _display: {
        name: name.length > 0 ? name : null,
        imageUrl: imageUrl.length > 0 ? imageUrl : null,
        palette,
      },
    } as Record<string, any>;
  }, [taste.summary]);

  const handleRoomFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setRoomFile(file);
    setRender((prev) => ({ status: 'idle', error: null, result: prev.result }));
  }, []);

  const handleRenderRoom = useCallback(async () => {
    if (!roomFile) {
      setRender((prev) => ({ status: 'error', error: 'Please upload a room photo first.', result: prev.result }));
      return;
    }

    if (!taste.summary || taste.summaryLoading) {
      setRender((prev) => ({ status: 'error', error: 'Your style brief is still loading. Try again in a moment.', result: prev.result }));
      return;
    }

    setRender((prev) => ({ status: 'rendering', error: null, result: prev.result }));

    try {
      const response = await postRoomRender(
        userId,
        roomFile,
        taste.summary?.summary ?? coerceTasteSummary(taste.summary?.raw_summary),
        taste.summary?.raw_summary ?? null,
      );
      console.log('Room render response', response);
    setRender({ status: 'complete', error: null, result: response });
    } catch (err) {
      console.error('Room render failed', err);
      setRender((prev) => ({ status: 'error', error: 'We could not stage your room yet. Please retry.', result: prev.result }));
    }
  }, [roomFile, taste.summary, taste.summaryLoading, userId]);

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Pick the artwork you vibe with the most</h1>
          <p>We will build your taste fingerprint in just {TARGET_COMPARISONS} quick choices.</p>
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressLabel}>
            {taste.comparisons}/{TARGET_COMPARISONS}
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${Math.min(progress, 1) * 100}%` }} />
          </div>
        </div>
      </header>

      {taste.error && <p className={styles.error}>{taste.error}</p>}

      {completed ? (
        <section className={styles.summary}>
          <h2>Fingerprint Ready</h2>
          <p>Your vector is ready for furnishing recommendations.</p>
          {/* <pre className={styles.vectorPreview}>
            {JSON.stringify(taste.vector?.slice(0, 12), null, 2)}
            {taste.vector && taste.vector.length > 12 ? '\n…' : ''}
          </pre> */}
          {taste.summaryLoading && <p className={styles.summaryStatus}>Generating your style brief…</p>}
          {taste.summaryError && <p className={styles.summaryError}>{taste.summaryError}</p>}
          {parsedSummary ? (
            <div className={styles.summaryCopy}>
              <h3>How we describe your vibe</h3>
              <p>{parsedSummary.concise}</p>
              <h4>For our planner</h4>
              <p>{parsedSummary.planner_brief}</p>
              <details className={styles.summaryDetails}>
                <summary>See full brief</summary>
                <div className={styles.summaryGrid}>
                  <div>
                    <h5>Palette</h5>
                    <p>{parsedSummary.palette_summary}</p>
                  </div>
                  <div>
                    <h5>Style</h5>
                    <p>{parsedSummary.style_summary}</p>
                  </div>
                  <div>
                    <h5>Materials</h5>
                    <p>{parsedSummary.material_summary}</p>
                  </div>
                  <div>
                    <h5>Mood</h5>
                    <p>{parsedSummary.mood_summary}</p>
                  </div>
                </div>
              </details>
            </div>
          ) : (
            taste.summary && !taste.summaryLoading && !taste.summaryError && (
              <p className={styles.summaryStatus}>Your brief is queued—hang tight.</p>
            )
          )}
          <section className={styles.renderSection}>
            <h3>Stage Your Room</h3>
            {taste.summaryLoading ? (
              <p className={styles.summaryStatus}>Your brief is nearly ready—hang tight.</p>
            ) : !parsedSummary ? (
              <p className={styles.summaryStatus}>We’re still assembling your room brief. Try again soon.</p>
            ) : (
              <>
                <p>Upload a photo of your space and we’ll furnish it with your personalized picks.</p>
                <div className={styles.renderControls}>
                  <input
                    ref={renderInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleRoomFileChange}
                  />
                  <button
                    className={styles.primaryButton}
                    onClick={handleRenderRoom}
                    disabled={render.status === 'rendering'}
                  >
                    {render.status === 'rendering' ? 'Staging room…' : 'Generate render'}
                  </button>
                </div>
                {render.error && <p className={styles.summaryError}>{render.error}</p>}
                {render.status === 'rendering' && !render.error && (
                  <p className={styles.summaryStatus}>Composing your furnished room…</p>
                )}
                {render.result && (
                  <div className={styles.renderOutput}>
                    <img
                      src={`${API_BASE}${render.result.image_url}`}
                      alt="Rendered furnished room"
                      className={styles.renderedImage}
                    />
                  </div>
                )}
                {render.result?.products && render.result.products.length > 0 && (
                  <section className={styles.productList}>
                    <h4>Shop the look</h4>
                    <ul>
                      {render.result.products.map((product) => (
                        <li key={product.id}>
                          <article>
                            <header>
                              <h5>{product.name ?? 'Recommended item'}</h5>
                              {product.brand && <span>{product.brand}</span>}
                            </header>
                            {product.image_url && (
                              <div className={styles.productImageWrap}>
                                <img
                                  src={product.image_url.startsWith('http') ? product.image_url : `${API_BASE}${product.image_url}`}
                                  alt={product.name ?? 'Recommended item'}
                                  loading="lazy"
                                />
                              </div>
                            )}
                            {product.description && <p>{product.description}</p>}
                            <footer>
                              {product.price_display && <span>{product.price_display}</span>}
                              {product.purchase_url && (
                                <a href={product.purchase_url} target="_blank" rel="noreferrer">
                                  View on Amazon
                                </a>
                              )}
                            </footer>
                          </article>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </section>
          <button className={styles.primaryButton} onClick={restart}>
            Restart picks
          </button>
        </section>
      ) : pairForRender ? (
        <section className={styles.choices}>
          <ArtworkCard
            artwork={pairForRender.a}
            disabled={taste.loading}
            onSelect={() => handleChoice(pairForRender.a, pairForRender.b)}
          />
          <ArtworkCard
            artwork={pairForRender.b}
            disabled={taste.loading}
            onSelect={() => handleChoice(pairForRender.b, pairForRender.a)}
          />
        </section>
      ) : (
        <section className={styles.loading}>Preparing artworks…</section>
      )}
    </main>
  );
}

interface ArtworkCardProps {
  artwork: Artwork;
  onSelect: () => void;
  disabled?: boolean;
}

function ArtworkCard({ artwork, onSelect, disabled }: ArtworkCardProps) {
  return (
    <button className={styles.card} onClick={onSelect} disabled={disabled}>
      <div className={styles.imageWrapper}>
        <Image
          src={artwork.image_url}
          alt={`${artwork.title} by ${artwork.artist}`}
          fill
          sizes="(max-width: 768px) 100vw, 45vw"
          className={styles.artworkImage}
          unoptimized
        />
      </div>
      <div className={styles.cardMeta}>
        <h3>{artwork.title}</h3>
        <p>{artwork.artist}</p>
        <span>{artwork.museum}</span>
      </div>
    </button>
  );
}
