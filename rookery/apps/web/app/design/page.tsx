import type { Metadata } from 'next';
import { DesignShowcase } from '@/components/design/DesignShowcase';
import { PageHeader } from '@/components/layout/PageHeader';
import { getBots } from '@/lib/data';

export const metadata: Metadata = { title: 'Design system' };

export default function DesignPage() {
  return (
    <>
      <PageHeader
        eyebrow="For contributors"
        title="Design system"
        description="Tokens and reusable components that every Rookery page is built from. Source: apps/web/components/ui and app/globals.css."
      />
      <DesignShowcase bots={getBots().data.bots} />
    </>
  );
}
