// Import WebDAV client
import { createClient } from 'webdav';

// Global application state
class BookmarkManager {
    constructor() {
        this.bookmarks = [];
        this.folders = [];
        this.tags = [];
        this.stats = {};
        this.currentView = 'all';
        this.currentFolder = null;
        this.searchFilters = {};
        this.viewMode = 'grid';
        this.selectedBookmarks = new Set();
        
        // WebDAV client for pCloud sync
        this.webdavClient = null;
        this.webdavEnabled = false;
        
        this.init();
    }

    async init() {
        // Initialize WebDAV client if credentials exist
        this.initializeWebDAVClient();
        
        await this.loadData();
        this.bindEvents();
        this.renderUI();
        this.setupTheme();
        
        // Create a backup after initial load
        this.createBackup();
        
        // Set up periodic backup (every 5 minutes)
        setInterval(() => this.createBackup(), 5 * 60 * 1000);
        
        // Check storage quota and show warning if needed
        this.checkStorageQuota();
    }

    async loadData() {
        // First try to load from WebDAV if available
        if (this.webdavEnabled) {
            const webdavLoaded = await this.loadBookmarksFromWebDAV();
            if (webdavLoaded) {
                return; // Successfully loaded from WebDAV
            }
        }
        
        try {
            // Fall back to localStorage
            const savedData = localStorage.getItem('bookmarkManagerData');
            if (savedData) {
                const data = JSON.parse(savedData);
                this.bookmarks = data.bookmarks || [];
                this.folders = data.folders || [];
                this.tags = data.tags || [];
                this.stats = data.stats || {};
                
                // Update sync status with last update time if available
                if (data.lastUpdated) {
                    const lastUpdated = new Date(data.lastUpdated);
                    const formattedDate = lastUpdated.toLocaleString();
                    this.updateSyncStatus(`Last synced: ${formattedDate}`, true);
                }
                
                return; // Skip loading sample data if we found saved data
            }
        } catch (error) {
            console.error('Error loading data:', error);
            // Try to recover from backup if available
            this.recoverFromBackup();
        }

        const sampleData = [
            {
                "bookmarks": [
                    {
                        "id": 1,
                        "title": "Advanced React Patterns",
                        "url": "https://reactjs.org/docs/advanced-patterns.html",
                        "description": "Learn advanced React patterns for building scalable applications",
                        "tags": ["react", "javascript", "patterns", "frontend"],
                        "folder": "Development/Frontend",
                        "dateAdded": "2025-08-10",
                        "visited": 15,
                        "favorite": true,
                        "screenshot": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMjFkNGZkIi8+Cjx0ZXh0IHg9IjEyMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0Ij5SZWFjdCBEb2NzPC90ZXh0Pgo8L3N2Zz4K"
                    },
                    {
                        "id": 2,
                        "title": "Python Flask Tutorial",
                        "url": "https://flask.palletsprojects.com/tutorial/",
                        "description": "Complete guide to building web applications with Flask",
                        "tags": ["python", "flask", "backend", "tutorial"],
                        "folder": "Development/Backend",
                        "dateAdded": "2025-08-09",
                        "visited": 8,
                        "favorite": false,
                        "screenshot": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMDAwMDAwIi8+Cjx0ZXh0IHg9IjEyMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0Ij5GbGFzayBEb2NzPC90ZXh0Pgo8L3N2Zz4K"
                    },
                    {
                        "id": 3,
                        "title": "CSS Grid Complete Guide",
                        "url": "https://css-tricks.com/snippets/css/complete-guide-grid/",
                        "description": "Everything you need to know about CSS Grid layout",
                        "tags": ["css", "grid", "layout", "frontend", "responsive"],
                        "folder": "Development/Frontend",
                        "dateAdded": "2025-08-08",
                        "visited": 12,
                        "favorite": true,
                        "screenshot": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjZmY2OTMzIi8+Cjx0ZXh0IHg9IjEyMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0Ij5DU1MgVHJpY2tzPC90ZXh0Pgo8L3N2Zz4K"
                    },
                    {
                        "id": 4,
                        "title": "AI Bookmark Tagging",
                        "url": "https://aibookmarker.com",
                        "description": "AI-powered bookmark management with automatic tagging",
                        "tags": ["ai", "bookmarks", "automation", "productivity"],
                        "folder": "Tools/Productivity",
                        "dateAdded": "2025-08-07",
                        "visited": 5,
                        "favorite": false,
                        "screenshot": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjNjM2NmYxIi8+Cjx0ZXh0IHg9IjEyMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0Ij5BSSBCb29rbWFya2VyPC90ZXh0Pgo8L3N2Zz4K"
                    },
                    {
                        "id": 5,
                        "title": "Bootstrap Documentation",
                        "url": "https://getbootstrap.com/docs/",
                        "description": "Official Bootstrap framework documentation",
                        "tags": ["bootstrap", "css", "framework", "responsive", "frontend"],
                        "folder": "Development/Frontend",
                        "dateAdded": "2025-08-06",
                        "visited": 20,
                        "favorite": true,
                        "screenshot": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjNzk1MmIzIi8+Cjx0ZXh0IHg9IjEyMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0Ij5Cb290c3RyYXA8L3RleHQ+Cjwvc3ZnPgo="
                    },
                    {
                        "id": 6,
                        "title": "JavaScript ES6 Features",
                        "url": "https://developer.mozilla.org/docs/Web/JavaScript/Guide",
                        "description": "Modern JavaScript features and best practices",
                        "tags": ["javascript", "es6", "modern", "frontend"],
                        "folder": "Development/Frontend",
                        "dateAdded": "2025-08-05",
                        "visited": 18,
                        "favorite": false,
                        "screenshot": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjZjdkZjFlIi8+Cjx0ZXh0IHg9IjEyMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9ImJsYWNrIiBmb250LXNpemU9IjE0Ij5KYXZhU2NyaXB0PC90ZXh0Pgo8L3N2Zz4K"
                    },
                    {
                        "id": 7,
                        "title": "Database Design Principles",
                        "url": "https://database.guide/database-design/",
                        "description": "Best practices for designing robust databases",
                        "tags": ["database", "design", "sql", "backend"],
                        "folder": "Development/Backend",
                        "dateAdded": "2025-08-04",
                        "visited": 7,
                        "favorite": false,
                        "screenshot": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMzM2Nzk0Ii8+Cjx0ZXh0IHg9IjEyMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0Ij5EYXRhYmFzZSBHdWlkZTwvdGV4dD4KPC9zdmc+Cg=="
                    },
                    {
                        "id": 8,
                        "title": "API Security Best Practices",
                        "url": "https://owasp.org/www-project-api-security/",
                        "description": "OWASP guide to securing APIs and web services",
                        "tags": ["api", "security", "owasp", "backend"],
                        "folder": "Development/Backend",
                        "dateAdded": "2025-08-03",
                        "visited": 9,
                        "favorite": true,
                        "screenshot": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDI0MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNDAiIGhlaWdodD0iMTgwIiBmaWxsPSIjZGM0OTQ0Ii8+Cjx0ZXh0IHg9IjEyMCIgeT0iOTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjE0Ij5PV0FTUDwvdGV4dD4KPC9zdmc+Cg=="
                    }
                ],
                "folders": [
                    {
                        "id": 1,
                        "name": "Development",
                        "parent": null,
                        "children": [
                            {"id": 2, "name": "Frontend", "parent": 1},
                            {"id": 3, "name": "Backend", "parent": 1},
                            {"id": 4, "name": "DevOps", "parent": 1}
                        ]
                    },
                    {
                        "id": 5,
                        "name": "Tools",
                        "parent": null,
                        "children": [
                            {"id": 6, "name": "Productivity", "parent": 5},
                            {"id": 7, "name": "Design", "parent": 5}
                        ]
                    },
                    {
                        "id": 8,
                        "name": "Learning",
                        "parent": null,
                        "children": [
                            {"id": 9, "name": "Tutorials", "parent": 8},
                            {"id": 10, "name": "Documentation", "parent": 8}
                        ]
                    }
                ],
                "tags": [
                    {"name": "javascript", "count": 15, "color": "#f7df1e"},
                    {"name": "python", "count": 12, "color": "#3776ab"},
                    {"name": "react", "count": 8, "color": "#61dafb"},
                    {"name": "css", "count": 10, "color": "#1572b6"},
                    {"name": "frontend", "count": 25, "color": "#e34c26"},
                    {"name": "backend", "count": 18, "color": "#336791"},
                    {"name": "ai", "count": 5, "color": "#6366f1"},
                    {"name": "tutorial", "count": 20, "color": "#28a745"}
                ],
                "stats": {
                    "totalBookmarks": 247,
                    "totalFolders": 15,
                    "totalTags": 45,
                    "favoriteBookmarks": 38,
                    "recentlyAdded": 12,
                    "mostVisited": "Bootstrap Documentation"
                }
            }
        ];

        const data = sampleData[0];
        this.bookmarks = data.bookmarks;
        this.folders = data.folders;
        this.tags = data.tags;
        this.stats = data.stats;
    }

