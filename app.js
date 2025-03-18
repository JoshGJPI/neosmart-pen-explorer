/**
 * NeoSmartpen Data Explorer
 * Main application script
 */
// Initialize the application when everything is ready
function initializeApp() {
    console.log('NeoSmartpen Data Explorer loaded');
    
    // Check if the Web Bluetooth API is available
    if (!navigator.bluetooth) {
        alert('Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or another compatible browser.');
        document.getElementById('connect-btn').disabled = true;
        document.getElementById('connection-status').textContent = 'Bluetooth Not Supported';
        return;
    }
    
    // Check if the SDK is available
    if (!window.WebPenSDK || !window.WebPenSDK.PenHelper) {
        console.error('Web Pen SDK not loaded. Using fallback implementation.');
        
        // Create a fallback SDK with a PenHelper object for testing
        window.WebPenSDK = {
            PenHelper: createFallbackPenHelper(),
            PenMessageType: createFallbackPenMessageType()
        };
        
        console.warn('Created fallback SDK for testing.');
    } else {
        console.log('WebPenSDK loaded successfully');
    }
    
    // Check if Fabric.js is available
    if (typeof fabric === 'undefined') {
        console.error('Fabric.js library not loaded');
        console.warn('Canvas visualization will not work correctly.');
        // Try to load Fabric.js dynamically
        const fabricScript = document.createElement('script');
        fabricScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.2.1/fabric.min.js';
        document.head.appendChild(fabricScript);
    }
    
    // Initialize the application
    const penConnector = new PenConnector();
    const dataManager = new DataManager();
    const uiController = new UIController(penConnector, dataManager);
    
    // Make instances available globally for debugging
    window.penConnector = penConnector;
    window.dataManager = dataManager;
    window.uiController = uiController;
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, waiting for SDK...');
    
    // Listen for SDK loaded event
    document.addEventListener('sdk-loaded', function() {
        console.log('SDK loaded event received');
        initializeApp();
    });
    
    // Listen for SDK failure event
    document.addEventListener('sdk-failed', function() {
        console.error('SDK failed to load');
        initializeApp(); // Still initialize with fallback
    });
    
    // Fallback: If neither event fires within 3 seconds, initialize anyway
    setTimeout(function() {
        if (!window.penConnector) {
            console.warn('SDK loading timed out, initializing with fallback');
            initializeApp();
        }
    }, 3000);
});

/**
 * Create a fallback PenHelper for testing when the SDK is not available
 */
function createFallbackPenHelper() {
    return {
        pens: [],
        scanPen: async function() {
            console.log('Fallback: Scanning for pen');
            alert('This is a fallback implementation. The real SDK is not available.');
            
            // Simulate finding a pen after 2 seconds
            setTimeout(() => {
                const mockPenController = {
                    info: {
                        MacAddress: '00:11:22:33:44:55',
                        deviceName: 'Mock Neo Smartpen'
                    },
                    device: {
                        id: 'mock-device-id',
                        gatt: {
                            disconnect: function() {
                                console.log('Fallback: Pen disconnected');
                                // Simulate disconnection
                                this.messageCallback('00:11:22:33:44:55', 4, null);
                                this.pens = [];
                            }.bind(this)
                        }
                    },
                    InputPassword: function(password) {
                        console.log('Fallback: Password input - ' + password);
                        // Simulate successful authorization
                        setTimeout(() => {
                            this.messageCallback('00:11:22:33:44:55', 1, null);
                        }, 500);
                    }.bind(this),
                    RequestOfflineNoteList: function(section, owner) {
                        console.log('Fallback: RequestOfflineNoteList', section, owner);
                        // Simulate note list response
                        setTimeout(() => {
                            const mockNoteList = [
                                { Section: 1, Owner: 1, Note: 1 },
                                { Section: 1, Owner: 1, Note: 2 }
                            ];
                            this.messageCallback('00:11:22:33:44:55', 48, mockNoteList);
                        }, 1000);
                    }.bind(this),
                    RequestOfflinePageList: function(section, owner, note) {
                        console.log('Fallback: RequestOfflinePageList', section, owner, note);
                        // Simulate page list response
                        setTimeout(() => {
                            const mockPageList = {
                                Section: section,
                                Owner: owner,
                                Note: note,
                                Pages: [1, 2, 3, 4, 5]
                            };
                            this.messageCallback('00:11:22:33:44:55', 49, mockPageList);
                        }, 1000);
                    }.bind(this),
                    RequestOfflineData: function(section, owner, note, deleteOnFinished, pages) {
                        console.log('Fallback: RequestOfflineData', section, owner, note, deleteOnFinished, pages);
                        // Simulate data response
                        setTimeout(() => {
                            this.messageCallback('00:11:22:33:44:55', 50, null); // Start
                            
                            setTimeout(() => {
                                this.messageCallback('00:11:22:33:44:55', 51, 50); // Progress
                                
                                setTimeout(() => {
                                    const mockData = createMockStrokeData(section, owner, note, pages);
                                    this.messageCallback('00:11:22:33:44:55', 52, mockData); // Success
                                }, 1000);
                            }, 500);
                        }, 500);
                    }.bind(this)
                };
                
                this.pens.push(mockPenController);
                this.messageCallback('00:11:22:33:44:55', 17, { Battery: 85, Storage: '50%' });
            }, 2000);
        },
        disconnect: function(controller) {
            console.log('Fallback: Disconnecting pen');
            controller.device.gatt.disconnect();
        },
        messageCallback: null,
        dotCallback: null,
        isSamePage: function(page1, page2) {
            if (!page1 || !page2) return false;
            
            return (
                page1.section === page2.section &&
                page1.owner === page2.owner &&
                page1.book === page2.book &&
                page1.page === page2.page
            );
        },
        isPlatePaper: function(pageInfo) {
            return (pageInfo.owner === 1013 && pageInfo.book === 2);
        }
    };
}

