import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const KeyValueEditor = ({ items, setItems, placeholder, title }) => {
  const handleItemChange = (index, value) => {
    const newItems = [...items];
    newItems[index].value = value;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), value: '' }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const inputStyles = "w-full p-2 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition font-mono text-sm";
  const iconButtonStyles = "p-2 bg-dark-bg rounded-full shadow-neo active:shadow-neo-inset transition-all";

  return (
    <div>
      {title && <label className="block text-sm font-medium mb-2 text-gray-400">{title}</label>}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <input
              type="text"
              value={item.value}
              onChange={(e) => handleItemChange(index, e.target.value)}
              className={inputStyles}
              placeholder={placeholder}
            />
            <button type="button" onClick={() => removeItem(index)} className={`${iconButtonStyles} text-red-500`}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm font-semibold text-accent mt-2 p-2 rounded-lg hover:bg-blue-900/30 transition-colors">
        <Plus size={16} /> Add
      </button>
    </div>
  );
};

export default KeyValueEditor;