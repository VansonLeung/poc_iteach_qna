import { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

/**
 * Reusable Draggable Tree Component
 * 
 * Features:
 * - Hierarchical tree structure (folders/files)
 * - File-explorer-like drag and drop
 * - Position indicators (before/after/inside)
 * - No animation during drag
 * - Fully customizable rendering
 * 
 * @param {Array} items - Array of tree items with optional children
 * @param {Function} onReorder - Callback when items are reordered (item, targetItem, position)
 * @param {Function} renderItem - Custom render function for each item
 * @param {Function} canHaveChildren - Function to determine if item can contain children
 * @param {String} childrenKey - Key name for children array (default: 'children')
 * @param {Function} getId - Function to get unique ID from item
 */
export function DraggableTree({
  items,
  onReorder,
  renderItem,
  canHaveChildren,
  childrenKey = 'children',
  getId = (item) => item.id,
  className = '',
}) {
  const [dragState, setDragState] = useState({
    draggingId: null,
    overId: null,
    position: null, // 'before', 'after', 'inside'
    startY: 0,
    currentY: 0,
  });

  const dragImageRef = useRef(null);

  const handleDragStart = (e, item) => {
    const itemId = getId(item);
    
    setDragState({
      draggingId: itemId,
      overId: null,
      position: null,
      startY: e.clientY,
      currentY: e.clientY,
    });

    // Set drag image to be transparent
    if (dragImageRef.current) {
      const img = document.createElement('div');
      img.style.opacity = '0';
      document.body.appendChild(img);
      e.dataTransfer.setDragImage(img, 0, 0);
      setTimeout(() => document.body.removeChild(img), 0);
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleDragOver = (e, item, rect) => {
    e.preventDefault();
    e.stopPropagation();
    
    const itemId = getId(item);
    const { top, bottom, height } = rect;
    const mouseY = e.clientY;

    let position = null;

    // Determine drop position based on mouse location
    if (canHaveChildren(item)) {
      // For container items: divide into thirds
      const thirdHeight = height / 3;
      if (mouseY < top + thirdHeight) {
        position = 'before';
      } else if (mouseY > bottom - thirdHeight) {
        position = 'after';
      } else {
        position = 'inside';
      }
    } else {
      // For leaf items: only before/after
      const midY = (top + bottom) / 2;
      position = mouseY < midY ? 'before' : 'after';
    }

    setDragState(prev => ({
      ...prev,
      overId: itemId,
      position,
      currentY: mouseY,
    }));
  };

  const handleDragEnd = (e) => {
    e.preventDefault();
    
    const { draggingId, overId, position } = dragState;

    if (draggingId && overId && position && draggingId !== overId) {
      // Find items
      const draggingItem = findItemById(items, draggingId, childrenKey, getId);
      const targetItem = findItemById(items, overId, childrenKey, getId);

      if (draggingItem && targetItem) {
        // Check if trying to drop container into its own descendant
        if (canHaveChildren(draggingItem) && isDescendant(draggingItem, overId, childrenKey, getId)) {
          console.warn('Cannot drop container into its own descendant');
        } else {
          onReorder(draggingItem, targetItem, position);
        }
      }
    }

    setDragState({
      draggingId: null,
      overId: null,
      position: null,
      startY: 0,
      currentY: 0,
    });
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the entire component
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragState(prev => ({
        ...prev,
        overId: null,
        position: null,
      }));
    }
  };

  return (
    <div 
      className={`draggable-tree ${className}`}
      onDragLeave={handleDragLeave}
    >
      {items.map((item, index) => (
        <TreeItem
          key={getId(item)}
          item={item}
          index={index}
          level={0}
          dragState={dragState}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          renderItem={renderItem}
          canHaveChildren={canHaveChildren}
          childrenKey={childrenKey}
          getId={getId}
        />
      ))}
    </div>
  );
}

function TreeItem({
  item,
  index,
  level,
  dragState,
  onDragStart,
  onDragOver,
  onDragEnd,
  renderItem,
  canHaveChildren,
  childrenKey,
  getId,
}) {
  const itemRef = useRef(null);
  const itemId = getId(item);
  const isDragging = dragState.draggingId === itemId;
  const isOver = dragState.overId === itemId;
  const position = isOver ? dragState.position : null;
  const children = item[childrenKey] || [];
  const hasChildren = children.length > 0;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      onDragOver(e, item, rect);
    }
  };

  return (
    <div className="tree-item-wrapper">
      {/* Drop indicator - BEFORE */}
      {isOver && position === 'before' && (
        <div className="h-0.5 bg-blue-500 rounded-full -mt-0.5 mb-0.5" />
      )}

      <div
        ref={itemRef}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();  // Prevent parent from also handling drag
          onDragStart(e, item);
        }}
        onDragOver={handleDragOver}
        onDragEnd={onDragEnd}
        className={`tree-item ${isDragging ? 'opacity-30' : ''} ${
          isOver && position === 'inside' ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/50' : ''
        }`}
        style={{
          marginLeft: `${level * 24}px`,
        }}
      >
        {renderItem(item, {
          isDragging,
          isOver,
          position,
          level,
          hasChildren,
          dragHandleProps: {
            className: 'cursor-grab active:cursor-grabbing touch-none',
            children: <GripVertical className="h-4 w-4 text-muted-foreground" />,
          },
        })}
      </div>

      {/* Render children */}
      {canHaveChildren(item) && hasChildren && (
        <div className="tree-children ml-6 border-l-2 border-dashed border-muted-foreground/20 pl-2">
          {children.map((child, childIndex) => (
            <TreeItem
              key={getId(child)}
              item={child}
              index={childIndex}
              level={level + 1}
              dragState={dragState}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
              renderItem={renderItem}
              canHaveChildren={canHaveChildren}
              childrenKey={childrenKey}
              getId={getId}
            />
          ))}
        </div>
      )}

      {/* Empty container indicator */}
      {canHaveChildren(item) && !hasChildren && (
        <div className="ml-6 border-l-2 border-dashed border-muted-foreground/20 pl-2">
          <div className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded border-2 border-dashed">
            Empty - drag items here
          </div>
        </div>
      )}

      {/* Drop indicator - AFTER */}
      {isOver && position === 'after' && (
        <div className="h-0.5 bg-blue-500 rounded-full mt-0.5 -mb-0.5" />
      )}
    </div>
  );
}

