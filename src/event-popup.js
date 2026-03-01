// Event Popup Entry Point
// This file will be compiled from event-popup.tsx during build
// For now, it's a placeholder that will be replaced by the build system

import React from 'react';
import { createRoot } from 'react-dom/client';
import { EventPopup } from './event-popup';

const root = createRoot(document.getElementById('root'));
root.render(<EventPopup />);
