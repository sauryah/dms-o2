import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PrintPassChart } from '../components/PrintPassChart';
import type { PassData } from '../types';

const mockPasses: PassData[] = [
  {
    pass: 1,
    fromDie: 2.490,
    toDie: 2.217,
    areaBefore: 4.870,
    areaAfter: 3.860,
    areaReduction: 20.73,
    elongation: 26.16,
    reductionRatio: 1.26,
  },
  {
    pass: 2,
    fromDie: 2.217,
    toDie: 1.974,
    areaBefore: 3.860,
    areaAfter: 3.060,
    areaReduction: 20.73,
    elongation: 26.14,
    reductionRatio: 1.26,
  },
  {
    pass: 3,
    fromDie: 1.974,
    toDie: 1.757,
    areaBefore: 3.060,
    areaAfter: 2.425,
    areaReduction: 20.76,
    elongation: 26.20,
    reductionRatio: 1.26,
  },
];

describe('PrintPassChart', () => {
  test('returns null when passes array is empty', () => {
    const { container } = render(
      <PrintPassChart title="Elongation per Pass" metric="elongation" passes={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders chart title and summary statistics', () => {
    const { getByText } = render(
      <PrintPassChart title="Elongation per Pass (%)" metric="elongation" passes={mockPasses} />
    );
    expect(getByText('Elongation per Pass (%)')).toBeInTheDocument();
    expect(getByText(/AVG: 26.17%/)).toBeInTheDocument();
  });

  test('renders pass labels and SVG bar rects', () => {
    const { getByText, container } = render(
      <PrintPassChart title="Elongation per Pass (%)" metric="elongation" passes={mockPasses} />
    );
    expect(getByText('P1')).toBeInTheDocument();
    expect(getByText('P2')).toBeInTheDocument();
    expect(getByText('P3')).toBeInTheDocument();

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 680 210');
  });

  test('renders area reduction metrics when specified', () => {
    const { getByText } = render(
      <PrintPassChart
        title="Area Reduction per Pass (%)"
        metric="areaReduction"
        passes={mockPasses}
        barColor="#059669"
      />
    );
    expect(getByText('Area Reduction per Pass (%)')).toBeInTheDocument();
    expect(getByText(/AVG: 20.74%/)).toBeInTheDocument();
  });

  test('renders AVG callout annotation badge in dedicated right gutter isolated from plot bars', () => {
    const { container } = render(
      <PrintPassChart title="Elongation per Pass (%)" metric="elongation" passes={mockPasses} />
    );

    const calloutText = container.querySelector('.avg-callout-text');
    expect(calloutText).toBeInTheDocument();
    expect(calloutText?.textContent).toBe('AVG 26.17%');

    const badgeRect = container.querySelector('.avg-callout-badge');
    expect(badgeRect).toBeInTheDocument();
    const badgeX = Number(badgeRect?.getAttribute('x'));
    // Dedicated right gutter starts at plotRight (594), badge is at 600
    expect(badgeX).toBeGreaterThanOrEqual(594);
  });

  test('isolates 18 passes so rightmost bar never collides with AVG gutter callout', () => {
    // Industrial 18-pass schedule with ~26.09% elongation
    const passes18: PassData[] = Array.from({ length: 18 }, (_, i) => ({
      pass: i + 1,
      fromDie: 2.6 - i * 0.1,
      toDie: 2.5 - i * 0.1,
      areaBefore: 5.0 - i * 0.2,
      areaAfter: 4.0 - i * 0.2,
      areaReduction: 20.69,
      elongation: 26.09,
      reductionRatio: 1.26,
    }));

    const { container } = render(
      <PrintPassChart title="Elongation per Pass (%)" metric="elongation" passes={passes18} />
    );

    const calloutText = container.querySelector('.avg-callout-text');
    expect(calloutText?.textContent).toBe('AVG 26.09%');

    const badgeRect = container.querySelector('.avg-callout-badge');
    const badgeX = Number(badgeRect?.getAttribute('x'));

    // Check all bar rects to verify none enter the gutter
    const barRects = container.querySelectorAll('g rect[opacity="0.92"]');
    expect(barRects.length).toBe(18);

    barRects.forEach((rect) => {
      const x = Number(rect.getAttribute('x'));
      const width = Number(rect.getAttribute('width'));
      const rightEdge = x + width;
      // All bars must strictly finish before plotRight (594) and before badge (600)
      expect(rightEdge).toBeLessThan(594);
      expect(rightEdge).toBeLessThan(badgeX);
    });
  });
});