// Helper function to find item by ID in tree
function findItemById(items, id, childrenKey, getId) {
  for (const item of items) {
    if (getId(item) === id) return item;
    
    const children = item[childrenKey] || [];
    if (children.length > 0) {
      const found = findItemById(children, id, childrenKey, getId);
      if (found) return found;
    }
  }
  return null;
}

// Helper function to check if item is descendant
function isDescendant(parent, childId, childrenKey, getId) {
  if (getId(parent) === childId) return true;
  
  const children = parent[childrenKey] || [];
  for (const child of children) {
    if (isDescendant(child, childId, childrenKey, getId)) {
      return true;
    }
  }
  return false;
}

// Helper function to find parent of an item
export function findParentId(items, targetId, childrenKey = 'children', getId = (item) => item.id, parentId = null) {
  for (const item of items) {
    if (getId(item) === targetId) {
      return parentId;
    }
    
    const children = item[childrenKey] || [];
    if (children.length > 0) {
      const found = findParentId(children, targetId, childrenKey, getId, getId(item));
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

// Helper function to get siblings of an item
export function getSiblings(items, targetId, childrenKey = 'children', getId = (item) => item.id) {
  const parentId = findParentId(items, targetId, childrenKey, getId);
  
  if (parentId === null) {
    // Root level
    return items;
  }
  
  const parent = findItemById(items, parentId, childrenKey, getId);
  return parent ? parent[childrenKey] || [] : [];
}
