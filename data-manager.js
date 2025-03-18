/**
 * Data Manager Module
 * Handles data retrieval, storage, visualization, and export for the Neo Smartpen
 */
class DataManager {
    constructor() {
        this.noteList = [];
        this.pagesByNote = new Map(); // Map of note ID to page list
        this.dataByPage = new Map(); // Map of page ID to stroke data
        this.canvas = null;
        this.fabricCanvas = null;
        
        // Bind methods to maintain 'this' context
        this.setCanvas = this.setCanvas.bind(this);
        this.storeNoteList = this.storeNoteList.bind(this);
        this.storePageList = this.storePageList.bind(this);
        this.storeOfflineData = this.storeOfflineData.bind(this);
        this.visualizeStrokes = this.visualizeStrokes.bind(this);
        this.downloadData = this.downloadData.bind(this);
        this.exportAllData = this.exportAllData.bind(this);
    }
    
    /**
     * Initialize the canvas for visualizing strokes
     */
    setCanvas(canvasElement) {
        this.canvas = canvasElement;
        
        // Check if Fabric.js is available
        if (typeof fabric !== 'undefined') {
            try {
                // Initialize Fabric.js canvas
                this.fabricCanvas = new fabric.Canvas(canvasElement, {
                    isDrawingMode: false,
                    selection: false,
                    backgroundColor: '#ffffff'
                });
                console.log('Canvas initialized with Fabric.js');
            } catch (error) {
                console.error('Error initializing Fabric.js canvas:', error);
                this.fabricCanvas = null;
                this.drawFallbackCanvas(canvasElement);
            }
        } else {
            console.warn('Fabric.js not available, using fallback canvas');
            this.fabricCanvas = null;
            this.drawFallbackCanvas(canvasElement);
        }
    }
    
    /**
     * Draw a fallback canvas when Fabric.js is not available
     */
    drawFallbackCanvas(canvasElement) {
        if (!canvasElement) return;
        
        const ctx = canvasElement.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        // Draw "Fabric.js not available" message
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('Fabric.js not available', canvasElement.width / 2, canvasElement.height / 2 - 20);
        ctx.fillText('Visualization requires Fabric.js', canvasElement.width / 2, canvasElement.height / 2 + 20);
    }
    
    /**
     * Store the list of notes from the pen
     */
    storeNoteList(noteList) {
        this.noteList = noteList || [];
        console.log('Stored note list:', this.noteList);
        return this.noteList;
    }
    
    /**
     * Store the list of pages for a specific note
     */
    storePageList(noteId, pageList) {
        const key = this.getNoteKey(noteId);
        this.pagesByNote.set(key, pageList);
        console.log(`Stored page list for note ${key}:`, pageList);
        return pageList;
    }
    
    /**
     * Store the offline stroke data for a specific page
     */
    storeOfflineData(noteId, pageId, data) {
        const key = this.getPageKey(noteId, pageId);
        this.dataByPage.set(key, data);
        console.log(`Stored offline data for page ${key}:`, data);
        return data;
    }
    
    /**
     * Get the raw JSON data for a specific page
     */
    getPageData(noteId, pageId) {
        const key = this.getPageKey(noteId, pageId);
        return this.dataByPage.get(key) || null;
    }
    
    /**
     * Get a list of all notes currently stored
     */
    getNoteList() {
        return this.noteList;
    }
    
    /**
     * Get the list of pages for a specific note
     */
    getPageList(noteId) {
        const key = this.getNoteKey(noteId);
        return this.pagesByNote.get(key) || [];
    }
    
