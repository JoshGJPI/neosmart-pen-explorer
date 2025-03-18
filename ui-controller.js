/**
 * UI Controller Module
 * Handles the user interface interactions and updates
 */
class UIController {
    constructor(penConnector, dataManager) {
        this.penConnector = penConnector;
        this.dataManager = dataManager;
        
        // UI elements
        this.elements = {
            connectionStatus: document.getElementById('connection-status'),
            penInfo: document.getElementById('pen-info'),
            connectBtn: document.getElementById('connect-btn'),
            disconnectBtn: document.getElementById('disconnect-btn'),
            noteList: document.getElementById('note-list'),
            pageList: document.getElementById('page-list'),
            refreshNotesBtn: document.getElementById('refresh-notes-btn'),
            previewType: document.getElementById('preview-type'),
            previewCanvas: document.getElementById('preview-canvas'),
            dataPreview: document.getElementById('data-preview'),
            downloadDataBtn: document.getElementById('download-data-btn'),
            backupAllBtn: document.getElementById('backup-all-btn'),
            backupLogContainer: document.getElementById('backup-log-container'),
            dataModal: document.getElementById('data-modal'),
            detailedData: document.getElementById('detailed-data'),
            closeModalBtn: document.querySelector('.close-btn')
        };
        
        // Current selection
        this.selectedNote = null;
        this.selectedPage = null;
        
        // Initialize
        this.initialize();
        
        // Bind methods to maintain 'this' context
        this.handleConnectionChange = this.handleConnectionChange.bind(this);
        this.handlePenInfoUpdate = this.handlePenInfoUpdate.bind(this);
        this.refreshNoteList = this.refreshNoteList.bind(this);
        this.selectNote = this.selectNote.bind(this);
        this.selectPage = this.selectPage.bind(this);
        this.showDataPreview = this.showDataPreview.bind(this);
        this.downloadSelectedData = this.downloadSelectedData.bind(this);
        this.backupAllData = this.backupAllData.bind(this);
        this.showModal = this.showModal.bind(this);
        this.hideModal = this.hideModal.bind(this);
    }
    
    /**
     * Initialize the UI controller
     */
    initialize() {
        // Set up connection to pen controller
        this.penConnector.onConnectionChange = this.handleConnectionChange;
        this.penConnector.onPenInfoUpdate = this.handlePenInfoUpdate;
        this.penConnector.onError = (error) => this.logMessage(`Error: ${error}`, 'error');
        
        // Initialize canvas
        this.dataManager.setCanvas(this.elements.previewCanvas);
        
        // Set up event listeners
        this.elements.connectBtn.addEventListener('click', async () => {
            this.logMessage('Connecting to pen...');
            const success = await this.penConnector.connectPen();
            if (!success) {
                this.logMessage('Failed to connect to pen.', 'error');
            }
        });
        
        this.elements.disconnectBtn.addEventListener('click', () => {
            this.penConnector.disconnectPen();
            this.logMessage('Disconnected from pen.');
        });
        
        this.elements.refreshNotesBtn.addEventListener('click', () => {
            this.refreshNoteList();
        });
        
        this.elements.previewType.addEventListener('change', () => {
            if (this.selectedNote && this.selectedPage) {
                this.showDataPreview(this.selectedNote, this.selectedPage);
            }
        });
        
        this.elements.downloadDataBtn.addEventListener('click', () => {
            this.downloadSelectedData();
        });
        
        this.elements.backupAllBtn.addEventListener('click', () => {
            this.backupAllData();
        });
        
        this.elements.closeModalBtn.addEventListener('click', () => {
            this.hideModal();
        });
        
        window.addEventListener('click', (event) => {
            if (event.target === this.elements.dataModal) {
                this.hideModal();
            }
        });
    }
    
    /**
     * Handle connection status changes
     */
    handleConnectionChange(connected) {
        if (connected) {
            this.elements.connectionStatus.textContent = 'Connected';
            this.elements.connectionStatus.classList.add('connected');
            this.elements.connectBtn.classList.add('hidden');
            this.elements.disconnectBtn.classList.remove('hidden');
            this.elements.refreshNotesBtn.disabled = false;
            this.elements.backupAllBtn.disabled = false;
            
            // Automatically refresh note list
            this.refreshNoteList();
        } else {
            this.elements.connectionStatus.textContent = 'Disconnected';
            this.elements.connectionStatus.classList.remove('connected');
            this.elements.connectBtn.classList.remove('hidden');
            this.elements.disconnectBtn.classList.add('hidden');
            this.elements.refreshNotesBtn.disabled = true;
            this.elements.downloadDataBtn.disabled = true;
            this.elements.backupAllBtn.disabled = true;
            
            // Clear pen info
            this.elements.penInfo.textContent = 'No pen connected';
        }
    }
    
