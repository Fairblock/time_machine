/* app/page.tsx */
import ClientHome from './ClientHome';
import type { Metadata } from "next";

export const dynamic = 'force-static';


export default function Page() {
  return <ClientHome />;
}