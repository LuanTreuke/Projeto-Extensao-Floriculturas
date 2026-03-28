import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import styles from '../styles/PriceRange.module.css';

interface PriceRangeProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
}

export default function PriceRange({ min, max, value, onChange }: PriceRangeProps) {
  return (
    <div className={styles.rangeGroup}>
      <div className={styles.sliderWithValues}>
        <span>Preço</span>
        <Slider
          className={styles.range}
          range
          min={min}
          max={max}
          value={value}
          onChange={(v) => {
            if (Array.isArray(v) && v.length === 2) {
              onChange([v[0], v[1]]);
            }
          }}
          allowCross={false}
          styles={{
            track: { backgroundColor: '#4b7350' },
            handle: { borderColor: '#4b7350', backgroundColor: '#fff' }
          }}
        />
      </div>
      <span className={styles.values}>{`R$${value[0].toFixed(2)} - R$${value[1].toFixed(2)}`}</span>
    </div>
  );
}
