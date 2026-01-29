import {
    DndContext,
    closestCenter
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition
    } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition
            }}
            {...attributes}
            {...listeners}
        >
            {children}
        </div>
    );
};

export default SortableItem
