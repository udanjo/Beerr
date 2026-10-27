# Gerenciamento de Estado

## Quando Usar Cada Solução

Escolha a solução mais simples que resolve o problema:

| Cenário | Solução |
|---------|---------|
| Estado local de um componente | `useState` |
| Estado compartilhado entre 2-3 componentes próximos | Props ou Context |
| Tema, auth, locale (muda raramente) | Context API |
| Estado global complexo, muitos consumidores | Zustand |
| Cache de dados do servidor, sync, refetch | TanStack Query |
| Estado global muito complexo com middleware | Redux Toolkit (raro) |

A regra de ouro: comece com `useState`. Suba para Context quando precisar compartilhar. Use Zustand se Context ficar complexo demais. TanStack Query para qualquer dado que vem de API.

## useState — O Padrão

```tsx
const [count, setCount] = useState(0);
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<Item[]>([]);

// Atualização funcional quando depende do estado anterior
setCount(prev => prev + 1);
setItems(prev => [...prev, newItem]);
```

Quando NÃO usar useState:
- Quando 3+ componentes distantes precisam do mesmo estado
- Quando a lógica de atualização fica complexa (use `useReducer`)

## useReducer — Estado Local Complexo

Melhor que múltiplos `useState` quando estados estão relacionados:

```tsx
type State = {
  data: Item[];
  isLoading: boolean;
  error: string | null;
  page: number;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Item[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'LOAD_MORE' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, data: action.payload };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'LOAD_MORE':
      return { ...state, page: state.page + 1 };
  }
}
```

## Context API — Estado Global Simples

Ideal para: tema, autenticação, configurações, idioma.

```tsx
// src/features/auth/context/AuthContext.tsx
import { createContext, useContext, useCallback, useMemo, useState } from 'react';

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (credentials: Credentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    await tokenStorage.save(response.token);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    tokenStorage.clear();
  }, []);

  // useMemo para evitar re-render de todos os consumidores a cada render do provider
  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, logout }),
    [user, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
```

### Armadilhas do Context:
1. **Sem useMemo no value** → todo consumidor re-renderiza quando o provider re-renderiza
2. **Context grande demais** → separe em contextos menores (AuthContext, ThemeContext, etc.)
3. **Dados que mudam frequentemente** → não use Context, use Zustand ou estado local

## Zustand — Estado Global Escalável

Quando Context fica complexo ou você precisa de estado global que muda frequentemente:

```bash
npx expo install zustand
```

```tsx
// src/shared/stores/useCartStore.ts
import { create } from 'zustand';

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type CartStore = {
  items: CartItem[];
  totalPrice: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  totalPrice: 0,

  addItem: (item) =>
    set((state) => {
      const existing = state.items.find((i) => i.id === item.id);
      const items = existing
        ? state.items.map((i) =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          )
        : [...state.items, { ...item, quantity: 1 }];
      return {
        items,
        totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      };
    }),

  removeItem: (id) =>
    set((state) => {
      const items = state.items.filter((i) => i.id !== id);
      return {
        items,
        totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      };
    }),

  updateQuantity: (id, quantity) =>
    set((state) => {
      const items = state.items.map((i) =>
        i.id === id ? { ...i, quantity } : i,
      );
      return {
        items,
        totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      };
    }),

  clearCart: () => set({ items: [], totalPrice: 0 }),
}));
```

Uso em componentes:
```tsx
function CartBadge() {
  // Seleciona apenas o que precisa — só re-renderiza quando items.length muda
  const itemCount = useCartStore((state) => state.items.length);
  return <Badge count={itemCount} />;
}

function CartTotal() {
  const totalPrice = useCartStore((state) => state.totalPrice);
  return <Text>Total: R$ {totalPrice.toFixed(2)}</Text>;
}
```

### Vantagens do Zustand sobre Context:
- Não precisa de Provider (menos boilerplate)
- Seletores granulares (componente só re-renderiza se o slice que usa mudou)
- Funciona fora de componentes React (em services, utils)
- Middleware fácil (persist, devtools, immer)

### Persistência com AsyncStorage:
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // ... store definition
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

## TanStack Query — Cache de Dados do Servidor

Para qualquer dado que vem de uma API, TanStack Query é a melhor solução:

```bash
npx expo install @tanstack/react-query
```

Setup:
```tsx
// src/app/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min até considerar "stale"
      gcTime: 10 * 60 * 1000,         // 10 min no cache após inativo
      retry: 2,                        // 2 retries em caso de erro
      refetchOnWindowFocus: false,     // Desliga refetch no focus (mobile)
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

Uso:
```tsx
// Hook da feature
function useProducts(category: string) {
  return useQuery({
    queryKey: ['products', category],
    queryFn: () => productService.getByCategory(category),
  });
}

// No componente
function ProductList({ category }: { category: string }) {
  const { data, isLoading, error, refetch } = useProducts(category);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorView onRetry={refetch} />;

  return <FlatList data={data} ... />;
}
```

Mutations:
```tsx
function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      // Invalida o cache para refetch automático
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

## Resumo: Combinação Recomendada

Para a maioria dos projetos React Native:

1. **useState/useReducer** → estado local de componente
2. **Context API** → auth, tema, configurações (muda raramente)
3. **Zustand** → estado global da UI (carrinho, filtros, preferências)
4. **TanStack Query** → todo dado que vem do servidor

Não use todas de uma vez desde o início. Comece simples e adicione conforme a necessidade real aparecer.
