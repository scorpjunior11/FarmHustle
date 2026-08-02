import * as Notifications from 'expo-notifications';
import appJson from '../../app.json';

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      const newPermission = await Notifications.requestPermissionsAsync();
      if (newPermission.status !== 'granted') {
        return null;
      }
    }

    const projectId = appJson.expo.extra?.eas?.projectId;
    if (!projectId) {
      console.error('EAS projectId not found in app.json');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.error('Failed to get Expo push token:', error);
    return null;
  }
}
