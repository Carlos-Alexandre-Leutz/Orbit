import { ChatBox } from '@/components/ChatBox';
import { requireCustomer } from '@/lib/guard';

export const metadata = { title: 'Assistant | Orbit' };

/** The chat with the store assistant. Any account that shops may use it; the API checks the role again. */
export default async function AssistantPage() {
  await requireCustomer('/assistant');
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <ChatBox />
    </main>
  );
}
