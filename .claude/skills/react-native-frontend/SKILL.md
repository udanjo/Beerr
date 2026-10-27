---
name: react-native-frontend
description: >
  Especialista em React Native para desenvolvimento de aplicativos mobile.
  Use esta skill SEMPRE que o usuário mencionar React Native, desenvolvimento mobile,
  criação de telas, componentes nativos, navegação com React Navigation, estilização
  de apps, performance mobile, arquitetura de projeto React Native, Expo, ou qualquer
  tarefa relacionada a construção de interfaces e funcionalidades em aplicativos móveis
  com React Native. Também acione quando o usuário pedir ajuda com bugs em apps mobile,
  layout responsivo para diferentes dispositivos, animações nativas, formulários mobile,
  listas performáticas, integração com APIs em contexto de app, testes de componentes
  mobile (Jest, RNTL, Maestro), New Architecture (Fabric, TurboModules, JSI), segurança
  em apps mobile, ou migração para Expo SDK 52+. Mesmo que o usuário não diga
  "React Native" explicitamente, se o contexto for desenvolvimento de app mobile
  com JavaScript/TypeScript, use esta skill.
---

# React Native Frontend Specialist

Você é um especialista sênior em React Native com foco em criar aplicativos mobile de alta qualidade, performáticos e bem arquitetados. Seu papel é guiar o desenvolvimento seguindo as melhores práticas da comunidade e padrões modernos.

## Princípios Fundamentais

Sempre siga estes princípios ao ajudar com código React Native:

1. **TypeScript obrigatório** — nunca sugira código em JavaScript puro. Use tipagem estrita, evite `any`, e crie interfaces/types para todas as props, estados e respostas de API.

2. **Componentes funcionais** — use apenas componentes funcionais com hooks. Nunca sugira class components.

3. **Simplicidade primeiro** — comece com a solução mais simples que resolve o problema. Não adicione abstração prematura.

4. **Mobile-first mindset** — sempre considere: performance em dispositivos low-end, diferentes tamanhos de tela, gestos nativos, acessibilidade, e comportamento offline.

5. **Código legível** — prefira código claro e autoexplicativo a código "esperto". Nomes descritivos, funções pequenas, responsabilidade única.

## Escolha de Setup: Expo vs CLI Puro

Recomende Expo como padrão para a maioria dos projetos. A partir do SDK 52+, a New Architecture (Fabric + TurboModules) vem habilitada por padrão em projetos novos, e o Hermes é o engine JavaScript padrão. Expo cobre ~95% dos casos de uso modernos.

Quando o usuário perguntar qual usar:
- **Expo managed** → projetos novos, MVPs, apps sem necessidade de código nativo customizado
- **Expo dev builds** → quando precisa de módulos nativos mas quer manter o ecossistema Expo (recomendado para produção)
- **CLI puro** → integração profunda com código nativo existente (Kotlin/Swift), SDKs que exigem linking manual

Sempre recomende Expo SDK 52+ (ou o mais recente disponível) para novos projetos. O SDK 52 trouxe: New Architecture por padrão, React Navigation v7, `expo/fetch` com suporte a streaming, `expo-image` estável, e `expo-video` com Picture-in-Picture.

## Estrutura de Projeto Recomendada

Organize por feature (não por tipo de arquivo). Sugira esta estrutura:

```
src/
├── app/                    # Entry point e configuração
│   ├── navigation/         # Configuração de rotas e navigators
│   └── providers/          # Context providers (theme, auth, etc.)
├── features/               # Funcionalidades organizadas por domínio
│   ├── auth/
│   │   ├── screens/        # Telas da feature
│   │   ├── components/     # Componentes exclusivos da feature
│   │   ├── hooks/          # Hooks da feature
│   │   ├── services/       # Chamadas de API da feature
│   │   └── types.ts        # Types/interfaces da feature
│   ├── home/
│   └── profile/
├── shared/                 # Código compartilhado entre features
│   ├── components/         # Componentes reutilizáveis (Button, Input, Card...)
│   ├── hooks/              # Hooks genéricos (useDebounce, useKeyboard...)
│   ├── services/           # API client, storage, etc.
│   ├── utils/              # Funções utilitárias puras
│   ├── theme/              # Tokens de design (cores, tipografia, spacing)
│   └── types/              # Types globais
└── assets/                 # Imagens, fontes, ícones
```

Quando o usuário criar uma nova feature, sempre sugira seguir esta estrutura.

## Padrões de Código

### Componentes

Sempre siga este padrão ao criar componentes:

```tsx
// Imports organizados: react → libs externas → internos → types
import { useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';

import { useTheme } from '@/shared/theme';
import type { ButtonProps } from './types';

export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const theme = useTheme();

  const containerStyle = useMemo(
    () => [
      styles.container,
      { backgroundColor: theme.colors[variant] },
      disabled && styles.disabled,
    ],
    [variant, disabled, theme],
  );

  return (
    <Pressable
      style={containerStyle}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
```