    /**
     * Clear the canvas and visualize the strokes for a specific page
     */
    visualizeStrokes(noteId, pageId) {
        if (!this.canvas) {
            console.error('Canvas not initialized');
            return false;
        }
        
        // Get the stored data
        const key = this.getPageKey(noteId, pageId);
        const strokeData = this.dataByPage.get(key);
        
        if (!strokeData || strokeData.length === 0) {
            console.warn(`No stroke data available for page ${key}`);
            return false;
        }
        
        // If Fabric.js is not available, show a message
        if (!this.fabricCanvas) {
            this.drawFallbackCanvas(this.canvas);
            return false;
        }
        
        // Clear the canvas
        this.fabricCanvas.clear();
        this.fabricCanvas.setBackgroundColor('#ffffff', this.fabricCanvas.renderAll.bind(this.fabricCanvas));
        
        // Group the dots by stroke
        const strokes = this.groupDotsByStroke(strokeData);
        
        // Find canvas dimensions
        const canvasWidth = this.fabricCanvas.getWidth();
        const canvasHeight = this.fabricCanvas.getHeight();
        
        // Find the min/max X and Y coordinates to scale properly
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        strokes.forEach(stroke => {
            stroke.forEach(dot => {
                minX = Math.min(minX, dot.x);
                maxX = Math.max(maxX, dot.x);
                minY = Math.min(minY, dot.y);
                maxY = Math.max(maxY, dot.y);
            });
        });
        
        // Add padding
        const padding = 20;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;
        
        // Calculate scale factors
        const scaleX = canvasWidth / (maxX - minX);
        const scaleY = canvasHeight / (maxY - minY);
        const scale = Math.min(scaleX, scaleY);
        
        // Draw each stroke
        strokes.forEach((stroke, index) => {
            if (stroke.length < 2) return; // Skip single points
            
            // Create a path for the stroke
            const points = stroke.map(dot => ({
                x: (dot.x - minX) * scale,
                y: (dot.y - minY) * scale
            }));
            
            const path = new fabric.Path(this.createPathFromPoints(points), {
                stroke: this.getStrokeColor(index),
                strokeWidth: 2,
                fill: false,
                selectable: false
            });
            
            this.fabricCanvas.add(path);
        });
        
        this.fabricCanvas.renderAll();
        return true;
    }
    
    /**
     * Helper method to convert points to an SVG path string
     */
    createPathFromPoints(points) {
        if (points.length < 2) return '';
        
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            path += ` L ${points[i].x} ${points[i].y}`;
        }
        
        return path;
    }
    
    /**
     * Helper method to group dots by stroke
     */
    groupDotsByStroke(dotArray) {
        const strokes = [];
        let currentStroke = [];
        
        dotArray.forEach(dot => {
            // For simplicity, we'll consider the "Dots" property which is an array of dot objects
            // In our case, the structure might be different, so adjust this based on actual data
            const dotData = dot.Dots || [dot];
            
            dotData.forEach(d => {
                const dotType = d.dotType;
                
                if (dotType === 0) { // PEN_DOWN - start of a new stroke
                    if (currentStroke.length > 0) {
                        strokes.push([...currentStroke]);
                        currentStroke = [];
                    }
                    currentStroke.push(d);
                } else if (dotType === 1) { // PEN_MOVE - continuation of a stroke
                    currentStroke.push(d);
                } else if (dotType === 2) { // PEN_UP - end of a stroke
                    if (currentStroke.length > 0) {
                        strokes.push([...currentStroke]);
                        currentStroke = [];
                    }
                }
            });
        });
        
        // Add any remaining stroke
        if (currentStroke.length > 0) {
            strokes.push([...currentStroke]);
        }
        
        return strokes;
    }
    
    /**
     * Helper method to get a color for a stroke based on its index
     */
    getStrokeColor(index) {
        const colors = [
            '#1a73e8', // blue
            '#ea4335', // red
            '#34a853', // green
            '#fbbc05', // yellow
            '#9c27b0', // purple
            '#ff9800', // orange
            '#795548', // brown
            '#607d8b'  // gray
        ];
        
        return colors[index % colors.length];
    }
    
    /**
     * Download the data for a specific page as a JSON file
     */
    downloadData(noteId, pageId) {
        const key = this.getPageKey(noteId, pageId);
        const data = this.dataByPage.get(key);
        
        if (!data) {
            console.warn(`No data available for page ${key}`);
            return false;
        }
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neopen_data_${key}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    }
    
    /**
     * Export all stored data as a single JSON file
     */
    exportAllData() {
        const exportData = {
            notes: this.noteList,
            pages: {},
            data: {}
        };
        
        // Convert Maps to objects for serialization
        this.pagesByNote.forEach((pages, noteKey) => {
            exportData.pages[noteKey] = pages;
        });
        
        this.dataByPage.forEach((data, pageKey) => {
            exportData.data[pageKey] = data;
        });
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `neopen_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    }
    
    /**
     * Helper method to create a consistent key for a note
     */
    getNoteKey(noteId) {
        const { Section, Owner, Note } = noteId;
        return `${Section}_${Owner}_${Note}`;
    }
    
    /**
     * Helper method to create a consistent key for a page
     */
    getPageKey(noteId, pageId) {
        const { Section, Owner, Note } = noteId;
        return `${Section}_${Owner}_${Note}_${pageId}`;
    }
}
