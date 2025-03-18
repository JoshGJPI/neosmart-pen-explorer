/**
 * Pen Connector Module
 * Handles the connection to the Neo Smartpen using the Web Bluetooth API
 */
class PenConnector {
    constructor() {
        this.isConnected = false;
        this.pendingPromises = {};
        this.currentRequestId = 0;

        // Callbacks
        this.onConnectionChange = null;
        this.onPenInfoUpdate = null;
        this.onNoteListReceived = null;
        this.onPageListReceived = null;
        this.onOfflineDataReceived = null;
        this.onError = null;
        
        // Bind methods to maintain 'this' context
        this.connectPen = this.connectPen.bind(this);
        this.disconnectPen = this.disconnectPen.bind(this);
        this.handlePenMessage = this.handlePenMessage.bind(this);
        this.requestOfflineNoteList = this.requestOfflineNoteList.bind(this);
        this.requestOfflinePageList = this.requestOfflinePageList.bind(this);
        this.requestOfflineData = this.requestOfflineData.bind(this);
    }

    /**
     * Initialize the pen connector by setting up SDK callbacks
     */
    initialize() {
        console.log('Initializing pen connector...');
        console.log('WebPenSDK:', window.WebPenSDK);
        
        // Check if PenHelper is available
        if (!window.WebPenSDK || !window.WebPenSDK.PenHelper) {
            console.error('Web Pen SDK not properly loaded');
            console.log('WebPenSDK object:', window.WebPenSDK);
            
            if (this.onError) {
                this.onError('Web Pen SDK not properly loaded. Please check your connection and reload the page.');
            }
            return false;
        }
        
        // Set up SDK callback handlers
        try {
            window.WebPenSDK.PenHelper.messageCallback = (mac, type, args) => {
                this.handlePenMessage(mac, type, args);
            };
            
            // Ensure dotCallback is also set up
            window.WebPenSDK.PenHelper.dotCallback = (mac, dot) => {
                // We're not handling dots directly, but the SDK requires this callback
                console.log('Dot received:', dot);
            };
            
            console.log('Pen connector initialized successfully');
            return true;
        } catch (error) {
            console.error('Error setting up SDK callbacks:', error);
            if (this.onError) {
                this.onError(`Failed to initialize pen: ${error.message}`);
            }
            return false;
        }
    }
    
