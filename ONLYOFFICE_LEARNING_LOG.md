# OnlyOffice Integration Learning Log

This document tracks everything learned during the step-by-step OnlyOffice integration following official documentation.

## 📋 Documentation Sources Completed

1. ✅ [Self-hosted Installation](https://api.onlyoffice.com/docs/docs-api/get-started/installation/self-hosted)
2. ✅ [Docker Installation](https://helpcenter.onlyoffice.com/installation/docs-developer-install-docker.aspx)
3. ✅ [Preload Configuration](https://api.onlyoffice.com/docs/docs-api/get-started/configuration/preload)
4. ✅ [Shard Key Configuration](https://api.onlyoffice.com/docs/docs-api/get-started/configuration/shard-key)
5. ✅ [Try-Docs](https://api.onlyoffice.com/docs/docs-api/get-started/try-docs)
6. ✅ [Playground](https://api.onlyoffice.com/docs/docs-api/get-started/playground)

---

## 🐳 Docker Installation

### Working Docker Command
```bash
docker run -i -t -d -p 80:80 --restart=always -e JWT_SECRET=my_jwt_secret onlyoffice/documentserver-de
```

### Key Points
- Uses OnlyOffice Document Server Developer Edition
- JWT_SECRET is required for security
- Runs on port 80
- Health check endpoint: `http://localhost/healthcheck` (returns `true` when ready)

### System Requirements
- Dual core 2 GHz CPU
- 4 GB RAM
- 40 GB free HDD space
- Docker supported version

---

## 🔐 JWT Token Implementation

### JWT Structure
```javascript
// Header
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload (contains entire OnlyOffice config)
{
  "document": {
    "fileType": "txt",
    "key": "unique-document-key",
    "title": "Document Title",
    "url": "accessible-document-url"
  },
  "documentType": "word",
  "editorConfig": {
    "user": {
      "id": "user-id",
      "name": "User Name"
    }
  },
  "height": "600px",
  "width": "100%"
}
```

### JWT Generation Process
1. Base64 URL encode header and payload
2. Create signature using HMAC-SHA256 with JWT_SECRET
3. Combine as: `header.payload.signature`

### Important Notes
- JWT token must contain the ENTIRE configuration
- Document URL must be accessible by OnlyOffice container
- Use `host.docker.internal:PORT` for local development servers
- Document key should be unique and change when document updates

---

## 📄 HTML Integration Structure

### Basic HTML Template
```html
<!DOCTYPE html>
<html>
<head>
    <title>OnlyOffice Integration</title>
</head>
<body>
    <div id="placeholder" style="width: 100%; height: 600px;"></div>
    
    <!-- Load API with preload optimization -->
    <script src="http://localhost/web-apps/apps/api/documents/api.js?preload=placeholder"></script>
    
    <script>
        window.docEditor = new DocsAPI.DocEditor("placeholder", {
            // Configuration goes here
            "token": "jwt-token-here"
        });
    </script>
</body>
</html>
```

### Key Requirements
- Placeholder div with unique ID
- API script from OnlyOffice server
- Configuration object with JWT token
- All parameters must match JWT payload exactly

---

## ⚡ Performance Optimizations

### Preload Configuration
- **Purpose**: Speed up editor loading by preloading static assets
- **Implementation**: Add `?preload=placeholder` to API script URL
- **Alternative**: Manual iframe preloading for custom security settings
- **Benefit**: Caches HTML, CSS, JS, and fonts before document opens

### Shard Key Configuration  
- **Purpose**: Load balancing for server clusters
- **When needed**: Only with multiple OnlyOffice servers
- **Implementation**: Add `_shardkey` parameter with document key value
- **Our setup**: Not needed (single server)

---

## 🎯 Document Types & Features

### Supported File Types
- **Documents**: DOCX, DOC, ODT, TXT
- **Spreadsheets**: XLSX, XLS, ODS, CSV  
- **Presentations**: PPTX, PPSX, PPT, ODP
- **PDF files**: View and limited editing

### Editing Modes (Relevant for Manuscript System)
- **Edit**: Full editing capabilities
- **Co-editing**: Real-time collaboration
- **Strict co-editing**: Turn-based editing
- **Review**: Track changes and suggestions
- **Commenting**: Add comments and feedback
- **View**: Read-only mode

### Permission Levels
- Full editing permissions
- Review/comment only permissions  
- View only permissions

---

## 🚀 Development Tools

### Try-Docs Platform
- Interactive demo of all OnlyOffice features
- Test different document types and editing modes
- View example source code for implementations
- Preview capabilities before development

### Playground
- Online code editor for testing API configurations
- No installation or registration required
- Test across desktop, mobile, and embedded platforms
- Experiment with themes and language interfaces

---

## 📝 Lessons Learned

### Security
1. JWT tokens are mandatory in production
2. Document URLs must be accessible by OnlyOffice container
3. JWT secret should be strong and consistent

### Performance
1. Always use preload optimization
2. Document keys should be unique and change with updates
3. Container health check is essential before integration

### Development Workflow
1. Start with basic HTML integration
2. Test with simple documents first
3. Use local document servers for development
4. Verify each step before proceeding

### Common Issues & Solutions
1. **"Document security token not correctly formed"** → JWT implementation needed
2. **"Download failed"** → Document URL not accessible by container
3. **Stuck at 80% loading** → Document server connectivity issues
4. **403 Errors** → External URLs may be blocked, use local servers

---

## 🎯 Next Steps for Manuscript System

### Integration Plan
1. Create Next.js API routes for OnlyOffice configuration
2. Generate JWT tokens server-side with document permissions
3. Implement role-based access (Author vs Editor permissions)
4. Connect with Supabase document storage
5. Add callback handling for document saves
6. Implement real-time collaboration features

### Key Features to Implement
- Author: Full edit permissions on their manuscripts
- Editor: Review/comment permissions on assigned manuscripts  
- Real-time collaboration between author and editor
- Document versioning and change tracking
- Save callbacks to update database

---

## ⚛️ React Integration

### Official React Component
OnlyOffice provides an official React component for easy integration:

```bash
npm install --save @onlyoffice/document-editor-react
```

### Component Usage
```javascript
import {DocumentEditor} from "@onlyoffice/document-editor-react";

export default function App() {
  return (
    <DocumentEditor
      id="docxEditor"
      documentServerUrl="http://localhost/"
      config={{
        document: {
          fileType: "docx",
          key: "unique-document-key",
          title: "Document Title.docx",
          url: "https://example.com/document.docx"
        },
        documentType: "word",
        editorConfig: {
          user: {
            id: "user-id",
            name: "User Name"
          }
        }
      }}
    />
  )
}
```

### Key Benefits
- ✅ Ready-to-use React component
- ✅ Standardized frontend technology
- ✅ Reusable interface blocks
- ✅ Faster development than raw HTML integration
- ✅ Built-in TypeScript support
- ✅ Extensive configuration options

### Integration with Next.js
- Works seamlessly with Next.js projects
- Can be used in both client-side components
- Supports server-side configuration generation
- Perfect for our manuscript editing system

### Configuration Requirements
- Same document configuration as HTML integration
- JWT tokens still required for security
- DocumentServerUrl points to our Docker container
- All document URLs must be accessible by OnlyOffice

---

## 🔧 Current Working Setup

### Files Created
- `test-onlyoffice.html` - Working HTML integration
- `generate-jwt.js` - JWT token generator
- `simple-server.js` - Local document server (stopped)
- `ONLYOFFICE_LEARNING_LOG.md` - This learning documentation

### Docker Container
- Container ID: Running OnlyOffice Document Server DE
- Port: 80 (accessible via localhost)
- JWT Secret: `my_jwt_secret`
- Status: ✅ Healthy and verified

### Verification Status
- ✅ Docker container running and healthy
- ✅ API endpoint accessible 
- ✅ JWT authentication working
- ✅ Document loading and display working
- ✅ Basic editor functionality confirmed
- ✅ React integration method understood
- ✅ Language-specific examples studied
- ✅ External access patterns understood

---

## 📚 Language-Specific Examples

### Available Examples
OnlyOffice provides complete integration examples in multiple languages:
- ✅ **NodeJS** (Most relevant for our Next.js app)
- .Net (C#), .Net (C# MVC)
- Java, Java Spring
- PHP, PHP (Laravel)
- Python, Ruby, Go

### NodeJS Example Structure
**Repository**: `https://github.com/ONLYOFFICE/document-server-integration/tree/master/web/documentserver-example/nodejs`

```
nodejs/
├── bin/          # Application entry point
├── config/       # Configuration files
│   └── default.json
├── files/        # Document storage
├── helpers/      # Utility functions
├── public/       # Static assets
└── views/        # Template files (EJS)
```

### Key Configuration (config/default.json)
```json
{
  "server": {
    "port": 3000,
    "siteUrl": "https://documentserver/"
  },
  "storageFolder": "./files",
  "storagePath": "/files"
}
```

### NodeJS Implementation Approach
1. **Express.js** based web server
2. **EJS templates** for document editor views
3. **File-based storage** for documents
4. **JWT authentication** for security
5. **Callback handling** for document saves
6. **Multiple document format support**

### Security Considerations
⚠️ **Important**: Example has minimal security
- No authorization protection on storage
- Intended for testing/demonstration only
- Requires proper modifications for production use

### Setup Process
```bash
# 1. Install dependencies
npm install

# 2. Configure default.json
# Set documentServer URL and storage paths

# 3. Run application
node bin/www

# 4. Access at localhost:3000
```

### Detailed Configuration (config/default.json)
```json
{
  "storageFolder": "./files",
  "storagePath": "/files",
  "siteUrl": "https://documentserver/",
  "server": {
    "port": 3000,
    "token": {
      "enable": true,
      "secret": "secret"
    }
  }
}
```

### JWT Token Generation in NodeJS
```javascript
// Token generation function
documentService.getToken = function getToken(data) {
  const options = {
    algorithm: cfgSignatureSecretAlgorithmRequest,
    expiresIn: cfgSignatureSecretExpiresIn
  };
  return jwt.sign(data, cfgSignatureSecret, options);
};
```

### Security Implementation Details
- **JWT Standard**: Uses JSON Web Token standard for security
- **Token in Body**: Starting v7.1, tokens can be in request body
- **Token in Header**: Alternative/fallback token placement
- **Dual Token Support**: Incoming uses body first, then header
- **Outgoing Requests**: Can use both body and header tokens

### Configuration Requirements
- Token must be added to editor configuration
- JWT payload structure must match config exactly
- Enable body tokens: `services.CoAuthoring.token.inbox.inBody = true`
- Enable header tokens: `services.CoAuthoring.token.outbox.inHeader = true`

### Platform-Specific Notes
- **Windows**: Use double backslashes in file paths
- **Linux**: Ensure read/write permissions for storage folders
- **Network**: Mutual accessibility between servers required
- **Firewall**: Configure if servers on different machines

### Critical Security Warnings
⚠️ **Production Usage**:
- Examples are for testing/demonstration only
- DO NOT use directly in production
- Requires proper security modifications
- No authorization protection in examples

---

## 🔌 External Access to Document Editing (Automation API)

### Automation API Technical Overview
- **Purpose**: Edit documents from external sources programmatically
- **Supported Types**: Documents, spreadsheets, presentations, PDFs, forms
- **Requirement**: ONLYOFFICE Docs Developer edition + paid addon
- **Interface**: Similar to plugins but with external access

### Core API Methods
```javascript
// Initialize connector
const connector = window.Asc.plugin.createConnector();

// Add menu items
connector.addContextMenuItem();
connector.addToolbarMenuItem();

// Event handling
connector.attachEvent();

// Execute commands
connector.callCommand();
connector.executeMethod();

// Create modal windows
connector.createWindow();
```

### 1. Comment Management
**Capabilities**:
- Collect all comments from documents
- Display comments in custom external interfaces
- Add replies to existing comments programmatically

**Implementation**:
```javascript
// Handle comment changes
connector.attachEvent("onCommentChange", (data) => {
  // Process comment data
  displayCommentsInCustomUI(data);
});

// Add reply to comment
connector.executeMethod("ChangeComment", [commentData]);
```

### 2. Review Process Control
**Capabilities**:
- Manage review workflows from external applications
- Accept/reject changes programmatically
- Navigate through review changes

**Implementation**:
```javascript
// Accept selected changes
$("#accept").on("click", () => {
  connector.executeMethod("AcceptReviewChanges");
});

// Reject selected changes
$("#reject").on("click", () => {
  connector.executeMethod("RejectReviewChanges");
});

// Navigate review changes
$("#next").on("click", () => {
  connector.executeMethod("MoveToNextReviewChange");
});

$("#prev").on("click", () => {
  connector.executeMethod("MoveToNextReviewChange", [false]);
});
```

### 3. Form Filling Automation
**Capabilities**:
- Programmatically fill form fields
- Automate document completion
- Integrate with external data sources
- Lock PDF editing after completion

**Use Cases**:
- Pre-populate manuscript submission forms
- Automate reviewer information entry
- Fill publication details automatically

### Implementation Requirements
- **License**: ONLYOFFICE Docs Developer edition required
- **Cost**: Additional paid feature (contact sales)
- **Compatibility**: Works with Office JavaScript API
- **Context**: Operates in isolated JavaScript environment

### Limitations
- **Content Only**: Can create/insert content but cannot modify existing structure
- **Paid Feature**: Not included in standard licensing
- **Developer Edition**: Requires specific ONLYOFFICE version

### Use Cases for Manuscript System

#### External Comment System
```javascript
// Custom comment management interface
class ManuscriptCommentManager {
  constructor(connector) {
    this.connector = connector;
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.connector.attachEvent("onCommentChange", (comments) => {
      this.updateExternalCommentUI(comments);
      this.notifyAuthorsOfNewComments(comments);
    });
  }
  
  addEditorComment(text, position) {
    this.connector.executeMethod("ChangeComment", [{
      text: text,
      position: position,
      author: "Editor"
    }]);
  }
}
```

#### External Review Workflow
```javascript
// Manuscript review management
class ManuscriptReviewManager {
  acceptAllChanges() {
    this.connector.executeMethod("AcceptReviewChanges");
    this.updateManuscriptStatus("approved");
  }
  
  rejectSelectedChanges() {
    this.connector.executeMethod("RejectReviewChanges");
    this.requestAuthorRevision();
  }
  
  trackReviewProgress() {
    // Monitor review state externally
    this.connector.attachEvent("onReviewChange", (changes) => {
      this.updateDashboardProgress(changes);
    });
  }
}
```

### Integration Benefits for Manuscript System
- **Custom Workflows**: Build manuscript-specific review processes
- **External Notifications**: Alert authors/editors outside the document
- **Dashboard Integration**: Show editing progress in main app
- **Automated Processes**: Pre-fill forms, auto-accept changes
- **Custom UI**: Display comments/changes in manuscript management interface

### Important Considerations
⚠️ **Cost Factor**: This is a paid addon feature
⚠️ **License Requirement**: Needs Developer edition
⚠️ **Sales Contact**: Must contact ONLYOFFICE sales team
⚠️ **Alternative**: Consider using callbacks and standard API for basic external functionality

---

## 🎯 Implementation Strategy for Manuscript System

### Backend Architecture (Next.js API Routes)
Based on NodeJS example patterns:
```javascript
// pages/api/editor/config/[id].js
export default async function handler(req, res) {
  // 1. Authenticate user
  // 2. Get manuscript from Supabase
  // 3. Generate JWT token with proper permissions
  // 4. Return editor configuration
}

// pages/api/editor/callback/[id].js
export default async function handler(req, res) {
  // 1. Verify JWT token
  // 2. Handle document saves
  // 3. Update Supabase records
  // 4. Notify collaborators
}
```

### Frontend Integration (React Component)
```javascript
import {DocumentEditor} from "@onlyoffice/document-editor-react";

export default function ManuscriptEditor({manuscriptId, userRole}) {
  const [config, setConfig] = useState(null);
  
  useEffect(() => {
    // Fetch configuration from our API
    fetchEditorConfig(manuscriptId, userRole)
      .then(setConfig);
  }, [manuscriptId, userRole]);

  return config ? (
    <DocumentEditor
      id="manuscriptEditor"
      documentServerUrl="http://localhost/"
      config={config}
    />
  ) : <LoadingSpinner />;
}
```

### Key Features to Implement
1. **Role-based permissions**: Different access for authors vs editors
2. **Document versioning**: Track changes and revisions
3. **Real-time collaboration**: Multiple users editing simultaneously
4. **Save callbacks**: Update database when documents change
5. **Comment system**: External comment management
6. **Review workflows**: Manuscript approval processes

### Security Implementation
- JWT tokens with user-specific permissions
- Supabase Row Level Security (RLS)
- Document access validation
- Secure file storage with signed URLs
- Production-ready authentication

---

## 📝 Next Implementation Steps

### Phase 1: Basic Integration
1. Install `@onlyoffice/document-editor-react`
2. Create Next.js API routes for configuration
3. Implement JWT token generation
4. Connect with Supabase storage

### Phase 2: Advanced Features
1. Role-based permissions (author/editor)
2. Document save callbacks
3. Version history tracking
4. Real-time collaboration features

### Phase 3: Production Ready
1. Security hardening
2. Error handling and logging
3. Performance optimization
4. User interface enhancements

---

## ⚙️ Advanced Parameters (API Usage)

### Configuration Structure Overview
OnlyOffice configuration has four main sections:
1. **config** - Platform type, document display, document type
2. **document** - Document-specific parameters  
3. **editorConfig** - Editor interface parameters
4. **events** - Actions triggered during document interactions

### editorConfig Parameters

#### Core Interface Settings
```javascript
"editorConfig": {
  "mode": "edit",           // "edit" or "view" (default: "edit")
  "lang": "en",             // Interface language (default: "en")
  "callbackUrl": "https://example.com/callback",  // Required for saves
  "user": {
    "id": "user-unique-id",
    "name": "Full User Name", 
    "image": "https://example.com/avatar.png"  // Optional avatar
  }
}
```

#### Co-editing Configuration
```javascript
"coEditing": {
  "mode": "fast",          // "fast" or "strict" (default: "fast")
  "change": true           // Allow users to change mode (default: true)
}
```

#### Regional Settings
```javascript
"regional": "en-US"        // Currency/date format (en-US, fr-FR, etc.)
```

### Customization Parameters

#### Interface Controls
```javascript
"customization": {
  // Toolbar settings
  "compactToolbar": false,    // Full toolbar (false) or compact (true)
  
  // Auto-functionality
  "autosave": true,          // Enable autosave (default: true)
  
  // UI Elements
  "chat": true,              // Show chat button (default: true) [DEPRECATED - use document.permissions.chat]
  "hideRightMenu": false,    // Hide right panel (default: false)
  
  // Visual enhancements
  "zoom": 100,               // Default zoom level
  
  // Advanced UI
  "showHorizontalScroll": true,  // Show horizontal scrollbar
  "showVerticalScroll": true,    // Show vertical scrollbar
  "featuresTips": true           // Show feature tips
}
```

#### Mobile Editor Parameters
Only these parameters work on mobile:
- close
- feedback  
- goback
- help
- logo
- macrosMode
- mobileForceView

### Events Configuration

#### Key Event Handlers
```javascript
"events": {
  // Mode switching
  "onRequestEditRights": function() {
    // User clicks "Edit" button - reinitialize editor in edit mode
  },
  
  // Bookmark handling
  "onMakeActionLink": function(data) {
    // User requests bookmark link - call setActionLink method
  },
  
  // Notifications
  "onRequestSendNotify": function(data) {
    // User mentioned in comment - data contains message and emails
  },
  
  // Document lifecycle
  "onDocumentReady": function() {
    // Document loaded and ready for editing
  },
  
  "onInfo": function(data) {
    // General info messages
  },
  
  "onWarning": function(data) {
    // Warning messages
  },
  
  "onError": function(data) {
    // Error handling
  }
}
```

### Document Parameters

#### File Information
```javascript
"document": {
  "fileType": "docx",
  "key": "unique-document-key",
  "title": "Document Title.docx",
  "url": "https://example.com/document.docx"
}
```

#### Permissions Control
```javascript
"permissions": {
  "edit": true,              // Allow editing
  "download": true,          // Allow download  
  "review": true,            // Allow review mode
  "comment": true,           // Allow comments
  "print": true,             // Allow printing
  "chat": true,              // Allow chat functionality
  "fillForms": true,         // Allow form filling
  "modifyFilter": true,      // Allow filter modifications
  "modifyContentControl": true  // Allow content control modifications
}
```

### Implementation Considerations for Manuscript System

#### Author Configuration
```javascript
const authorConfig = {
  editorConfig: {
    mode: "edit",
    user: {
      id: authorId,
      name: authorName
    },
    customization: {
      autosave: true,
      compactToolbar: false,  // Full toolbar for authors
      hideRightMenu: false    // Show all panels
    }
  },
  document: {
    permissions: {
      edit: true,
      download: true,
      review: true,
      comment: true,
      print: true,
      chat: true
    }
  }
};
```

#### Editor/Reviewer Configuration  
```javascript
const editorConfig = {
  editorConfig: {
    mode: "edit",
    user: {
      id: editorId,
      name: editorName
    },
    customization: {
      autosave: true,
      compactToolbar: true,   // Compact toolbar for reviewers
      hideRightMenu: false
    }
  },
  document: {
    permissions: {
      edit: true,             // Can edit for suggestions
      download: false,        // Restrict download
      review: true,           // Primary function
      comment: true,          // Primary function
      print: false,           // Restrict printing
      chat: true
    }
  }
};
```

#### View-Only Configuration
```javascript
const viewOnlyConfig = {
  editorConfig: {
    mode: "view",             // View-only mode
    customization: {
      compactToolbar: true,   // Minimal UI
      hideRightMenu: true
    }
  },
  document: {
    permissions: {
      edit: false,
      download: false,
      review: false,
      comment: false,
      print: false,
      chat: false
    }
  }
};
```

### Browser Storage Behavior
⚠️ **Important**: Many customization settings are stored in browser localStorage:
- `compactToolbar` setting
- `hideRightMenu` setting  
- `autosave` setting
- `zoom` level

**Impact**: User changes in the editor interface will override server-sent parameters!

### Advanced Features
- **Integration Mode**: For external connectors
- **Plugin Integration**: Custom plugins support
- **Branding**: Custom logos and company information
- **Theme Support**: Light/dark themes
- **Locale Support**: Full internationalization

### Performance Considerations
- Use `compactToolbar: true` for mobile/small screens
- Consider `hideRightMenu: true` for focused editing
- Optimize `zoom` levels for different screen sizes
- Enable `featuresTips: false` for experienced users

### Security Parameters
- Set appropriate `permissions` for user roles
- Use `callbackUrl` for secure document saves
- Implement proper `user` identification
- Consider `download` and `print` restrictions for sensitive documents

---

## 📄 Document Configuration (config/document)

### Core Document Parameters
```javascript
"document": {
  // Required parameters
  "fileType": "docx",                    // File extension (lowercase, 50+ supported)
  "key": "unique-doc-key-123",           // Max 128 chars, regenerate after each edit
  "url": "https://example.com/doc.docx", // Absolute URL to document
  "title": "Document Title.docx",        // Max 128 chars, used for display/download
  
  // Optional parameters
  "isForm": true,                        // PDF form detection (default: true)
  "referenceData": {                     // Unique file identification
    "fileKey": "persistent-file-id",
    "instanceId": "system-instance-id"
  }
}
```

### Document Key Requirements
⚠️ **Critical**: Document `key` must be:
- Unique for each document
- Max 128 characters
- Only: `0-9`, `a-z`, `A-Z`, `-`, `.`, `_`, `=`
- **Regenerated after each edit** for proper versioning

### Supported File Types (50+ extensions)
- **Documents**: docx, doc, odt, txt, rtf, pdf
- **Spreadsheets**: xlsx, xls, ods, csv
- **Presentations**: pptx, ppt, odp
- **Forms**: PDF forms with fillable fields

---

## 📋 Document Info Configuration

### Document Metadata
```javascript
"document": {
  "info": {
    "owner": "Document Creator Name",      // Document creator
    "folder": "Manuscripts/Drafts",       // Storage location path
    "uploaded": "2024-01-15 2:30 PM",     // Upload timestamp
    "favorite": false,                     // Favorite status
    
    "sharingSettings": [{                  // Sharing permissions
      "user": "Editor Name",
      "permissions": "Full Access",        // "Full Access", "Read Only", etc.
      "isLink": false                      // Use link icon instead of user icon
    }]
  }
}
```

### Deprecated Parameters (v5.4+)
❌ No longer use:
- `author` - Use `info.owner` instead
- `created` - Use `info.uploaded` instead

---

## 🔒 Document Permissions Configuration

### Complete Permissions Control
```javascript
"document": {
  "permissions": {
    // Core editing permissions
    "edit": true,                    // Allow document editing (default: true)
    "review": true,                  // Allow review mode (default: same as edit)
    "comment": true,                 // Allow commenting (default: same as edit)
    "fillForms": true,               // Allow form filling (default: same as edit/review)
    
    // Document actions
    "download": true,                // Allow download (default: true)
    "print": true,                   // Allow printing (default: true)
    "copy": true,                    // Allow copy to clipboard (default: true)
    
    // UI features
    "chat": true,                    // Enable chat functionality (default: true)
    "changeHistory": false,          // Show Restore button (default: false)
    "protect": true,                 // Show Protection tab (default: true)
    
    // Group-based permissions (advanced)
    "commentGroups": ["editors"],    // Groups allowed to comment
    "reviewGroups": ["reviewers"],   // Groups allowed to review
    "userInfoGroups": ["admins"]     // Groups with user info access
  }
}
```

### Role-Based Permission Presets

#### Author Permissions
```javascript
const authorPermissions = {
  edit: true,
  download: true,
  print: true,
  copy: true,
  review: true,
  comment: true,
  chat: true,
  fillForms: true,
  protect: true,
  changeHistory: false
};
```

#### Editor/Reviewer Permissions
```javascript
const editorPermissions = {
  edit: true,          // Can make suggestions
  download: false,     // Restrict download
  print: false,        // Restrict printing  
  copy: true,
  review: true,        // Primary function
  comment: true,       // Primary function
  chat: true,
  fillForms: false,
  protect: false,      // Hide protection features
  changeHistory: false
};
```

#### View-Only Permissions
```javascript
const viewOnlyPermissions = {
  edit: false,
  download: false,
  print: false,
  copy: false,
  review: false,
  comment: false,
  chat: false,
  fillForms: false,
  protect: false,
  changeHistory: false
};
```

---

## ⚙️ Extended Editor Configuration

### Additional Editor Parameters
```javascript
"editorConfig": {
  // Document creation
  "createUrl": "https://example.com/create-new",  // URL for new document creation
  
  // Action links (bookmarks)
  "actionLink": {                                 // Data from editing service
    // Contains specific action information
  },
  
  // Recent documents menu
  "recent": [{
    "folder": "Recent Files",
    "title": "Last Document.docx",
    "url": "https://example.com/recent/doc.docx"
  }],
  
  // Document templates
  "templates": [{
    "image": "https://example.com/template-preview.png",
    "title": "Manuscript Template",
    "url": "https://example.com/templates/manuscript.docx"
  }],
  
  // Regional formatting
  "region": "en-US"                               // Currency, date, measurement formats
}
```

### Templates Configuration for Manuscript System
```javascript
const manuscriptTemplates = [
  {
    image: "/templates/academic-paper-preview.png",
    title: "Academic Paper Template",
    url: "/api/templates/academic-paper"
  },
  {
    image: "/templates/book-chapter-preview.png", 
    title: "Book Chapter Template",
    url: "/api/templates/book-chapter"
  },
  {
    image: "/templates/research-article-preview.png",
    title: "Research Article Template", 
    url: "/api/templates/research-article"
  }
];
```

---

## 🎨 Branding and Customization

### Standard Branding Options
```javascript
"customization": {
  // Company branding
  "logo": {
    "image": "https://example.com/logo.png",
    "imageEmbedded": "base64-image-data",
    "url": "https://company.com"
  },
  
  // Contact information
  "customer": {
    "info": "Manuscript Publishing Platform",
    "logo": "https://example.com/customer-logo.png",
    "name": "PublishHub",
    "address": "123 Publishing St, Editor City",
    "mail": "support@publishhub.com",
    "phone": "+1-555-PUBLISH",
    "www": "https://publishhub.com"
  },
  
  // UI modifications
  "compactToolbar": false,
  "hideRightMenu": false,
  "autosave": true,
  "zoom": 100,
  "anonymous": {
    "request": false,              // Disable anonymous access
    "label": "Guest User"
  }
}
```

### White Label Customization (Enterprise)
⚠️ **License Required**: Extended white label license needed

```javascript
"customization": {
  // Custom loader
  "loaderLogo": "https://example.com/custom-loader.png",
  "loaderName": "Loading your manuscript...",
  
  // Complete UI control
  "layout": {
    "toolbar": {
      "file": false,           // Hide File tab
      "home": true,            // Show Home tab
      "view": true             // Show View tab
    },
    "header": {
      "visible": false         // Hide header completely
    },
    "leftPanel": {
      "visible": true          // Control left panel
    }
  },
  
  // Advanced customization
  "about": false,              // Hide About menu
  "feedback": false,           // Hide feedback options
  "help": false               // Hide help button
}
```

### Manuscript System Branding Example
```javascript
const manuscriptBranding = {
  logo: {
    image: "/branding/manuscript-logo.png",
    url: "https://manuscript-platform.com"
  },
  customer: {
    info: "Professional Manuscript Publishing",
    name: "ManuscriptPro",
    address: "456 Academic Blvd, Research City", 
    mail: "support@manuscriptpro.com",
    www: "https://manuscriptpro.com"
  },
  anonymous: {
    request: false  // Authors/editors must be authenticated
  },
  feedback: {
    url: "https://manuscriptpro.com/feedback",
    visible: true
  }
};
```

---

## 💡 Implementation Best Practices

### Document Key Strategy
```javascript
// Generate unique keys for manuscript system
function generateDocumentKey(manuscriptId, version = null) {
  const base = `manuscript-${manuscriptId}`;
  const timestamp = Date.now();
  const versionSuffix = version ? `-v${version}` : '';
  return `${base}-${timestamp}${versionSuffix}`.substring(0, 128);
}

// Regenerate key after each edit
function onDocumentSaved(manuscriptId) {
  const newKey = generateDocumentKey(manuscriptId);
  // Update database with new key
  updateManuscriptKey(manuscriptId, newKey);
}
```

### Permission Management
```javascript
class ManuscriptPermissions {
  static getPermissions(userRole, manuscriptStatus) {
    const basePermissions = {
      author: {
        edit: true, download: true, print: true, 
        review: true, comment: true, chat: true
      },
      editor: {
        edit: true, download: false, print: false,
        review: true, comment: true, chat: true
      },
      viewer: {
        edit: false, download: false, print: false,
        review: false, comment: false, chat: false
      }
    };
    
    // Modify based on manuscript status
    if (manuscriptStatus === 'submitted') {
      basePermissions.author.edit = false;  // Lock after submission
    }
    
    return basePermissions[userRole];
  }
}
```

### Configuration Factory
```javascript
class OnlyOfficeConfigBuilder {
  constructor(manuscriptId, userId, userRole) {
    this.manuscriptId = manuscriptId;
    this.userId = userId;
    this.userRole = userRole;
  }
  
  async build() {
    const manuscript = await this.getManuscript();
    const user = await this.getUser();
    
    return {
      document: {
        fileType: manuscript.fileType,
        key: this.generateKey(),
        url: manuscript.documentUrl,
        title: manuscript.title,
        permissions: ManuscriptPermissions.getPermissions(
          this.userRole, 
          manuscript.status
        ),
        info: {
          owner: manuscript.author.name,
          folder: "Manuscripts",
          uploaded: manuscript.createdAt
        }
      },
      editorConfig: {
        mode: this.userRole === 'viewer' ? 'view' : 'edit',
        lang: user.preferredLanguage || 'en',
        user: {
          id: this.userId,
          name: user.name,
          image: user.avatar
        },
        customization: this.getCustomization(),
        templates: this.getTemplates()
      }
    };
  }
}
```

## Advanced Configuration Options

### Embedded Editor Configuration
For embedded document viewing/editing scenarios:

```javascript
editorConfig: {
  embedded: {
    embedUrl: "https://yoursite.com/manuscripts/embed/123",
    fullscreenUrl: "https://yoursite.com/manuscripts/123/fullscreen",
    saveUrl: "https://yoursite.com/manuscripts/123/download",
    shareUrl: "https://yoursite.com/manuscripts/123/share",
    toolbarDocked: "top"  // or "bottom"
  }
}
```

**Use Cases:**
- Embedding manuscript preview in dashboards
- Providing save/share functionality
- Controlling toolbar placement

### Plugins Configuration
OnlyOffice supports plugins for extended functionality:

```javascript
editorConfig: {
  plugins: {
    autostart: ["asc.{7327FC95-16DA-41D9-9AF2-0E7F449F6800}"], // Auto-launch plugins
    options: {
      "all": { 
        globalSetting: "value"  // Global plugin options
      },
      "asc.{38E022EA-AD92-45FC-B22B-49DF39746DB4}": {
        pluginSpecificSetting: "value"  // Plugin-specific options
      }
    },
    pluginsData: [
      "https://yoursite.com/plugins/manuscript-tools/config.json"
    ]
  }
}
```

**Available Plugin Types:**
- Grammar/spell checkers
- Reference managers
- Citation tools
- Collaboration enhancers

### Events Configuration
Events provide extensive customization and integration hooks:

```javascript
const editorConfig = {
  events: {
    // Lifecycle Events
    onAppReady: () => {
      console.log("Editor initialized");
      // Initialize custom features
    },
    
    onDocumentReady: () => {
      console.log("Document loaded");
      // Set document-specific settings
    },
    
    // User Interaction Events
    onRequestEditRights: () => {
      // Handle permission changes
      // Check if user can edit this manuscript
      return checkManuscriptEditPermissions();
    },
    
    onRequestClose: () => {
      // Handle editor closing
      // Save any pending changes
      saveManuscriptState();
      window.close();
    },
    
    onRequestRename: (event) => {
      // Handle manuscript renaming
      updateManuscriptTitle(event.data);
    },
    
    onRequestSaveAs: (event) => {
      // Handle save-as operations
      createManuscriptCopy(event.data);
    },
    
    // Collaboration Events
    onCollaborativeChanges: () => {
      // Track collaborative editing
      logCollaborationActivity();
    },
    
    onRequestUsers: (event) => {
      // Provide user list for mentions/sharing
      return getManuscriptCollaborators();
    },
    
    onRequestSendNotify: (event) => {
      // Handle user mentions in comments
      sendNotificationToUser(event.data);
    },
    
    // Error Handling
    onError: (event) => {
      console.error("Editor error:", event.data);
      // Log error and provide user feedback
      handleEditorError(event.data);
    },
    
    onWarning: (event) => {
      console.warn("Editor warning:", event.data);
      // Handle warnings gracefully
    }
  }
};
```

**Key Event Categories:**
1. **Lifecycle**: App/document ready, plugin loading
2. **User Interaction**: Edit requests, close, rename, save-as
3. **Collaboration**: Changes tracking, user management, notifications
4. **Error Handling**: Errors, warnings, user action requirements

**Implementation Benefits:**
- Deep integration with manuscript workflow
- Real-time collaboration tracking
- Custom permission handling
- Enhanced error management
- User experience customization

## Next Steps for Implementation

Based on this comprehensive learning, the implementation phases will be:

### Phase 1: Basic Integration
1. Install React component: `npm install @onlyoffice/document-editor-react`
2. Create Next.js API routes for editor configuration
3. Set up JWT authentication
4. Create basic manuscript editing component

### Phase 2: Database Integration  
1. Add manuscript file storage (Supabase Storage)
2. Implement document versioning
3. Create user permission system
4. Set up collaboration tracking

### Phase 3: Advanced Features
1. Real-time collaboration
2. Comment and review systems  
3. Version comparison
4. Integration with existing manuscript workflow
5. Plugin integration for manuscript-specific tools
6. Event-driven workflow automation

### Phase 4: Production Optimization
1. Performance optimization
2. Error handling and monitoring
3. Security hardening
4. User experience polish
5. Embedded editor for dashboard previews

## API Methods for Programmatic Control

OnlyOffice provides API methods for advanced editor control and automation:

### Document Manipulation Methods
```javascript
// Insert images programmatically
window.docEditor.insertImage({
  "c": "image",
  "images": [
    {
      "fileType": "png",
      "url": "https://example.com/image.png"
    }
  ]
});

// Download document in specific format
window.docEditor.downloadAs("pdf");

// Refresh file version without reloading
window.docEditor.refreshFile({
  "c": "refresh",
  "url": "https://example.com/updated-document.docx",
  "key": "new-document-key-123"
});
```

### Collaboration Methods
```javascript
// Update sharing settings
window.docEditor.setSharingSettings({
  "c": "setSharingSettings", 
  "sharingSettings": [
    {
      "permissions": "Full Access",
      "user": "John Smith"
    }
  ]
});

// Set user list for mentions/permissions
window.docEditor.setUsers({
  "c": "setUsers",
  "users": [
    {
      "email": "john@example.com",
      "id": "user123",
      "name": "John Smith"
    }
  ]
});

// Show document version history
window.docEditor.setHistoryData({
  "c": "setHistoryData",
  "key": "document-key",
  "version": 2,
  "url": "https://example.com/document-v2.docx"
});
```

### Editor Control Methods
```javascript
// Destroy editor instance
window.docEditor.destroyEditor();

// Request editor close with save check
window.docEditor.requestClose();

// Disable editing
window.docEditor.denyEditingRights("Document is locked for editing");

// Show tooltip messages
window.docEditor.showMessage("Changes saved successfully");
```

### Manuscript-Specific Use Cases
```javascript
// For manuscript submission workflow
const manuscriptMethods = {
  // Lock manuscript after submission
  lockForReview: () => {
    window.docEditor.denyEditingRights("Manuscript submitted for review");
  },
  
  // Add editor/reviewer to collaboration
  addReviewer: (reviewer) => {
    window.docEditor.setUsers({
      "c": "setUsers",
      "users": [reviewer]
    });
  },
  
  // Export final manuscript
  exportFinal: (format) => {
    window.docEditor.downloadAs(format || "pdf");
  },
  
  // Show submission status
  showStatus: (message) => {
    window.docEditor.showMessage(message);
  }
};
```

**Key Method Categories:**
1. **Document Manipulation**: insertImage, downloadAs, refreshFile
2. **Collaboration & Sharing**: setSharingSettings, setUsers, setHistoryData  
3. **Editor Control**: destroyEditor, requestClose, denyEditingRights, showMessage
4. **Special Operations**: setRequestedDocument, startFilling, setReferenceData

**Implementation Notes:**
- Methods are called on the `docEditor` instance
- Most methods use command-based parameters (`"c": "methodName"`)
- Security tokens may be required for sensitive operations
- Methods integrate with event-driven workflows

For comprehensive method documentation: https://api.onlyoffice.com/docs/docs-api/usage-api/methods

## Callback Handler for Document Synchronization

The callback handler is crucial for synchronizing document changes and managing collaborative editing:

### Callback Configuration
```javascript
// In editor config
editorConfig: {
  callbackUrl: "https://yoursite.com/api/onlyoffice/callback"
}
```

### Callback Request Structure
OnlyOffice sends POST requests with this JSON structure:
```json
{
  "key": "manuscript-123-key",
  "status": 2,
  "users": ["user123", "user456"],
  "url": "https://docserver.com/cache/files/manuscript-123.docx",
  "actions": [
    {
      "type": 1,
      "userid": "user123"
    }
  ]
}
```

### Status Codes
- **1**: Document editing (user connected/disconnected)
- **2**: Document ready for saving (download and save)
- **3**: Document saving error
- **4**: Document closed without changes
- **6**: Document force-saved (download and save)
- **7**: Force saving error

### Next.js API Route Implementation
```javascript
// pages/api/onlyoffice/callback.js
import { createReadStream } from 'fs';
import { supabase } from '../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 1 });
  }

  const { key, status, url, users } = req.body;
  
  try {
    // Status 2 or 6: Document ready for saving
    if (status === 2 || status === 6) {
      // Download document from OnlyOffice
      const response = await fetch(url);
      const documentBuffer = await response.buffer();
      
      // Extract manuscript ID from key
      const manuscriptId = key.split('-')[1];
      
      // Save to Supabase Storage
      const { data, error } = await supabase.storage
        .from('manuscripts')
        .upload(`${manuscriptId}/document.docx`, documentBuffer, {
          upsert: true
        });
      
      if (error) throw error;
      
      // Update manuscript record
      await supabase
        .from('manuscripts')
        .update({
          updated_at: new Date().toISOString(),
          last_edited_by: users[0],
          status: status === 6 ? 'force_saved' : 'saved'
        })
        .eq('id', manuscriptId);
      
      console.log(`Manuscript ${manuscriptId} saved successfully`);
    }
    
    // Status 1: User activity tracking
    if (status === 1) {
      await supabase
        .from('manuscript_activity')
        .insert({
          manuscript_id: key.split('-')[1],
          users: users,
          activity_type: 'editing',
          timestamp: new Date().toISOString()
        });
    }
    
    // Always return success
    return res.status(200).json({ error: 0 });
    
  } catch (error) {
    console.error('Callback handler error:', error);
    return res.status(200).json({ error: 0 }); // Still return success to avoid editor errors
  }
}
```

### Manuscript-Specific Callback Handling
```javascript
class ManuscriptCallbackHandler {
  static async handleCallback(callbackData) {
    const { key, status, url, users, actions } = callbackData;
    const manuscriptId = this.extractManuscriptId(key);
    
    switch (status) {
      case 2: // Document ready for saving
        await this.saveManuscript(manuscriptId, url, users);
        await this.notifyAuthorEditor(manuscriptId, 'document_saved');
        break;
        
      case 1: // User activity
        await this.trackCollaboration(manuscriptId, users, actions);
        break;
        
      case 6: // Force save
        await this.saveManuscript(manuscriptId, url, users);
        await this.createVersion(manuscriptId);
        break;
        
      case 3: // Save error
      case 7: // Force save error
        await this.handleSaveError(manuscriptId, status);
        break;
    }
  }
  
  static async saveManuscript(manuscriptId, documentUrl, users) {
    // Download and save logic
    const documentData = await fetch(documentUrl);
    const buffer = await documentData.buffer();
    
    // Save to storage and update database
    await this.saveToStorage(manuscriptId, buffer);
    await this.updateManuscriptRecord(manuscriptId, users);
  }
  
  static async trackCollaboration(manuscriptId, users, actions) {
    // Track who is editing, commenting, etc.
    const activityLog = {
      manuscript_id: manuscriptId,
      active_users: users,
      actions: actions,
      timestamp: new Date()
    };
    
    await this.logActivity(activityLog);
  }
}
```

**Key Implementation Notes:**
- **Always return `{"error": 0}`** to prevent editor errors
- Handle status 2 and 6 for document saving
- Use status 1 for collaboration tracking
- Download documents from provided URL
- Update database records accordingly
- Implement error handling but still return success

**Security Considerations:**
- Validate callback authenticity (JWT tokens)
- Sanitize file names and paths
- Implement proper access controls
- Log all callback activities

For comprehensive callback documentation: https://api.onlyoffice.com/docs/docs-api/usage-api/callback-handler

## Command Service API for Document Management

The Command Service API provides server-side document management capabilities:

### Command Service Endpoint
```javascript
const COMMAND_SERVICE_URL = "https://your-onlyoffice-server/coauthoring/CommandService.ashx";
```

### Available Commands
1. **info** - Get document status and active users
2. **forcesave** - Force save document without closing
3. **drop** - Disconnect specific users from editing
4. **version** - Get OnlyOffice server version
5. **license** - Retrieve server license info
6. **meta** - Update document metadata

### Command Request Structure
```javascript
async function sendCommand(command, key, additionalParams = {}) {
  const payload = {
    c: command,
    key: key,
    ...additionalParams
  };
  
  // Sign with JWT
  const token = generateJWT(payload, JWT_SECRET);
  
  const response = await fetch(COMMAND_SERVICE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ token })
  });
  
  return response.json();
}
```

### Manuscript Management Examples
```javascript
class ManuscriptCommandService {
  // Get manuscript editing status
  static async getManuscriptStatus(manuscriptId) {
    return await sendCommand('info', `manuscript-${manuscriptId}-key`);
  }
  
  // Force save manuscript
  static async forceSaveManuscript(manuscriptId) {
    return await sendCommand('forcesave', `manuscript-${manuscriptId}-key`, {
      userdata: JSON.stringify({
        manuscriptId,
        action: 'force_save',
        timestamp: new Date().toISOString()
      })
    });
  }
  
  // Disconnect user from editing
  static async disconnectUser(manuscriptId, userId) {
    return await sendCommand('drop', `manuscript-${manuscriptId}-key`, {
      users: [userId]
    });
  }
  
  // Update manuscript metadata
  static async updateMetadata(manuscriptId, metadata) {
    return await sendCommand('meta', `manuscript-${manuscriptId}-key`, {
      meta: {
        title: metadata.title,
        author: metadata.author,
        lastModified: new Date().toISOString()
      }
    });
  }
}
```

### Integration with Manuscript Workflow
```javascript
// Force save before submission
app.post('/api/manuscripts/:id/submit', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Force save the document
    const saveResult = await ManuscriptCommandService.forceSaveManuscript(id);
    
    if (saveResult.error === 0) {
      // Update manuscript status
      await supabase
        .from('manuscripts')
        .update({ status: 'submitted' })
        .eq('id', id);
      
      res.json({ success: true, message: 'Manuscript submitted' });
    } else {
      throw new Error(`Force save failed: ${saveResult.error}`);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check who's editing before allowing access
app.get('/api/manuscripts/:id/editing-status', async (req, res) => {
  const { id } = req.params;
  
  try {
    const status = await ManuscriptCommandService.getManuscriptStatus(id);
    res.json({
      isBeingEdited: status.error === 0,
      activeUsers: status.users || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Detailed Command Specifications

#### 1. **info** Command
```javascript
// Get document status and active users
const infoResponse = await sendCommand('info', 'manuscript-123-key');
// Returns: { error: 0, key: "manuscript-123-key", users: ["user1", "user2"] }
```
- **Purpose**: Check who's currently editing, document status
- **Returns**: Active user list, document key
- **Use Case**: Before allowing new editors, monitoring collaboration

#### 2. **forcesave** Command  
```javascript
// Force save without closing document
const saveResponse = await sendCommand('forcesave', 'manuscript-123-key', {
  userdata: JSON.stringify({ action: 'submission_save' })
});
// Returns: { error: 0, key: "manuscript-123-key" }
```
- **Purpose**: Save document while editing continues
- **Use Case**: Before submission, periodic auto-saves, critical checkpoints

#### 3. **drop** Command
```javascript
// Disconnect specific users from editing
const dropResponse = await sendCommand('drop', 'manuscript-123-key', {
  users: ["problematic-user-id"]
});
// Returns: { error: 0, key: "manuscript-123-key" }
```
- **Purpose**: Remove users from active editing (they can still view)
- **Use Case**: Maintenance, conflict resolution, permission changes

#### 4. **version** Command
```javascript
// Get OnlyOffice server version
const versionResponse = await sendCommand('version');
// Returns: { error: 0, version: "7.5.1" }
```
- **Purpose**: Check server version for compatibility
- **Use Case**: Feature availability checks, debugging

#### 5. **license** Command  
```javascript
// Get license information
const licenseResponse = await sendCommand('license');
// Returns detailed license info including expiration, user limits
```
- **Purpose**: Check license status, user limits, trial status
- **Use Case**: User capacity planning, license compliance

#### 6. **getForgottenList** Command
```javascript
// Get list of forgotten document keys
const forgottenResponse = await sendCommand('getForgottenList');
// Returns: { error: 0, keys: ["forgotten-key-1", "forgotten-key-2"] }
```
- **Purpose**: Retrieve abandoned/forgotten document identifiers
- **Use Case**: Cleanup operations, orphaned document management

### Manuscript Workflow Integration Examples
```javascript
class ManuscriptWorkflowService {
  // Check if manuscript is being edited before deletion
  static async safeDeleteManuscript(manuscriptId) {
    const status = await sendCommand('info', `manuscript-${manuscriptId}-key`);
    
    if (status.users && status.users.length > 0) {
      throw new Error(`Cannot delete: ${status.users.length} users currently editing`);
    }
    
    // Safe to delete
    await this.deleteManuscript(manuscriptId);
  }
  
  // Force save and disconnect all users for maintenance
  static async prepareForMaintenance(manuscriptId) {
    // Force save current state
    await sendCommand('forcesave', `manuscript-${manuscriptId}-key`);
    
    // Get active users
    const status = await sendCommand('info', `manuscript-${manuscriptId}-key`);
    
    // Disconnect all users
    if (status.users && status.users.length > 0) {
      await sendCommand('drop', `manuscript-${manuscriptId}-key`, {
        users: status.users
      });
    }
  }
  
  // Check server compatibility
  static async checkServerCompatibility() {
    const version = await sendCommand('version');
    const requiredVersion = '7.0.0';
    
    if (this.compareVersions(version.version, requiredVersion) < 0) {
      console.warn(`Server version ${version.version} is below required ${requiredVersion}`);
    }
  }
}
```

**Key Use Cases:**
- **Force Save**: Before manuscript submission or critical operations
- **User Management**: Disconnect users during maintenance or conflicts  
- **Status Checking**: Monitor active editing sessions
- **Metadata Updates**: Keep document info synchronized
- **Maintenance**: Prepare documents for system updates
- **Cleanup**: Manage orphaned/forgotten documents

**Error Codes:**
- 0: Success
- 1: Document key missing
- 2: Callback URL incorrect
- 3: Internal server error
- 4: Document not found
- 5: Command not supported
- 6: Invalid token

For comprehensive Command Service documentation: https://api.onlyoffice.com/docs/docs-api/additional-api/command-service

## Conversion API for Document Format Transformation

The Conversion API enables document format conversion between different file types:

### Conversion API Endpoint
```javascript
const CONVERSION_API_URL = "https://your-onlyoffice-server/ConvertService.ashx";
```

### Basic Conversion Request
```javascript
async function convertDocument(fileUrl, fromFormat, toFormat, documentKey) {
  const conversionRequest = {
    url: fileUrl,
    filetype: fromFormat,
    outputtype: toFormat,
    key: documentKey
  };
  
  const response = await fetch(CONVERSION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'  // For JSON response
    },
    body: JSON.stringify(conversionRequest)
  });
  
  return response.json();
}
```

### Manuscript Conversion Service
```javascript
class ManuscriptConversionService {
  // Convert manuscript to PDF for final submission
  static async convertToPDF(manuscriptId) {
    const manuscript = await this.getManuscript(manuscriptId);
    
    const result = await convertDocument(
      manuscript.documentUrl,
      'docx',
      'pdf',
      `manuscript-${manuscriptId}-pdf-${Date.now()}`
    );
    
    if (result.endConvert && result.error === 0) {
      // Save PDF URL to manuscript record
      await supabase
        .from('manuscripts')
        .update({ pdf_url: result.fileUrl })
        .eq('id', manuscriptId);
      
      return result.fileUrl;
    }
    
    throw new Error(`Conversion failed: Error ${result.error}`);
  }
  
  // Convert uploaded files to standardized format
  static async standardizeFormat(fileUrl, originalFormat) {
    const targetFormat = 'docx'; // Standardize to DOCX
    
    if (originalFormat === targetFormat) {
      return fileUrl; // Already in target format
    }
    
    const result = await convertDocument(
      fileUrl,
      originalFormat,
      targetFormat,
      `convert-${Date.now()}`
    );
    
    return result.endConvert ? result.fileUrl : fileUrl;
  }
  
  // Generate manuscript preview thumbnail
  static async generateThumbnail(manuscriptId) {
    const manuscript = await this.getManuscript(manuscriptId);
    
    const conversionRequest = {
      url: manuscript.documentUrl,
      filetype: 'docx',
      outputtype: 'png',
      key: `thumb-${manuscriptId}-${Date.now()}`,
      thumbnail: {
        aspect: 2,  // Keep aspect ratio
        first: true, // Only first page
        width: 300,
        height: 200
      }
    };
    
    const result = await this.performConversion(conversionRequest);
    return result.fileUrl;
  }
}
```

### Advanced Conversion Options
```javascript
// Conversion with custom options
const advancedConversionRequest = {
  url: "https://example.com/document.docx",
  filetype: "docx",
  outputtype: "pdf",
  key: "manuscript-123-final",
  title: "Final Manuscript",
  
  // PDF-specific options
  pdf: {
    watermark: {
      text: "DRAFT - Confidential",
      diagonal: true,
      opacity: 0.3
    }
  },
  
  // Async conversion for large files
  async: true,
  
  // Password protection
  password: "manuscript-access-2024"
};
```

### Conversion Response Handling
```javascript
async function handleConversionResponse(conversionResult) {
  if (conversionResult.error !== 0) {
    const errorMessages = {
      '-1': 'Unknown conversion error',
      '-2': 'Conversion timeout - file too large',
      '-3': 'General conversion error',
      '-4': 'Error downloading source file',
      '-5': 'Incorrect password provided',
      '-8': 'Invalid token',
      '-9': 'Cannot determine output format',
      '-10': 'File size limit exceeded'
    };
    
    throw new Error(errorMessages[conversionResult.error] || `Conversion error: ${conversionResult.error}`);
  }
  
  if (!conversionResult.endConvert) {
    // Async conversion in progress
    console.log(`Conversion progress: ${conversionResult.percent}%`);
    return null; // Check again later
  }
  
  // Conversion completed successfully
  return {
    downloadUrl: conversionResult.fileUrl,
    fileType: conversionResult.fileType,
    completed: true
  };
}
```

### Manuscript Workflow Integration
```javascript
// Convert and archive submitted manuscripts
app.post('/api/manuscripts/:id/archive', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Convert to PDF for archival
    const pdfUrl = await ManuscriptConversionService.convertToPDF(id);
    
    // Generate thumbnail for quick preview
    const thumbnailUrl = await ManuscriptConversionService.generateThumbnail(id);
    
    // Update manuscript record
    await supabase
      .from('manuscripts')
      .update({
        status: 'archived',
        pdf_url: pdfUrl,
        thumbnail_url: thumbnailUrl,
        archived_at: new Date().toISOString()
      })
      .eq('id', id);
    
    res.json({ 
      success: true, 
      pdfUrl, 
      thumbnailUrl,
      message: 'Manuscript archived successfully'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Key Supported Formats:**
- **Text Documents**: docx, doc, pdf, rtf, txt, html, odt
- **Spreadsheets**: xlsx, xls, csv, ods  
- **Presentations**: pptx, ppt, odp
- **Images**: png, jpg, bmp, gif (for thumbnails)

**Common Use Cases:**
- **PDF Generation**: Final manuscript submission copies
- **Format Standardization**: Convert uploads to consistent format
- **Thumbnail Generation**: Document previews for dashboards
- **Archive Creation**: Long-term storage in PDF format
- **Multi-format Distribution**: Provide manuscripts in various formats

**Error Codes Reference:**
- 0: Success
- -1: Unknown error  
- -2: Timeout (large files)
- -4: Download error
- -5: Invalid password
- -8: Invalid token
- -10: Size limit exceeded

For comprehensive Conversion API documentation: https://api.onlyoffice.com/docs/docs-api/additional-api/conversion-api

The learning documented above provides all necessary technical details for successful implementation.</function_results>

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Update learning log with configuration knowledge", "status": "completed", "activeForm": "Updating learning log with configuration knowledge"}]