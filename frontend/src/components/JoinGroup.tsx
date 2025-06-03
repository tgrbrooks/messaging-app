import React from 'react';
import Group from '../types/group';

interface JoinGroupProps {
    availableGroups: Group[];
    onJoinGroup: (groupId: string) => void;
}

export default function JoinGroup({ availableGroups, onJoinGroup }: JoinGroupProps) {
    return (
        <div className="join-group">
            <select onChange={(e) => e.target.value && onJoinGroup(e.target.value)}>
                <option value="">Join group</option>
                {availableGroups.map(group => (
                    <option key={group.id} value={group.id}>
                        {group.name}
                    </option>
                ))}
            </select>
        </div>
    );
} 