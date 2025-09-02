export interface ManuscriptEditorProps {
  manuscriptId: string;
  userId: string;
  userRole: 'author' | 'editor' | 'publisher' | 'viewer';
  manuscriptStatus: string;
  onClose?: () => void;
}

export interface EditorConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      edit: boolean;
      download: boolean;
      print: boolean;
      review: boolean;
      comment: boolean;
      chat: boolean;
      fillForms: boolean;
      modifyFilter: boolean;
      modifyContentControl: boolean;
    };
    info: {
      owner: string;
      folder: string;
      uploaded: string;
    };
  };
  documentType: string;
  editorConfig: {
    mode: 'edit' | 'view';
    lang: string;
    callbackUrl: string;
    coEditing: {
      mode: string;
      change: boolean;
    };
    user: {
      id: string;
      name: string;
    };
    customization: {
      about: boolean;
      feedback: boolean;
      goback: {
        url: string;
        text: string;
      };
    };
  };
  token?: string;
}

// OnlyOffice editor event types
export interface OnlyOfficeErrorEvent {
  data?: {
    error?: string;
    message?: string;
  };
}

export interface OnlyOfficeSaveAsEvent {
  data?: {
    fileType?: string;
    url?: string;
    title?: string;
  };
}

export interface EditorEvents {
  onAppReady: () => void;
  onDocumentReady: () => void;
  onLoadComponentError: (error: OnlyOfficeErrorEvent) => void;
  onRequestClose: () => void;
  onRequestSaveAs: (event: OnlyOfficeSaveAsEvent) => void;
  onRequestEditRights: () => boolean;
  onCollaborativeChanges: () => void;
  onRequestRefreshFile: () => void;
  onError: (event: OnlyOfficeErrorEvent) => void;
}