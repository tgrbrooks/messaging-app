import React from 'react';
import '../styles/ToggleSwitch.css';

interface ToggleSwitchProps {
    isOn: boolean;
    onToggle: () => void;
    label?: string;
}

export default function ToggleSwitch({ isOn, onToggle, label }: ToggleSwitchProps) {
    return (
        <div className="toggle-switch-container">
            {label && <span className="toggle-switch-label">{label}</span>}
            <label className="toggle-switch">
                <input
                    type="checkbox"
                    checked={isOn}
                    onChange={onToggle}
                />
                <span className="toggle-slider"></span>
            </label>
        </div>
    );
} 