/**
 * Create fallback message types when the SDK is not available
 */
function createFallbackPenMessageType() {
    return {
        PEN_AUTHORIZED: 1,
        PEN_PASSWORD_REQUEST: 2,
        PEN_DISCONNECTED: 4,
        PEN_SETTING_INFO: 17,
        OFFLINE_DATA_NOTE_LIST: 48,
        OFFLINE_DATA_PAGE_LIST: 49,
        OFFLINE_DATA_SEND_START: 50,
        OFFLINE_DATA_SEND_STATUS: 51,
        OFFLINE_DATA_SEND_SUCCESS: 52,
        OFFLINE_DATA_SEND_FAILURE: 53
    };
}

/**
 * Create mock stroke data for testing
 */
function createMockStrokeData(section, owner, note, pages) {
    // Create some random strokes
    const strokes = [];
    const pageArray = pages.length > 0 ? pages : [1, 2, 3, 4, 5];
    
    pageArray.forEach(page => {
        // Create 2-5 strokes per page
        const strokeCount = 2 + Math.floor(Math.random() * 4);
        
        for (let s = 0; s < strokeCount; s++) {
            const dots = [];
            
            // Start point (PEN_DOWN)
            const startX = 100 + Math.random() * 300;
            const startY = 100 + Math.random() * 200;
            
            dots.push({
                pageInfo: { section, owner, book: note, page },
                x: startX,
                y: startY,
                f: 500 + Math.random() * 400,
                dotType: 0, // PEN_DOWN
                timeStamp: Date.now() - 60000 + s * 1000 // Timestamps starting from a minute ago
            });
            
            // Move points (PEN_MOVE)
            const pointCount = 10 + Math.floor(Math.random() * 20);
            let lastX = startX;
            let lastY = startY;
            
            for (let p = 0; p < pointCount; p++) {
                const deltaX = (Math.random() - 0.5) * 30;
                const deltaY = (Math.random() - 0.5) * 30;
                
                lastX += deltaX;
                lastY += deltaY;
                
                dots.push({
                    pageInfo: { section, owner, book: note, page },
                    x: lastX,
                    y: lastY,
                    f: 500 + Math.random() * 400,
                    dotType: 1, // PEN_MOVE
                    timeStamp: dots[dots.length - 1].timeStamp + 50 + Math.random() * 20
                });
            }
            
            // End point (PEN_UP)
            dots.push({
                pageInfo: { section, owner, book: note, page },
                x: lastX,
                y: lastY,
                f: 100 + Math.random() * 200,
                dotType: 2, // PEN_UP
                timeStamp: dots[dots.length - 1].timeStamp + 50
            });
            
            strokes.push({ Dots: dots });
        }
    });
    
    return strokes;
}