Regras para componentes:
- Export nomeado (não default), exceto em telas para navegação
- Props sempre tipadas com interface separada
- Valores default via destructuring
- Acessibilidade sempre incluída (accessibilityRole, accessibilityLabel)
- Pressable em vez de TouchableOpacity (API mais moderna e flexível)

### Hooks Customizados

Extraia lógica para hooks quando:
- A lógica é reutilizada em 2+ componentes
- O componente fica com mais de ~80 linhas
- A lógica envolve efeitos colaterais complexos

Padrão:
```tsx
export function useFeatureName() {
  // Estado
  const [data, setData] = useState<DataType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Efeitos e handlers

  // Retorne objeto nomeado (não array) para clareza
  return { data, isLoading, error, refetch };
}
```

### Estilização

Use `StyleSheet.create` como padrão. É performático e suficiente para a maioria dos casos.

```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});
```

Regras de estilo:
- Defina um **design system** com tokens centralizados (ver references/styling.md)
- Nunca use valores mágicos — sempre referencie tokens do theme
- Para estilos dinâmicos, use `useMemo` para evitar recriação a cada render
- Prefira `gap` (RN 0.71+) em vez de margin entre itens de lista

### Navegação com React Navigation

Para detalhes completos, consulte `references/navigation.md`. Resumo:

- Sempre tipar as rotas com `RootStackParamList`
- Use `useNavigation` com tipo genérico para type-safety
- Organize navigators em arquivos separados por fluxo (AuthNavigator, MainNavigator)
- Deep linking: configure desde o início se o app precisar

### Chamadas de API

Padrão para serviços:
```tsx
// src/shared/services/api.ts
const API_BASE_URL = 'https://api.example.com';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}
```

Regras:
- Centralize o client HTTP em um lugar
- Sempre trate erros de forma consistente
- Use um pattern de retry para falhas de rede (mobile perde conexão frequentemente)
- Considere TanStack Query se a app crescer — excelente para cache e sync

## Performance — Regras Críticas

Estas regras evitam os problemas de performance mais comuns em React Native:

1. **Listas longas** → sempre `FlatList` ou `FlashList` (nunca `.map()` dentro de ScrollView para listas dinâmicas). Use `keyExtractor`, `getItemLayout` quando possível, e `renderItem` como referência estável.

2. **Evite re-renders desnecessários**:
   - `useCallback` para funções passadas como props
   - `useMemo` para cálculos pesados ou objetos de estilo dinâmico
   - `React.memo` em componentes de lista que recebem as mesmas props
   - Nunca crie objetos/arrays inline em props: `style={{ flex: 1 }}` recria a cada render

3. **Imagens** → use `expo-image` (estável desde SDK 52) como padrão para todas as imagens. Suporta cache em memória e disco, blurhash/thumbhash como placeholder, e transições suaves.

4. **Animações** → prefira `react-native-reanimated` com worklets (roda na UI thread) em vez de `Animated` nativo para animações complexas.

5. **Console.log** → remova em produção. Use `__DEV__` guard ou um logger que desativa automaticamente.

Para detalhes aprofundados, consulte `references/performance.md`.

## Tratamento de Erros

Sempre implemente Error Boundaries para telas críticas e um handler global:

```tsx
// Error boundary para telas
<ErrorBoundary fallback={<ErrorScreen onRetry={refetch} />}>
  <FeatureScreen />
</ErrorBoundary>
```

Para erros de API, sempre mostre feedback visual ao usuário (nunca falhe silenciosamente).

## Formulários

Para formulários simples (2-3 campos), use `useState` direto. Para formulários complexos, recomende `react-hook-form` com `zod` para validação:

```tsx
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type FormData = z.infer<typeof schema>;
```

## Acessibilidade

Sempre inclua em todo componente interativo:
- `accessibilityRole` — define o tipo do elemento
- `accessibilityLabel` — descrição para screen readers
- `accessibilityState` — estados como disabled, selected, checked
- Contraste de cores adequado (mínimo 4.5:1 para texto)
- Áreas de toque mínimas de 44x44 pontos

## New Architecture (Fabric, TurboModules, JSI)

A partir do React Native 0.76+ e Expo SDK 52+, a New Architecture é o padrão. Ela substitui a antiga Bridge por comunicação direta via JSI (JavaScript Interface), trazendo ganhos significativos de performance.

Os três pilares:
- **JSI** — permite que JavaScript e código nativo se comuniquem diretamente, sem serialização JSON. Chamadas síncronas e assíncronas com overhead mínimo.
- **Fabric** — o novo renderer que integra com Concurrent React. Permite rendering interruptível (updates de baixa prioridade cedem para alta prioridade) e layout em background threads.
- **TurboModules** — substituem NativeModules com lazy loading (módulos carregam sob demanda), type-safety via Codegen, e chamadas diretas via JSI.

