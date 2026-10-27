# Navegação com React Navigation

## Setup Inicial

Instale as dependências core:
```bash
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
```

Para tabs:
```bash
npx expo install @react-navigation/bottom-tabs
```

## Tipagem de Rotas

Sempre defina os parâmetros de cada rota em um type central:

```tsx
// src/app/navigation/types.ts

export type RootStackParamList = {
  // Rotas sem parâmetros
  Home: undefined;
  Settings: undefined;

  // Rotas com parâmetros obrigatórios
  ProductDetail: { productId: string };

  // Rotas com parâmetros opcionais
  Search: { query?: string };
};

// Para usar useNavigation tipado em qualquer lugar:
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

Com essa declaração global, `useNavigation()` já vem tipado automaticamente em toda a app.

## Estrutura de Navigators

Organize os navigators por fluxo:

```tsx
// src/app/navigation/AuthNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
```

```tsx
// src/app/navigation/MainNavigator.tsx — tabs principais
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

```tsx
// src/app/navigation/RootNavigator.tsx — decide auth vs main
export function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
```

## Navegação Type-Safe

```tsx
// Em qualquer componente:
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

function ProductCard({ productId }: { productId: string }) {
  const navigation = useNavigation();

  const handlePress = () => {
    // TypeScript vai validar os parâmetros automaticamente
    navigation.navigate('ProductDetail', { productId });
  };

  return <Pressable onPress={handlePress}>...</Pressable>;
}
```

## Recebendo Parâmetros em Telas

```tsx
import { useRoute, RouteProp } from '@react-navigation/native';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

export function ProductDetailScreen() {
  const route = useRoute<ProductDetailRouteProp>();
  const { productId } = route.params;

  // Use productId para buscar dados...
}
```

## Deep Linking

Configure no `NavigationContainer`:

```tsx
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      Main: {
        screens: {
          Home: 'home',
          ProductDetail: 'product/:productId',
        },
      },
      Auth: {
        screens: {
          Login: 'login',
        },
      },
    },
  },
};

<NavigationContainer linking={linking}>
  <RootNavigator />
</NavigationContainer>
```

## Padrões Importantes

1. **Nunca passe funções de navegação como props profundas** — use `useNavigation()` no componente que precisa navegar.

2. **Evite navegação em useEffect sem condição** — pode causar loops infinitos.

3. **Use `navigation.goBack()` com cuidado** — verifique se existe tela anterior com `navigation.canGoBack()`.

4. **Headers customizados** — use `screenOptions` no navigator ou `options` na Screen, não crie headers manuais:
```tsx
<Stack.Screen
  name="Profile"
  component={ProfileScreen}
  options={{
    headerTitle: 'Meu Perfil',
    headerRight: () => <SettingsButton />,
  }}
/>
```

5. **Loading screen** — enquanto verifica autenticação, mostre uma splash/loading:
```tsx
if (isLoadingAuth) {
  return <SplashScreen />;
}
```
