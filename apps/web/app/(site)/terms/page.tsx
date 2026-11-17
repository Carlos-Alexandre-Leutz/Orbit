import { LegalPage } from '@/components/LegalPage';

export const metadata = { title: 'Terms of Use | Orbit' };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      updated="2026-11-17"
      intro="These terms apply to everyone who uses Orbit, whether to open a store or to buy in one. By creating an account or using the site you agree to them."
      sections={[
        {
          title: 'What Orbit is',
          body: [
            'Orbit is a platform where sellers open online stores, each at its own link, and customers buy from them with a single Orbit account. Orbit provides the software. Orbit is not the seller of the products shown in a store.',
          ],
        },
        {
          title: 'Your account',
          body: [
            'You must give true information and keep your password safe. You are responsible for what happens under your account.',
            'One Orbit account can shop in every store and can also own one store.',
          ],
        },
        {
          title: 'Buying in a store',
          body: [
            'The sale is made between you and the store. The store sets the products, prices, stock, shipping fee and delivery time, and is responsible for delivering what you bought and for answering questions and complaints about it.',
            'The delivery time shown at checkout is an estimate set by the store, in business days; it is not a guarantee of a date.',
            'Your rights under Brazilian consumer law, including the right to withdraw from an online purchase within 7 days of receiving the product, are not limited by these terms. Contact the store to use them.',
            'Orbit does not receive your payment. Each store receives through its own payment provider, which processes your card. Orbit never sees or stores your card number.',
          ],
        },
        {
          title: 'Selling on Orbit',
          body: [
            'To open a store to the public you need an active subscription. The price and the free trial period are shown on the Billing page of your panel before you subscribe. A store without an active plan stays as a draft that only you can see.',
            'To receive payments you connect your own payment provider account. You pay that provider its fees, and you keep the keys you paste safe: Orbit stores them encrypted and never shows them back.',
            'As a seller you are responsible for:',
            '- the products you list, their descriptions, photos, prices and stock;',
            '- delivering orders, tracking codes, returns, refunds and customer service;',
            '- issuing tax documents (such as the nota fiscal) and paying taxes that apply to your sales;',
            '- complying with consumer, tax and any other law that applies to what you sell.',
            'You may not sell illegal, counterfeit or dangerous products, or use a store to deceive customers.',
          ],
        },
        {
          title: 'Content you upload',
          body: [
            'You keep the rights to the photos and texts you upload, and you allow Orbit to show them in your store and in the service. You confirm you have the right to use them. Pictures you replace or remove are deleted.',
          ],
        },
        {
          title: 'Suspension',
          body: [
            'Orbit may suspend a store, or an account, that breaks these terms or the law, or that puts customers at risk. A suspended store is closed to the public. The reason is recorded and can be shown to the owner.',
          ],
        },
        {
          title: 'Availability and liability',
          body: [
            'Orbit is provided as it is, and may be unavailable for maintenance or for reasons outside its control. To the extent the law allows, Orbit is not liable for the products, deliveries or conduct of sellers, nor for indirect losses such as lost sales.',
          ],
        },
        {
          title: 'Ending your account',
          body: [
            'You can delete your account in My account. Orders keep the data they need for the store to meet its legal duties. See the Privacy Policy.',
          ],
        },
        {
          title: 'Changes and law',
          body: [
            'Orbit may change these terms; the date above shows the latest version, and using the site after a change means you accept it. These terms are governed by the laws of Brazil.',
          ],
        },
      ]}
    />
  );
}
