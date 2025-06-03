import React from 'react';
import { LogoutIcon } from './Icons';
import AddGroup from './AddGroup';
import JoinGroup from './JoinGroup';
import GroupList from './GroupList';
import Group from '../types/group';
import '../styles/Messages.css';

interface GroupSectionProps {
    username: string;
    userGroups: Group[];
    availableGroups: Group[];
    selectedGroup: Group | null;
    currentUserId: string;
    onCreateGroup: (name: string) => void;
    onJoinGroup: (groupId: string) => void;
    onLeaveGroup: (groupId: string) => void;
    onDeleteGroup: (groupId: string) => void;
    onSelectGroup: (group: Group) => void;
    onLogout: () => void;
}

export default function GroupSection({
    username,
    userGroups,
    availableGroups,
    selectedGroup,
    currentUserId,
    onCreateGroup,
    onJoinGroup,
    onLeaveGroup,
    onDeleteGroup,
    onSelectGroup,
    onLogout
}: GroupSectionProps) {
    return (
        <div className="sidebar">
            <div className="user-header">
                <span>{username}</span>
                <button className="icon-button" onClick={onLogout}>
                    <LogoutIcon />
                </button>
            </div>

            <div className="group-actions">
                <AddGroup onCreateGroup={onCreateGroup} />
                <JoinGroup
                    availableGroups={availableGroups}
                    onJoinGroup={onJoinGroup}
                />
            </div>

            <GroupList
                groups={userGroups}
                selectedGroup={selectedGroup}
                currentUserId={currentUserId}
                onSelectGroup={onSelectGroup}
                onLeaveGroup={onLeaveGroup}
                onDeleteGroup={onDeleteGroup}
            />
        </div>
    );
} 