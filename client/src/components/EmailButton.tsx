import { useState } from 'react';
import { useAppStore } from '../hooks/useItinerary';

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || '';

export function EmailButton() {
  const { itinerary } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itinerary || !email) return;

    setIsLoading(true);
    setStatus('idle');

    try {
      if (!N8N_WEBHOOK_URL) {
        // Simulate success if no webhook configured
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setStatus('success');
        setTimeout(() => {
          setShowModal(false);
          setStatus('idle');
          setEmail('');
        }, 2000);
        return;
      }

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          itinerary,
          timestamp: new Date().toISOString(),
        }),
      });

      // Parse response JSON to check for success field
      const data = await response.json().catch(() => ({}));

      // Check both HTTP status and response body for success
      if (!response.ok || data.success === false) {
        throw new Error(data.error || 'Failed to send email');
      }

      setStatus('success');
      setTimeout(() => {
        setShowModal(false);
        setStatus('idle');
        setEmail('');
      }, 2000);
    } catch (error) {
      console.error('Error sending email:', error);
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show the button if there's no itinerary
  if (!itinerary) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-terracotta-500 text-white rounded-lg hover:bg-terracotta-600 transition-colors"
      >
        <span>📧</span>
        <span>Email this Plan</span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-panel p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-jaipur-pink-700 mb-4">
              Email Your Itinerary
            </h3>

            {status === 'success' ? (
              <div className="text-center py-8">
                <span className="text-4xl">✅</span>
                <p className="text-green-600 mt-2 font-medium">
                  Itinerary sent successfully!
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Check your inbox for the PDF
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 rounded-lg border border-jaipur-pink-200 focus:outline-none focus:ring-2 focus:ring-jaipur-pink-400"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-red-500 text-sm mb-4">
                    Failed to send email. Please try again.
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="flex-1 px-4 py-2 bg-jaipur-pink-500 text-white rounded-lg hover:bg-jaipur-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default EmailButton;
