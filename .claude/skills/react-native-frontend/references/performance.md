# Performance em React Native

## Regra #1: Meça Antes de Otimizar

Nunca otimize "no escuro". Use estas ferramentas:
- **React Native DevTools** — substitui o antigo debugger a partir do SDK 52. Baseado no Chrome DevTools, inspeciona performance, componentes e rede
- **React DevTools Profiler** — identifica componentes que re-renderizam demais
- **Flipper** — inspeciona rede, layout, performance (RN CLI, ainda funcional mas em declínio)
- **`__DEV__` console.time** — medições rápidas de tempo de execução
- **Systrace / Perfetto** — análise detalhada de threads (avançado)

### Hermes — Engine JS Padrão

Hermes é o engine JavaScript padrão do React Native moderno. Benefícios: startup mais rápido (bytecode pré-compilado), menor uso de memória, e melhor integração com JSI/TurboModules. Verifique que está habilitado:

```json
// app.json (Expo)
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```

## Listas — O Problema #1 de Performance

### Nunca faça isso:
```tsx
// RUIM — renderiza TUDO de uma vez, sem virtualização
<ScrollView>
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</ScrollView>
```

### FlatList correta:
```tsx
const renderItem = useCallback(
  ({ item }: { item: ItemType }) => <ItemCard item={item} />,
  [],
);

const keyExtractor = useCallback(
  (item: ItemType) => item.id,
  [],
);

<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  // Performance boosters:
  removeClippedSubviews={true}           // Remove itens fora da tela (Android)
  maxToRenderPerBatch={10}               // Itens por batch de render
  windowSize={5}                         // Janela de virtualização (5 = 5 telas)
  initialNumToRender={10}                // Itens no render inicial
  getItemLayout={(_, index) => ({        // Pula medição se altura é fixa
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### FlashList (alternativa mais performática):
```bash
npx expo install @shopify/flash-list
```

```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={80}    // Obrigatório — estimativa da altura do item
  keyExtractor={keyExtractor}
/>
```

FlashList é significativamente mais rápido que FlatList para listas grandes (1000+ itens). Use como padrão se possível.

## Prevenção de Re-renders

### Identifique re-renders com Profiler
```tsx
// Temporário, para debug:
import { Profiler } from 'react';

function onRender(id: string, phase: string, actualDuration: number) {
  if (actualDuration > 16) { // mais que 1 frame (60fps)
    console.warn(`Slow render: ${id} took ${actualDuration}ms`);
  }
}

<Profiler id="ProductList" onRender={onRender}>
  <ProductList />
</Profiler>
```

### React.memo para componentes de lista
```tsx
// Componente de item de lista — evita re-render se props não mudaram
export const ProductCard = React.memo(function ProductCard({ product, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(product.id)}>
      <Text>{product.name}</Text>
    </Pressable>
  );
});

// Com comparação customizada (raro, use apenas se necessário):
export const ProductCard = React.memo(
  function ProductCard({ product, onPress }: Props) { ... },
  (prevProps, nextProps) => prevProps.product.id === nextProps.product.id,
);
```

### useCallback e useMemo
```tsx
function ProductList({ products }: { products: Product[] }) {
  // useCallback — função estável para não invalidar memo dos filhos
  const handlePress = useCallback((id: string) => {
    navigation.navigate('ProductDetail', { productId: id });
  }, [navigation]);

  // useMemo — evita recalcular em cada render
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => b.rating - a.rating),
    [products],
  );

  // useMemo — evita recriar objeto de estilo dinâmico
  const headerStyle = useMemo(
    () => ({ paddingTop: insets.top }),
    [insets.top],
  );

  return (
    <FlatList
      data={sortedProducts}
      renderItem={({ item }) => (
        <ProductCard product={item} onPress={handlePress} />
      )}
      style={headerStyle}
    />
  );
}
```

### Armadilhas comuns
```tsx
// RUIM — novo objeto a cada render, invalida React.memo
<ProductCard style={{ marginBottom: 8 }} />

// BOM — referência estável via StyleSheet
<ProductCard style={styles.card} />

// RUIM — nova função a cada render
<Button onPress={() => handleDelete(item.id)} />

// BOM — useCallback ou extrair para componente
const handleDelete = useCallback(() => deleteItem(item.id), [item.id]);
<Button onPress={handleDelete} />
```

## Imagens

### Use expo-image (padrão recomendado)
```bash
npx expo install expo-image
```

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  style={{ width: 200, height: 200 }}
  contentFit="cover"
  placeholder={blurhash}        // Placeholder enquanto carrega
  transition={200}              // Fade-in suave
  cachePolicy="memory-disk"     // Cache agressivo
/>
```

### Regras para imagens:
- Sempre defina `width` e `height` explícitos (evita layout shift)
- Use `blurhash` ou `thumbhash` como placeholder
- Redimensione imagens no servidor — não envie imagens 4K para um thumbnail de 100px
- Para avatares/ícones, considere SVG com `react-native-svg`

## Animações

### Reanimated para animações fluidas
```bash
npx expo install react-native-reanimated
```

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

function AnimatedCard() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text>Press me</Text>
      </Animated.View>
    </Pressable>
  );
}
```

Reanimated roda animações na **UI thread**, então não sofre com o overhead da JS thread. Use para qualquer animação que precisa ser suave (60fps).

## Bundle Size

- Use `npx expo-doctor` para verificar problemas
- Importe apenas o necessário de bibliotecas grandes: `import { format } from 'date-fns'` (não `import * as dateFns`)
- Considere `react-native-bundle-visualizer` para identificar dependências pesadas
- Lazy load de telas pesadas com `React.lazy` + `Suspense`

## Checklist de Performance

Antes de submeter uma feature, verifique:
- [ ] Listas usam FlatList/FlashList (nunca .map em ScrollView)
- [ ] Funções em props de lista usam useCallback
- [ ] Componentes de lista usam React.memo
- [ ] Imagens têm dimensões fixas e cache
- [ ] Estilos dinâmicos usam useMemo
- [ ] Sem console.log em código de produção
- [ ] Animações usam Reanimated (não Animated nativo)
- [ ] Sem objetos/arrays inline em props de componentes frequentes
