import React from 'react';
import styles from '../styles/SortButtons.module.css';

interface SortButtonsProps {
  selected: string;
  onSelect: (v: string) => void;
}

const options = [
  { label: 'Novo', value: 'new' },
  { label: 'Preço crescente', value: 'asc' },
  { label: 'Preço decrescente', value: 'desc' },
];

export default function SortButtons({ selected, onSelect }: SortButtonsProps) {
  return (
    <div className={styles.sortGroup}>
      {options.map(opt => (
        <button
          key={opt.value}
          className={selected === opt.value ? styles.selected : styles.button}
          onClick={() => onSelect(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
