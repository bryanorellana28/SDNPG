import React from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="input-group" style={{ maxWidth: '250px' }}>
      <span className="input-group-text">🔍</span>
      <input
        className="form-control"
        placeholder="Buscar"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
