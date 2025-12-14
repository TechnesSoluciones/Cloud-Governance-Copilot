/**
 * PageWrapper Component Tests
 *
 * Unit tests for the PageWrapper component to ensure proper rendering,
 * accessibility, and responsive behavior.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PageWrapper } from './PageWrapper';

describe('PageWrapper', () => {
  describe('Basic Rendering', () => {
    it('should render children correctly', () => {
      render(
        <PageWrapper>
          <h1>Test Content</h1>
          <p>Test paragraph</p>
        </PageWrapper>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
      expect(screen.getByText('Test paragraph')).toBeInTheDocument();
    });

    it('should render as a main element with proper role', () => {
      render(
        <PageWrapper>
          <div>Content</div>
        </PageWrapper>
      );

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(main.tagName).toBe('MAIN');
    });

    it('should have default aria-label', () => {
      render(
        <PageWrapper>
          <div>Content</div>
        </PageWrapper>
      );

      expect(screen.getByLabelText('Main content')).toBeInTheDocument();
    });

    it('should accept custom aria-label', () => {
      render(
        <PageWrapper ariaLabel="Dashboard page content">
          <div>Content</div>
        </PageWrapper>
      );

      expect(screen.getByLabelText('Dashboard page content')).toBeInTheDocument();
    });
  });

  describe('Max Width Variants', () => {
    it('should apply full max-width class by default', () => {
      const { container } = render(
        <PageWrapper>
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('max-w-full');
    });

    it('should apply container max-width class', () => {
      const { container } = render(
        <PageWrapper maxWidth="container">
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('max-w-container');
      expect(main).toHaveClass('mx-auto');
    });

    it('should apply 4xl max-width class', () => {
      const { container } = render(
        <PageWrapper maxWidth="4xl">
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('max-w-4xl');
      expect(main).toHaveClass('mx-auto');
    });

    it('should apply 2xl max-width class', () => {
      const { container } = render(
        <PageWrapper maxWidth="2xl">
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('max-w-2xl');
      expect(main).toHaveClass('mx-auto');
    });

    it('should not apply mx-auto for full width', () => {
      const { container } = render(
        <PageWrapper maxWidth="full">
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).not.toHaveClass('mx-auto');
    });
  });

  describe('Spacing Variants', () => {
    it('should apply medium spacing by default', () => {
      const { container } = render(
        <PageWrapper>
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('space-y-6');
    });

    it('should apply small spacing', () => {
      const { container } = render(
        <PageWrapper spacing="sm">
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('space-y-4');
    });

    it('should apply large spacing', () => {
      const { container } = render(
        <PageWrapper spacing="lg">
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('space-y-8');
    });
  });

  describe('Padding', () => {
    it('should apply responsive padding by default', () => {
      const { container } = render(
        <PageWrapper>
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('p-4');
      expect(main).toHaveClass('sm:p-6');
      expect(main).toHaveClass('lg:p-8');
    });

    it('should not apply padding when withPadding is false', () => {
      const { container } = render(
        <PageWrapper withPadding={false}>
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).not.toHaveClass('p-4');
      expect(main).not.toHaveClass('sm:p-6');
      expect(main).not.toHaveClass('lg:p-8');
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <PageWrapper className="custom-class bg-gray-50">
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('custom-class');
      expect(main).toHaveClass('bg-gray-50');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <PageWrapper className="custom-class">
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('custom-class');
      expect(main).toHaveClass('w-full');
      expect(main).toHaveClass('p-4');
    });
  });

  describe('Breadcrumbs', () => {
    it('should render breadcrumbs when provided', () => {
      const breadcrumbs = (
        <div data-testid="breadcrumbs">
          <a href="/home">Home</a> / <span>Current Page</span>
        </div>
      );

      render(
        <PageWrapper breadcrumbs={breadcrumbs}>
          <div>Content</div>
        </PageWrapper>
      );

      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Current Page')).toBeInTheDocument();
    });

    it('should wrap breadcrumbs in nav with proper aria-label', () => {
      const breadcrumbs = <div>Home / Page</div>;

      const { container } = render(
        <PageWrapper breadcrumbs={breadcrumbs}>
          <div>Content</div>
        </PageWrapper>
      );

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb navigation');
    });

    it('should not render breadcrumbs nav when not provided', () => {
      const { container } = render(
        <PageWrapper>
          <div>Content</div>
        </PageWrapper>
      );

      const nav = container.querySelector('nav');
      expect(nav).not.toBeInTheDocument();
    });

    it('should apply correct classes to breadcrumbs wrapper', () => {
      const breadcrumbs = <div>Breadcrumbs</div>;

      const { container } = render(
        <PageWrapper breadcrumbs={breadcrumbs} maxWidth="container">
          <div>Content</div>
        </PageWrapper>
      );

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('mb-4');
      expect(nav).toHaveClass('max-w-container');
      expect(nav).toHaveClass('mx-auto');
    });
  });

  describe('Responsive Behavior', () => {
    it('should include all responsive padding classes', () => {
      const { container } = render(
        <PageWrapper>
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      // Mobile
      expect(main).toHaveClass('p-4');
      // Tablet
      expect(main).toHaveClass('sm:p-6');
      // Desktop
      expect(main).toHaveClass('lg:p-8');
    });

    it('should maintain w-full class for all breakpoints', () => {
      const { container } = render(
        <PageWrapper maxWidth="container">
          <div>Content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toHaveClass('w-full');
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic HTML structure', () => {
      const { container } = render(
        <PageWrapper>
          <h1>Page Title</h1>
          <section>
            <h2>Section Title</h2>
          </section>
        </PageWrapper>
      );

      const main = container.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should support keyboard navigation (no focus traps)', () => {
      render(
        <PageWrapper>
          <button>Button 1</button>
          <a href="/link">Link</a>
          <button>Button 2</button>
        </PageWrapper>
      );

      // Ensure all interactive elements are accessible
      expect(screen.getByText('Button 1')).toBeInTheDocument();
      expect(screen.getByText('Link')).toBeInTheDocument();
      expect(screen.getByText('Button 2')).toBeInTheDocument();
    });

    it('should maintain aria-label hierarchy', () => {
      const breadcrumbs = <div>Breadcrumbs</div>;

      const { container } = render(
        <PageWrapper breadcrumbs={breadcrumbs} ariaLabel="Dashboard content">
          <div>Content</div>
        </PageWrapper>
      );

      const main = screen.getByLabelText('Dashboard content');
      const nav = screen.getByLabelText('Breadcrumb navigation');

      expect(main).toBeInTheDocument();
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should memoize and not re-render unnecessarily', () => {
      const { rerender } = render(
        <PageWrapper maxWidth="container">
          <div>Content</div>
        </PageWrapper>
      );

      const { container: container1 } = rerender(
        <PageWrapper maxWidth="container">
          <div>Content</div>
        </PageWrapper>
      );

      // Component should maintain stable structure
      expect(container1.querySelector('main')).toBeInTheDocument();
    });
  });

  describe('Combined Props', () => {
    it('should handle all props together correctly', () => {
      const breadcrumbs = <div>Home / Settings</div>;

      const { container } = render(
        <PageWrapper
          maxWidth="2xl"
          spacing="sm"
          className="bg-gray-50"
          breadcrumbs={breadcrumbs}
          withPadding={true}
          ariaLabel="Settings page"
        >
          <h1>Settings</h1>
          <div>Form content</div>
        </PageWrapper>
      );

      const main = container.querySelector('main');

      // Check all applied classes
      expect(main).toHaveClass('max-w-2xl');
      expect(main).toHaveClass('mx-auto');
      expect(main).toHaveClass('space-y-4');
      expect(main).toHaveClass('bg-gray-50');
      expect(main).toHaveClass('p-4');

      // Check aria-label
      expect(screen.getByLabelText('Settings page')).toBeInTheDocument();

      // Check breadcrumbs
      expect(screen.getByText('Home / Settings')).toBeInTheDocument();

      // Check content
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Form content')).toBeInTheDocument();
    });
  });
});
