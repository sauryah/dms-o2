import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { PassData, Statistics } from '../types';
import { formatNumber } from './parsing';

export function exportCSV(passes: PassData[], _stats: Statistics): void {
  const headers = [
    'Pass',
    'From Die (mm)',
    'To Die (mm)',
    'Area Before (mm²)',
    'Area After (mm²)',
    'Area Reduction (%)',
    'Elongation (%)',
    'Reduction Ratio',
  ];

  const rows = passes.map((p) => [
    p.pass,
    formatNumber(p.fromDie),
    formatNumber(p.toDie),
    formatNumber(p.areaBefore),
    formatNumber(p.areaAfter),
    formatNumber(p.areaReduction),
    formatNumber(p.elongation),
    formatNumber(p.reductionRatio),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((v) => `"${v}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'wire-drawing-analysis.csv');
}

export function exportExcel(
  passes: PassData[],
  stats: Statistics,
  _dies: number[]
): void {
  const wb = XLSX.utils.book_new();

  const sheetData = [
    [
      'Pass',
      'From Die (mm)',
      'To Die (mm)',
      'Area Before (mm²)',
      'Area After (mm²)',
      'Area Reduction (%)',
      'Elongation (%)',
      'Reduction Ratio',
    ],
    ...passes.map((p) => [
      p.pass,
      p.fromDie,
      p.toDie,
      parseFloat(formatNumber(p.areaBefore)),
      parseFloat(formatNumber(p.areaAfter)),
      parseFloat(formatNumber(p.areaReduction)),
      parseFloat(formatNumber(p.elongation)),
      parseFloat(formatNumber(p.reductionRatio)),
    ]),
    [],
    ['Statistics'],
    ['Total Passes', stats.totalPasses],
    ['Starting Die (mm)', stats.startingDie],
    ['Final Die (mm)', stats.finalDie],
    ['Average Elongation (%)', parseFloat(formatNumber(stats.avgElongation))],
    ['Maximum Elongation (%)', parseFloat(formatNumber(stats.maxElongation))],
    ['Minimum Elongation (%)', parseFloat(formatNumber(stats.minElongation))],
    [
      'Average Area Reduction (%)',
      parseFloat(formatNumber(stats.avgAreaReduction)),
    ],
    [
      'Overall Area Reduction (%)',
      parseFloat(formatNumber(stats.overallAreaReduction)),
    ],
    [
      'Overall Reduction Ratio',
      parseFloat(formatNumber(stats.overallReductionRatio)),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(wb, ws, 'Die Schedule');
  XLSX.writeFile(wb, 'wire-drawing-analysis.xlsx');
}

export function exportPDF(
  passes: PassData[],
  stats: Statistics,
  dies: number[]
): void {
  const doc = new jsPDF('landscape');

  doc.setFontSize(18);
  doc.text('Wire Drawing Die Elongation Report', 14, 20);

  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);
  doc.text(
    `Die Schedule: ${dies.map((d) => formatNumber(d)).join(' → ')}`,
    14,
    36
  );

  const tableData = passes.map((p) => [
    p.pass.toString(),
    formatNumber(p.fromDie),
    formatNumber(p.toDie),
    formatNumber(p.areaBefore),
    formatNumber(p.areaAfter),
    formatNumber(p.areaReduction),
    formatNumber(p.elongation),
    formatNumber(p.reductionRatio),
  ]);

  (doc as any).autoTable({
    startY: 45,
    head: [
      [
        'Pass',
        'From Die',
        'To Die',
        'Area Before',
        'Area After',
        'Area Red. %',
        'Elong. %',
        'Red. Ratio',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 95] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.text('Statistics', 14, finalY);
  doc.setFontSize(10);
  const statsLines = [
    `Total Passes: ${stats.totalPasses}`,
    `Starting Die: ${formatNumber(stats.startingDie)} mm`,
    `Final Die: ${formatNumber(stats.finalDie)} mm`,
    `Average Elongation: ${formatNumber(stats.avgElongation)}%`,
    `Max Elongation: ${formatNumber(stats.maxElongation)}%`,
    `Min Elongation: ${formatNumber(stats.minElongation)}%`,
    `Average Area Reduction: ${formatNumber(stats.avgAreaReduction)}%`,
    `Overall Area Reduction: ${formatNumber(stats.overallAreaReduction)}%`,
    `Overall Reduction Ratio: ${formatNumber(stats.overallReductionRatio)}`,
  ];
  statsLines.forEach((line, i) => {
    doc.text(line, 14, finalY + 7 + i * 6);
  });

  doc.save('wire-drawing-report.pdf');
}

export function copyResultsToClipboard(
  passes: PassData[],
  stats: Statistics
): Promise<void> {
  const lines: string[] = [
    'Wire Drawing Die Elongation Analysis',
    '=' .repeat(50),
    '',
    'Pass\tFrom\tTo\tArea Bef\tArea Aft\tRed %\tElong %\tRatio',
    '-'.repeat(80),
  ];

  for (const p of passes) {
    lines.push(
      `${p.pass}\t${formatNumber(p.fromDie)}\t${formatNumber(p.toDie)}\t${formatNumber(p.areaBefore)}\t${formatNumber(p.areaAfter)}\t${formatNumber(p.areaReduction)}\t${formatNumber(p.elongation)}\t${formatNumber(p.reductionRatio)}`
    );
  }

  lines.push(
    '',
    `Avg Elongation: ${formatNumber(stats.avgElongation)}%`,
    `Overall Reduction: ${formatNumber(stats.overallAreaReduction)}%`
  );

  return navigator.clipboard.writeText(lines.join('\n'));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
