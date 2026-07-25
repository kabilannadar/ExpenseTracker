import HelpSection from '../components/HelpSection';

export default function HelpPage() {
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">Help & Knowledge Base</h1>
          <p className="page-subtitle">Frequently asked questions and Telegram bot setup guides</p>
        </div>
      </div>
      <HelpSection />
    </div>
  );
}
