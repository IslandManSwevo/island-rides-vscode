import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { notificationService } from '../services/notificationService';
import { GiftedChat, IMessage, User as GiftedChatUser } from 'react-native-gifted-chat';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';

import { ChatContext, ChatMessage, ConversationResponse } from '../types';
import { RootStackParamList } from '../navigation/routes';
import conversationService from '../services/conversationService';
import chatService from '../services/chatService';
import { AppHeader } from '../components/AppHeader';
import { useAuth } from '../context/AuthContext';

// Navigation types
type ChatConversationScreenProps = StackScreenProps<RootStackParamList, 'Chat'>;

const ChatConversationScreen: React.FC<ChatConversationScreenProps> = ({ route, navigation }) => {
  const { currentUser: authUser } = useAuth();
  const { context, title: initialTitle } = route.params;

  // State management
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [conversationData, setConversationData] = useState<ConversationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const isMountedRef = useRef(true);

  /**
   * Initialize conversation and chat connection
   */
  useEffect(() => {
    initializeChat();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [context]);

  /**
   * Set up navigation header
   */
  useEffect(() => {
    if (conversationData) {
      const headerTitle = initialTitle || 
        conversationService.getConversationTitle(
          context,
          conversationData.participant,
          conversationData.vehicle
        );

      navigation.setOptions({
        headerTitle: headerTitle,
        headerTitleStyle: { fontSize: 16 },
      });
    }
  }, [conversationData, initialTitle, context, navigation]);

  /**
   * Initialize chat system
   */
  const initializeChat = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🚀 Initializing chat with context:', context);

      // Step 1: Resolve conversation context
      const resolvedConversation = await conversationService.resolveConversation(context);
      
      if (!isMountedRef.current) return;
      
      setConversationData(resolvedConversation);
      console.log('✅ Conversation resolved:', resolvedConversation);

      // Step 2: Load message history
      await loadMessageHistory(resolvedConversation.conversationId);

      // Step 3: Connect to chat server
      await connectToChat(resolvedConversation.conversationId);

    } catch (error) {
      console.error('❌ Failed to initialize chat:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to initialize chat');
        setIsLoading(false);
      }
    }
  };

  /**
   * Load message history from API
   */
  const loadMessageHistory = async (conversationId: number) => {
    try {
      console.log('📚 Loading message history...');
      
      const chatMessages = await chatService.loadMessageHistory(conversationId);
      
      if (!isMountedRef.current) return;

      // Transform to GiftedChat format
      const giftedMessages: IMessage[] = chatMessages.map(transformToGiftedMessage);
      
      setMessages(giftedMessages);
      console.log(`✅ Loaded ${giftedMessages.length} messages`);

    } catch (error) {
      console.error('❌ Failed to load message history:', error);
      // Continue without history - not a critical error
    }
  };

  /**
   * Connect to WebSocket chat server
   */
  const connectToChat = async (conversationId: number) => {
    try {
      setIsConnecting(true);
      setConnectionStatus('connecting');

      notificationService.info('Connecting to chat server...', {
        duration: 0,
        closable: false
      });

      console.log('🔌 Connecting to chat server...');

      // Connect to WebSocket
      await chatService.connect();
      
      if (!isMountedRef.current) return;

      // Join conversation room
      await chatService.joinConversation(conversationId);
      
      if (!isMountedRef.current) return;

      // Set up message listener
      chatService.onMessage(handleNewMessage);
      
      // Set up connection listeners
      chatService.onConnect(() => {
        if (isMountedRef.current) {
          setConnectionStatus('connected');
        }
      });

      chatService.onDisconnect(() => {
        if (isMountedRef.current) {
          setConnectionStatus('disconnected');
        }
      });

      chatService.onError((error) => {
        if (isMountedRef.current) {
          console.error('❌ Chat error:', error);
          setError(error);
        }
      });

      setConnectionStatus('connected');
      console.log('✅ Connected to chat server');

    } catch (error) {
      console.error('❌ Failed to connect to chat:', error);
      if (isMountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to connect to chat');
        setConnectionStatus('disconnected');
      }
    } finally {
      if (isMountedRef.current) {
        setIsConnecting(false);
        setIsLoading(false);
      }
    }
  };

  /**
   * Handle new incoming messages
   */
  const handleNewMessage = useCallback((message: ChatMessage) => {
    if (!isMountedRef.current) return;

    console.log('📨 New message received:', message);
    
    // Show notification if message is from other user and app is not focused
    if (message.user._id !== getCurrentUser()._id) {
      notificationService.info(`${message.user.name}: ${message.text}`, {
        title: 'New Message',
        duration: 3000,
        action: {
          label: 'Reply',
          handler: () => {} // Already in chat screen
        }
      });
    }
    
    const giftedMessage = transformToGiftedMessage(message);
    
    setMessages(previousMessages => 
      GiftedChat.append(previousMessages, [giftedMessage])
    );
  }, []);

  /**
   * Transform ChatMessage to GiftedChat IMessage format
   */
  const transformToGiftedMessage = (chatMessage: ChatMessage): IMessage => {
    return {
      _id: chatMessage._id,
      text: chatMessage.text,
      createdAt: new Date(chatMessage.createdAt),
      user: {
        _id: chatMessage.user._id,
        name: chatMessage.user.name,
        avatar: chatMessage.user.avatar,
      },
    };
  };

  /**
   * Handle sending messages
   */
  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!chatService.isConnected()) {
      notificationService.error('Not connected to chat server. Please check your connection and try again.', {
        title: 'Connection Error',
        duration: 5000,
        action: {
          label: 'Retry',
          handler: () => onSend(newMessages)
        }
      });
      return;
    }

    const message = newMessages[0];
    if (!message?.text?.trim()) return;

    try {
      // Optimistically update UI
      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, newMessages)
      );

      // Send via WebSocket
      await chatService.sendMessage(message.text);
      
      console.log('✅ Message sent successfully');

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Remove optimistic message on failure
      setMessages(previousMessages =>
        previousMessages.filter(msg => msg._id !== message._id)
      );

      notificationService.error('Failed to send message', {
        title: 'Send Failed',
        duration: 4000,
        action: {
          label: 'Retry',
          handler: () => onSend(newMessages)
        }
      });
    }
  }, []);

  /**
   * Get current user for GiftedChat
   */
  const getCurrentUser = (): GiftedChatUser => {
    if (!authUser) {
      // Fallback if user is not available
      return {
        _id: 1,
        name: 'You',
      };
    }

    return {
      _id: authUser.id,
      name: `${authUser.firstName} ${authUser.lastName}`,
    };
  };

  /**
   * Cleanup function
   */
  const cleanup = () => {
    console.log('🧹 Cleaning up chat screen...');
    
    try {
      chatService.disconnect();
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  };

  /**
   * Retry connection
   */
  const retryConnection = () => {
    setError(null);
    initializeChat();
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <AppHeader 
          title="Loading Chat..." 
          navigation={navigation}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {isConnecting ? 'Connecting to chat...' : 'Setting up conversation...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <AppHeader 
          title="Chat Error" 
          navigation={navigation}
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to start chat</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.retryButton} onPress={retryConnection}>
            Tap to retry
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /**
   * Render connection status indicator
   */
  const renderConnectionStatus = () => {
    if (connectionStatus === 'connected') return null;

    return (
      <View style={styles.connectionStatus}>
        <Text style={styles.connectionStatusText}>
          {connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </Text>
        {connectionStatus === 'connecting' && (
          <ActivityIndicator size="small" color="#fff" style={styles.connectionIndicator} />
        )}
      </View>
    );
  };

  /**
   * Main render
   */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <AppHeader 
        title={conversationData ? 
          conversationService.getConversationTitle(
            context,
            conversationData.participant,
            conversationData.vehicle
          ) : 'Chat'
        }
        navigation={navigation}
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      {renderConnectionStatus()}

      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={getCurrentUser()}
        placeholder="Type a message..."
        alwaysShowSend
        renderAvatar={null} // Disable avatars for cleaner look
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  connectionStatus: {
    backgroundColor: '#ff9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionStatusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  connectionIndicator: {
    marginLeft: 8,
  },
  giftedChatContainer: {
    flex: 1,
  },
  messagesContainer: {
    backgroundColor: '#f5f5f5',
  },
  textInput: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  sendButton: {
    marginRight: 8,
    marginBottom: 4,
  },
  scrollToBottom: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
  },
});

export default ChatConversationScreen;
