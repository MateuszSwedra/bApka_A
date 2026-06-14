// FCM background + TaskManager muszą być zarejestrowane PRZED React (RN Firebase wymaga tego).
import './services/sosNotifeeBackground';
import './services/fcmBackgroundHandler';
import './services/sosBackgroundNotificationTask';
import 'expo-router/entry';
