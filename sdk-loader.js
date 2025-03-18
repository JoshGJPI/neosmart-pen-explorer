/**
 * This file loads and initializes the NeoSmartpen SDK
 * It handles the CommonJS to browser conversion issues
 */

// Create a global object to hold the SDK
window.WebPenSDK = {};

// Function to load the SDK dynamically from the local file
async function loadSDK() {
  try {
    // Declare global variables that the SDK might expect
    window.global = window;
    window.process = { env: { NODE_ENV: 'production' } };
    window.Buffer = window.Buffer || { isBuffer: () => false };
    
    // Import SDK files (we'll use separate files to avoid the 'exports' issue)
    const response = await fetch('./libs/web-pen-sdk.min.js');
    const sdkScript = await response.text();
    
    // Create a sanitized version by wrapping in IIFE and exposing to our global
    const wrappedScript = `
      (function(window) {
        const module = { exports: {} };
        const exports = module.exports;
        
        ${sdkScript}
        
        // Expose the SDK to our global object
        window.WebPenSDK = module.exports;
      })(window);
    `;
    
    // Create and append script element
    const scriptElement = document.createElement('script');
    scriptElement.textContent = wrappedScript;
    document.head.appendChild(scriptElement);
    
    console.log('SDK loaded successfully');
    
    // After the SDK is loaded, initialize the app
    initializeApp();
  } catch (error) {
    console.error('Failed to load SDK:', error);
    
    // Fall back to mock implementation
    console.warn('Using fallback implementation');
    window.WebPenSDK = {
      PenHelper: createFallbackPenHelper(),
      PenMessageType: createFallbackPenMessageType()
    };
    
    // Still initialize the app with the fallback
    initializeApp();
  }
}

// Initialize the application after SDK is loaded or fallback is created
function initializeApp() {
  // Initialize the application
  const penConnector = new PenConnector();
  const dataManager = new DataManager();
  const uiController = new UIController(penConnector, dataManager);
  
  // Make instances available globally for debugging
  window.penConnector = penConnector;
  window.dataManager = dataManager;
  window.uiController = uiController;
  
  // Update UI to show app is ready
  document.getElementById('app-loading').style.display = 'none';
  document.getElementById('app-content').style.display = 'block';
}

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
    dotCallback: null
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
