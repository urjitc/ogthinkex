import React from 'react';

const TableOfContents: React.FC = () => {
  return (
    <div className="w-64 bg-zinc-950/70 p-6 border-r border-zinc-800 custom-scrollbar overflow-y-auto h-full">
      <h3 className="text-lg font-medium text-gray-300 mb-4">Table of Contents</h3>
      <ul className="space-y-2">
        <li><a href="#section1" className="text-gray-400 hover:text-white">Section 1</a></li>
        <li><a href="#section2" className="text-gray-400 hover:text-white">Section 2</a></li>
        <li><a href="#section3" className="text-gray-400 hover:text-white">Section 3</a></li>
        <li><a href="#section4" className="text-gray-400 hover:text-white">Section 4</a></li>
      </ul>
    </div>
  );
};

export default TableOfContents;