    /**
     * Handle pen info updates
     */
    handlePenInfoUpdate(penInfo) {
        const { name, macAddress, battery } = penInfo;
        this.elements.penInfo.textContent = `${name} (${macAddress}) - Battery: ${battery}%`;
    }
    
    /**
     * Refresh the list of notes from the pen
     */
    async refreshNoteList() {
        try {
            this.logMessage('Requesting note list from pen...');
            this.elements.noteList.innerHTML = '<p class="empty-message">Loading notes...</p>';
            
            const noteList = await this.penConnector.requestOfflineNoteList();
            this.dataManager.storeNoteList(noteList);
            
            if (noteList && noteList.length > 0) {
                this.renderNoteList(noteList);
                this.logMessage(`Found ${noteList.length} notes in the pen.`);
            } else {
                this.elements.noteList.innerHTML = '<p class="empty-message">No notes found in pen.</p>';
                this.logMessage('No notes found in the pen.', 'warning');
            }
        } catch (error) {
            console.error('Error refreshing note list:', error);
            this.elements.noteList.innerHTML = '<p class="empty-message">Error loading notes.</p>';
            this.logMessage(`Error loading notes: ${error.message}`, 'error');
        }
    }
    
    /**
     * Render the list of notes in the UI
     */
    renderNoteList(noteList) {
        this.elements.noteList.innerHTML = '';
        
        noteList.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.className = 'note-item';
            noteItem.setAttribute('data-section', note.Section);
            noteItem.setAttribute('data-owner', note.Owner);
            noteItem.setAttribute('data-note', note.Note);
            
            noteItem.textContent = `Note ${note.Note} (Section ${note.Section}, Owner ${note.Owner})`;
            
            noteItem.addEventListener('click', () => {
                this.selectNote(note);
            });
            
            this.elements.noteList.appendChild(noteItem);
        });
    }
    
    /**
     * Handle selection of a note
     */
    async selectNote(note) {
        // Update UI selection
        const noteItems = document.querySelectorAll('.note-item');
        noteItems.forEach(item => item.classList.remove('selected'));
        
        const selectedItem = document.querySelector(`.note-item[data-section="${note.Section}"][data-owner="${note.Owner}"][data-note="${note.Note}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        this.selectedNote = note;
        this.selectedPage = null;
        
        // Request page list for this note
        try {
            this.logMessage(`Requesting pages for note ${note.Note}...`);
            this.elements.pageList.innerHTML = '<p class="empty-message">Loading pages...</p>';
            
            const { Section, Owner, Note } = note;
            const pageList = await this.penConnector.requestOfflinePageList(Section, Owner, Note);
            this.dataManager.storePageList(note, pageList);
            
            if (pageList && pageList.Pages && pageList.Pages.length > 0) {
                this.renderPageList(pageList.Pages);
                this.logMessage(`Found ${pageList.Pages.length} pages in note ${note.Note}.`);
            } else {
                this.elements.pageList.innerHTML = '<p class="empty-message">No pages found in this note.</p>';
                this.logMessage(`No pages found in note ${note.Note}.`, 'warning');
            }
        } catch (error) {
            console.error('Error loading page list:', error);
            this.elements.pageList.innerHTML = '<p class="empty-message">Error loading pages.</p>';
            this.logMessage(`Error loading pages: ${error.message}`, 'error');
        }
    }
    
    /**
     * Render the list of pages in the UI
     */
    renderPageList(pages) {
        this.elements.pageList.innerHTML = '';
        
        pages.forEach(page => {
            const pageItem = document.createElement('div');
            pageItem.className = 'page-item';
            pageItem.setAttribute('data-page', page);
            
            pageItem.textContent = `Page ${page}`;
            
            pageItem.addEventListener('click', () => {
                this.selectPage(page);
            });
            
            this.elements.pageList.appendChild(pageItem);
        });
    }
    
    /**
     * Handle selection of a page
     */
    async selectPage(page) {
        if (!this.selectedNote) return;
        
        // Update UI selection
        const pageItems = document.querySelectorAll('.page-item');
        pageItems.forEach(item => item.classList.remove('selected'));
        
        const selectedItem = document.querySelector(`.page-item[data-page="${page}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        this.selectedPage = page;
        this.elements.downloadDataBtn.disabled = false;
        
        // Request data for this page if we don't already have it
        const pageKey = this.dataManager.getPageKey(this.selectedNote, page);
        if (!this.dataManager.dataByPage.has(pageKey)) {
            try {
                this.logMessage(`Requesting data for page ${page}...`);
                
                const { Section, Owner, Note } = this.selectedNote;
                const data = await this.penConnector.requestOfflineData(Section, Owner, Note, [page]);
                this.dataManager.storeOfflineData(this.selectedNote, page, data);
                
                this.logMessage(`Received data for page ${page}.`);
            } catch (error) {
                console.error('Error loading page data:', error);
                this.logMessage(`Error loading page data: ${error.message}`, 'error');
                return;
            }
        }
        
        // Show data preview
        this.showDataPreview(this.selectedNote, page);
    }
    
    /**
     * Show a preview of the selected page data
     */
    showDataPreview(note, page) {
        const data = this.dataManager.getPageData(note, page);
        if (!data) {
            this.elements.dataPreview.textContent = 'No data available for this page.';
            return;
        }
        
        const previewType = this.elements.previewType.value;
        
        if (previewType === 'visual') {
            // Show canvas, hide JSON
            this.elements.dataPreview.style.display = 'none';
            this.elements.previewCanvas.parentElement.style.display = 'block';
            
            // Visualize the strokes
            this.dataManager.visualizeStrokes(note, page);
        } else {
            // Show JSON, hide canvas
            this.elements.dataPreview.style.display = 'block';
            this.elements.previewCanvas.parentElement.style.display = 'none';
            
            // Show JSON data preview (first 1000 characters)
            const jsonString = JSON.stringify(data, null, 2);
            this.elements.dataPreview.textContent = jsonString.length > 1000 
                ? jsonString.substring(0, 1000) + '...\n\n(truncated - click to view full data)'
                : jsonString;
                
            // Add click handler to show full data in modal
            this.elements.dataPreview.onclick = () => {
                this.showModal(jsonString);
            };
        }
    }
    
    /**
     * Download the selected page data
     */
    downloadSelectedData() {
        if (!this.selectedNote || !this.selectedPage) {
            this.logMessage('No page selected for download.', 'warning');
            return;
        }
        
        const success = this.dataManager.downloadData(this.selectedNote, this.selectedPage);
        
        if (success) {
            this.logMessage(`Downloaded data for page ${this.selectedPage}.`);
        } else {
            this.logMessage('Failed to download data.', 'error');
        }
    }
    
    /**
     * Backup all pen data to a JSON file
     */
    async backupAllData() {
        this.logMessage('Starting backup of all pen data...');
        
        try {
            // First, get the list of notes if we don't have it
            if (this.dataManager.noteList.length === 0) {
                this.logMessage('Requesting note list...');
                const noteList = await this.penConnector.requestOfflineNoteList();
                this.dataManager.storeNoteList(noteList);
            }
            
            const noteList = this.dataManager.noteList;
            
            if (noteList.length === 0) {
                this.logMessage('No notes found in pen.', 'warning');
                return;
            }
            
            this.logMessage(`Found ${noteList.length} notes. Processing...`);
            
            // For each note, get pages and data
            for (let i = 0; i < noteList.length; i++) {
                const note = noteList[i];
                const { Section, Owner, Note } = note;
                
                this.logMessage(`Processing note ${i+1}/${noteList.length}: Note ${Note}...`);
                
                // Get page list for this note
                const noteKey = this.dataManager.getNoteKey(note);
                let pageList;
                
                if (this.dataManager.pagesByNote.has(noteKey)) {
                    pageList = this.dataManager.pagesByNote.get(noteKey);
                } else {
                    this.logMessage(`Requesting pages for note ${Note}...`);
                    pageList = await this.penConnector.requestOfflinePageList(Section, Owner, Note);
                    this.dataManager.storePageList(note, pageList);
                }
                
                if (!pageList || !pageList.Pages || pageList.Pages.length === 0) {
                    this.logMessage(`No pages found in note ${Note}.`, 'warning');
                    continue;
                }
                
                this.logMessage(`Found ${pageList.Pages.length} pages in note ${Note}.`);
                
                // Get data for all pages in this note
                this.logMessage(`Requesting data for note ${Note}...`);
                const data = await this.penConnector.requestOfflineData(Section, Owner, Note, []);
                
                // Store data for each page
                pageList.Pages.forEach(page => {
                    this.dataManager.storeOfflineData(note, page, data);
                });
                
                this.logMessage(`Stored data for all pages in note ${Note}.`);
            }
            
            // Export all data
            this.logMessage('Exporting all data...');
            const success = this.dataManager.exportAllData();
            
            if (success) {
                this.logMessage('All pen data has been successfully backed up!', 'success');
            } else {
                this.logMessage('Failed to export backup data.', 'error');
            }
        } catch (error) {
            console.error('Error during backup:', error);
            this.logMessage(`Error during backup: ${error.message}`, 'error');
        }
    }
    
    /**
     * Show a message in the backup log
     */
    logMessage(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        this.elements.backupLogContainer.appendChild(logEntry);
        this.elements.backupLogContainer.scrollTop = this.elements.backupLogContainer.scrollHeight;
    }
    
    /**
     * Show the modal with detailed data
     */
    showModal(data) {
        this.elements.detailedData.textContent = data;
        this.elements.dataModal.style.display = 'block';
    }
    
    /**
     * Hide the modal
     */
    hideModal() {
        this.elements.dataModal.style.display = 'none';
    }
}
