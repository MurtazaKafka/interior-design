import Link from 'next/link';
import styles from './styles.module.css';

export default function HomePage() {
  return (
    <main className={styles.hero}>
      <div className={styles.heroCard}>
        <h1>Taste Fingerprint</h1>
        <p>
          Explore museum masterpieces to map your interior design taste. Complete a quick
          set of A/B choices and we will craft your unique fingerprint.
        </p>
        <Link href="/onboarding" className={styles.cta}>
          Start Onboarding
        </Link>
      </div>
    </main>
  );
}