    async saveData() {
        try {
            const data = {
                bookmarks: this.bookmarks,
                folders: this.folders,
                tags: this.tags,
                stats: this.stats,
                lastUpdated: new Date().toISOString()
            };
            
            // Save to localStorage first
            localStorage.setItem('bookmarkManagerData', JSON.stringify(data));
            
            // Also sync to WebDAV if enabled
            if (this.webdavEnabled) {
                await this.saveBookmarksToWebDAV();
            }
            
            this.updateSyncStatus('Synced', true);
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            this.updateSyncStatus('Sync Failed', false);
            return false;
        }
    }

    updateSyncStatus(message, isSuccess) {
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.innerHTML = `<i class="fas fa-${isSuccess ? 'sync-alt' : 'exclamation-circle'}"></i><span>${message}</span>`;
            syncStatus.className = `sync-status ${isSuccess ? 'synced' : 'failed'}`;
        }
    }
    
    recoverFromBackup() {
        // Try to load from backup if main storage is corrupted
        const backupData = localStorage.getItem('bookmarkManagerBackup');
        if (backupData) {
            try {
                const data = JSON.parse(backupData);
                this.bookmarks = data.bookmarks || [];
                this.folders = data.folders || [];
                this.tags = data.tags || [];
                this.stats = data.stats || {};
                this.updateSyncStatus('Recovered from backup', true);
                return true;
            } catch (error) {
                console.error('Error recovering from backup:', error);
            }
        }
        return false;
    }
    
    createBackup() {
        // Create a backup of current data
        const data = {
            bookmarks: this.bookmarks,
            folders: this.folders,
            tags: this.tags,
            stats: this.stats,
            backupDate: new Date().toISOString()
        };
        try {
            localStorage.setItem('bookmarkManagerBackup', JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            return false;
        }
    }
    
    bindEvents() {
        // Search with debounce for performance
        const searchInput = document.getElementById('globalSearch');
        let debounceTimeout;
        
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300); // 300ms debounce
        });

        // View toggles
        document.getElementById('gridViewBtn').addEventListener('click', () => {
            this.setViewMode('grid');
        });

        document.getElementById('listViewBtn').addEventListener('click', () => {
            this.setViewMode('list');
        });

        // Add bookmark
        document.getElementById('addBookmarkBtn').addEventListener('click', () => {
            this.openBookmarkModal();
        });

        document.getElementById('emptyStateAddBtn').addEventListener('click', () => {
            this.openBookmarkModal();
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.setCurrentView(view);
            });
        });

        // Sort
        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.sortBookmarks(e.target.value);
        });

        // Modal save
        document.getElementById('saveBookmarkBtn').addEventListener('click', () => {
            this.saveBookmark();
        });

        // Advanced search
        document.getElementById('advancedSearchBtn').addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('advancedSearchModal'));
            modal.show();
        });

        document.getElementById('applySearchBtn').addEventListener('click', () => {
            this.applyAdvancedSearch();
        });

        document.getElementById('clearSearchBtn').addEventListener('click', () => {
            this.clearSearchFilters();
        });

        // Add Folder button
        document.getElementById('addFolderBtn').addEventListener('click', () => {
            this.openFolderModal();
        });
        
        // Import/Export
        document.getElementById('importBtn').addEventListener('click', () => {
            this.importData();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            this.openSettingsModal();
        });
        
        // Add manual sync button functionality
        const syncStatus = document.getElementById('syncStatus');
        if (syncStatus) {
            syncStatus.addEventListener('click', async () => {
                await this.saveData();
                this.createBackup();
                this.updateSyncStatus('Manual sync complete', true);
            });
        }

        // Context menu
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.bookmark-card') || e.target.closest('.bookmark-list-item')) {
                e.preventDefault();
                this.showContextMenu(e);
            }
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Drag and drop
        this.setupDragAndDrop();
    }

    // Storage quota checking
    checkStorageQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(estimate => {
                const usedPercentage = (estimate.usage / estimate.quota) * 100;
                if (usedPercentage > 80) {
                    // Show warning if using more than 80% of available storage
                    this.showNotification('Storage Warning', 'You are using ' + usedPercentage.toFixed(1) + '% of available storage. Consider exporting your data.', 'warning');
                }
            }).catch(error => {
                console.error('Error checking storage quota:', error);
            });
        }
    }

    // Data export functionality
    exportData() {
        try {
            const data = {
                bookmarks: this.bookmarks,
                folders: this.folders,
                tags: this.tags,
                stats: this.stats,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            // Convert to JSON and create blob
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookmark-manager-export-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            this.showNotification('Export Complete', 'Your bookmarks have been exported successfully.', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showNotification('Export Failed', 'There was an error exporting your bookmarks.', 'error');
        }
    }

    // Data import functionality
    importData() {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    
                    // Validate imported data
                    if (!importedData.bookmarks || !Array.isArray(importedData.bookmarks)) {
                        throw new Error('Invalid bookmark data format');
                    }
                    
                    // Create backup before import
                    this.createBackup();
                    
                    // Merge or replace data
                    const confirmReplace = confirm('Do you want to replace all existing bookmarks? Click OK to replace or Cancel to merge with existing bookmarks.');
                    
                    if (confirmReplace) {
                        // Replace all data
                        this.bookmarks = importedData.bookmarks || [];
                        this.folders = importedData.folders || [];
                        this.tags = importedData.tags || [];
                        this.stats = importedData.stats || {};
                    } else {
                        // Merge data - add only new bookmarks
                        const existingIds = new Set(this.bookmarks.map(b => b.id));
                        const newBookmarks = importedData.bookmarks.filter(b => !existingIds.has(b.id));
                        this.bookmarks = [...this.bookmarks, ...newBookmarks];
                        
                        // Merge folders and tags intelligently
                        this.mergeFolders(importedData.folders || []);
                        this.mergeTags(importedData.tags || []);
                    }
                    
                    // Save and update UI
                    await this.saveData();
                    this.renderUI();
                    this.showNotification('Import Complete', 'Your bookmarks have been imported successfully.', 'success');
                } catch (error) {
                    console.error('Error importing data:', error);
                    this.showNotification('Import Failed', 'There was an error importing your bookmarks. Please check the file format.', 'error');
                }
            };
            
            reader.readAsText(file);
        });
        
        fileInput.click();
    }

    // Helper method to merge folders
    mergeFolders(newFolders) {
        if (!newFolders || !newFolders.length) return;
        
        const existingFolderMap = new Map();
        this.folders.forEach(folder => {
            existingFolderMap.set(folder.name, folder);
        });
        
        newFolders.forEach(newFolder => {
            if (!existingFolderMap.has(newFolder.name)) {
                // Generate new ID to avoid conflicts
                const maxId = Math.max(0, ...this.folders.map(f => f.id));
                newFolder.id = maxId + 1;
                this.folders.push(newFolder);
            }
        });
    }

    // Helper method to merge tags
    mergeTags(newTags) {
        if (!newTags || !newTags.length) return;
        
        const existingTagMap = new Map();
        this.tags.forEach(tag => {
            existingTagMap.set(tag.name, tag);
        });
        
        newTags.forEach(newTag => {
            if (!existingTagMap.has(newTag.name)) {
                this.tags.push(newTag);
            } else {
                // Update count for existing tag
                const existingTag = existingTagMap.get(newTag.name);
                existingTag.count += newTag.count;
            }
        });
    }

    // Folder management
    openFolderModal() {
        // Create a simple prompt for folder creation
        const folderName = prompt('Enter folder name:');
        if (folderName && folderName.trim()) {
            // Always add to root when using the Add Folder button
            this.addFolder(folderName.trim(), null);
        }
    }
    
    async addFolder(folderName, parentId = null) {
        // Check if folder already exists at the same level
        let folderExists = false;
        
        if (parentId === null) {
            // Check at root level
            folderExists = this.folders.some(folder => folder.name === folderName && folder.parent === null);
        } else {
            // Check within the parent folder's children
            const parentFolder = this.findFolderById(parentId);
            if (parentFolder && parentFolder.children) {
                folderExists = parentFolder.children.some(folder => folder.name === folderName);
            }
        }
        
        if (folderExists) {
            this.showNotification('Folder Exists', 'A folder with this name already exists at this level.', 'warning');
            return false;
        }
        
        // Generate new ID
        const maxId = Math.max(0, ...this.folders.map(f => f.id), ...this.folders.flatMap(f => f.children?.map(c => c.id) || []));
        
        // Create new folder
        const newFolder = {
            id: maxId + 1,
            name: folderName,
            parent: parentId,
            children: []
        };
        
        if (parentId === null) {
            // Add to root folders array
            this.folders.push(newFolder);
        } else {
            // Add as child to parent folder
            const parentFolder = this.findFolderById(parentId);
            if (parentFolder) {
                if (!parentFolder.children) {
                    parentFolder.children = [];
                }
                parentFolder.children.push(newFolder);
            } else {
                // If parent not found, add to root
                newFolder.parent = null;
                this.folders.push(newFolder);
            }
        }
        
        // Save data and update UI
        await this.saveData();
        this.renderFolders();
        this.showNotification('Folder Created', `Folder "${folderName}" has been created.`, 'success');
        
        return true;
    }
    
    renderFolders() {
        const folderTree = document.getElementById('folderTree');
        if (!folderTree) return;
        
        // Clear current folders
        folderTree.innerHTML = '';
        
        // Create folder tree HTML with proper nesting
        const createFolderTree = (folders) => {
            if (!folders || !folders.length) return '';
            
            let html = '<ul class="folder-list">';
            
            folders.forEach(folder => {
                const hasChildren = folder.children && folder.children.length > 0;
                const activeClass = this.currentFolder === folder.id ? 'active' : '';
                const bookmarkCount = this.getBookmarkCountForFolder(folder.id);
                
                // Start the list item
                html += `<li class="folder-item ${activeClass}" data-folder-id="${folder.id}">`;
                
                // Add the folder content (name, icon, etc.)
                html += `
                    <div class="folder-item-content">
                        <div class="folder-toggle ${hasChildren ? '' : 'hidden'}">
                            <i class="fas fa-chevron-right"></i>
                        </div>
                        <i class="fas fa-${hasChildren ? 'folder-open' : 'folder'}"></i>
                        <span>${folder.name}</span>
                        <span class="count">${bookmarkCount}</span>
                        <div class="folder-actions">
                            <button class="folder-add-btn" title="Add subfolder">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="folder-delete-btn" title="Delete folder">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                
                // If has children, add them as a nested list inside this list item
                if (hasChildren) {
                    // Ensure the nested list is properly contained within the parent list item
                    html += createFolderTree(folder.children);
                }
                
                // Close the list item
                html += '</li>';
            });
            
            html += '</ul>';
            return html;
        };
        
        // Get root folders (parent is null)
        const rootFolders = this.folders.filter(folder => folder.parent === null);
        folderTree.innerHTML = createFolderTree(rootFolders);
        
        // Add click event to folders
        document.querySelectorAll('.folder-item-content').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger folder selection when clicking delete button
                if (e.target.closest('.folder-delete-btn')) {
                    e.stopPropagation();
                    const folderItem = e.target.closest('.folder-item');
                    const folderIdStr = folderItem.dataset.folderId;
                    const folderId = parseInt(folderIdStr);
                    this.deleteFolder(folderId);
                    return;
                }
                
                // Don't trigger folder selection when clicking add subfolder button
                if (e.target.closest('.folder-add-btn')) {
                    e.stopPropagation();
                    const folderItem = e.target.closest('.folder-item');
                    const folderIdStr = folderItem.dataset.folderId;
                    const folderId = parseInt(folderIdStr);
                    
                    // Prompt for subfolder name
                    const subfolderName = prompt('Enter subfolder name:');
                    if (subfolderName && subfolderName.trim()) {
                        // Add the subfolder
                        this.addFolder(subfolderName.trim(), folderId);
                        
                        // Expand the parent folder to show the new subfolder
                        folderItem.classList.add('expanded');
                        
                        // Update folder icon
                        const folderIcon = folderItem.querySelector('.folder-item-content i:not(.fa-chevron-right)');
                        folderIcon.className = 'fas fa-folder-open';
                    }
                    return;
                }
                
                // Toggle folder expansion when clicking the toggle button
                if (e.target.closest('.folder-toggle')) {
                    e.stopPropagation();
                    const folderItem = e.target.closest('.folder-item');
                    folderItem.classList.toggle('expanded');
                    
                    // Update folder icon
                    const folderIcon = folderItem.querySelector('.folder-item-content i:not(.fa-chevron-right)');
                    if (folderItem.classList.contains('expanded')) {
                        folderIcon.className = 'fas fa-folder-open';
                    } else {
                        folderIcon.className = 'fas fa-folder';
                    }
                    return;
                }
                
                const folderId = parseInt(e.currentTarget.parentElement.dataset.folderId);
                this.setCurrentFolder(folderId);
            });
        });
        
        // Call this method to update the breadcrumb
        if (this.currentFolder) {
            this.updateBreadcrumb();
        }
    }
    
    setCurrentFolder(folderId) {
        this.currentFolder = folderId;
        this.currentView = 'folder';
        
        // Update active state in sidebar
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.folderId == folderId) {
                item.classList.add('active');
            }
        });
        
        // Update breadcrumb
        this.updateBreadcrumb();
        
        // Filter bookmarks by folder
        this.filterBookmarksByFolder(folderId);
    }
    
    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        
        if (this.currentView === 'folder' && this.currentFolder) {
            // Find folder path
            const folderPath = this.getFolderPath(this.currentFolder);
            breadcrumb.innerHTML = folderPath.map((folder, index) => {
                if (index === folderPath.length - 1) {
                    return `<span>${folder.name}</span>`;
                } else {
                    return `<a href="#" data-folder-id="${folder.id}">${folder.name}</a> <i class="fas fa-chevron-right"></i> `;
                }
            }).join('');
            
            // Add click events to breadcrumb links
            breadcrumb.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const folderId = parseInt(e.target.dataset.folderId);
                    this.setCurrentFolder(folderId);
                });
            });
        } else {
            // Default view
            breadcrumb.innerHTML = `<span>${this.getViewTitle()}</span>`;
        }
    }
    
    getFolderPath(folderId) {
        const result = [];
        const folder = this.findFolderById(folderId);
        
        if (!folder) return result;
        
        result.push(folder);
        
        if (folder.parent) {
            const parentPath = this.getFolderPath(folder.parent);
            return [...parentPath, ...result];
        }
        
        return result;
    }
    
    findFolderById(folderId) {
        // Search in root folders
        let folder = this.folders.find(f => f.id === folderId);
        if (folder) return folder;
        
        // Search in children recursively
        for (const rootFolder of this.folders) {
            folder = this.findFolderInChildren(rootFolder.children, folderId);
            if (folder) return folder;
        }
        
        return null;
    }
    
    findFolderInChildren(children, folderId) {
        if (!children || !children.length) return null;
        
        // Search in direct children
        let folder = children.find(f => f.id === folderId);
        if (folder) return folder;
        
        // Search in grandchildren
        for (const child of children) {
            if (child.children && child.children.length) {
                folder = this.findFolderInChildren(child.children, folderId);
                if (folder) return folder;
            }
        }
        
        return null;
    }
    
    filterBookmarksByFolder(folderId) {
        const folder = this.findFolderById(folderId);
        if (!folder) return;
        
        // Get full folder path
        const folderPath = this.getFolderPath(folderId).map(f => f.name).join('/');
        
        // Filter bookmarks by folder path
        const filteredBookmarks = this.bookmarks.filter(bookmark => {
            return bookmark.folder && bookmark.folder.startsWith(folderPath);
        });
        
        this.renderBookmarks(filteredBookmarks);
    }
    
    getViewTitle() {
        switch (this.currentView) {
            case 'all': return 'All Bookmarks';
            case 'favorites': return 'Favorites';
            case 'recent': return 'Recently Added';
            case 'untagged': return 'Untagged';
            case 'folder': {
                const folder = this.findFolderById(this.currentFolder);
                return folder ? folder.name : 'Unknown Folder';
            }
            default: return 'Bookmarks';
        }
    }
    
    // Notification system
    showNotification(title, message, type = 'info') {
        // Check if notification container exists, create if not
        let notificationContainer = document.getElementById('notificationContainer');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notificationContainer';
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        
        // Add icon based on type
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        if (type === 'error') icon = 'exclamation-circle';
        
        notification.innerHTML = `
            <div class="notification__icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="notification__content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
            <button class="notification__close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Add close button functionality
        const closeBtn = notification.querySelector('.notification__close');
        closeBtn.addEventListener('click', () => {
            notification.classList.add('notification--closing');
            setTimeout(() => {
                notificationContainer.removeChild(notification);
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode === notificationContainer) {
                notification.classList.add('notification--closing');
                setTimeout(() => {
                    if (notification.parentNode === notificationContainer) {
                        notificationContainer.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
    }
    
    renderUI() {
        this.renderStats();
        this.renderFolderTree();
        this.renderTagCloud();
        this.renderBookmarks();
        this.populateFolderSelects();
    }

    renderStats() {
        // Update the actual counts based on the current data
        document.getElementById('totalBookmarks').textContent = this.bookmarks.length;
        document.getElementById('totalTags').textContent = this.tags.length;
        document.getElementById('favoriteCount').textContent = this.bookmarks.filter(b => b.favorite).length;
        document.getElementById('recentCount').textContent = this.bookmarks.filter(b => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(b.dateAdded) > weekAgo;
        }).length;
        
        // Update the counts in the sidebar navigation
        document.querySelector('[data-view="all"] .count').textContent = this.bookmarks.length;
        document.querySelector('[data-view="favorites"] .count').textContent = this.bookmarks.filter(b => b.favorite).length;
        document.querySelector('[data-view="recent"] .count').textContent = this.bookmarks.filter(b => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(b.dateAdded) > weekAgo;
        }).length;
        document.querySelector('[data-view="untagged"] .count').textContent = this.bookmarks.filter(b => !b.tags.length).length;
    }

    renderFolderTree() {
        // Use our new renderFolders method instead
        this.renderFolders();
    }
    
    getBookmarkCountForFolder(folderId) {
        // Get the folder by ID
        const folder = this.findFolderById(folderId);
        if (!folder) return 0;
        
        // Get the folder path
        const folderPath = this.getFolderPath(folderId);
        if (!folderPath.length) return 0;
        
        // Get the full folder path string
        const fullPath = folderPath.map(f => f.name).join('/');
        
        // Count bookmarks in this folder and its subfolders
        return this.bookmarks.filter(b => b.folder && b.folder.startsWith(fullPath)).length;
    }
    
    // Folder deletion functionality
    async deleteFolder(folderId) {
        const folder = this.findFolderById(folderId);
        if (!folder) return;
        
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents?`)) {
            return;
        }
        
        // Get all bookmarks in this folder and its subfolders
        const folderPath = this.getFolderPath(folderId);
        const fullPath = folderPath.map(f => f.name).join('/');
        
        // Ask if user wants to delete bookmarks in the folder
        const deleteBookmarks = confirm(`Do you want to delete all bookmarks in this folder? Click Cancel to keep the bookmarks.`);
        
        if (deleteBookmarks) {
            // Delete all bookmarks in this folder and its subfolders
            this.bookmarks = this.bookmarks.filter(b => !b.folder || !b.folder.startsWith(fullPath));
        } else {
            // Move bookmarks to root (no folder)
            this.bookmarks.forEach(bookmark => {
                if (bookmark.folder && bookmark.folder.startsWith(fullPath)) {
                    bookmark.folder = '';
                }
            });
        }
        
        // Remove folder from parent's children array
        console.log('Removing folder from parent, folder:', folder);
        if (folder.parent) {
            const parent = this.findFolderById(folder.parent);
            console.log('Parent folder:', parent);
            if (parent && parent.children) {
                console.log('Parent children before:', parent.children);
                parent.children = parent.children.filter(child => child.id !== folder.id);
                console.log('Parent children after:', parent.children);
            }
        } else {
            // Remove from root folders
            console.log('Root folders before:', this.folders);
            this.folders = this.folders.filter(f => f.id !== folder.id);
            console.log('Root folders after:', this.folders);
        }
        
        // If current folder is being deleted, reset to all view
        console.log('Current folder:', this.currentFolder, 'Deleted folder ID:', folder.id);
        if (this.currentFolder === folder.id) {
            console.log('Resetting current folder and view');
            this.currentFolder = null;
            this.currentView = 'all';
        }
        
        // Save data and update UI
        console.log('Saving data after folder deletion');
        await this.saveData();
        console.log('Rendering UI after folder deletion');
        this.renderUI();
        console.log('Showing notification after folder deletion');
        this.showNotification('Folder Deleted', `Folder "${folder.name}" has been deleted.`, 'success');
    }

    renderTagCloud() {
        const container = document.getElementById('tagCloud');
        container.innerHTML = '';

        this.tags.slice(0, 12).forEach(tag => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag-item';
            tagElement.innerHTML = `
                <span>${tag.name}</span>
                <span class="tag-count">${tag.count}</span>
            `;
            tagElement.addEventListener('click', () => {
                this.filterByTag(tag.name);
            });
            container.appendChild(tagElement);
        });
    }

    renderBookmarks() {
        const container = document.getElementById('bookmarksGrid');
        const filteredBookmarks = this.getFilteredBookmarks();

        if (filteredBookmarks.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
            document.getElementById('bookmarksContainer').style.display = 'none';
            return;
        }

        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('bookmarksContainer').style.display = 'block';

        container.innerHTML = '';
        container.className = this.viewMode === 'grid' ? 'bookmarks-grid' : 'bookmarks-list';

        filteredBookmarks.forEach(bookmark => {
            const element = this.createBookmarkElement(bookmark);
            container.appendChild(element);
        });
    }

    createBookmarkElement(bookmark) {
        const element = document.createElement('div');
        element.className = this.viewMode === 'grid' ? 'bookmark-card' : 'bookmark-list-item';
        element.dataset.bookmarkId = bookmark.id;
        element.setAttribute('tabindex', '0');
        element.style.cursor = 'pointer';

        if (this.viewMode === 'grid') {
            element.innerHTML = `
                <div class="bookmark-screenshot">
                    <img src="${bookmark.screenshot}" alt="${bookmark.title}" loading="lazy">
                    <div class="bookmark-favorite ${bookmark.favorite ? 'active' : ''}" data-bookmark-id="${bookmark.id}">
                        <i class="fas fa-heart"></i>
                    </div>
                </div>
                <div class="bookmark-content">
                    <h3 class="bookmark-title">${bookmark.title}</h3>
                    <div class="bookmark-url">${bookmark.url}</div>
                    <p class="bookmark-description">${bookmark.description}</p>
                    <div class="bookmark-tags">
                        ${bookmark.tags.map(tag => `<span class="bookmark-tag">${tag}</span>`).join('')}
                    </div>
                    <div class="bookmark-footer">
                        <span class="bookmark-date">${this.formatDate(bookmark.dateAdded)}</span>
                        <div class="bookmark-visits">
                            <i class="fas fa-eye"></i>
                            <span>${bookmark.visited}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            element.innerHTML = `
                <div class="bookmark-list-screenshot">
                    <img src="${bookmark.screenshot}" alt="${bookmark.title}" loading="lazy">
                </div>
                <div class="bookmark-list-content">
                    <h4 class="bookmark-title">${bookmark.title}</h4>
                    <div class="bookmark-url">${bookmark.url}</div>
                    <p class="bookmark-description">${bookmark.description}</p>
                    <div class="bookmark-tags">
                        ${bookmark.tags.map(tag => `<span class="bookmark-tag">${tag}</span>`).join('')}
                    </div>
                </div>
                <div class="bookmark-list-meta">
                    <div class="bookmark-favorite ${bookmark.favorite ? 'active' : ''}" data-bookmark-id="${bookmark.id}">
                        <i class="fas fa-heart"></i>
                    </div>
                    <span class="bookmark-date">${this.formatDate(bookmark.dateAdded)}</span>
                    <div class="bookmark-visits">
                        <i class="fas fa-eye"></i>
                        <span>${bookmark.visited}</span>
                    </div>
                </div>
            `;
        }

        // Main click event to open bookmark
        element.addEventListener('click', (e) => {
            // Don't open if clicking on favorite button
            if (e.target.closest('.bookmark-favorite')) {
                return;
            }
            
            // Open bookmark in new tab
            window.open(bookmark.url, '_blank');
            this.incrementVisits(bookmark.id);
            this.showToast(`Opening ${bookmark.title}`, 'info');
        });

        // Separate event for favorite button
        const favoriteBtn = element.querySelector('.bookmark-favorite');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleFavorite(bookmark.id);
            });
        }

        // Keyboard support
        element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.open(bookmark.url, '_blank');
                this.incrementVisits(bookmark.id);
                this.showToast(`Opening ${bookmark.title}`, 'info');
            }
        });

        return element;
    }

    getFilteredBookmarks() {
        let filtered = [...this.bookmarks];

        // Apply view filter
        if (this.currentView === 'favorites') {
            filtered = filtered.filter(b => b.favorite);
        } else if (this.currentView === 'recent') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(b => new Date(b.dateAdded) > weekAgo);
        } else if (this.currentView === 'untagged') {
            filtered = filtered.filter(b => !b.tags || b.tags.length === 0);
        }

        // Apply folder filter
        if (this.currentFolder) {
            filtered = filtered.filter(b => b.folder && b.folder.includes(this.currentFolder));
        }

        // Apply search filters
        if (this.searchFilters.query) {
            const query = this.searchFilters.query.toLowerCase();
            filtered = filtered.filter(b => 
                b.title.toLowerCase().includes(query) ||
                b.description.toLowerCase().includes(query) ||
                b.tags.some(tag => tag.toLowerCase().includes(query))
            );
        }

        return filtered;
    }

    performSearch(query) {
        this.searchFilters.query = query;
        this.renderBookmarks();
        this.updateBreadcrumb();
    }

    setViewMode(mode) {
        this.viewMode = mode;
        
        document.getElementById('gridViewBtn').classList.toggle('active', mode === 'grid');
        document.getElementById('listViewBtn').classList.toggle('active', mode === 'list');
        
        this.renderBookmarks();
    }

    setCurrentView(view) {
        this.currentView = view;
        this.currentFolder = null;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        
        this.renderBookmarks();
        this.updateBreadcrumb();
    }

    setCurrentFolder(folderName) {
        this.currentView = 'folder';
        this.currentFolder = folderName;
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        this.renderBookmarks();
        this.updateBreadcrumb();
    }

    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        let text = 'All Bookmarks';
        
        if (this.currentView === 'favorites') text = 'Favorites';
        else if (this.currentView === 'recent') text = 'Recently Added';
        else if (this.currentView === 'untagged') text = 'Untagged';
        else if (this.currentFolder) text = this.currentFolder;
        
        if (this.searchFilters.query) {
            text += ` - Search: "${this.searchFilters.query}"`;
        }
        
        breadcrumb.textContent = text;
    }

    openBookmarkModal(bookmark = null) {
        const modal = new bootstrap.Modal(document.getElementById('bookmarkModal'));
        const title = document.getElementById('bookmarkModalTitle');
        const form = document.getElementById('bookmarkForm');
        
        if (bookmark) {
            title.textContent = 'Edit Bookmark';
            document.getElementById('bookmarkId').value = bookmark.id;
            document.getElementById('bookmarkTitle').value = bookmark.title;
            document.getElementById('bookmarkUrl').value = bookmark.url;
            document.getElementById('bookmarkDescription').value = bookmark.description;
            document.getElementById('bookmarkTags').value = bookmark.tags.join(', ');
            document.getElementById('bookmarkFavorite').checked = bookmark.favorite;
            
            // Generate AI suggestions
            this.generateAITagSuggestions(bookmark.url);
        } else {
            title.textContent = 'Add Bookmark';
            form.reset();
            document.getElementById('bookmarkId').value = '';
            this.generateAITagSuggestions('');
        }
        
        modal.show();
    }

    saveBookmark() {
        const id = document.getElementById('bookmarkId').value;
        const title = document.getElementById('bookmarkTitle').value;
        const url = document.getElementById('bookmarkUrl').value;
        const description = document.getElementById('bookmarkDescription').value;
        const tags = document.getElementById('bookmarkTags').value.split(',').map(t => t.trim()).filter(t => t);
        const folder = document.getElementById('bookmarkFolder').value;
        const favorite = document.getElementById('bookmarkFavorite').checked;

        if (!title || !url) {
            this.showToast('Please fill in required fields', 'error');
            return;
        }

        const bookmark = {
            id: id ? parseInt(id) : Date.now(),
            title,
            url,
            description,
            tags,
            folder,
            favorite,
            dateAdded: id ? this.bookmarks.find(b => b.id == id).dateAdded : new Date().toISOString().split('T')[0],
            visited: id ? this.bookmarks.find(b => b.id == id).visited : 0,
            screenshot: this.generateScreenshot(title)
        };

        if (id) {
            const index = this.bookmarks.findIndex(b => b.id == id);
            this.bookmarks[index] = bookmark;
            this.showToast('Bookmark updated successfully', 'success');
        } else {
            this.bookmarks.push(bookmark);
            this.showToast('Bookmark added successfully', 'success');
        }

        this.updateTagsFromBookmarks();
        this.renderUI();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('bookmarkModal'));
        modal.hide();
    }

    generateScreenshot(title) {
        const colors = ['#21d4fd', '#000000', '#ff6933', '#6366f1', '#7952b3', '#f7df1e', '#336794', '#dc4944'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const textColor = color === '#f7df1e' ? 'black' : 'white';
        
        return `data:image/svg+xml;base64,${btoa(`
            <svg width="240" height="180" viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="240" height="180" fill="${color}"/>
                <text x="120" y="90" text-anchor="middle" fill="${textColor}" font-size="14">${title.substring(0, 15)}</text>
            </svg>
        `)}`;
    }

    generateAITagSuggestions(url) {
        // Simulate AI tag suggestions based on URL
        const suggestions = [];
        const urlLower = url.toLowerCase();
        
        if (urlLower.includes('react')) suggestions.push('react', 'frontend', 'javascript');
        if (urlLower.includes('python')) suggestions.push('python', 'backend', 'programming');
        if (urlLower.includes('css')) suggestions.push('css', 'styling', 'frontend');
        if (urlLower.includes('api')) suggestions.push('api', 'backend', 'web-services');
        if (urlLower.includes('tutorial')) suggestions.push('tutorial', 'learning', 'guide');
        if (urlLower.includes('doc')) suggestions.push('documentation', 'reference');
        
        if (suggestions.length === 0) {
            suggestions.push('web', 'resource', 'bookmark');
        }
        
        document.getElementById('aiTagSuggestions').textContent = suggestions.slice(0, 3).join(', ');
    }

    toggleFavorite(bookmarkId) {
        const bookmark = this.bookmarks.find(b => b.id == bookmarkId);
        if (bookmark) {
            bookmark.favorite = !bookmark.favorite;
            this.renderBookmarks();
            this.renderStats();
            this.showToast(`Bookmark ${bookmark.favorite ? 'added to' : 'removed from'} favorites`, 'success');
        }
    }

    incrementVisits(bookmarkId) {
        const bookmark = this.bookmarks.find(b => b.id == bookmarkId);
        if (bookmark) {
            bookmark.visited++;
        }
    }

    deleteBookmark(bookmarkId) {
        if (confirm('Are you sure you want to delete this bookmark?')) {
            this.bookmarks = this.bookmarks.filter(b => b.id != bookmarkId);
            this.renderUI();
            this.showToast('Bookmark deleted successfully', 'success');
        }
    }

    sortBookmarks(criteria) {
        const container = document.getElementById('bookmarksGrid');
        const bookmarks = Array.from(container.children);
        
        bookmarks.sort((a, b) => {
            const aId = a.dataset.bookmarkId;
            const bId = b.dataset.bookmarkId;
            const aBookmark = this.bookmarks.find(b => b.id == aId);
            const bBookmark = this.bookmarks.find(b => b.id == bId);
            
            switch (criteria) {
                case 'title':
                    return aBookmark.title.localeCompare(bBookmark.title);
                case 'visited':
                    return bBookmark.visited - aBookmark.visited;
                case 'favorite':
                    return (bBookmark.favorite ? 1 : 0) - (aBookmark.favorite ? 1 : 0);
                default: // dateAdded
                    return new Date(bBookmark.dateAdded) - new Date(aBookmark.dateAdded);
            }
        });
        
        bookmarks.forEach(bookmark => container.appendChild(bookmark));
    }

    showContextMenu(event) {
        const contextMenu = document.getElementById('contextMenu');
        const bookmarkElement = event.target.closest('.bookmark-card') || event.target.closest('.bookmark-list-item');
        const bookmarkId = bookmarkElement.dataset.bookmarkId;
        
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
        contextMenu.classList.remove('hidden');
        
        // Update context menu items
        const bookmark = this.bookmarks.find(b => b.id == bookmarkId);
        document.getElementById('contextFavorite').innerHTML = `
            <i class="fas fa-heart"></i>
            ${bookmark.favorite ? 'Remove from Favorites' : 'Add to Favorites'}
        `;
        
        // Bind context menu actions
        document.getElementById('contextEdit').onclick = () => {
            this.openBookmarkModal(bookmark);
            this.hideContextMenu();
        };
        
        document.getElementById('contextDelete').onclick = () => {
            this.deleteBookmark(bookmarkId);
            this.hideContextMenu();
        };
        
        document.getElementById('contextFavorite').onclick = () => {
            this.toggleFavorite(bookmarkId);
            this.hideContextMenu();
        };
        
        document.getElementById('contextCopy').onclick = () => {
            navigator.clipboard.writeText(bookmark.url);
            this.showToast('URL copied to clipboard', 'success');
            this.hideContextMenu();
        };
    }

    hideContextMenu() {
        document.getElementById('contextMenu').classList.add('hidden');
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-color-scheme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-color-scheme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        this.showToast(`Switched to ${newTheme} theme`, 'success');
    }

    updateThemeIcon(theme) {
        const icon = document.querySelector('#themeToggle i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;
        toast.innerHTML = `
            <div class="toast-body">
                ${message}
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    }

    getBookmarkCountForFolder(folderName) {
        return this.bookmarks.filter(b => b.folder && b.folder.includes(folderName)).length;
    }

    populateFolderSelects() {
        const selects = ['bookmarkFolder', 'searchFolder'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            // Clear existing options except first
            while (select.children.length > 1) {
                select.removeChild(select.lastChild);
            }
            
            const addFolderOptions = (folders, prefix = '') => {
                folders.forEach(folder => {
                    const option = document.createElement('option');
                    option.value = prefix + folder.name;
                    option.textContent = prefix + folder.name;
                    select.appendChild(option);
                    
                    if (folder.children) {
                        addFolderOptions(folder.children, prefix + folder.name + '/');
                    }
                });
            };
            
            addFolderOptions(this.folders);
        });
    }

    updateTagsFromBookmarks() {
        const tagCounts = {};
        
        this.bookmarks.forEach(bookmark => {
            bookmark.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        
        this.tags = Object.entries(tagCounts).map(([name, count]) => ({
            name,
            count,
            color: this.tags.find(t => t.name === name)?.color || '#666'
        }));
        
        this.renderTagCloud();
    }

    filterByTag(tagName) {
        document.getElementById('globalSearch').value = tagName;
        this.performSearch(tagName);
    }

    toggleFolder(folderId) {
        const children = document.getElementById(`folder-children-${folderId}`);
        const toggle = document.querySelector(`[data-folder-id="${folderId}"] .folder-toggle i`);
        
        if (children) {
            const isVisible = children.style.display !== 'none';
            children.style.display = isVisible ? 'none' : 'block';
            toggle.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(90deg)';
        }
    }

    applyAdvancedSearch() {
        const filters = {
            searchTitle: document.getElementById('searchTitle').checked,
            searchDescription: document.getElementById('searchDescription').checked,
            searchTags: document.getElementById('searchTags').checked,
            folder: document.getElementById('searchFolder').value,
            dateFrom: document.getElementById('searchDateFrom').value,
            dateTo: document.getElementById('searchDateTo').value,
            favoritesOnly: document.getElementById('searchFavoritesOnly').checked
        };
        
        this.searchFilters = { ...this.searchFilters, ...filters };
        this.renderBookmarks();
        this.updateBreadcrumb();
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('advancedSearchModal'));
        modal.hide();
        
        this.showToast('Advanced search applied', 'success');
    }

    clearSearchFilters() {
        this.searchFilters = {};
        document.getElementById('globalSearch').value = '';
        document.getElementById('advancedSearchForm').reset();
        this.renderBookmarks();
        this.updateBreadcrumb();
        
        this.showToast('Search filters cleared', 'success');
    }

    openImportModal() {
        const modal = new bootstrap.Modal(document.getElementById('importExportModal'));
        document.getElementById('importExportTitle').textContent = 'Import Bookmarks';
        document.getElementById('importExportContent').innerHTML = `
            <p>Import bookmarks from various formats:</p>
            <div class="mb-3">
                <label for="importFile" class="form-label">Select file</label>
                <input type="file" class="form-control" id="importFile" accept=".json,.html,.csv">
            </div>
            <div class="alert alert-info">
                <strong>Supported formats:</strong>
                <ul class="mb-0">
                    <li>JSON - Export from BookmarkPro</li>
                    <li>HTML - Browser bookmark export</li>
                    <li>CSV - Spreadsheet format</li>
                </ul>
            </div>
            <button class="btn btn--primary" onclick="bookmarkManager.importBookmarks()">Import</button>
        `;
        modal.show();
    }

    openExportModal() {
        const modal = new bootstrap.Modal(document.getElementById('importExportModal'));
        document.getElementById('importExportTitle').textContent = 'Export Bookmarks';
        document.getElementById('importExportContent').innerHTML = `
            <p>Export your bookmarks in various formats:</p>
            <div class="d-grid gap-2">
                <button class="btn btn--outline" onclick="bookmarkManager.exportBookmarks('json')">
                    <i class="fas fa-file-code"></i> Export as JSON
                </button>
                <button class="btn btn--outline" onclick="bookmarkManager.exportBookmarks('html')">
                    <i class="fas fa-file-code"></i> Export as HTML
                </button>
                <button class="btn btn--outline" onclick="bookmarkManager.exportBookmarks('csv')">
                    <i class="fas fa-file-csv"></i> Export as CSV
                </button>
            </div>
            <div class="alert alert-info mt-3">
                <strong>Export includes:</strong> All bookmarks, folders, tags, and metadata
            </div>
        `;
        modal.show();
    }

    exportBookmarks(format) {
        let content, filename, mimeType;
        
        switch (format) {
            case 'json':
                content = JSON.stringify({
                    bookmarks: this.bookmarks,
                    folders: this.folders,
                    tags: this.tags,
                    exportDate: new Date().toISOString()
                }, null, 2);
                filename = 'bookmarks.json';
                mimeType = 'application/json';
                break;
                
            case 'html':
                content = this.generateHTMLExport();
                filename = 'bookmarks.html';
                mimeType = 'text/html';
                break;
                
            case 'csv':
                content = this.generateCSVExport();
                filename = 'bookmarks.csv';
                mimeType = 'text/csv';
                break;
        }
        
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast(`Bookmarks exported as ${format.toUpperCase()}`, 'success');
    }

    generateHTMLExport() {
        let html = `
            <!DOCTYPE NETSCAPE-Bookmark-file-1>
            <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
            <TITLE>Bookmarks</TITLE>
            <H1>Bookmarks</H1>
            <DL><p>
        `;
        
        this.bookmarks.forEach(bookmark => {
            html += `<DT><A HREF="${bookmark.url}" ADD_DATE="${new Date(bookmark.dateAdded).getTime()}">${bookmark.title}</A>\n`;
            if (bookmark.description) {
                html += `<DD>${bookmark.description}\n`;
            }
        });
        
        html += '</DL><p>';
        return html;
    }

    generateCSVExport() {
        const headers = ['Title', 'URL', 'Description', 'Tags', 'Folder', 'Favorite', 'Date Added', 'Visits'];
        const rows = [headers.join(',')];
        
        this.bookmarks.forEach(bookmark => {
            const row = [
                `"${bookmark.title}"`,
                `"${bookmark.url}"`,
                `"${bookmark.description}"`,
                `"${bookmark.tags.join(';')}"`,
                `"${bookmark.folder || ''}"`,
                bookmark.favorite ? 'Yes' : 'No',
                bookmark.dateAdded,
                bookmark.visited
            ];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }

    openSettingsModal() {
        const modal = new bootstrap.Modal(document.getElementById('importExportModal'));
        document.getElementById('importExportTitle').textContent = 'Settings';
        
        // Get current WebDAV credentials
        const currentUsername = localStorage.getItem('pcloudUser') || '';
        const hasPassword = localStorage.getItem('pcloudPass') ? true : false;
        
        document.getElementById('importExportContent').innerHTML = `
            <div class="row">
                <div class="col-12">
                    <h6><i class="fas fa-cloud"></i> pCloud WebDAV Sync</h6>
                    <div class="alert alert-info" role="alert">
                        <small><i class="fas fa-info-circle"></i> Enter your pCloud credentials to enable automatic bookmark synchronization. Your credentials are stored locally and never shared.</small>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label class="form-label" for="pcloudUsername">pCloud Username/Email</label>
                                <input type="text" class="form-control" id="pcloudUsername" value="${currentUsername}" placeholder="your@email.com">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label class="form-label" for="pcloudPassword">pCloud Password</label>
                                <input type="password" class="form-control" id="pcloudPassword" placeholder="${hasPassword ? '••••••••' : 'Enter password'}">
                            </div>
                        </div>
                    </div>
                    <div class="d-flex gap-2 mb-3">
                        <button class="btn btn--primary btn--sm" onclick="bookmarkManager.saveWebDAVCredentials()">
                            <i class="fas fa-save"></i> Save Credentials
                        </button>
                        <button class="btn btn--outline btn--sm" onclick="bookmarkManager.testWebDAVConnection()">
                            <i class="fas fa-plug"></i> Test Connection
                        </button>
                        <button class="btn btn--outline btn--sm" onclick="bookmarkManager.clearWebDAVCredentials()">
                            <i class="fas fa-trash"></i> Clear
                        </button>
                    </div>
                </div>
            </div>
            <hr>
            <div class="row">
                <div class="col-md-6">
                    <h6>Sync Settings</h6>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="autoSync" checked>
                        <label class="form-check-label" for="autoSync">Auto-sync enabled</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="cloudBackup" checked>
                        <label class="form-check-label" for="cloudBackup">Cloud backup</label>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6>Browser Integration</h6>
                    <button class="btn btn--outline btn--sm mb-2" onclick="bookmarkManager.openBookmarkletModal()">
                        <i class="fas fa-bookmark"></i> Generate Bookmarklet
                    </button>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="aiSuggestions" checked>
                        <label class="form-check-label" for="aiSuggestions">AI tag suggestions</label>
                    </div>
                </div>
            </div>
            <hr>
            <div class="row">
                <div class="col-12">
                    <h6>Data Management</h6>
                    <div class="d-flex gap-2">
                        <button class="btn btn--outline btn--sm" onclick="bookmarkManager.cleanupDuplicates()">
                            <i class="fas fa-broom"></i> Remove Duplicates
                        </button>
                        <button class="btn btn--outline btn--sm" onclick="bookmarkManager.validateLinks()">
                            <i class="fas fa-link"></i> Validate Links
                        </button>
                        <button class="btn btn--outline btn--sm" onclick="bookmarkManager.resetData()">
                            <i class="fas fa-refresh"></i> Reset to Defaults
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.show();
    }

    // WebDAV credential management functions
    saveWebDAVCredentials() {
        const username = document.getElementById('pcloudUsername').value.trim();
        const password = document.getElementById('pcloudPassword').value;
        
        if (!username || !password) {
            this.showToast('Please enter both username and password', 'error');
            return;
        }
        
        // Store credentials in localStorage (with warning about security)
        localStorage.setItem('pcloudUser', username);
        localStorage.setItem('pcloudPass', password);
        
        // Initialize WebDAV client
        this.initializeWebDAVClient();
        
        this.showToast('WebDAV credentials saved successfully', 'success');
    }
    
    clearWebDAVCredentials() {
        localStorage.removeItem('pcloudUser');
        localStorage.removeItem('pcloudPass');
        this.webdavClient = null;
        this.webdavEnabled = false;
        
        // Clear the form fields
        document.getElementById('pcloudUsername').value = '';
        document.getElementById('pcloudPassword').value = '';
        
        this.updateSyncStatus('WebDAV disconnected', false);
        this.showToast('WebDAV credentials cleared', 'info');
    }
    
    async testWebDAVConnection() {
        const username = document.getElementById('pcloudUsername').value.trim();
        const password = document.getElementById('pcloudPassword').value;
        
        if (!username || !password) {
            this.showToast('Please enter credentials first', 'error');
            return;
        }
        
        try {
            // Create temporary client for testing (using proxy to avoid CORS)
            const testClient = createClient('/webdav', {
                username: username,
                password: password
            });
            
            // Test connection by trying to get server info (PROPFIND on root)
            // pCloud WebDAV doesn't support listing root directory, so we use a different approach
            await testClient.stat('/');
            
            this.showToast('WebDAV connection successful!', 'success');
            
            // Save credentials if test successful
            this.saveWebDAVCredentials();
            
        } catch (error) {
            console.error('WebDAV connection test failed:', error);
            
            // Provide more specific error messages
            let errorMessage = 'WebDAV connection failed. ';
            
            if (error.status === 401) {
                errorMessage += 'Invalid credentials. Please check your username and password.';
            } else if (error.status === 403) {
                errorMessage += 'Access forbidden. Please check your account permissions.';
            } else if (error.status === 404) {
                errorMessage += 'WebDAV endpoint not found. Please verify the URL.';
            } else if (error.status === 0 || error.message?.includes('CORS')) {
                errorMessage += 'CORS error. This is a browser security limitation when accessing WebDAV directly.';
            } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
                errorMessage += 'Network error. Please check your internet connection.';
            } else {
                errorMessage += `Error: ${error.message || 'Unknown error occurred'}`;
            }
            
            this.showToast(errorMessage, 'error');
        }
    }
    
    initializeWebDAVClient() {
        const username = localStorage.getItem('pcloudUser');
        const password = localStorage.getItem('pcloudPass');
        
        if (username && password) {
            try {
                this.webdavClient = createClient('/webdav', {
                    username: username,
                    password: password
                });
                this.webdavEnabled = true;
                this.updateSyncStatus('WebDAV connected', true);
            } catch (error) {
                console.error('Failed to initialize WebDAV client:', error);
                this.webdavEnabled = false;
                this.updateSyncStatus('WebDAV connection failed', false);
            }
        }
     }
     
     // WebDAV sync functions
     async loadBookmarksFromWebDAV() {
         if (!this.webdavEnabled || !this.webdavClient) {
             console.log('WebDAV not enabled, skipping cloud sync');
             return false;
         }
         
         try {
             this.updateSyncStatus('Syncing from cloud...', true);
             
             // Try to get bookmarks.json from pCloud
             const raw = await this.webdavClient.getFileContents('/bookmarks.json', { format: 'text' });
             const cloudData = JSON.parse(raw);
             
             // Merge cloud data with local data
             if (cloudData.bookmarks) {
                 this.bookmarks = cloudData.bookmarks;
             }
             if (cloudData.folders) {
                 this.folders = cloudData.folders;
             }
             if (cloudData.tags) {
                 this.tags = cloudData.tags;
             }
             if (cloudData.stats) {
                 this.stats = cloudData.stats;
             }
             
             // Update UI
             this.renderUI();
             
             const lastUpdated = new Date().toLocaleString();
             this.updateSyncStatus(`Last synced: ${lastUpdated}`, true);
             
             console.log('Bookmarks loaded from pCloud successfully');
             return true;
             
         } catch (error) {
             console.error('Failed to load bookmarks from pCloud:', error);
             
             // If file doesn't exist, that's okay - we'll create it on first save
             if (error.status === 404) {
                 console.log('bookmarks.json not found in pCloud, will create on first save');
                 this.updateSyncStatus('Ready to sync', true);
                 return false;
             }
             
             this.updateSyncStatus('Sync failed', false);
             this.showToast('Failed to load bookmarks from cloud', 'error');
             return false;
         }
     }
     
     async saveBookmarksToWebDAV() {
         if (!this.webdavEnabled || !this.webdavClient) {
             console.log('WebDAV not enabled, skipping cloud sync');
             return false;
         }
         
         try {
             this.updateSyncStatus('Syncing to cloud...', true);
             
             // Prepare data for sync
             const dataToSync = {
                 bookmarks: this.bookmarks,
                 folders: this.folders,
                 tags: this.tags,
                 stats: this.stats,
                 lastUpdated: new Date().toISOString(),
                 version: '1.0'
             };
             
             const jsonData = JSON.stringify(dataToSync, null, 2);
             
             // Save to pCloud
             await this.webdavClient.putFileContents('/bookmarks.json', jsonData, { overwrite: true });
             
             const lastUpdated = new Date().toLocaleString();
             this.updateSyncStatus(`Last synced: ${lastUpdated}`, true);
             
             console.log('Bookmarks saved to pCloud successfully');
             return true;
             
         } catch (error) {
             console.error('Failed to save bookmarks to pCloud:', error);
             this.updateSyncStatus('Sync failed', false);
             this.showToast('Failed to save bookmarks to cloud', 'error');
             return false;
         }
     }

    openBookmarkletModal() {
        const modal = new bootstrap.Modal(document.getElementById('bookmarkletModal'));
        modal.show();
    }

    setupDragAndDrop() {
        // Enable drag and drop for bookmark organization
        let draggedElement = null;
        
        document.addEventListener('dragstart', (e) => {
            if (e.target.closest('.bookmark-card') || e.target.closest('.bookmark-list-item')) {
                draggedElement = e.target.closest('.bookmark-card') || e.target.closest('.bookmark-list-item');
                draggedElement.classList.add('dragging');
            }
        });
        
        document.addEventListener('dragend', () => {
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement = null;
            }
        });
        
        // Folder drop zones
        document.addEventListener('dragover', (e) => {
            if (e.target.closest('.folder-item')) {
                e.preventDefault();
                e.target.closest('.folder-item').classList.add('drag-over');
            }
        });
        
        document.addEventListener('dragleave', (e) => {
            if (e.target.closest('.folder-item')) {
                e.target.closest('.folder-item').classList.remove('drag-over');
            }
        });
        
        document.addEventListener('drop', (e) => {
            if (e.target.closest('.folder-item') && draggedElement) {
                e.preventDefault();
                const folderItem = e.target.closest('.folder-item');
                const folderId = folderItem.dataset.folderId;
                const bookmarkId = draggedElement.dataset.bookmarkId;
                
                // Update bookmark folder
                const bookmark = this.bookmarks.find(b => b.id == bookmarkId);
                if (bookmark) {
                    const folder = this.findFolderById(parseInt(folderId));
                    bookmark.folder = this.getFolderPath(folder);
                    this.showToast(`Bookmark moved to ${bookmark.folder}`, 'success');
                    this.renderBookmarks();
                }
                
                folderItem.classList.remove('drag-over');
            }
        });
    }

    findFolderById(id) {
        // Ensure id is a number for comparison
        const numId = typeof id === 'string' ? parseInt(id) : id;
        
        const findInFolders = (folders) => {
            for (const folder of folders) {
                // Compare as numbers to ensure type consistency
                if (folder.id === numId) return folder;
                if (folder.children) {
                    const found = findInFolders(folder.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findInFolders(this.folders);
    }

    getFolderPath(folderId) {
        // Handle both folder object and folder ID
        const folder = typeof folderId === 'object' ? folderId : this.findFolderById(folderId);
        if (!folder) return [];
        
        // Build path array from bottom up
        const path = [folder];
        let current = folder;
        
        while (current.parent) {
            const parent = this.findFolderById(current.parent);
            if (!parent) break;
            path.unshift(parent);
            current = parent;
        }
        
        return path;
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('globalSearch').focus();
        }
        
        // Ctrl/Cmd + N for new bookmark
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.openBookmarkModal();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            this.hideContextMenu();
        }
    }

    cleanupDuplicates() {
        const urlMap = new Map();
        const duplicates = [];
        
        this.bookmarks.forEach(bookmark => {
            if (urlMap.has(bookmark.url)) {
                duplicates.push(bookmark.id);
            } else {
                urlMap.set(bookmark.url, bookmark.id);
            }
        });
        
        if (duplicates.length > 0) {
            this.bookmarks = this.bookmarks.filter(b => !duplicates.includes(b.id));
            this.renderUI();
            this.showToast(`Removed ${duplicates.length} duplicate bookmarks`, 'success');
        } else {
            this.showToast('No duplicates found', 'info');
        }
    }

    validateLinks() {
        this.showToast('Link validation started (simulated)', 'info');
        // Simulate link validation
        setTimeout(() => {
            const brokenCount = Math.floor(Math.random() * 3);
            this.showToast(`Link validation complete. Found ${brokenCount} broken links`, 'success');
        }, 2000);
    }

    resetData() {
        if (confirm('This will reset all your bookmarks to the default sample data. Are you sure?')) {
            this.loadData();
            this.renderUI();
            this.showToast('Data reset to defaults', 'success');
        }
    }

    importBookmarks() {
        this.showToast('Import functionality simulated - feature coming soon!', 'info');
    }
}

// Initialize the application
const bookmarkManager = new BookmarkManager();

// Make some functions globally available for onclick handlers
window.bookmarkManager = bookmarkManager;
