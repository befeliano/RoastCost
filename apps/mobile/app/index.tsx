import { APP_NAME } from '@roastcost/shared';
import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <Text style={{ fontSize: 28, color: '#5E1A2B' }}>{APP_NAME}</Text>
    </View>
  );
}
