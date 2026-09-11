import { redirect } from 'next/navigation';

export default function PlatformHealthPage() {
  redirect('/dashboard?view=platform');
}
