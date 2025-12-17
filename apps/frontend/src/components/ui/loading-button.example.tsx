/**
 * LoadingButton Usage Examples
 *
 * This file demonstrates various use cases for the LoadingButton component.
 * You can use these examples as reference for implementation.
 */

import { LoadingButton } from './loading-button';
import { useState } from 'react';

export function LoadingButtonExamples() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  return (
    <div className="space-y-8 p-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Basic Usage</h2>

        {/* Default variant with loading */}
        <LoadingButton
          isLoading={isLoading}
          onClick={handleSubmit}
        >
          Submit
        </LoadingButton>

        {/* With custom loading text */}
        <LoadingButton
          isLoading={isLoading}
          loadingText="Submitting..."
          onClick={handleSubmit}
        >
          Submit Form
        </LoadingButton>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">All Variants</h2>

        {/* Default variant */}
        <LoadingButton
          variant="default"
          isLoading={isLoading}
          onClick={handleSubmit}
        >
          Default Button
        </LoadingButton>

        {/* Outline variant */}
        <LoadingButton
          variant="outline"
          isLoading={isLoading}
          onClick={handleSubmit}
        >
          Outline Button
        </LoadingButton>

        {/* Ghost variant */}
        <LoadingButton
          variant="ghost"
          isLoading={isLoading}
          onClick={handleSubmit}
        >
          Ghost Button
        </LoadingButton>

        {/* Destructive variant */}
        <LoadingButton
          variant="error"
          isLoading={isLoading}
          loadingText="Deleting..."
          onClick={handleSubmit}
        >
          Delete Item
        </LoadingButton>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">All Sizes</h2>

        {/* Small size */}
        <LoadingButton
          size="sm"
          isLoading={isLoading}
          onClick={handleSubmit}
        >
          Small
        </LoadingButton>

        {/* Default size */}
        <LoadingButton
          size="default"
          isLoading={isLoading}
          onClick={handleSubmit}
        >
          Default
        </LoadingButton>

        {/* Large size */}
        <LoadingButton
          size="lg"
          isLoading={isLoading}
          loadingText="Processing..."
          onClick={handleSubmit}
        >
          Large Button
        </LoadingButton>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Form Integration</h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4"
        >
          <input
            type="text"
            placeholder="Enter some data..."
            className="w-full px-4 py-2 border rounded-md"
          />

          <LoadingButton
            type="submit"
            isLoading={isLoading}
            loadingText="Saving..."
          >
            Save Changes
          </LoadingButton>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Disabled State</h2>

        {/* Disabled without loading */}
        <LoadingButton disabled>
          Disabled Button
        </LoadingButton>

        {/* Disabled with loading (both disabled props combine) */}
        <LoadingButton
          disabled
          isLoading={isLoading}
        >
          Disabled & Loading
        </LoadingButton>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Real-world Examples</h2>

        {/* Login button */}
        <LoadingButton
          isLoading={isLoading}
          loadingText="Signing in..."
          className="w-full"
          onClick={handleSubmit}
        >
          Sign In
        </LoadingButton>

        {/* Save draft */}
        <LoadingButton
          variant="outline"
          isLoading={isLoading}
          loadingText="Saving draft..."
          onClick={handleSubmit}
        >
          Save Draft
        </LoadingButton>

        {/* Delete account */}
        <LoadingButton
          variant="error"
          isLoading={isLoading}
          loadingText="Deleting account..."
          onClick={handleSubmit}
        >
          Delete Account
        </LoadingButton>

        {/* API call */}
        <LoadingButton
          size="lg"
          isLoading={isLoading}
          loadingText="Fetching data..."
          onClick={handleSubmit}
        >
          Load More Results
        </LoadingButton>
      </section>
    </div>
  );
}

/**
 * Async Form Submission Example
 */
export function AsyncFormExample() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData);

      // Simulate API call
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }

      // Success handling
      console.log('Form submitted successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full px-4 py-2 border rounded-md"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          className="w-full px-4 py-2 border rounded-md"
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <LoadingButton
          type="submit"
          isLoading={isSubmitting}
          loadingText="Sending..."
          className="flex-1"
        >
          Send Message
        </LoadingButton>

        <LoadingButton
          type="button"
          variant="outline"
          isLoading={isSubmitting}
          onClick={() => console.log('Save draft')}
        >
          Save Draft
        </LoadingButton>
      </div>
    </form>
  );
}
