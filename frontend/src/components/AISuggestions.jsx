import React from 'react';

const AISuggestions = ({ suggestion }) => {
  return (
    <div className="bg-blue-50 text-blue-900 p-2 mt-2 rounded border border-blue-300 text-sm">
      💡 <strong>AI Tip:</strong> {suggestion || "Loading suggestion..."}
    </div>
  );
};

export default AISuggestions;
