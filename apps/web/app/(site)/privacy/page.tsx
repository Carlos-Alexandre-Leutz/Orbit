import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Privacy Policy | Orbit' };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="2026-11-17"
      intro="This page explains what personal data Orbit handles, why, who sees it and what you can do about it, in line with the Brazilian data protection law (LGPD)."
      sections={[
        {
          title: 'Who is responsible',
          body: [
            'For your account and your use of the platform, Orbit is the controller of the data.',
            'For the data of the customers of a store (their orders and delivery details), the store is the controller and Orbit acts as the operator that provides the software.',
          ],
        },
        {
          title: 'What we collect',
          body: [
            '- Account: your name, e-mail and a password (kept only as a hash, never in plain text).',
            '- Orders: what you bought, the store, the totals, the dates and the status.',
            '- Delivery: the recipient name, phone and address you type at checkout. Up to five addresses are saved on your account so you can choose one next time.',
            '- Stores: the name, description, contact details, images and settings a seller enters. Payment provider keys are stored encrypted and are never shown back.',
            '- Technical: a session cookie that keeps you signed in, and basic server logs.',
            'We do not collect your card number. Card data goes to the payment provider of the store.',
          ],
        },
        {
          title: 'Why we use it',
          body: [
            '- To run your account, orders and deliveries (performing the contract).',
            '- To send e-mails about your account and orders, such as the order confirmation and password recovery.',
            '- To keep the service safe and to meet legal duties.',
            '- To send marketing from a store only if you agreed to it for that store. You can withdraw that consent at any time in My account.',
          ],
        },
        {
          title: 'Who sees your data',
          body: [
            'The store you buy from sees your name, e-mail, order and delivery address, to deliver and to serve you. It does not see your other orders in other stores.',
            'We use service providers to run Orbit, such as hosting, e-mail sending and the payment providers each store connects. They get only what they need.',
            'We do not sell your personal data.',
          ],
        },
        {
          title: 'Cookies',
          body: [
            'Orbit uses one cookie, strictly necessary, to keep you signed in. It is not used for advertising or tracking.',
          ],
        },
        {
          title: 'How long we keep it',
          body: [
            'Your data stays while your account exists. When you delete your account, your personal data is removed; some order records may be kept in anonymous or limited form where a store needs them to meet tax or consumer-law duties.',
          ],
        },
        {
          title: 'Your rights',
          body: [
            'Under the LGPD you can ask to confirm that we handle your data, to access it, to correct it, to delete it, to receive a copy, and to withdraw consent.',
            'You can delete your account and manage your marketing consent in My account. For anything else, use the contact below. For data held by a store, you can also ask the store.',
          ],
        },
        {
          title: 'Changes',
          body: [
            'If this policy changes, the date above changes. If the change is important we will tell account holders by e-mail.',
          ],
        },
      ]}
    />
  );
}