    /**
     * Connect to a Neo Smartpen via Web Bluetooth
     */
    async connectPen() {
        try {
            if (!this.isConnected) {
                console.log('Attempting to connect to pen...');
                
                if (!this.initialize()) {
                    console.error('Initialization failed, cannot connect to pen');
                    return false;
                }
                
                console.log('Initialization successful, scanning for pen...');
                
                try {
                    // For Neo SmartPen devices, we need specific service UUIDs
                    // Neo SmartPen often uses Nordic UART service (NUS)
                    console.log('Using service UUID filters for Neo SmartPen');
                    const penOptions = {
                        // Check for device name patterns or known services
                        filters: [
                            // Neo SmartPen naming pattern
                            { namePrefix: 'Neo' },
                            // Nordic UART Service UUID
                            { services: ['6e400001-b5a3-f393-e0a9-e50e24dcca9e'] },
                            // Neo SmartPen M1 service UUID
                            { services: [0x19F1] }
                        ],
                        optionalServices: [
                            'battery_service',
                            '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
                            '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
                        ]
                    };
                    
                    // Show options menu to user
                    console.log('Waiting for user to select pen from Bluetooth devices...');
                    await window.WebPenSDK.PenHelper.scanPen(penOptions);
                    console.log('Pen scan completed successfully');
                    return true;
                } catch (scanError) {
                    console.error('Error during pen scanning:', scanError);
                    
                    // Check if this is a user cancellation (not a true error)
                    if (scanError.name === 'NotFoundError' || scanError.message.includes('cancelled')) {
                        if (this.onError) {
                            this.onError('Bluetooth device selection was cancelled');
                        }
                    } else {
                        // Real error
                        if (this.onError) {
                            this.onError(`Failed to scan for pen: ${scanError.message}`);
                        }
                    }
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error('Unexpected error connecting to pen:', error);
            if (this.onError) {
                this.onError(`Failed to connect to pen: ${error.message}`);
            }
            return false;
        }
    }
    
    /**
     * Disconnect from the currently connected Neo Smartpen
     */
    disconnectPen() {
        try {
            if (this.isConnected && window.WebPenSDK.PenHelper.pens.length > 0) {
                window.WebPenSDK.PenHelper.disconnect(window.WebPenSDK.PenHelper.pens[0]);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error disconnecting pen:', error);
            if (this.onError) {
                this.onError(`Failed to disconnect pen: ${error.message}`);
            }
            return false;
        }
    }
    
    /**
     * Handle messages from the pen
     */
    handlePenMessage(mac, type, args) {
        // For debugging
        console.log('Pen message:', { type, args });
        
        // Handle different message types
        switch (type) {
            case window.WebPenSDK.PenMessageType.PEN_SETTING_INFO:
                // Store pen controller and update connection status
                this.penController = window.WebPenSDK.PenHelper.pens.find(c => c.info.MacAddress === mac);
                this.penInfo = args;
                this.isConnected = true;
                
                if (this.onConnectionChange) {
                    this.onConnectionChange(true);
                }
                
                if (this.onPenInfoUpdate) {
                    this.onPenInfoUpdate({
                        name: this.penController.info.deviceName || 'Neo Smartpen',
                        macAddress: mac,
                        battery: args.Battery,
                        storage: args.Storage || 'Unknown'
                    });
                }
                break;
                
            case window.WebPenSDK.PenMessageType.PEN_AUTHORIZED:
                // Pen is authorized and ready for use
                console.log('Pen authorized');
                break;
                
            case window.WebPenSDK.PenMessageType.PEN_PASSWORD_REQUEST:
                // Pen requires a password
                this.handlePasswordRequest(args);
                break;
                
            case window.WebPenSDK.PenMessageType.PEN_DISCONNECTED:
                // Pen has been disconnected
                this.isConnected = false;
                this.penController = null;
                this.penInfo = null;
                
                if (this.onConnectionChange) {
                    this.onConnectionChange(false);
                }
                break;
                
            case window.WebPenSDK.PenMessageType.OFFLINE_DATA_NOTE_LIST:
                // Received list of notes stored on the pen
                if (this.onNoteListReceived) {
                    this.onNoteListReceived(args);
                }
                
                // Resolve any pending promise for note list
                this.resolvePendingPromise('noteList', args);
                break;
                
            case window.WebPenSDK.PenMessageType.OFFLINE_DATA_PAGE_LIST:
                // Received list of pages for a specific note
                if (this.onPageListReceived) {
                    this.onPageListReceived(args);
                }
                
                // Resolve any pending promise for page list
                this.resolvePendingPromise('pageList', args);
                break;
                
            case window.WebPenSDK.PenMessageType.OFFLINE_DATA_SEND_START:
                // Offline data transfer started
                console.log('Offline data transfer started');
                break;
                
            case window.WebPenSDK.PenMessageType.OFFLINE_DATA_SEND_STATUS:
                // Progress update for offline data transfer
                console.log(`Offline data transfer progress: ${args}%`);
                break;
                
            case window.WebPenSDK.PenMessageType.OFFLINE_DATA_SEND_SUCCESS:
                // Successful receipt of offline data
                if (this.onOfflineDataReceived) {
                    this.onOfflineDataReceived(args);
                }
                
                // Resolve any pending promise for offline data
                this.resolvePendingPromise('offlineData', args);
                break;
                
            case window.WebPenSDK.PenMessageType.OFFLINE_DATA_SEND_FAILURE:
                // Failed to retrieve offline data
                console.error('Failed to retrieve offline data:', args);
                
                if (this.onError) {
                    this.onError(`Failed to retrieve offline data: ${args}`);
                }
                
                // Reject any pending promise for offline data
                this.rejectPendingPromise('offlineData', `Failed to retrieve offline data: ${args}`);
                break;
        }
    }
    
    /**
     * Handle password request from the pen
     */
    handlePasswordRequest(args) {
        const password = prompt(
            `Please enter your pen's password (${args.RetryCount} attempts remaining). ` +
            `After ${args.ResetCount} failed attempts, the pen will be reset.`
        );
        
        if (password === null) {
            return;
        }
        
        if (password.length !== 4) {
            alert('Password must be 4 digits.');
            this.handlePasswordRequest(args);
            return;
        }
        
        if (this.penController) {
            this.penController.InputPassword(password);
        }
    }
    
    /**
     * Request the list of notes stored on the pen
     */
    async requestOfflineNoteList() {
        if (!this.isConnected || !this.penController) {
            throw new Error('Pen not connected');
        }
        
        // Create a promise that will be resolved when we receive the note list
        const requestId = this.createPendingPromise('noteList');
        
        // Request all notes (section=0, owner=0)
        this.penController.RequestOfflineNoteList(0, 0);
        
        // Return the promise
        return this.pendingPromises[requestId].promise;
    }
    
    /**
     * Request the list of pages for a specific note
     */
    async requestOfflinePageList(section, owner, note) {
        if (!this.isConnected || !this.penController) {
            throw new Error('Pen not connected');
        }
        
        // Create a promise that will be resolved when we receive the page list
        const requestId = this.createPendingPromise('pageList');
        
        // Request pages for the specified note
        this.penController.RequestOfflinePageList(section, owner, note);
        
        // Return the promise
        return this.pendingPromises[requestId].promise;
    }
    
    /**
     * Request the offline data for a specific note
     * Important: This does NOT delete the data from the pen
     */
    async requestOfflineData(section, owner, note, pages = []) {
        if (!this.isConnected || !this.penController) {
            throw new Error('Pen not connected');
        }
        
        // Create a promise that will be resolved when we receive the offline data
        const requestId = this.createPendingPromise('offlineData');
        
        // Request offline data for the specified note, with deleteOnFinished=false
        this.penController.RequestOfflineData(section, owner, note, false, pages);
        
        // Return the promise
        return this.pendingPromises[requestId].promise;
    }
    
    /**
     * Helper method to create a pending promise
     */
    createPendingPromise(type) {
        const id = `${type}_${this.currentRequestId++}`;
        let resolveFunc, rejectFunc;
        
        const promise = new Promise((resolve, reject) => {
            resolveFunc = resolve;
            rejectFunc = reject;
        });
        
        this.pendingPromises[id] = {
            type,
            promise,
            resolve: resolveFunc,
            reject: rejectFunc,
            timestamp: Date.now()
        };
        
        return id;
    }
    
    /**
     * Helper method to resolve a pending promise
     */
    resolvePendingPromise(type, data) {
        // Find all pending promises of the specified type
        const pendingIds = Object.keys(this.pendingPromises).filter(
            id => this.pendingPromises[id].type === type
        );
        
        if (pendingIds.length > 0) {
            // Resolve the oldest pending promise
            const oldestId = pendingIds.reduce((oldest, id) => {
                if (!oldest || this.pendingPromises[id].timestamp < this.pendingPromises[oldest].timestamp) {
                    return id;
                }
                return oldest;
            }, null);
            
            if (oldestId) {
                this.pendingPromises[oldestId].resolve(data);
                delete this.pendingPromises[oldestId];
            }
        }
    }
    
    /**
     * Helper method to reject a pending promise
     */
    rejectPendingPromise(type, error) {
        // Find all pending promises of the specified type
        const pendingIds = Object.keys(this.pendingPromises).filter(
            id => this.pendingPromises[id].type === type
        );
        
        if (pendingIds.length > 0) {
            // Reject the oldest pending promise
            const oldestId = pendingIds.reduce((oldest, id) => {
                if (!oldest || this.pendingPromises[id].timestamp < this.pendingPromises[oldest].timestamp) {
                    return id;
                }
                return oldest;
            }, null);
            
            if (oldestId) {
                this.pendingPromises[oldestId].reject(new Error(error));
                delete this.pendingPromises[oldestId];
            }
        }
    }
}
