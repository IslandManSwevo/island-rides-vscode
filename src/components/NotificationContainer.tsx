import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';
import NotificationItem from './NotificationItem';

export const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const subscription = notificationService.subscribe(setNotifications);
    return () => subscription.unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={() => notificationService.dismiss(notification.id)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    padding: 16,
  },
});

export default NotificationContainer;