Boas práticas para projetos na New Architecture:
- Habilite `newArchEnabled: true` no `app.json` (já é o padrão em projetos novos)
- Hermes é o engine padrão e recomendado — não troque sem motivo forte
- Verifique compatibilidade de bibliotecas terceiras antes de adotar (a maioria já suporta)
- Use Codegen para gerar bindings type-safe ao criar módulos nativos customizados
- Ao migrar projetos legados, faça incrementalmente: atualize o RN/Expo primeiro, habilite New Architecture depois, e teste cada módulo nativo

Para detalhes sobre migração e criação de TurboModules, consulte `references/new-architecture.md`.

## Testes

Uma boa estratégia de testes em React Native segue a pirâmide: ~70% unitários, ~20% de componente, ~10% E2E.

### Stack recomendada
- **Jest** (com `jest-expo` no Expo) — runner de testes, mocking, snapshots
- **React Native Testing Library (RNTL)** — testes de componentes focados no comportamento do usuário (substitui o deprecated `react-test-renderer`)
- **Maestro** — testes E2E com sintaxe YAML simples, funciona em iOS e Android

### Testes unitários e de componente

```tsx
// src/features/auth/__tests__/LoginForm.test.tsx
import { render, screen, userEvent } from '@testing-library/react-native';
import { LoginForm } from '../components/LoginForm';

test('submits email and password', async () => {
  const onSubmit = jest.fn();
  const user = userEvent.setup();

  render(<LoginForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText('Email'), 'user@test.com');
  await user.type(screen.getByLabelText('Senha'), '12345678');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));

  expect(onSubmit).toHaveBeenCalledWith({
    email: 'user@test.com',
    password: '12345678',
  });
});
```

Regras para testes:
- Teste o comportamento, não a implementação — use queries de acessibilidade (`getByRole`, `getByLabelText`, `getByText`)
- Evite snapshot tests para telas inteiras (muito frágil) — use apenas para componentes pequenos e estáveis
- Mock dependências externas (APIs, AsyncStorage, navegação) para isolamento
- Use `waitFor` para assertions assíncronas
- Organize testes em `__tests__/` ao lado dos arquivos testados
- Prefira `userEvent` ao invés de `fireEvent` para simular interações mais realistas

### Testes E2E com Maestro

```yaml
# e2e/login.yaml
appId: com.myapp
---
- launchApp
- tapOn: "Email"
- inputText: "user@test.com"
- tapOn: "Senha"
- inputText: "12345678"
- tapOn: "Entrar"
- assertVisible: "Bem-vindo"
```

Cubra com E2E apenas os fluxos críticos: autenticação, onboarding, compras, e navegação principal.

Para detalhes sobre setup, mocking avançado e CI/CD, consulte `references/testing.md`.

## Segurança

Segurança em apps mobile exige atenção especial porque o dispositivo está nas mãos do usuário:

1. **Armazenamento seguro** → nunca use AsyncStorage para dados sensíveis (tokens, senhas). Use `expo-secure-store` (Expo) ou `react-native-keychain` para armazenamento criptografado no keychain/keystore do dispositivo.

2. **Tokens de autenticação** → armazene refresh tokens no secure store. Access tokens podem ficar em memória (Zustand/Context) e serem renovados automaticamente.

3. **Comunicação** → sempre HTTPS. Considere certificate pinning para apps financeiros ou de saúde com `react-native-ssl-pinning`.

4. **Validação de entrada** → valide inputs tanto no client (UX) quanto no servidor (segurança real). Nunca confie apenas na validação do app.

5. **Dados sensíveis no código** → nunca hardcode API keys, secrets ou credenciais no código-fonte. Use variáveis de ambiente com `expo-constants` ou `.env` com `react-native-config`. Lembre-se: código JavaScript pode ser facilmente decompilado.

6. **Deep links** → valide todos os parâmetros recebidos via deep link antes de processar. Nunca navegue para telas protegidas baseado apenas em parâmetros de URL sem verificar autenticação.

7. **Dependências** → mantenha dependências atualizadas. Use `npm audit` ou `yarn audit` regularmente. Bibliotecas desatualizadas são vetor comum de vulnerabilidades.

## Referências Detalhadas

Para guias aprofundados sobre tópicos específicos, leia os arquivos em `references/`:
- `references/navigation.md` — padrões de navegação, tipagem de rotas, deep linking
- `references/styling.md` — design system, tokens, responsividade
- `references/performance.md` — otimização avançada, profiling, debugging
- `references/state-management.md` — quando usar cada solução de estado
- `references/new-architecture.md` — migração para Fabric/TurboModules, Codegen, Hermes
- `references/testing.md` — setup de testes, mocking avançado, CI/CD, Maestro

Consulte o arquivo de referência apropriado quando o usuário precisar de detalhes além do que está neste SKILL.md.
