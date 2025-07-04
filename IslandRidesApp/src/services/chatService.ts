import io, { Socket } from 'socket.io-client';
import { apiService } from './apiService';
import { ChatMessage } from '../types';

type MessageCallback = (message: ChatMessage) => void;
type ConnectionCallback = () => void;
type ErrorCallback = (error: string) => void;

class ChatService {
  private socket: Socket | null = null;
  private currentConversationId: number | null = null;
  private currentUserId: number | null = null;
  private messageCallbacks: MessageCallback[] = [];
  private connectCallbacks: ConnectionCallback[] = [];
  private disconnectCallbacks: ConnectionCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  /**
   * Connect to WebSocket server with JWT authentication
   */
  async connect(): Promise<void> {
    try {
      console.log('🔌 Connecting to chat server...');

      const token = await apiService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Disconnect existing connection if any
      if (this.socket) {
        this.socket.disconnect();
      }

      // Create new socket connection
      this.socket = io('ws://localhost:3000', {
        auth: {
          token: token,
        },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: false, // We'll handle reconnection manually
      });

      // Set up event listeners
      this.setupEventListeners();

      // Wait for connection
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.on('connect', () => {
          console.log('✅ Connected to chat server');
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          this.notifyConnectCallbacks();
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          console.error('❌ Chat connection error:', error.message);
          clearTimeout(timeout);
          this.notifyErrorCallbacks(`Connection failed: ${error.message}`);
          reject(new Error(`Connection failed: ${error.message}`));
        });
      });

    } catch (error) {
      console.error('❌ Failed to connect to chat server:', error);
      throw error;
    }
  }

  /**
   * Set up socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connection_established', (data) => {
      console.log('🎉 Chat connection established:', data);
      this.currentUserId = data.userId;
    });

    this.socket.on('new_message', (message) => {
      console.log('📨 New message received:', message);
      this.notifyMessageCallbacks(message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from chat server:', reason);
      this.notifyDisconnectCallbacks();
      
      // Attempt reconnection if not manually disconnected
      if (reason !== 'io client disconnect') {
        this.attemptReconnection();
      }
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      this.notifyErrorCallbacks(`Socket error: ${error}`);
    });
  }

  /**
   * Join a specific conversation room
   */
  async joinConversation(conversationId: number): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Not connected to chat server');
    }

    console.log(`🏠 Joining conversation ${conversationId}`);

    // Leave current conversation if any
    if (this.currentConversationId && this.currentConversationId !== conversationId) {
      await this.leaveConversation();
    }

    this.currentConversationId = conversationId;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join conversation timeout'));
      }, 5000);

      this.socket!.emit('join_conversation', { conversationId });

      // Listen for confirmation (you may need to add this to backend)
      this.socket!.once('conversation_joined', (data) => {
        clearTimeout(timeout);
        console.log('✅ Joined conversation:', data);
        resolve();
      });

      // For now, resolve immediately since backend doesn't send confirmation
      clearTimeout(timeout);
      resolve();
    });
  }

  /**
   * Leave current conversation room
   */
  async leaveConversation(): Promise<void> {
    if (!this.socket || !this.currentConversationId) {
      return;
    }

    console.log(`🚪 Leaving conversation ${this.currentConversationId}`);
    
    this.socket.emit('leave_conversation', { 
      conversationId: this.currentConversationId 
    });
    
    this.currentConversationId = null;
  }

  /**
   * Send a message to the current conversation
   */
  async sendMessage(text: string): Promise<void> {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Not connected to chat server');
    }

    if (!this.currentConversationId) {
      throw new Error('No active conversation');
    }

    if (!text.trim()) {
      throw new Error('Message cannot be empty');
    }

    console.log(`📤 Sending message to conversation ${this.currentConversationId}:`, text);

    this.socket.emit('send_message', {
      conversationId: this.currentConversationId,
      content: text.trim(),
      messageType: 'text'
    });
  }

  /**
   * Load message history for a conversation
   */
  async loadMessageHistory(conversationId: number, limit: number = 50): Promise<ChatMessage[]> {
    try {
      console.log(`📚 Loading message history for conversation ${conversationId}`);

      const messages = await apiService.get<ChatMessage[]>(
        `/api/conversations/${conversationId}/messages?limit=${limit}`
      );

      // Transform backend messages to GiftedChat format
      return messages.map(this.transformMessage).reverse(); // Reverse for GiftedChat (newest first)

    } catch (error) {
      console.error('❌ Failed to load message history:', error);
      throw new Error('Failed to load message history');
    }
  }

  /**
   * Transform backend message to GiftedChat format
   */
  private transformMessage(backendMsg: any): ChatMessage {
    return {
      _id: backendMsg._id,
      text: backendMsg.text,
      createdAt: new Date(backendMsg.createdAt),
      user: {
        _id: backendMsg.user._id,
        name: backendMsg.user.name,
      },
    };
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.notifyErrorCallbacks('Connection lost. Please refresh the app.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      try {
        await this.connect();
        
        // Rejoin conversation if we were in one
        if (this.currentConversationId) {
          await this.joinConversation(this.currentConversationId);
        }
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.attemptReconnection();
      }
    }, delay);
  }

  /**
   * Disconnect from chat server
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from chat server');
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.currentConversationId = null;
    this.currentUserId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Check if connected to chat server
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current conversation ID
   */
  getCurrentConversationId(): number | null {
    return this.currentConversationId;
  }

  /**
   * Event listener management
   */
  onMessage(callback: MessageCallback): void {
    this.messageCallbacks.push(callback);
  }

  onConnect(callback: ConnectionCallback): void {
    this.connectCallbacks.push(callback);
  }

  onDisconnect(callback: ConnectionCallback): void {
    this.disconnectCallbacks.push(callback);
  }

  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Remove event listeners
   */
  removeMessageListener(callback: MessageCallback): void {
    this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
  }

  removeConnectListener(callback: ConnectionCallback): void {
    this.connectCallbacks = this.connectCallbacks.filter(cb => cb !== callback);
  }

  removeDisconnectListener(callback: ConnectionCallback): void {
    this.disconnectCallbacks = this.disconnectCallbacks.filter(cb => cb !== callback);
  }

  removeErrorListener(callback: ErrorCallback): void {
    this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
  }

  /**
   * Notify callbacks
   */
  private notifyMessageCallbacks(message: ChatMessage): void {
    this.messageCallbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('❌ Error in message callback:', error);
      }
    });
  }

  private notifyConnectCallbacks(): void {
    this.connectCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('❌ Error in connect callback:', error);
      }
    });
  }

  private notifyDisconnectCallbacks(): void {
    this.disconnectCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('❌ Error in disconnect callback:', error);
      }
    });
  }

  private notifyErrorCallbacks(error: string): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('❌ Error in error callback:', err);
      }
    });
  }
}

export default new ChatService();
