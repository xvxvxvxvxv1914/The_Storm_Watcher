import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  AreaSeries,
  LineSeries,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';

export interface TsPoint {
  time: UTCTimestamp;
  value: number;
}

interface RefLine {
  value: number;
  color: string;
  label?: string;
}

interface Props {
  data: TsPoint[];
  color: string;
  type?: 'line' | 'area';
  height?: number;
  refLines?: RefLine[];
  yMin?: number;
  yMax?: number;
}

export default function TimeSeriesChart({
  data,
  color,
  type = 'area',
  height = 300,
  refLines,
  yMin,
  yMax,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || data.length === 0) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.05)' },
        horzLines: { color: 'rgba(255,255,255,0.05)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        ...(yMin !== undefined || yMax !== undefined ? {
          autoScale: false,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        } : {}),
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: color + '80', width: 1 },
        horzLine: { color: color + '80', width: 1 },
      },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    if (yMin !== undefined && yMax !== undefined) {
      chart.priceScale('right').applyOptions({ autoScale: false });
    }

    let series;
    if (type === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: color,
        topColor: color + '50',
        bottomColor: color + '05',
        lineWidth: 2,
        priceLineVisible: false,
      });
    } else {
      series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceLineVisible: false,
      });
    }

    series.setData(data);

    refLines?.forEach(rl => {
      series.createPriceLine({
        price: rl.value,
        color: rl.color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: rl.label ?? '',
      });
    });

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (el && chartRef.current) {
        chartRef.current.applyOptions({ width: el.clientWidth });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, color, type, height]);

  return <div ref={containerRef} />;
}
