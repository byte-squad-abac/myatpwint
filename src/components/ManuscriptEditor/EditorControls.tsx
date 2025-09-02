'use client';

import Button from '../ui/Button';

interface EditorControlsProps {
  userRole: string;
  saving: boolean;
  onClose?: () => void;
}

export function EditorControls({ userRole, saving, onClose }: EditorControlsProps) {
  return (
    <div className="absolute top-0 right-0 z-50 p-4">
      <div className="flex items-center gap-4 bg-white rounded-lg shadow-lg px-4 py-2">
        {saving && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Saving...
          </div>
        )}
        
        <div className="text-sm text-gray-600">
          Role: <span className="font-medium capitalize">{userRole}</span>
        </div>
        
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}