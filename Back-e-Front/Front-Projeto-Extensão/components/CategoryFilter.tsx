import React from 'react';
import styles from '../styles/CategoryFilter.module.css';

interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (cat: string) => void;
}

export default function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className={styles.filterGroup}>
      {categories.map((cat) => (
        <button
          key={cat}
          className={selected === cat ? styles.selected : styles.button}
          onClick={() => onSelect(selected === cat ? '' : cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
