import type { Metadata } from 'next';
import { OpeningExplorer } from '@/components/explorer/OpeningExplorer';

export const metadata: Metadata = { title: 'Opening explorer' };

export default function ExplorerPage() {
  return <OpeningExplorer />;
}
