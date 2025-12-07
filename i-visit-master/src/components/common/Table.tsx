import React from 'react';

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto overflow-y-scroll flex-1 shadow custom-scrollbar">
      <table className="min-w-full text-sm text-left text-white border border-gray-700">{children}</table>
    </div>
  );
}

export function Thead({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <thead
      className={`bg-gray-800 text-nowrap sticky top-0 z-20 text-gray-200 uppercase ${className}`}
    >
      {children}
    </thead>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Tr({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <tr className={`transition ${className}`}>{children}</tr>;
}

export function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-2 border-y bg-[#D8D8D8] text-dark-gray ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`bg-dark-gray/60 p-4 border-y border-white/10 ${className}`}
    >
      {children}
    </td>
  );
}