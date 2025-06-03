import React from 'react';
import { DeleteIcon, LeaveIcon } from './Icons';
import Group from '../types/group';
import '../styles/Messages.css';

interface GroupListProps {
    groups: Group[];
    selectedGroup: Group | null;
    currentUserId: string;
    onSelectGroup: (group: Group) => void;
    onLeaveGroup: (groupId: string) => void;
    onDeleteGroup: (groupId: string) => void;
}

export default function GroupList({
    groups,
    selectedGroup,
    currentUserId,
    onSelectGroup,
    onLeaveGroup,
    onDeleteGroup
}: GroupListProps) {
    return (
        <div className="groups-list">
            <h2>Your groups</h2>
            {groups.sort((a, b) => a.name.localeCompare(b.name)).map(group => (
                <div
                    key={group.id}
                    className={`group-item ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                    onClick={() => onSelectGroup(group)}
                >
                    <span>{group.name}</span>
                    <button
                        className="icon-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            group.created_by === currentUserId
                                ? onDeleteGroup(group.id)
                                : onLeaveGroup(group.id);
                        }}
                    >
                        {group.created_by === currentUserId ? <DeleteIcon /> : <LeaveIcon />}
                    </button>
                </div>
            ))}
        </div>
    );
} 