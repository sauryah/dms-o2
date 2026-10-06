import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WireDrawingPrintReport } from '../components/WireDrawingPrintReport';
import type { PassData, Statistics, ConsistencyData } from '../types';

const mockDies = [2.490, 2.217, 1.974, 1.757];

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

const mockStats: Statistics = {
  totalPasses: 3,
  startingDie: 2.490,
  finalDie: 1.757,
  avgElongation: 26.17,
  maxElongation: 26.20,
  minElongation: 26.14,
  avgAreaReduction: 20.74,
  overallAreaReduction: 50.21,
  overallReductionRatio: 2.01,
};

const mockConsistency: ConsistencyData = {
  avgElongation: 26.17,
  variation: 0.03,
  qualityRating: 'EXCELLENT',
  stars: 5,
};

describe('WireDrawingPrintReport', () => {
  test('returns null if dies are empty or stats are null', () => {
    const { container } = render(
      <WireDrawingPrintReport passes={[]} stats={null} dies={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders document header and reference metadata', () => {
    const { getByText } = render(
      <WireDrawingPrintReport
        passes={mockPasses}
        stats={mockStats}
        dies={mockDies}
        consistency={mockConsistency}
        workOrder="WO-998877"
        machineName="Niehoff MT-200"
      />
    );
    expect(getByText(/WIRE DRAWING TECHNICAL DATA SHEET/i)).toBeInTheDocument();
    expect(getByText('WO-998877')).toBeInTheDocument();
    expect(getByText('Niehoff MT-200')).toBeInTheDocument();
  });

  test('renders Section 01: process summary KPIs and die series sequence', () => {
    const { getByText, getAllByText } = render(
      <WireDrawingPrintReport
        passes={mockPasses}
        stats={mockStats}
        dies={mockDies}
        consistency={mockConsistency}
      />
    );
    expect(getByText('01. Drafting Schedule & Series Summary')).toBeInTheDocument();
    expect(getByText('3 Drawing Passes Total')).toBeInTheDocument();
    expect(getByText('Ø 2.490 mm')).toBeInTheDocument();
    expect(getByText('Ø 1.757 mm')).toBeInTheDocument();
    expect(getAllByText('50.21 %').length).toBeGreaterThanOrEqual(1);
  });

  test('renders Section 02: schematic drafting pipeline', () => {
    const { getByText } = render(
      <WireDrawingPrintReport
        passes={mockPasses}
        stats={mockStats}
        dies={mockDies}
        consistency={mockConsistency}
      />
    );
    expect(getByText('02. Schematic Drafting Pipeline')).toBeInTheDocument();
    expect(getByText('4 STATIONS • 3 DRAFT PASSES')).toBeInTheDocument();
  });

  test('renders Section 03: engineering data table with passes and summary rows', () => {
    const { getByText, getAllByText } = render(
      <WireDrawingPrintReport
        passes={mockPasses}
        stats={mockStats}
        dies={mockDies}
        consistency={mockConsistency}
      />
    );
    expect(getByText('03. Elongation & Reduction Engineering Data Table')).toBeInTheDocument();
    expect(getAllByText('P1').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('P2').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('P3').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('AVG')[0]).toBeInTheDocument();
    expect(getAllByText('TOTAL')[0]).toBeInTheDocument();
  });

  test('renders Section 04: graphical analysis with Elongation and Area Reduction charts', () => {
    const { getByText } = render(
      <WireDrawingPrintReport
        passes={mockPasses}
        stats={mockStats}
        dies={mockDies}
        consistency={mockConsistency}
      />
    );
    expect(getByText('04. Graphical Pass Analysis')).toBeInTheDocument();
    expect(getByText('Elongation per Pass (%)')).toBeInTheDocument();
    expect(getByText('Area Reduction per Pass (%)')).toBeInTheDocument();
  });

  test('renders Section 05: operational notes and sign-off blocks', () => {
    const { getByText } = render(
      <WireDrawingPrintReport
        passes={mockPasses}
        stats={mockStats}
        dies={mockDies}
        consistency={mockConsistency}
        notes="Custom test shopfloor instructions."
      />
    );
    expect(getByText('05. Operational Notes & Engineering Sign-Off')).toBeInTheDocument();
    expect(getByText('Custom test shopfloor instructions.')).toBeInTheDocument();
    expect(getByText('Prepared By:')).toBeInTheDocument();
    expect(getByText('Verified By:')).toBeInTheDocument();
    expect(getByText('Quality Approval:')).toBeInTheDocument();
  });
});
