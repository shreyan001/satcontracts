import React from 'react';

const PreBuiltTemplates = () => {
  const templates = [
    { title: 'Game Key Rental', description: 'Rent out your game keys for a set period of time.' },
    { title: 'Domain Lease Agreement', description: 'Lease your domain name to another person or entity.' },
    { title: 'Gift Card Exchange', description: 'Exchange your gift cards for other goods or services.' },
  ];

  return (
    <div className="p-4 bg-gray-800 rounded-md border border-gray-700">
      <h2 className="text-xl font-bold mb-4 text-center">Pre-Built Templates</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template, index) => (
          <div key={index} className="bg-gray-700 p-4 rounded-md">
            <h3 className="font-bold">{template.title}</h3>
            <p>{template.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreBuiltTemplates;