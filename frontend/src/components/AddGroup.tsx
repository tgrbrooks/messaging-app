import React, { useState } from 'react';
import { AddIcon } from './Icons';
import '../styles/Messages.css';

interface AddGroupProps {
    onCreateGroup: (name: string) => void;
}

export default function AddGroup({ onCreateGroup }: AddGroupProps) {
    const [newGroupName, setNewGroupName] = useState('');

    const handleCreate = () => {
        if (newGroupName.trim()) {
            onCreateGroup(newGroupName);
            setNewGroupName('');
        }
    };

    return (
        <div className="add-group">
            <input
                type="text"
                placeholder="Add group"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button className="icon-button" onClick={handleCreate}>
                <AddIcon />
            </button>
        </div>
    );
} 